import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { CheckoutPreviewDto } from './dto';
import { Public, CurrentUser } from '../common/decorators';

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Public()
  @Post('preview')
  @ApiOperation({
    summary:
      'Calculate order price preview with server-side validation of package, offer, and coupon',
  })
  async previewCheckout(
    @Body() dto: CheckoutPreviewDto,
    @CurrentUser('id') userId?: number,
  ) {
    return this.checkoutService.calculatePricing(dto, userId);
  }
}
