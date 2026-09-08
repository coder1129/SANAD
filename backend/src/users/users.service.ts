import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAdministratorDto,
  ResetAdministratorPasswordDto,
  UpdateAdministratorDto,
  UpdateProfileDto,
} from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        first_name: true,
        last_name: true,
        gender: true,
        role: true,
        email_verified: true,
        last_login: true,
        created_at: true,
        updated_at: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const firstName = dto.first_name?.trim();
    const lastName = dto.last_name?.trim();
    const effectiveFirstName = firstName ?? user.first_name;
    const effectiveLastName = lastName ?? user.last_name;
    const syncedName =
      effectiveFirstName || effectiveLastName
        ? [effectiveFirstName, effectiveLastName].filter(Boolean).join(' ')
        : dto.name;

    return this.prisma.users.update({
      where: { id: userId },
      data: {
        ...(syncedName !== undefined && { name: syncedName }),
        ...(firstName !== undefined && { first_name: firstName }),
        ...(lastName !== undefined && { last_name: lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        first_name: true,
        last_name: true,
        gender: true,
        role: true,
        email_verified: true,
        last_login: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async listAdministrators() {
    return this.prisma.users.findMany({
      where: { role: { in: ['admin', 'super_admin'] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        email_verified: true,
        account_locked: true,
        last_login: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createAdministrator(dto: CreateAdministratorDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.users.findUnique({ where: { email } })) {
      throw new ConflictException('Email is already in use');
    }
    return this.prisma.users.create({
      data: {
        name: dto.name.trim(),
        email,
        password_hash: await argon2.hash(dto.password, {
          type: argon2.argon2id,
        }),
        role: dto.role,
        email_verified: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        email_verified: true,
        account_locked: true,
        created_at: true,
      },
    });
  }

  async updateAdministrator(
    id: number,
    dto: UpdateAdministratorDto,
    requesterId?: number,
  ) {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user || !['admin', 'super_admin'].includes(user.role))
      throw new NotFoundException('Administrator not found');
    if (id === requesterId && dto.role && dto.role !== user.role) {
      throw new BadRequestException(
        'You cannot change your own administrator role',
      );
    }
    return this.prisma.users.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.role && { role: dto.role }),
        ...(dto.active !== undefined && {
          account_locked: !dto.active,
          token_version: { increment: 1 },
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        account_locked: true,
      },
    });
  }

  async deleteAdministrator(id: number, requesterId: number) {
    if (id === requesterId) {
      throw new BadRequestException(
        'You cannot delete your own administrator account',
      );
    }

    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      throw new NotFoundException('Administrator not found');
    }

    await this.prisma.users.delete({ where: { id } });
    return { message: 'Administrator deleted successfully' };
  }

  async resetAdministratorPassword(
    id: number,
    dto: ResetAdministratorPasswordDto,
  ) {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user || !['admin', 'super_admin'].includes(user.role))
      throw new NotFoundException('Administrator not found');
    await this.prisma.users.update({
      where: { id },
      data: {
        password_hash: await argon2.hash(dto.password, {
          type: argon2.argon2id,
        }),
        token_version: { increment: 1 },
      },
    });
    return { message: 'Administrator password reset successfully' };
  }
}
