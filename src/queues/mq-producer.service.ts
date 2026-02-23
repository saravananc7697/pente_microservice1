import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  AmqpConnectionManager,
  ChannelWrapper,
  connect,
} from 'amqp-connection-manager';
import { Options } from 'amqplib';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class RabbitMqProducerService implements OnModuleInit, OnModuleDestroy {
  private connection?: AmqpConnectionManager;
  private channel?: ChannelWrapper;
  private readonly urls: string[];
  private readonly exchange?: string;
  private readonly queue?: string;

  constructor(private readonly logger: PinoLogger) {
    this.urls = this.extractUrls(process.env.RABBITMQ_URL);
    this.exchange = this.clean(process.env.EXCHANGE);
    this.queue = this.clean(process.env.CONSUME_QUEUE);
  }

  async onModuleInit(): Promise<void> {
    if (!this.urls.length || !this.exchange || !this.queue) {
      this.logger.warn(
        'RabbitMQ producer is not fully configured. Skipping connection setup.',
      );
      return;
    }

    try {
      this.connection = connect(this.urls, {
        heartbeatIntervalInSeconds: 30,
        reconnectTimeInSeconds: 5,
      });

      this.connection.on('connect', () =>
        this.logger.info('RabbitMQ connection established.'),
      );
      this.connection.on('disconnect', ({ err }) =>
        this.logger.error('RabbitMQ connection lost.', err),
      );

      this.channel = this.connection.createChannel({
        json: false,
        setup: async (channel: {
          assertExchange: (
            exchange: string,
            type: string,
            options?: Options.AssertExchange,
          ) => Promise<any>;
          assertQueue: (
            queue: string,
            options?: Options.AssertQueue,
          ) => Promise<any>;
          bindQueue: (
            queue: string,
            source: string,
            pattern: string,
            args?: any,
          ) => Promise<any>;
        }) => {
          await channel.assertExchange(this.exchange as string, 'direct', {
            durable: true,
          });
          await channel.assertQueue(this.queue as string, {
            durable: true,
          });
          await channel.bindQueue(
            this.queue as string,
            this.exchange as string,
            this.queue as string,
          );
        },
      });

      await this.channel.waitForConnect();
      this.logger.info('RabbitMQ channel is ready for publishing.');
    } catch (error) {
      this.logger.error('Failed to initialise RabbitMQ producer.', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch (error) {
      this.logger.error('Failed to close RabbitMQ resources cleanly.', error);
    }
  }

  private extractUrls(value?: string): string[] {
    const cleaned = this.clean(value);
    if (!cleaned) {
      return [];
    }

    return cleaned
      .split(',')
      .map((url) => url.trim())
      .filter((url) => Boolean(url));
  }

  private clean(value?: string): string | undefined {
    if (!value) return value;

    value = value.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.substring(1, value.length - 1);
    }

    if (value.startsWith('"') || value.startsWith("'")) {
      return value.substring(1);
    }

    if (value.endsWith('"') || value.endsWith("'")) {
      return value.substring(0, value.length - 1);
    }

    return value;
  }
}
