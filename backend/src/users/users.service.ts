import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto';

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
}
