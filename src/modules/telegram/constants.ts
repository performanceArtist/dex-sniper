const regexDefault = {
  name: '[a-zA-Z0-9-_]+',
  address: '0x[0-9a-fA-F]{40}',
  privateKey: '(0x)[0-9a-fA-F]{64}',
  token: '0x[0-9a-fA-F]{40}',
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
  addToken: new RegExp(`^\/addtoken (${regex.address})$`),
  removeToken: new RegExp(`^\/removetoken (${regex.address})$`),
  balance: new RegExp(`^\/balance$`),
  follow: new RegExp(
    `^\/follow (${regex.address}) (${regex.side}) (${regex.amount})$`,
  ),
  unfollow: new RegExp(`^\/unfollow (${regex.address})$`),
  swap: new RegExp(
    `^\/swap (${regex.token}) (${regex.amount}) (${regex.token})$`,
  ),
  swapWith: new RegExp(
    `^\/swapwith (${regex.token}) (${regex.amount}) (${regex.token}) (${regex.chain}) (${regex.privateKey})$`,
  ),
  subscriptions: new RegExp(`^\/subscriptions$`),
  send: new RegExp(
    `^\/send (${regex.address}) (${regex.amount}) (${regex.token})$`,
  ),
});

export const telegramCommands = getTelegramCommands(regexDefault);
