import { ConfigService } from 'src/modules/config/config.service';
import {
  ClientListener,
  Command,
  MediatorClient,
  Notification,
  ReportAction,
  ReswapResult,
} from '../mediator/contract';
import { Injectable } from '@nestjs/common';
import { TelegramBot } from 'typescript-telegram-bot-api';
import { ChainId, SubscriptionSide } from 'src/shared/types';
import { telegramCommands } from './constants';

const chains = {
  BNB: ChainId.BNB,
  Sepolia: ChainId.SEPOLIA,
  Polygon: ChainId.POLYGON,
};

const getClientCommand = ({
  key,
  match,
}: {
  key: keyof typeof telegramCommands;
  match: string[];
}): Command => {
  switch (key) {
    case 'register':
      return {
        type: 'register',
        payload: {
          name: match[1],
          chainId: chains[match[2] as keyof typeof chains],
        },
      };
    case 'registerWith':
      return {
        type: 'registerWith',
        payload: {
          name: match[1],
          chainId: chains[match[2] as keyof typeof chains],
          importKey: match[3],
        },
      };
    case 'switchChain':
      return {
        type: 'switchChain',
        payload: {
          chainId: chains[match[1] as keyof typeof chains],
        },
      };
    case 'addToken':
      return {
        type: 'addToken',
        payload: {
          token: match[1],
        },
      };
    case 'removeToken':
      return {
        type: 'removeToken',
        payload: {
          token: match[1],
        },
      };
    case 'balance':
      return {
        type: 'balance',
      };
    case 'follow':
      return {
        type: 'follow',
        payload: {
          address: match[1],
          side: match[2] as SubscriptionSide,
          limit: Number(match[3]),
        },
      };
    case 'unfollow':
      return {
        type: 'unfollow',
        payload: {
          address: match[1],
        },
      };
    case 'swap':
      return {
        type: 'swap',
        payload: {
          tokenIn: match[1],
          tokenOut: match[3],
          amount: Number(match[2]),
        },
      };
    case 'swapWith':
      return {
        type: 'swap',
        payload: {
          tokenIn: match[1],
          tokenOut: match[3],
          amount: Number(match[2]),
          forAddress: {
            privateKey: match[5],
            chainId: chains[match[4] as keyof typeof chains],
          },
        },
      };
    case 'subscriptions':
      return {
        type: 'subscriptions',
      };
    case 'send':
      return {
        type: 'send',
        payload: {
          to: match[1],
          amount: Number(match[2]),
          token: match[3],
        },
      };
    default:
      return { type: 'unknownCommand' };
  }
};

@Injectable()
export class TelegramService implements MediatorClient {
  private bot: TelegramBot;

  constructor(private config: ConfigService) {
    this.bot = new TelegramBot({ botToken: this.config.appConfig.BOT_TOKEN });
    this.bot.startPolling();
  }

  public on = (f: ClientListener) => {
    this.bot.on('message', (message) => {
      const report = f(message.chat.id);
      const text = message.text || '';
      const parsed = Object.entries(telegramCommands).reduce<null | {
        key: keyof typeof telegramCommands;
        match: string[];
      }>((acc, [key, regex]) => {
        if (acc !== null) return acc;
        const match = [...(text.match(regex) || [])];
        if (match.length !== 0) return { key: key as any, match };
        return null;
      }, null);

      if (!parsed) {
        report({ type: 'unknownCommand' });
        return;
      }
      const command = getClientCommand(parsed);
      report(command);
    });
  };

  public respond = (userId: number) => (action: ReportAction) => {
    switch (action.type) {
      case 'genericSuccess':
        this.bot.sendMessage({
          chat_id: userId,
          text: action.message,
        });
        break;
      case 'genericError':
        this.bot.sendMessage({
          chat_id: userId,
          text: `Error: ${action.error}`,
        });
        break;
      default:
        this.bot.sendMessage({
          chat_id: userId,
          text: 'buh',
        });
    }
  };

  public notify = (userId: number) => (notification: Notification) => {
    switch (notification.type) {
      case 'reswap':
        return this.handleReswap(userId, notification.payload);
      default:
        return;
    }
  };

  private handleReswap = (userId: number, result: ReswapResult) => {
    if (result.type === 'success') {
      const { tokenIn, tokenOut } = result;
      this.bot.sendMessage({
        chat_id: userId,
        text: `New reswap(${result.subscription.to}): ${tokenIn.amount} ${tokenIn.symbol} for ${tokenOut.amount} ${tokenOut.symbol}`,
      });
    } else {
      this.bot.sendMessage({
        chat_id: userId,
        text: `Reswap failed(${result.subscription.to}): ${result.message}`,
      });
    }
  };
}
