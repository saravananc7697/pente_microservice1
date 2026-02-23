import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
// import { RedisIoAdapter } from './adapters/socketio-redis.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useLogger(app.get(Logger));

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      callback(null, !!origin);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Credentials',
    ],
  });
  app.setGlobalPrefix('api');

  // const redisUrl =
  //   process.env.REDIS_URL ?? 'redis://localhost:6379';
  // const redisAdapter = new RedisIoAdapter(app);
  // await redisAdapter.connectToRedis(redisUrl);
  // app.useWebSocketAdapter(redisAdapter);

  const config = new DocumentBuilder()
    .setTitle('Pente AI API Documentation')
    .setDescription('API documentation for Pente AI backend')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'jwt',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Pente AI API Docs',
  });

  await app.listen(Number(process.env.PORT) || 8080, '0.0.0.0');
}
bootstrap();
