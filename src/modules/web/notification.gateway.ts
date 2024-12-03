import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { ReswapResult } from '../subscription/subscription.service';

@WebSocketGateway()
export class NotificationGateway
  implements
    OnGatewayInit<Server>,
    OnGatewayConnection<Socket>,
    OnGatewayDisconnect<Socket>
{
  constructor() {}

  @WebSocketServer() wss: Server;

  afterInit(server: Server) {
    console.log('init socket.io');
  }

  handleConnection(client: Socket) {}

  handleDisconnect(client: Socket) {}

  private users: Record<number, Socket> = {};

  @SubscribeMessage('reswapSubscribe')
  handleSubscribe(client: Socket, data: unknown) {
    const id = Number(data);
    if (Number.isNaN(id)) client.emit('reswap', 'Invalid id');
    this.users[id] = client;
    client.emit('reswap', 'Subscribed successfully');
    console.log('New user:', id);
  }

  @SubscribeMessage('reswapUnsubscribe')
  handleUnsubscribe(client: Socket, data: unknown) {
    const id = Number(data);
    if (Number.isNaN(id)) client.emit('reswap', 'Invalid id');
    delete this.users[id];
    client.emit('reswap', 'Unsubscribed successfully');
  }

  @OnEvent('reswap')
  onReswap(result: ReswapResult) {
    const client = this.users[result.userId];

    if (client) {
      if (result.type === 'success') {
        const { tokenIn, tokenOut } = result;
        client.emit(
          'reswap',
          `New reswap(${result.subscription.to}): ${tokenIn.amount} ${tokenIn.symbol} for ${tokenOut.amount} ${tokenOut.symbol}`,
        );
      } else {
        client.emit(
          'reswap',
          `Reswap failed(${result.subscription.to}): ${result.message}`,
        );
      }
    }
  }
}
