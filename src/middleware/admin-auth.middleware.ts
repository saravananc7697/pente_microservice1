import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { JwksClient } from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import { PinoLogger } from 'nestjs-pino';

interface AuthenticatedRequest extends Request {
  user?: {
    email: string;
    userId: string;
    sub: string;
    isAdmin: boolean;
  };
}

@Injectable()
export class AdminAuthMiddleware implements NestMiddleware {
  private readonly jwksClient: JwksClient;
  private readonly userPoolId: string;
  private readonly region: string;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AdminAuthMiddleware.name);

    const region = this.config.get<string>('PS_AUTH_VAR_AWS_COGNITO_REGION');
    const userPoolId = this.config.get<string>(
      'PS_AUTH_VAR_AWS_COGNITO_USER_POOL_ID',
    );

    if (!region || !userPoolId) {
      const missing: string[] = [];
      if (!region) missing.push('PS_AUTH_VAR_AWS_COGNITO_REGION');
      if (!userPoolId) missing.push('PS_AUTH_VAR_AWS_COGNITO_USER_POOL_ID');

      this.logger.error(
        { missingVars: missing },
        'Missing required Cognito configuration',
      );
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`,
      );
    }

    this.region = region;
    this.userPoolId = userPoolId;

    // Initialize JWKS client to fetch Cognito's public keys
    this.jwksClient = new JwksClient({
      jwksUri: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  private async getSigningKey(kid: string): Promise<string> {
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      return key.getPublicKey();
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message, kid },
        'Failed to get signing key',
      );
      throw new UnauthorizedException('Unable to verify token');
    }
  }

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.toString().split(' ')?.[1];

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Decode token header to get the key ID (kid)
      const decodedHeader = jwt.decode(token, { complete: true });

      if (!decodedHeader || typeof decodedHeader === 'string') {
        throw new UnauthorizedException('Invalid token format');
      }

      const kid = decodedHeader.header.kid;
      if (!kid) {
        throw new UnauthorizedException('Token missing key ID');
      }

      // Get the public key from Cognito
      const publicKey = await this.getSigningKey(kid);

      // Verify the token
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`,
      }) as any;

      // Extract user info from token
      const email = decoded.email || decoded['cognito:username'];
      const sub = decoded.sub;

      // Attach user to request
      req.user = {
        email,
        userId: sub,
        sub,
        isAdmin: true, // You can add additional checks here based on Cognito groups or custom attributes
      };

      this.logger.info(
        { email, sub, path: req.originalUrl, method: req.method },
        'Token verified successfully',
      );

      next();
    } catch (error) {
      this.logger.error(
        {
          error: (error as Error).message,
          path: req.originalUrl,
          method: req.method,
        },
        'Token verification failed',
      );

      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      } else if (error instanceof UnauthorizedException) {
        throw error;
      } else {
        throw new UnauthorizedException('Token verification failed');
      }
    }
  }
}
