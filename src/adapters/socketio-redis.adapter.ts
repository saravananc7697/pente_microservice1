/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { INestApplication, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, type RedisClientType } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private pubClient?: RedisClientType;
  private subClient?: RedisClientType;
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(private readonly app: INestApplication) {
    super(app);
  }

  public async connectToRedis(url: string): Promise<void> {
    this.pubClient = createClient({ url });
    this.subClient = this.pubClient.duplicate();

    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    this.logger.log('Connected Redis pub/sub clients and created adapter');
  }

  // Ensure proper typing against Nest’s IoAdapter createIOServer
  override createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, {
      // safe defaults + CORS example, can be customized
      cors: { origin: '*', methods: ['GET', 'POST'] },
      ...options,
    });

    if (!this.adapterConstructor) {
      // Defensive: adapter must be ready before usage
      throw new Error(
        'Redis adapter is not initialized. Call connectToRedis() first.',
      );
    }

    // Attach redis adapter
    server.adapter(this.adapterConstructor);
    return server;
  }

  // Optional clean shutdown
  public async close(): Promise<void> {
    await Promise.allSettled([this.pubClient?.quit(), this.subClient?.quit()]);
  }
}
