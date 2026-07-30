import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { DashboardService } from './dashboard.service';
import AuthGuard from 'src/app/middlewares/auth.guard';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('business-overview')
  @ApiOperation({
    summary: 'Get the 4 summary cards for the logged in business dashboard',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner'))
  @HttpCode(HttpStatus.OK)
  async businessDashboardOverview(@Req() req: Request) {
    const result = await this.dashboardService.businessDashboardOverview(
      req.user!.id,
    );

    return {
      message: 'Business dashboard overview fetched successfully',
      data: result,
    };
  }

  @Get('cards')
  @ApiOperation({ summary: 'Get dashboard stat cards (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @HttpCode(HttpStatus.OK)
  async getCards() {
    const result = await this.dashboardService.getCards();
    return {
      message: 'Dashboard cards fetched successfully',
      data: result,
    };
  }

  @Get('monthly-registrations')
  @ApiOperation({
    summary: 'Get monthly user registration counts (admin only)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    example: 2026,
    description:
      'Filter by specific year (Jan-Dec). If omitted, returns rolling last 12 months.',
  })
  @HttpCode(HttpStatus.OK)
  async getMonthlyRegistrations(@Query('year') year?: string) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    const result =
      await this.dashboardService.getMonthlyRegistrations(parsedYear);
    return {
      message: 'Monthly registrations fetched successfully',
      data: result,
    };
  }

  @Get('monthly-sponsor-visits')
  @ApiOperation({
    summary: 'Get monthly sponsor visit counts (admin only)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    example: 2026,
    description:
      'Filter by specific year (Jan-Dec). If omitted, returns rolling last 12 months.',
  })
  @HttpCode(HttpStatus.OK)
  async getMonthlySponsorVisits(@Query('year') year?: string) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    const result =
      await this.dashboardService.getMonthlySponsorVisits(parsedYear);

    return {
      message: 'Monthly sponsor visits fetched successfully',
      data: result,
    };
  }

  @Get('recent-activity')
  @ApiOperation({
    summary:
      'Get latest 3 reports and latest 3 pending registrations (admin only)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @HttpCode(HttpStatus.OK)
  async getRecentActivity() {
    const result = await this.dashboardService.getRecentActivity();
    return {
      message: 'Recent activity fetched successfully',
      data: result,
    };
  }
}
