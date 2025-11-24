import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { CreatePlanDto, UpdatePlanDto } from './dto';
import { Plan, PlanType } from './entities/plan.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('plans')
@ApiTags('Plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  @Get('public')
  @Public()
  @ApiOperation({
    summary: 'Get all active plans (public)',
    description:
      'Returns all active plans with public information for display on the website',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active plans',
    type: [Plan],
  })
  async getPublicPlans() {
    const plans = await this.plansService.getPublicPlans();
    return {
      message: 'Planes obtenidos exitosamente',
      data: plans,
    };
  }

  @Get('public/:type')
  @Public()
  @ApiOperation({
    summary: 'Get plan by type (public)',
    description: 'Returns a specific plan by its type (basic, standard, premium)',
  })
  @ApiResponse({
    status: 200,
    description: 'Plan details',
    type: Plan,
  })
  @ApiNotFoundResponse({
    description: 'Plan not found',
  })
  async getPublicPlanByType(@Param('type') type: PlanType) {
    const plan = await this.plansService.findByType(type);
    return {
      message: 'Plan obtenido exitosamente',
      data: plan,
    };
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all plans (admin)',
    description: 'Returns all plans including inactive ones',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive plans',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all plans',
    type: [Plan],
  })
  async findAll(@Query('includeInactive') includeInactive?: boolean) {
    const plans = await this.plansService.findAll(includeInactive);
    return {
      message: 'Planes obtenidos exitosamente',
      data: plans,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get plan by ID (admin)',
    description: 'Returns a specific plan by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Plan details',
    type: Plan,
  })
  @ApiNotFoundResponse({
    description: 'Plan not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const plan = await this.plansService.findById(id);
    return {
      message: 'Plan obtenido exitosamente',
      data: plan,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new plan (admin)',
    description: 'Creates a new subscription plan',
  })
  @ApiResponse({
    status: 201,
    description: 'Plan created successfully',
    type: Plan,
  })
  @ApiBadRequestResponse({
    description: 'Invalid data or plan type already exists',
  })
  async create(@Body() createPlanDto: CreatePlanDto) {
    const plan = await this.plansService.create(createPlanDto);
    return {
      message: 'Plan creado exitosamente',
      data: plan,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a plan (admin)',
    description: 'Updates an existing plan',
  })
  @ApiResponse({
    status: 200,
    description: 'Plan updated successfully',
    type: Plan,
  })
  @ApiNotFoundResponse({
    description: 'Plan not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid data or plan type conflict',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePlanDto: UpdatePlanDto,
  ) {
    const plan = await this.plansService.update(id, updatePlanDto);
    return {
      message: 'Plan actualizado exitosamente',
      data: plan,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deactivate a plan (admin)',
    description: 'Soft deletes a plan by setting its status to inactive',
  })
  @ApiResponse({
    status: 200,
    description: 'Plan deactivated successfully',
    type: Plan,
  })
  @ApiNotFoundResponse({
    description: 'Plan not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const plan = await this.plansService.remove(id);
    return {
      message: 'Plan desactivado exitosamente',
      data: plan,
    };
  }

  @Put(':id/stripe-ids')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update Stripe IDs for a plan (admin)',
    description: 'Updates the Stripe product and price IDs for a plan',
  })
  @ApiResponse({
    status: 200,
    description: 'Stripe IDs updated successfully',
    type: Plan,
  })
  @ApiNotFoundResponse({
    description: 'Plan not found',
  })
  async updateStripeIds(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    stripeIds: {
      stripeProductId?: string;
      stripeMonthlyPriceId?: string;
      stripeInitialPriceId?: string;
      stripeInstallmentPriceId?: string;
    },
  ) {
    const plan = await this.plansService.updateStripeIds(id, stripeIds);
    return {
      message: 'IDs de Stripe actualizados exitosamente',
      data: plan,
    };
  }

  @Post('seed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Seed default plans (admin)',
    description: 'Creates the default plans if they do not exist',
  })
  @ApiResponse({
    status: 200,
    description: 'Plans seeded successfully',
  })
  async seedPlans() {
    await this.plansService.seedDefaultPlans();
    return {
      message: 'Planes sembrados exitosamente',
    };
  }
}
