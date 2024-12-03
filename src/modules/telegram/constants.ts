import { ChainId, SubscriptionSide } from 'src/shared/types';

export type Command =
  | {
      type: 'register';
      payload: {
        name: string;
        chainId: number;
      };
    }
  | {
      type: 'registerWith';
      payload: {
        name: string;
        chainId: number;
        importKey: string;
      };
    }
  | {
      type: 'switchChain';
      payload: {
        chainId: number;
      };
    }
  | {
      type: 'chatId';
    }
  | {
      type: 'addToken';
      payload: {
        token: string;
      };
    }
  | {
      type: 'removeToken';
      payload: {
        token: string;
      };
    }
  | {
      type: 'balance';
    }
  | {
      type: 'follow';
      payload: {
        address: string;
        side: SubscriptionSide;
        limit: number;
      };
    }
  | {
      type: 'unfollow';
      payload: {
        address: string;
      };
    }
  | {
      type: 'swap';
      payload: {
        tokenIn: string;
        tokenOut: string;
        amount: number;
      };
    }
  | {
      type: 'swapWith';
      payload: {
        tokenIn: string;
        tokenOut: string;
        amount: number;
        forAddress?: {
          chainId: number;
          privateKey: string;
        };
      };
    }
  | {
      type: 'subscriptions';
    }
  | {
      type: 'send';
      payload: {
        to: string;
        amount: number;
        token: string;
      };
    };

const regexDefault = {
  name: '[a-zA-Z0-9-_]+',
  address: '0x[0-9a-fA-F]{40}',
  privateKey: '(0x)[0-9a-fA-F]{64}',
  tokenSymbol: '[a-zA-Z ]+',
  amount: '[0-9.]+',
  chain: 'BNB|Sepolia|Polygon',
  side: 'buy|sell|any',
};

export type CommandRegex = typeof regexDefault;

export const getTelegramCommands = (regex: CommandRegex) => ({
  register: new RegExp(`^\/register (${regex.name}) (${regex.chain})$`),
  registerWith: new RegExp(
    `^\/registerwith (${regex.name}) (${regex.chain}) (${regex.privateKey})$`,
  ),
  switchChain: new RegExp(`^\/switch (${regex.chain})$`),
  chatId: new RegExp(`^\/chatid$`),
  addToken: new RegExp(`^\/addtoken (${regex.tokenSymbol})$`),
  removeToken: new RegExp(`^\/removetoken (${regex.tokenSymbol})$`),
  balance: new RegExp(`^\/balance$`),
  follow: new RegExp(
    `^\/follow (${regex.address}) (${regex.side}) (${regex.amount})$`,
  ),
  unfollow: new RegExp(`^\/unfollow (${regex.address})$`),
  swap: new RegExp(
    `^\/swap (${regex.tokenSymbol}) (${regex.amount}) (${regex.tokenSymbol})$`,
  ),
  swapWith: new RegExp(
    `^\/swapwith (${regex.tokenSymbol}) (${regex.amount}) (${regex.tokenSymbol}) (${regex.chain}) (${regex.privateKey})$`,
  ),
  subscriptions: new RegExp(`^\/subscriptions$`),
  send: new RegExp(
    `^\/send (${regex.address}) (${regex.amount}) (${regex.tokenSymbol})$`,
  ),
});

export const telegramCommands = getTelegramCommands(regexDefault);

const chains = {
  BNB: ChainId.BNB,
  Sepolia: ChainId.SEPOLIA,
  Polygon: ChainId.POLYGON,
};

export const getClientCommand = <K extends keyof typeof telegramCommands>({
  key,
  match,
}: {
  key: K;
  match: string[];
}) => {
  switch (key) {
    case 'register':
      return {
        type: 'register',
        payload: {
          name: match[1],
          chainId: chains[match[2] as keyof typeof chains],
        },
      } as Extract<Command, { type: K }>;
    case 'registerWith':
      return {
        type: 'registerWith',
        payload: {
          name: match[1],
          chainId: chains[match[2] as keyof typeof chains],
          importKey: match[3],
        },
      } as Extract<Command, { type: K }>;
    case 'switchChain':
      return {
        type: 'switchChain',
        payload: {
          chainId: chains[match[1] as keyof typeof chains],
        },
      } as Extract<Command, { type: K }>;
    case 'chatId':
      return {
        type: 'chatId',
      } as Extract<Command, { type: K }>;
    case 'addToken':
      return {
        type: 'addToken',
        payload: {
          token: match[1],
        },
      } as Extract<Command, { type: K }>;
    case 'removeToken':
      return {
        type: 'removeToken',
        payload: {
          token: match[1],
        },
      } as Extract<Command, { type: K }>;
    case 'balance':
      return {
        type: 'balance',
      } as Extract<Command, { type: K }>;
    case 'follow':
      return {
        type: 'follow',
        payload: {
          address: match[1],
          side: match[2] as SubscriptionSide,
          limit: Number(match[3]),
        },
      } as Extract<Command, { type: K }>;
    case 'unfollow':
      return {
        type: 'unfollow',
        payload: {
          address: match[1],
        },
      } as Extract<Command, { type: K }>;
    case 'swap':
      return {
        type: 'swap',
        payload: {
          tokenIn: match[1],
          tokenOut: match[3],
          amount: Number(match[2]),
        },
      } as Extract<Command, { type: K }>;
    case 'swapWith':
      return {
        type: 'swapWith',
        payload: {
          tokenIn: match[1],
          tokenOut: match[3],
          amount: Number(match[2]),
          forAddress: {
            privateKey: match[5],
            chainId: chains[match[4] as keyof typeof chains],
          },
        },
      } as Extract<Command, { type: K }>;
    case 'subscriptions':
      return {
        type: 'subscriptions',
      } as Extract<Command, { type: K }>;
    case 'send':
      return {
        type: 'send',
        payload: {
          to: match[1],
          amount: Number(match[2]),
          token: match[3],
        },
      } as Extract<Command, { type: K }>;
    default:
      assertExhaustive(key);
  }
};

const assertExhaustive = (_: never) => {
  throw 'Unhandled switch case';
};

export const getSniperCommand = <K extends Command['type']>(
  key: K,
  text = '',
) => {
  const match = [...(text.match(telegramCommands[key]) || [])];
  if (match.length === 0) return null;

  return (
    getClientCommand({
      key,
      match,
    }) || null
  );
};
