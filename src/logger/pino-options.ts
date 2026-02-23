import { randomUUID } from 'crypto';
import type { Params } from 'nestjs-pino';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import type { TransportTargetOptions } from 'pino';

export type PinoLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
const VALID_LEVELS: PinoLevel[] = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
];

export const normalizeLevel = (
  raw?: string,
  fallback: PinoLevel = 'info',
): PinoLevel => {
  const v = (raw || '').toLowerCase() as PinoLevel;
  return VALID_LEVELS.includes(v) ? v : fallback;
};

export function buildPinoHttpParams(config: ConfigService): Params {
  const level = normalizeLevel(config.get<string>('LOG_LEVEL'), 'error');

  const appName: string = config.get<string>('APP_NAME') ?? 'app';

  const targets: TransportTargetOptions[] = [];

  // Console / stdout
  targets.push({
    target: 'pino-pretty',
    level,
    options: {
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
      singleLine: true,
      colorize: true,
      levelFirst: true,
      ignore: 'pid,hostname',
      messageFormat: '{msg}',
    },
  });

  return {
    pinoHttp: {
      enabled: true,
      level,

      customLogLevel(_req: Request, res: Response, err?: Error) {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },

      genReqId(req: Request, res: Response): string {
        const headerId =
          (req.headers['x-request-id'] as string) ||
          (req.headers['x-correlation-id'] as string);
        if (headerId) return headerId;
        const id = randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },

      redact: {
        remove: true,
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.*.password',
          'req.body.token',
          'req.body.*.token',
          'req.query.password',
          'req.query.token',
        ],
      },

      customProps() {
        return { app: appName };
      },

      serializers: {
        req(req: Request) {
          return {
            id: (req as Request & { id?: string }).id,
            method: req.method,
            url: req.url,
            ip:
              (req.headers['x-forwarded-for'] as string) ||
              req.socket?.remoteAddress,
          };
        },
        res(res: Response) {
          return { statusCode: res.statusCode };
        },
        err(err: Error) {
          return {
            type: err?.constructor?.name,
            message: err?.message,
            stack: err?.stack,
          };
        },
      },

      transport: { targets },
    },
  };
}
