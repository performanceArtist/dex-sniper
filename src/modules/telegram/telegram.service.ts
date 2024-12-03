import { Update, Ctx, Command, InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { Command as SniperCommand, getSniperCommand } from './constants';
import { isUserError, User, UserService } from '../user/user.service';
import { formatUnits } from 'ethers';
import { OnEvent } from '@nestjs/event-emitter';
import { ReswapResult } from '../subscription/subscription.service';

@Update()
export class TelegramService {
  constructor(
    private userFactory: UserService,
    @InjectBot() private bot: Telegraf,
  ) {}

  private handle = async <K extends SniperCommand['type']>(
    key: K,
    ctx: Context,
    handler: (
      arg: {
        user: User;
      } & Extract<SniperCommand, { type: K }>,
    ) => Promise<void>,
  ) => {
    try {
      const command = getSniperCommand(key, ctx.text);
      if (!command) throw { type: 'parseError' };
      const id = ctx.message?.chat.id;
      if (!id) throw 'No id';
      const user = this.userFactory.getInstance(id);
      await handler({ user, ...command });
    } catch (e) {
      this.handleError(e, ctx);
    }
  };

  private handleError(e: unknown, ctx: Context) {
    if (isUserError(e)) {
      ctx.reply(e.message);
    } else if ((e as any).type === 'parseError') {
      ctx.reply('Invalid arguments');
    } else {
      console.error(e);
      ctx.reply('Internal error');
    }
  }

  @Command('register')
  register(@Ctx() ctx: Context) {
    this.handle(
      'register',
      ctx,
      async ({ user, payload: { name, chainId } }) => {
        const address = await user.register(name, chainId);
        await ctx.reply(`Registered, address: ${address}`);
      },
    );
  }

  @Command('registerwith')
  registerWith(@Ctx() ctx: Context) {
    this.handle(
      'registerWith',
      ctx,
      async ({ user, payload: { name, chainId, importKey } }) => {
        const address = await user.register(name, chainId, importKey);
        await ctx.reply(`Registered, address: ${address}`);
      },
    );
  }

  @Command('switch')
  switchChain(@Ctx() ctx: Context) {
    this.handle('switchChain', ctx, async ({ user, payload: { chainId } }) => {
      await user.switchChain(chainId);
      await ctx.reply(`Switch ok`);
    });
  }

  @Command('chatid')
  chatId(@Ctx() ctx: Context) {
    this.handle('chatId', ctx, async ({ user }) => {
      const id = await user.getChatId();
      await ctx.reply(`Your chat id: ${id}`);
    });
  }

  @Command('addtoken')
  addToken(@Ctx() ctx: Context) {
    this.handle('addToken', ctx, async ({ user, payload: { token } }) => {
      const tokens = await user.addToken(token);
      await ctx.reply(
        `Added token successfully, available tokens: ${tokens.join(' ')}`,
      );
    });
  }

  @Command('removetoken')
  removeToken(@Ctx() ctx: Context) {
    this.handle('removeToken', ctx, async ({ user, payload: { token } }) => {
      await user.removeToken(token);
      await ctx.reply(`Removed token successfully`);
    });
  }

  @Command('balance')
  balance(@Ctx() ctx: Context) {
    this.handle('balance', ctx, async ({ user }) => {
      const balances = await user.balance();
      const response = balances.reduce(
        (acc, { symbol, balance, decimals }) =>
          `${acc}${acc === '' ? '' : '\n'}${symbol}: ${formatUnits(balance, decimals)}`,
        '',
      );
      await ctx.reply(balances.length === 0 ? 'No tokens' : response);
    });
  }

  @Command('follow')
  follow(@Ctx() ctx: Context) {
    this.handle(
      'follow',
      ctx,
      async ({ user, payload: { address, side, limit } }) => {
        await user.follow(address, side, limit);
        await ctx.reply('Follow ok');
      },
    );
  }

  @Command('unfollow')
  unfollow(@Ctx() ctx: Context) {
    this.handle('unfollow', ctx, async ({ user, payload: { address } }) => {
      await user.unfollow(address);
      await ctx.reply('Unfollow ok');
    });
  }

  @Command('swap')
  async swap(@Ctx() ctx: Context) {
    this.handle(
      'swap',
      ctx,
      async ({ user, payload: { tokenIn, tokenOut, amount } }) => {
        const swap = await user.swap(tokenIn, tokenOut, amount);
        await ctx.reply(
          `Swap success: ${swap.tokenIn.amount} ${swap.tokenIn.symbol} for ${swap.tokenOut.amount} ${swap.tokenOut.symbol}`,
        );
      },
    );
  }

  @Command('swapwith')
  async swapWith(@Ctx() ctx: Context) {
    this.handle(
      'swapWith',
      ctx,
      async ({ user, payload: { tokenIn, tokenOut, amount, forAddress } }) => {
        const swap = await user.swap(tokenIn, tokenOut, amount, forAddress);
        await ctx.reply(
          `Swap success: ${swap.tokenIn.amount} ${swap.tokenIn.symbol} for ${swap.tokenOut.amount} ${swap.tokenOut.symbol}`,
        );
      },
    );
  }

  @Command('subscriptions')
  subscriptions(@Ctx() ctx: Context) {
    this.handle('subscriptions', ctx, async ({ user }) => {
      const subscriptions = await user.subscriptions();
      const response =
        subscriptions.length === 0
          ? 'No subscriptions'
          : subscriptions.map((s) => JSON.stringify(s)).join('\n');
      await ctx.reply(response);
    });
  }

  @Command('send')
  send(@Ctx() ctx: Context) {
    this.handle(
      'send',
      ctx,
      async ({ user, payload: { to, amount, token } }) => {
        await user.send(to, amount, token);
        await ctx.reply('Send ok');
      },
    );
  }

  @OnEvent('reswap')
  handleReswap(result: ReswapResult) {
    if (result.type === 'success') {
      const { tokenIn, tokenOut } = result;

      this.bot.telegram.sendMessage(
        result.userId,
        `New reswap(${result.subscription.to}): ${tokenIn.amount} ${tokenIn.symbol} for ${tokenOut.amount} ${tokenOut.symbol}`,
      );
    } else {
      this.bot.telegram.sendMessage(
        result.userId,
        `Reswap failed(${result.subscription.to}): ${result.message}`,
      );
    }
  }
}
