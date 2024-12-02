import { request } from 'graphql-request';
import { ChainId } from '../src/shared/types';

type ChainGraph = {
  chainId: number;
  graphId: string;
};

const chains: ChainGraph[] = [
  {
    chainId: ChainId.SEPOLIA,
    graphId: 'B4QeFHkfWXjKCDzNn3BJtDRDfG6VeHzGXgkf4Jt3fRn5',
  },
  {
    chainId: ChainId.BNB,
    graphId: 'F85MNzUGYqgSHSHRGgeVMNsdnW1KtZSVgFULumXRZTw2',
  },
  {
    chainId: ChainId.POLYGON,
    graphId: 'EsLGwxyeMMeJuhqWvuLmJEiDKXJ4Z6YsoJreUnyeozco',
  },
];

const query = `{
  pools(first:10, skip:0){
    id
    token0 {
      id
      symbol
      decimals
    }
    token1 {
      id
      symbol
      decimals
    }
  }
}`;

export type UniswapToken = {
  id: string;
  symbol: string;
  decimals: string;
};

export type UniswapPool = {
  id: string;
  token0: UniswapToken;
  token1: UniswapToken;
};

export type UniswapPoolData = {
  pools: UniswapPool[];
  tokens: Record<string, UniswapToken>;
  chainId: number;
};

export const getPools = async (apiKey: string) => {
  const endpoints = chains.map((c) => ({
    ...c,
    url: `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${c.graphId}`,
  }));

  try {
    const pools = await Promise.all(endpoints.map(getChainPools));
    return pools;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

const getChainPools = async (
  params: Pick<ChainGraph, 'chainId'> & { url: string },
): Promise<UniswapPoolData> => {
  const data = await request(params.url, query);
  const pools: UniswapPool[] = (data as any).pools;
  const tokens: Record<string, UniswapToken> = {};
  pools.forEach(({ token0, token1 }) => {
    tokens[token0.id] = token0;
    tokens[token1.id] = token1;
  });

  return { pools, tokens, chainId: params.chainId };
};
