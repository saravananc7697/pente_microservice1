import { Module } from '@nestjs/common';
import { LoggerModule as PinoNestLoggerModule, Params } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { buildPinoHttpParams } from './pino-options';
@Module({
  imports: [
    PinoNestLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): Params => {
        return buildPinoHttpParams(config);
      },
    }),
  ],
  exports: [PinoNestLoggerModule],
})
export class LoggerModule {}
