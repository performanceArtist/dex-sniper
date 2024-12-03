import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { formatUnits } from 'ethers';

@Controller('user')
export class HttpController {
  constructor(private userFactory: UserService) {}

  @Get(':id/balance')
  async balance(@Param() params: any) {
    const id = Number(params.id);
    if (Number.isNaN(id)) return `Invalid id: ${params.id}`;
    const user = this.userFactory.getInstance(id);
    const balances = await user.balance();
    const response = balances.reduce(
      (acc, { symbol, balance, decimals }) =>
        `${acc}${acc === '' ? '' : '\n'}${symbol}: ${formatUnits(balance, decimals)}`,
      '',
    );
    return balances.length === 0 ? 'No tokens' : response;
  }
}
