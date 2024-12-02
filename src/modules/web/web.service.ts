import { Injectable } from '@nestjs/common';
import {
  ClientListener,
  Command,
  MediatorClient,
  Notification,
  ReportAction,
} from '../mediator/contract';
import EventEmitter from 'events';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class WebService implements MediatorClient {
  constructor(private sock: NotificationGateway) {}

  private emitter: EventEmitter<{
    command: [Command, number];
    response: [ReportAction, number];
  }> = new EventEmitter();

  public request = (command: Command, userId: number) => {
    this.emitter.emit('command', command, userId);

    return new Promise<{
      action: ReportAction;
      userId: number;
    }>((resolve) =>
      this.emitter.on('response', (action, userId) =>
        resolve({ action, userId }),
      ),
    );
  };

  public on = (f: ClientListener) => {
    this.emitter.on('command', (c, id) => {
      f(id)(c).catch(console.error);
    });
  };

  public respond = (userId: number) => (action: ReportAction) => {
    this.emitter.emit('response', action, userId);
  };

  public notify = (userId: number) => (notification: Notification) => {
    if (notification.type === 'reswap') {
      this.sock.notifyReswap(notification.payload);
    }
  };
}
