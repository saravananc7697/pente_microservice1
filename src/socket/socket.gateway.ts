import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { PinoLogger } from 'nestjs-pino';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly logger: PinoLogger) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.info(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.info(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  handleRoomJoin(client: Socket, payload: { room: string } | string) {
    const room =
      typeof payload === 'string'
        ? (JSON.parse(payload) as { room: string }).room
        : payload.room;
    client.join(room);
    this.logger.info(`Client ${client.id} joined room ${room}`);
    this.server.to(room).emit('joined_room', {
      room,
      clientId: client.id,
    });
  }

  @SubscribeMessage('leave_room')
  handleRoomLeave(client: Socket, payload: { room: string } | string) {
    const room =
      typeof payload === 'string'
        ? (JSON.parse(payload) as { room: string }).room
        : payload.room;
    client.leave(room);
    this.logger.info(`Client ${client.id} left room ${room}`);
  }

  handleMessageToRoom(room: string, event: string, message: any) {
    this.server.to(room).emit(event, message);
  }
}
