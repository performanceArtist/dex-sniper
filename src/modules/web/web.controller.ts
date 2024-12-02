import { Controller, Get, Param } from '@nestjs/common';
import { WebService } from './web.service';

@Controller('user')
export class HttpController {
  constructor(private client: WebService) {}

  @Get(':id/balance')
  async balance(@Param() params: any) {
    const response = await this.client.request(
      {
        type: 'balance',
      },
      params.id,
    );

    return response;
  }
}
