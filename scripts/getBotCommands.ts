import {
  CommandRegex,
  getTelegramCommands,
} from '../src/modules/telegram/constants';

const regexDescription: CommandRegex = {
  name: '$name',
  address: '$address',
  privateKey: '$privateKey',
  token: '$token symbol',
  amount: '$amount',
  chain: 'BNB|Sepolia|Polygon',
  side: 'buy|sell|any',
};

const telegramCommandsDescription = getTelegramCommands(regexDescription);

const description = Object.values(telegramCommandsDescription).reduce(
  (acc, value) => {
    const [command, ...rest] = String(value).split(' ');
    if (rest.length === 0) {
      return `${acc}\n ${command.slice(4).slice(0, -2)} - No arguments`;
    }
    return `${acc}\n ${command.slice(4)} - ${rest.join(' ').slice(0, -2)}`;
  },
  '',
);

console.log(description);
