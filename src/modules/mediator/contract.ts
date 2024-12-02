import { SubscriptionSide } from 'src/shared/types';

export type MediatorUserError = {
  type: 'userError';
  message: string;
};

export const userError = (message: string): MediatorUserError => ({
  type: 'userError',
  message,
});

export const isMediatorUserError = (
  error: unknown,
): error is MediatorUserError => (error as any)['type'] === 'userError';

export type MediatorUserFactory = {
  getInstance: (id: number) => MediatorUser;
};

export type MediatorUser = {
  id: number;
  register: (
    name: string,
    chainId: number,
    importKey?: string,
  ) => Promise<string>;
  switchChain: (chainId: number) => Promise<void>;
  getChatId: () => Promise<number>;
  addToken: (token: string) => Promise<string[]>;
  removeToken: (token: string) => Promise<void>;
  balance: () => Promise<
    { symbol: string; balance: bigint; decimals: number }[]
  >;
  follow: (
    address: string,
    side: SubscriptionSide,
    limit: number,
  ) => Promise<void>;
  unfollow: (address: string) => Promise<void>;
  swap: (
    tokenIn: string,
    tokenOut: string,
    amount: number,
    forAddress?: {
      chainId: number;
      privateKey: string;
    },
  ) => Promise<{
    tokenIn: {
      amount: string;
      symbol: string;
    };
    tokenOut: {
      amount: string;
      symbol: string;
    };
    receipt: string;
  }>;
  subscriptions: () => Promise<{ to: string }[]>;
  send: (to: string, amount: number, token: string) => Promise<void>;
};

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
    }
  | { type: 'unknownCommand' };

export type MediatorClient = {
  on: (f: ClientListener) => void;
  respond: (userId: number) => (action: ReportAction) => void;
  notify: (userId: number) => (notification: Notification) => void;
};

export type ClientListener = (
  userId: number,
) => (command: Command) => Promise<void>;

export type ReportAction =
  | { type: 'genericError'; error: string }
  | { type: 'genericSuccess'; message: string };

export type Notification = {
  type: 'reswap';
  payload: ReswapResult;
};

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

export type ReswapSubscriber = (result: ReswapResult) => void;

export type MediatorReswapper = {
  onReswap: (subscriber: ReswapSubscriber) => void;
};
