import { Injectable } from '@nestjs/common';
import { formatUnits, Provider } from 'ethers';
import { CryptoFactoryService } from 'src/modules/crypto/crypto.service';
import {
  SwapResult,
  UniswapFactoryService,
} from 'src/modules/uniswap/uniswap.service';
import { RepositoryService } from '../repository/repository.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type ReswapResult =
  | {
      type: 'success';
      userId: number;
      tokenIn: {
        amount: string;
        symbol: string;
      };
      tokenOut: {
        amount: string;
        symbol: string;
      };
      receipt: string;
      subscription: {
        to: string;
      };
    }
  | {
      type: 'error';
      userId: number;
      message: string;
      subscription: {
        to: string;
      };
    };

@Injectable()
export class SubscriptionService {
  constructor(
    private repository: RepositoryService,
    private cryptoFactory: CryptoFactoryService,
    private uniswapFactory: UniswapFactoryService,
    private eventEmitter: EventEmitter2,
  ) {
    this.initSwapSubscriptions()
      .then(() => console.log('Swap subscriptions initialized'))
      .catch(console.error);
  }

  private async initSwapSubscriptions() {
    const cryptoClients = this.cryptoFactory.getInstances();
    const providers = Object.entries(cryptoClients).reduce<
      Record<number, Provider>
    >(
      (acc, [key, value]) => ({ ...acc, [Number(key)]: value.getProvider() }),
      {},
    );
    const uniswapClients = this.uniswapFactory.getInstances(providers);
    const pools = await this.repository.pool.find();
    if (!pools) throw 'No pools available';
    pools.forEach((pool) =>
      uniswapClients[pool.chainId].listenPoolSwap({ address: pool.address }),
    );
    Object.values(uniswapClients).forEach((uniswap) =>
      uniswap.subscribeToAllSwaps((swap) =>
        this.reswap(swap).catch(console.error),
      ),
    );
  }

  private reswap = async (swap: SwapResult) => {
    console.log('Reswap', swap);
    const side = swap.base > 0n ? 'base' : 'quote';
    const subscription = await this.repository.subscription.findOne({
      relations: {
        user: true,
      },
      where: {
        to: swap.recipient,
      },
    });
    if (!subscription) return;
    if (subscription.user.chainId !== swap.chainId) return;
    if (side === 'base' && subscription.side === 'buy')
      return this.notify({
        type: 'error',
        userId: subscription.user.chatId,
        message: `Swap sells, subscription is buy only`,
        subscription: {
          to: subscription.to,
        },
      });
    if (side === 'quote' && subscription.side === 'sell')
      return this.notify({
        type: 'error',
        userId: subscription.user.chatId,
        message: 'Swap buys, subscription is sell only',
        subscription: {
          to: subscription.to,
        },
      });
    const pool = await this.repository.pool.findOne({
      where: {
        address: swap.poolAddress,
      },
      relations: {
        base: true,
        quote: true,
      },
    });
    if (!pool) return;

    const crypto = this.cryptoFactory.getInstance(subscription.user.chainId);
    const uniswap = this.uniswapFactory.getInstance(
      crypto.getProvider(),
      subscription.user.chainId,
    );
    const tokenIn = side === 'base' ? pool.base : pool.quote;
    const balance = await crypto.getBalance(
      subscription.user.address,
      tokenIn.address,
    );
    const requiredBalance = side === 'base' ? swap.base : swap.quote;
    if (balance < requiredBalance)
      return this.notify({
        type: 'error',
        userId: subscription.user.chatId,
        message: `Insufficients funds: ${formatUnits(requiredBalance, tokenIn.decimals)} ${tokenIn.symbol} required, ${formatUnits(balance, tokenIn.decimals)} available`,
        subscription: {
          to: subscription.to,
        },
      });

    const reswapWallet = crypto.getWallet(subscription.user.privateKey);
    const reTokenIn = side === 'base' ? pool.base : pool.quote;
    const reTokenOut = side === 'quote' ? pool.base : pool.quote;
    const decimals = side === 'base' ? reTokenIn.decimals : reTokenOut.decimals;
    const amount = Number(
      formatUnits(side === 'base' ? swap.base : swap.quote, decimals),
    );
    if (subscription.limit !== 0 && amount > subscription.limit)
      return this.notify({
        type: 'error',
        userId: subscription.user.chatId,
        message: `Swap exceeded limit of ${subscription.limit}`,
        subscription: {
          to: subscription.to,
        },
      });

    console.log(
      'Reswap arguments',
      reswapWallet,
      reTokenIn,
      reTokenOut,
      amount,
      swap.poolAddress,
    );
    const swapResult = await uniswap.doSwap(
      reswapWallet,
      reTokenIn,
      reTokenOut,
      amount,
      swap.poolAddress,
    );

    this.notify({
      type: 'success',
      userId: subscription.user.chatId,
      ...swapResult,
      subscription: {
        to: subscription.to,
      },
    });
  };

  private notify(result: ReswapResult) {
    this.eventEmitter.emit('reswap', result);
  }
}
