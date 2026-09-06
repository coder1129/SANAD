import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public, Roles } from '../common/decorators';
import { ReviewStatus, UserRole } from '../common/enums';
import {
  AdminReviewFilterDto,
  CreateReviewDto,
  ModerateReviewDto,
  PublicReviewFilterDto,
  UpdateReviewDto,
} from './dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'List published verified-purchase reviews' })
  listPublished(@Query() query: PublicReviewFilterDto) {
    return this.reviewsService.listPublished(query);
  }

  @ApiBearerAuth('bearer')
  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get the current customer review for an order' })
  findForOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.reviewsService.findForOrder(orderId, userId);
  }

  @ApiBearerAuth('bearer')
  @Post()
  @ApiOperation({ summary: 'Review a completed paid order once' })
  create(@CurrentUser('id') userId: number, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(userId, dto);
  }

  @ApiBearerAuth('bearer')
  @Patch(':id')
  @ApiOperation({ summary: 'Update the customer own review' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, userId, dto);
  }
}

@ApiTags('Admin - Reviews')
@ApiBearerAuth('bearer')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  list(@Query() query: AdminReviewFilterDto) {
    return this.reviewsService.listAdmin(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.findOneAdmin(id);
  }

  @Patch(':id/status')
  moderate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') adminId: number,
    @Body() dto: ModerateReviewDto,
  ) {
    if (![ReviewStatus.PUBLISHED, ReviewStatus.HIDDEN].includes(dto.status)) {
      throw new BadRequestException({
        message: 'Reviews may only be published or hidden by an administrator',
        code: 'INVALID_REVIEW_STATUS',
      });
    }
    return this.reviewsService.moderate(id, adminId, dto.status);
  }
}
