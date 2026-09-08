import { Controller, Get, Patch, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateAdministratorDto, ResetAdministratorPasswordDto, UpdateAdministratorDto, UpdateProfileDto } from './dto';
import { CurrentUser, Roles } from '../common/decorators';
import { UserRole } from '../common/enums';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser('id') userId: number) {
    return this.usersService.getProfile(userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update current user profile' })
  updateProfile(
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }
}

@ApiTags('Super Admin')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/administrators')
export class AdministratorsController {
  constructor(private readonly usersService: UsersService) {}
  @Get() list() { return this.usersService.listAdministrators(); }
  @Post() create(@Body() dto: CreateAdministratorDto) { return this.usersService.createAdministrator(dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdministratorDto) { return this.usersService.updateAdministrator(id, dto); }
  @Post(':id/reset-password') resetPassword(@Param('id', ParseIntPipe) id: number, @Body() dto: ResetAdministratorPasswordDto) { return this.usersService.resetAdministratorPassword(id, dto); }
}
