import { Injectable } from '@nestjs/common';
import {
  userError as error,
  MediatorUser,
  MediatorUserFactory,
} from '../mediator/contract';
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

@Injectable()
export class UserService implements MediatorUserFactory {
  constructor(
    public repository: RepositoryService,
    public cryptoFactory: CryptoFactoryService,
    public uniswapFactory: UniswapFactoryService,
  ) {}

  private users: MediatorUser[] = [];

  public getInstance = (id: number) => {
    const stored = this.users.find((user) => user.id === id);
    if (!stored) {
      const newUser = this.createInstance(id);
      this.users.push(newUser);
      return newUser;
    } else {
      return stored;
    }
  };

  private createInstance = (id: number) => new User(id, this);
}

class User implements MediatorUser {
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
    if (!user) throw error('User not found');
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
      throw error('User registered');
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
    if (!supported) throw error(`Token not found`);

    if (
      user.tokens.filter((token) => token.chainId === user.chainId).length >=
      MAX_TOKENS
    )
      throw error(`Max ${MAX_TOKENS} tokens for each chain`);

    if (user.tokens.find((token) => supported.id === token.id))
      throw error('Token already added');

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
    if (!supported) throw error(`Token not found`);

    if (!user.tokens.find((token) => supported.id === token.id))
      throw error('No token present to remove');

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
    if (!user.subscriptions.find((s) => s.to === address))
      throw error('Subscription not found');
    user.subscriptions = user.subscriptions.filter((s) => s.to !== address);
    await user.save();
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
    if (!tokenIn) throw error(`${tokenInSymbol} token not found`);
    if (!tokenOut) throw error(`${tokenOutSymbol} token not found`);
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
    if (!pool) throw error('No pool found');

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
    const supported = await this.factory.repository.token.findOne({
      where: {
        symbol: token,
      },
    });
    if (!supported) throw error(`Token not found`);
    const user = await this.getUser();
    const crypto = this.factory.cryptoFactory.getInstance(user.chainId);
    const wallet = crypto.getWallet(user.privateKey);

    return crypto.send(wallet, to, supported, amount);
  };
}
