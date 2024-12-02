import { Inject, Injectable } from '@nestjs/common';
import {
  Command,
  isMediatorUserError,
  MediatorClient,
  MediatorReswapper,
  MediatorUser,
  MediatorUserFactory,
  ReportAction,
  ReswapResult,
} from './contract';
import { formatUnits } from 'ethers';
import { MEDIATOR_CONFIG } from './mediator.module-definition';

export type MediatorConfig = {
  userFactory: MediatorUserFactory;
  clients: MediatorClient[];
  reswapper: MediatorReswapper;
};

@Injectable()
export class MediatorService {
  constructor(@Inject(MEDIATOR_CONFIG) private config: MediatorConfig) {
    this.config.clients.forEach((c, i) => c.on(this.requestHandler(i)));
    this.config.reswapper.onReswap(this.reswapHandler);
  }

  private requestHandler =
    (clientIndex: number) => (userId: number) => async (command: Command) => {
      const user = this.config.userFactory.getInstance(userId);
      const respond = this.config.clients[clientIndex].respond(userId);

      try {
        if (!user) {
          respond({ type: 'genericError', error: 'User not found' });
          return;
        }

        console.log('command', command);

        const response = await this.getResponse(command, user);
        respond(response);
      } catch (e) {
        if (isMediatorUserError(e)) {
          respond({ type: 'genericError', error: e.message });
        } else {
          console.error(e);
          respond({ type: 'genericError', error: 'Internal error' });
        }
      }
    };

  private async getResponse(
    command: Command,
    user: MediatorUser,
  ): Promise<ReportAction> {
    switch (command.type) {
      case 'register':
        const address = await user.register(
          command.payload.name,
          command.payload.chainId,
        );
        return {
          type: 'genericSuccess',
          message: `Registered, address: ${address}`,
        };

      case 'registerWith':
        const importedAddress = await user.register(
          command.payload.name,
          command.payload.chainId,
          command.payload.importKey,
        );
        return {
          type: 'genericSuccess',
          message: `Registered, address: ${importedAddress}`,
        };

      case 'switchChain':
        await user.switchChain(command.payload.chainId);
        return {
          type: 'genericSuccess',
          message: `Switch ok`,
        };

      case 'chatId':
        const chatId = await user.getChatId();
        return {
          type: 'genericSuccess',
          message: `Your chat id: ${chatId}`,
        };

      case 'addToken':
        const token = command.payload.token;
        const tokens = await user.addToken(token);
        return {
          type: 'genericSuccess',
          message: `Added token successfully, available tokens: ${tokens.join(' ')}`,
        };

      case 'removeToken':
        await user.removeToken(command.payload.token);
        return {
          type: 'genericSuccess',
          message: `Removed token successfully`,
        };

      case 'balance':
        const balances = await user.balance();
        const response = balances.reduce(
          (acc, { symbol, balance, decimals }) =>
            `${acc}${acc === '' ? '' : '\n'}${symbol}: ${formatUnits(balance, decimals)}`,
          '',
        );
        return {
          type: 'genericSuccess',
          message: balances.length === 0 ? 'No tokens' : response,
        };

      case 'follow':
        await user.follow(
          command.payload.address,
          command.payload.side,
          command.payload.limit,
        );
        return {
          type: 'genericSuccess',
          message: 'Follow ok',
        };

      case 'unfollow':
        await user.unfollow(command.payload.address);
        return {
          type: 'genericSuccess',
          message: 'Unfollow ok',
        };

      case 'swap':
        const { tokenIn, tokenOut } = await user.swap(
          command.payload.tokenIn,
          command.payload.tokenOut,
          command.payload.amount,
          command.payload.forAddress,
        );
        return {
          type: 'genericSuccess',
          message: `Swap success: ${tokenIn.amount} ${tokenIn.symbol} for ${tokenOut.amount} ${tokenOut.symbol}`,
        };

      case 'subscriptions':
        const subscriptions = await user.subscriptions();
        return {
          type: 'genericSuccess',
          message:
            subscriptions.length === 0
              ? 'No subscriptions'
              : subscriptions.map((s) => JSON.stringify(s)).join('\n'),
        };

      case 'send':
        await user.send(
          command.payload.to,
          command.payload.amount,
          command.payload.token,
        );
        return {
          type: 'genericSuccess',
          message: 'Send ok',
        };

      case 'unknownCommand':
        return {
          type: 'genericError',
          error: 'huh?',
        };

      default:
        return {
          type: 'genericSuccess',
          message: 'buh',
        };
    }
  }

  private reswapHandler = (result: ReswapResult) => {
    this.config.clients.forEach((c) =>
      c.notify(result.userId)({
        type: 'reswap',
        payload: result,
      }),
    );
  };
}
