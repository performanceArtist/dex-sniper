import { Injectable } from '@nestjs/common';
import { FindOneOptions } from 'typeorm';
import { SubscriptionSide } from 'src/shared/types';
import { UniswapFactoryService } from 'src/modules/uniswap/uniswap.service';
import { CryptoFactoryService } from 'src/modules/crypto/crypto.service';
import { RepositoryService } from '../repository/repository.service';
import {
  SubscriptionEntity,
  TokenEntity,
  UserEntity,
} from '../repository/model';

export const MAX_TOKENS = 5;

export type UserError = {
  type: 'userError';
  message: string;
};

export const userError = (message: string): UserError => ({
  type: 'userError',
  message,
});

export const isUserError = (
  error: unknown,
): error is UserError => (error as any)['type'] === 'userError';

@Injectable()
export class UserService {
  constructor(
    public repository: RepositoryService,
    public cryptoFactory: CryptoFactoryService,
    public uniswapFactory: UniswapFactoryService,
  ) {}

  public getInstance = (id: number) =>  new User(id, this);
}

export class User {
  constructor(
    public id: number,
    private factory: UserService,
  ) {}

  private getUser = async (
    relations: FindOneOptions<UserEntity>['relations'] = {},
  ) => {
    const user = await this.factory.repository.user.findOne({
      where: {
        chatId: this.id,
      },
      relations,
    });
    if (!user) throw userError('User not found');
    return user;
  };

  public register = async (
    name: string,
    chainId: number,
    importKey?: string,
  ) => {
    const exists = await this.factory.repository.user.exists({
      where: {
        chatId: this.id,
      },
    });
    if (exists) {
      throw userError('User registered');
    }
    const crypto = this.factory.cryptoFactory.getInstance(chainId);
    const { address, privateKey } = (() => {
      if (importKey) {
        const wallet = crypto.getWallet(importKey);
        return { address: wallet.address, privateKey: importKey };
      } else {
        const { privateKey, wallet } = crypto.createWallet();
        return { privateKey, address: wallet.address };
      }
    })();

    await this.factory.repository.user.insert({
      name,
      chatId: this.id,
      privateKey,
      address,
      chainId,
    });

    return address;
  };

  public switchChain = async (chainId: number) => {
    const user = await this.getUser();
    user.chainId = chainId;
    user.save();
  };

  public getChatId = async () => {
    const user = await this.getUser();
    return user.chatId;
  };

  public addToken = async (token: string) => {
    const user = await this.getUser({
      tokens: true,
    });
    const supported = await this.factory.repository.token.findOne({
      where: {
        symbol: token,
        chainId: user.chainId,
      },
    });
    if (!supported) throw userError(`Token not found`);

    if (
      user.tokens.filter((token) => token.chainId === user.chainId).length >=
      MAX_TOKENS
    )
      throw userError(`Max ${MAX_TOKENS} tokens for each chain`);

    if (user.tokens.find((token) => supported.id === token.id))
      throw userError('Token already added');

    const newToken = new TokenEntity();
    newToken.id = supported.id;
    user.tokens = [...user.tokens, newToken];
    await user.save();

    return user.tokens
      .filter((token) => token.chainId === user.chainId)
      .map((token) => token.symbol)
      .concat(supported.symbol);
  };

  public removeToken = async (token: string) => {
    const user = await this.getUser({
      tokens: true,
    });
    const supported = await this.factory.repository.token.findOne({
      where: {
        symbol: token,
        chainId: user.chainId,
      },
    });
    if (!supported) throw userError(`Token not found`);

    if (!user.tokens.find((token) => supported.id === token.id))
      throw userError('No token present to remove');

    user.tokens = user.tokens.filter(({ symbol }) => symbol !== token);
    await user.save();
  };

  public balance = async () => {
    const user = await this.getUser({
      tokens: true,
    });
    const crypto = this.factory.cryptoFactory.getInstance(user.chainId);
    const wallet = crypto.getWallet(user.privateKey);
    const tokens = user.tokens.filter(
      (token) => token.chainId === user.chainId,
    );
    const balances = await Promise.all(
      tokens.map(({ address, symbol, decimals }) =>
        crypto.getBalance(wallet.address, address).then((balance) => ({
          balance,
          symbol,
          decimals,
        })),
      ),
    );

    return balances;
  };

  public follow = async (
    address: string,
    side: SubscriptionSide,
    limit: number,
  ) => {
    const user = await this.getUser({
      subscriptions: true,
    });
    const existingSubscription = user.subscriptions.find(
      (s) => s.to === address,
    );

    if (existingSubscription) {
      existingSubscription.side = side;
      existingSubscription.limit = limit;
      await existingSubscription.save();
    } else {
      const subscription = new SubscriptionEntity();
      subscription.to = address;
      subscription.side = side;
      subscription.limit = limit;
      subscription.user = user;
      user.subscriptions = [...user.subscriptions, subscription];
      await subscription.save();
      await user.save();
    }
  };

  public unfollow = async (address: string) => {
    const user = await this.getUser({
      subscriptions: true,
    });
    const subscription = user.subscriptions.find((s) => s.to === address)
    if (!subscription)
      throw userError('Subscription not found');
    await subscription.remove()
  };

  public swap = async (
    tokenInSymbol: string,
    tokenOutSymbol: string,
    amount: number,
    forAddress?: {
      privateKey: string;
      chainId: number;
    },
  ) => {
    const user = await this.getUser({
      tokens: true,
    });
    const chainId = forAddress ? forAddress.chainId : user.chainId;
    const privateKey = forAddress ? forAddress.privateKey : user.privateKey;

    const tokenIn = user.tokens.find(
      (token) => token.symbol === tokenInSymbol && token.chainId === chainId,
    );
    const tokenOut = user.tokens.find(
      (token) => token.symbol === tokenOutSymbol && token.chainId === chainId,
    );
    if (!tokenIn) throw userError(`${tokenInSymbol} token not found`);
    if (!tokenOut) throw userError(`${tokenOutSymbol} token not found`);
    const crypto = this.factory.cryptoFactory.getInstance(chainId);
    const wallet = crypto.getWallet(privateKey);
    const uniswap = this.factory.uniswapFactory.getInstance(
      crypto.getProvider(),
      chainId,
    );
    const pool1 = await this.factory.repository.pool.findOne({
      where: {
        base: tokenIn,
        quote: tokenOut,
        chainId,
      },
    });
    const pool2 = await this.factory.repository.pool.findOne({
      where: {
        base: tokenOut,
        quote: tokenIn,
        chainId,
      },
    });
    const pool = pool1 || pool2;
    if (!pool) throw userError('No pool found');

    const result = await uniswap.doSwap(
      wallet,
      tokenIn,
      tokenOut,
      amount,
      pool.address,
    );
    return result;
  };

  public subscriptions = async () => {
    const user = await this.getUser({
      subscriptions: true,
    });
    return user.subscriptions;
  };

  public send = async (to: string, amount: number, token: string) => {
    const user = await this.getUser({
      tokens: true,
    });
    const supported = await this.factory.repository.token.findOne({
      where: {
        symbol: token,
        chainId: user.chainId,
      },
    });
    if (!supported) throw userError(`Token not found`);
    if (!user.tokens.find((t) => t.symbol === token))
      throw userError(`Add token to your tokens to send`);

    const crypto = this.factory.cryptoFactory.getInstance(user.chainId);
    const wallet = crypto.getWallet(user.privateKey);

    return crypto.send(wallet, to, supported, amount);
  };
}
