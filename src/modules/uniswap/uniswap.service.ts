import { Inject, Injectable } from '@nestjs/common';
import {
  Contract,
  formatUnits,
  parseEther,
  parseUnits,
  Provider,
  Wallet,
} from 'ethers';
import FACTORY_ABI from './abis/factory.json';
import QUOTER_ABI from './abis/quoter.json';
import SWAP_ROUTER_ABI from './abis/swaprouter.json';
import POOL_ABI from './abis/pool.json';
import ERC20_ABI from './abis/erc20.json';
import { UNISWAP_CONFIG } from './uniswap.module-definition';

type Token = {
  chainId: number;
  address: string;
  decimals: number;
  symbol: string;
};

export type SwapResult = {
  sender: string;
  recipient: string;
  quote: bigint;
  base: bigint;
  sqrtPriceX96: bigint;
  poolAddress: string;
  chainId: number;
};

export type UniswapPool = {
  address: string;
};

export type UniswapConfig = {
  POOL_FACTORY_CONTRACT_ADDRESS: string;
  QUOTER_CONTRACT_ADDRESS: string;
  SWAP_ROUTER_ADDRESS: string;
};

@Injectable()
export class UniswapFactoryService {
  private clients: Record<number, UniswapClient> = {};

  constructor(
    @Inject(UNISWAP_CONFIG) private configs: Record<number, UniswapConfig>,
  ) {}

  public getInstance(provider: Provider, chainId: number) {
    const stored = this.clients[chainId];
    if (stored) return stored;
    const config = this.configs[chainId];
    if (!config) throw `Chain ${chainId} is not supported`;
    const instance = new UniswapClient(provider, config, chainId);
    this.clients[chainId] = instance;
    return instance;
  }

  public getInstances(providers: Record<number, Provider>) {
    Object.entries(providers).forEach(([key, provider]) => {
      this.clients[Number(key)] = this.getInstance(provider, Number(key));
    });
    return this.clients;
  }
}

export class UniswapClient {
  constructor(
    private provider: Provider,
    private config: UniswapConfig,
    private chainId: number,
  ) {}

  private swapSubscribers: ((swapResult: SwapResult) => void)[] = [];

  private listen = (poolAddress: string) => {
    const pairContract = new Contract(poolAddress, POOL_ABI, this.provider);

    pairContract.on(
      'Swap',
      (sender, recipient, amount0, amount1, sqrtPriceX96) => {
        console.log(
          'New swap',
          sender,
          recipient,
          amount0,
          amount1,
          sqrtPriceX96,
        );
        this.swapSubscribers.forEach((subscriber) =>
          subscriber({
            sender,
            recipient,
            quote: amount0,
            base: amount1,
            sqrtPriceX96,
            poolAddress,
            chainId: this.chainId,
          }),
        );
      },
    );
  };

  public listenPoolSwaps = (pools: UniswapPool[]) => {
    pools.forEach((pool) => this.listen(pool.address));
  };

  public listenPoolSwap = (pool: UniswapPool) => {
    this.listen(pool.address);
  };

  public subscribeToAllSwaps = (onSwap: (swapResult: SwapResult) => void) => {
    this.swapSubscribers.push(onSwap);
  };

  public approve = async (token: string, amount: bigint, wallet: Wallet) => {
    try {
      const tokenContract = new Contract(token, ERC20_ABI, wallet);

      const approveTransaction =
        await tokenContract.approve.populateTransaction(
          this.config.SWAP_ROUTER_ADDRESS,
          parseEther(amount.toString()),
        );
      const transactionResponse =
        await wallet.sendTransaction(approveTransaction);
      await transactionResponse.wait();
    } catch (e) {
      console.error(e);
    }
  };

  public getPoolFromTokens = async (
    factoryContract: Contract,
    tokenIn: Token,
    tokenOut: Token,
  ) => {
    const poolAddress = await factoryContract.getPool(
      tokenIn.address,
      tokenOut.address,
      3000,
    );
    if (!poolAddress) {
      throw new Error('Failed to get pool address');
    }

    return this.getPool(poolAddress);
  };

  public getPool = async (address: string) => {
    const poolContract = new Contract(address, POOL_ABI, this.provider);
    const [token0, token1, fee, poolAddress] = await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
      poolContract.getAddress(),
    ]);
    return { poolContract, token0, token1, fee, poolAddress };
  };

  public quoteSwap = async (
    quoterContract: Contract,
    tokenIn: Token,
    tokenOut: Token,
    fee: number,
    signer: Wallet,
    amountIn: bigint,
  ) => {
    const quotedAmountOut =
      await quoterContract.quoteExactInputSingle.staticCall({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        fee: fee,
        recipient: signer.address,
        deadline: Math.floor(new Date().getTime() / 1000 + 60 * 10),
        amountIn: amountIn,
        sqrtPriceLimitX96: 0,
      });
    const amountOut = formatUnits(
      quotedAmountOut[0].toString(),
      tokenOut.decimals,
    );
    return amountOut;
  };

  public prepareSwapParams = async (
    tokenIn: Token,
    tokenOut: Token,
    poolContract: Contract,
    signer: Wallet,
    amountIn: bigint,
    amountOut: bigint,
  ) => {
    return {
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      fee: await poolContract.fee(),
      recipient: signer.address,
      amountIn: amountIn,
      amountOutMinimum: amountOut,
      sqrtPriceLimitX96: 0,
    };
  };

  public executeSwap = async (
    swapRouter: Contract,
    params: any,
    signer: Wallet,
  ) => {
    const transaction =
      await swapRouter.exactInputSingle.populateTransaction(params);
    const receipt = await signer.sendTransaction(transaction);
    return receipt.hash;
  };

  public getFactoryContract = () => {
    return new Contract(
      this.config.POOL_FACTORY_CONTRACT_ADDRESS,
      FACTORY_ABI,
      this.provider,
    );
  };

  public doSwap = async (
    signer: Wallet,
    tokenIn: Token,
    tokenOut: Token,
    swapAmount: number,
    poolAddress?: string,
  ) => {
    const inputAmount = swapAmount;
    const amountIn = parseUnits(inputAmount.toString(), tokenIn.decimals);
    const factoryContract = this.getFactoryContract();

    await this.approve(tokenIn.address, amountIn, signer);
    const getPool = () =>
      poolAddress
        ? this.getPool(poolAddress)
        : this.getPoolFromTokens(factoryContract, tokenIn, tokenOut);

    const { poolContract, fee } = await getPool();

    const quoterContract = new Contract(
      this.config.QUOTER_CONTRACT_ADDRESS,
      QUOTER_ABI,
      this.provider,
    );
    const quotedAmountOut = await this.quoteSwap(
      quoterContract,
      tokenIn,
      tokenOut,
      fee,
      signer,
      amountIn,
    );
    const params = await this.prepareSwapParams(
      tokenIn,
      tokenOut,
      poolContract,
      signer,
      amountIn,
      (quotedAmountOut as any)[0].toString(),
    );
    const swapRouter = new Contract(
      this.config.SWAP_ROUTER_ADDRESS,
      SWAP_ROUTER_ABI,
      signer,
    );
    const receipt = await this.executeSwap(swapRouter, params, signer);

    return {
      tokenIn: {
        amount: String(swapAmount),
        symbol: tokenIn.symbol,
      },
      tokenOut: {
        amount: quotedAmountOut,
        symbol: tokenOut.symbol,
      },
      receipt,
    };
  };
}
