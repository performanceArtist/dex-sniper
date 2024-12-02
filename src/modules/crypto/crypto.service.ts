import { Inject, Injectable } from '@nestjs/common';
import {
  Contract,
  formatUnits,
  JsonRpcProvider,
  parseUnits,
  Provider,
  Wallet,
  WebSocketProvider,
} from 'ethers';
import ERC20_ABI from './abis/erc20.json';
import { CRYPTO_CONFIG } from './crypto.module-definition';

export type CryptoConfig = {
  chainId: number;
  rpc: string;
  type?: 'http' | 'websocket';
};

@Injectable()
export class CryptoFactoryService {
  constructor(
    @Inject(CRYPTO_CONFIG) private configs: Record<number, CryptoConfig>,
  ) {}

  private providers: Record<number, CryptoProvider> = {};

  public getInstance = (chainId: number) => {
    const stored = this.providers[chainId];
    if (stored) return stored;

    const config = this.configs[chainId];
    if (!config) throw 'No config found';
    const provider =
      config.type === 'websocket'
        ? new WebSocketProvider(config.rpc, config.chainId)
        : new JsonRpcProvider(config.rpc, config.chainId);
    const instance = new CryptoProvider(provider);
    this.providers[chainId] = instance;
    return instance;
  };

  public getInstances = () => {
    Object.entries(this.configs).forEach(([key]) => {
      this.getInstance(Number(key));
    });
    return this.providers;
  };
}

export class CryptoProvider {
  constructor(private provider: Provider) {}

  public getProvider = () => {
    return this.provider;
  };

  public getWallet = (privateKey: string) => {
    return new Wallet(privateKey, this.provider);
  };

  public createWallet = () => {
    const nodeWallet = Wallet.createRandom(this.provider);

    return {
      nodeWallet,
      privateKey: nodeWallet.privateKey,
      wallet: new Wallet(nodeWallet.privateKey, this.provider),
    };
  };

  public getBalance = async (
    address: string,
    token: string,
  ): Promise<bigint> => {
    const tokenContract = new Contract(token, ERC20_ABI, this.provider);
    return tokenContract.balanceOf(address);
  };

  public send = async (
    wallet: Wallet,
    to: string,
    token: {
      address: string;
      symbol: string;
      decimals: number;
    },
    amount: number,
  ) => {
    const balance = await this.getBalance(wallet.address, token.address);
    const requiredBalance = parseUnits(amount.toString(), token.decimals);
    if (balance < requiredBalance)
      throw `Insufficients funds: ${amount} ${token.symbol} required, ${formatUnits(balance, token.decimals)} available`;
    const tokenContract = new Contract(token.address, ERC20_ABI, wallet);
    const tx = await tokenContract.transfer(
      to,
      parseUnits(amount.toString(), token.decimals),
    );
    await tx.wait();
  };
}
