import { Controller, Logger } from '@nestjs/common';
import {
  MessagePattern,
  Payload,
  Ctx,
  RmqContext,
} from '@nestjs/microservices';
import type { ConsumeMessage } from 'amqplib';

type RabbitChannel = {
  ack: (message: ConsumeMessage) => void;
  nack: (message: ConsumeMessage, allUpTo?: boolean, requeue?: boolean) => void;
};

function isRabbitChannel(value: unknown): value is RabbitChannel {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const { ack, nack } = candidate;
  return typeof ack === 'function' && typeof nack === 'function';
}

function isConsumeMessage(value: unknown): value is ConsumeMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return 'content' in candidate && Buffer.isBuffer(candidate.content);
}

@Controller()
export class CrmPublishController {
  private readonly logger = new Logger(CrmPublishController.name);
  constructor(/** Add your service class here */) {}

  @MessagePattern(process.env.CONSUME_QUEUE as string)
  async handleMessage(@Payload() data: unknown, @Ctx() context: RmqContext) {
    const channelRef: unknown = context.getChannelRef();
    const originalMsgRef: unknown = context.getMessage();

    if (!isRabbitChannel(channelRef) || !isConsumeMessage(originalMsgRef)) {
      this.logger.error(
        'Received malformed RabbitMQ context; message will not be acknowledged',
      );
      return;
    }

    await this.processMessage(data, channelRef, originalMsgRef);
  }

  private async processMessage(
    data: unknown,
    channel: RabbitChannel,
    message: ConsumeMessage,
  ): Promise<void> {
    this.logger.log(`Received message: ${JSON.stringify(data)}`);

    try {
      await Promise.resolve();
      console.log(data as string); // Replace with actual processing logic
      channel.ack(message);
      this.logger.log('Message processed and acked');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `Message processing failed: ${error.message}`,
        error.stack,
      );
      channel.nack(message, false, false);
    }
  }
}
