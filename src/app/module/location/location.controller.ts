import { Controller, Get, HttpCode, HttpStatus, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  GetCitiesByStateQueryDto,
  GetStatesQueryDto,
} from './dto/location-query.dto';
import { LocationService } from './location.service';

@ApiTags('Location')
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('states')
  @ApiOperation({
    summary: 'Get states for registration or location filters',
  })
  @ApiQuery({
    name: 'countryCode',
    required: false,
    type: String,
    example: 'US',
  })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: 'ala',
  })
  @HttpCode(HttpStatus.OK)
  async getStates(@Query() query: GetStatesQueryDto) {
    const result = await this.locationService.getStates(query);

    return {
      message: 'States fetched successfully',
      data: result,
    };
  }

  @Get('states/:stateIdentifier/cities')
  @ApiOperation({
    summary: 'Get cities for a selected state on the registration page',
  })
  @ApiParam({
    name: 'stateIdentifier',
    required: true,
    type: String,
    description: 'Mongo id or numeric state id of the selected state',
  })
  @ApiQuery({
    name: 'countryName',
    required: false,
    type: String,
    example: 'United States',
  })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: 'bir',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 100,
  })
  @HttpCode(HttpStatus.OK)
  async getCitiesByState(
    @Param('stateIdentifier') stateIdentifier: string,
    @Query() query: GetCitiesByStateQueryDto,
  ) {
    const result = await this.locationService.getCitiesByState(
      stateIdentifier,
      query,
    );

    return {
      message: 'Cities fetched successfully',
      data: result,
    };
  }
}
