import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessDiscoveryService } from './business-discovery.service';
import { SearchBusinessesDto } from './dto/search-businesses.dto';

@ApiTags('Business Discovery')
@Controller('businesses')
export class BusinessDiscoveryController {
  constructor(
    private readonly businessDiscoveryService: BusinessDiscoveryService,
  ) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search registered and referred businesses with one card format',
  })
  @HttpCode(HttpStatus.OK)
  async search(@Query() query: SearchBusinessesDto) {
    const result = await this.businessDiscoveryService.search(query);

    return {
      message: 'Businesses fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }
}
