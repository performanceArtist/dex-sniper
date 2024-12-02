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
