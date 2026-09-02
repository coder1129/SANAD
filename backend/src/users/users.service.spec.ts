import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      users: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    service = new UsersService(prisma as PrismaService);
  });

  describe('getProfile', () => {
    it('throws NotFoundException when the account no longer exists', async () => {
      prisma.users.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(7)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('never selects credential or session-invalidation columns', async () => {
      prisma.users.findUnique.mockResolvedValue({
        id: 7,
        email: 'user@example.com',
      });

      await service.getProfile(7);

      const { select } = prisma.users.findUnique.mock.calls[0][0];
      expect(select.email).toBe(true);
      expect(select).not.toHaveProperty('password_hash');
      expect(select).not.toHaveProperty('token_version');
      expect(select).not.toHaveProperty('password_reset_token');
      expect(select).not.toHaveProperty('email_verification_token');
    });
  });

  describe('updateProfile', () => {
    it('rejects an update for a missing user before writing anything', async () => {
      prisma.users.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile(7, { name: 'New Name' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.users.update).not.toHaveBeenCalled();
    });

    it('writes only the fields the caller supplied', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: 7 });
      prisma.users.update.mockResolvedValue({ id: 7, phone: '+971500000000' });

      await service.updateProfile(7, { phone: '+971500000000' });

      expect(prisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 7 },
          data: { phone: '+971500000000' },
        }),
      );
    });

    it('returns the same non-sensitive projection as getProfile', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: 7 });
      prisma.users.update.mockResolvedValue({ id: 7 });

      await service.updateProfile(7, { name: 'Updated' });

      const { select } = prisma.users.update.mock.calls[0][0];
      expect(select).not.toHaveProperty('password_hash');
      expect(select).not.toHaveProperty('token_version');
      expect(select.role).toBe(true);
    });

    it('does not allow the role to be escalated through the profile update', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: 7 });
      prisma.users.update.mockResolvedValue({ id: 7 });

      await service.updateProfile(7, {
        name: 'Updated',
        role: 'super_admin',
      } as never);

      expect(prisma.users.update.mock.calls[0][0].data).toEqual({
        name: 'Updated',
      });
    });
  });
});
