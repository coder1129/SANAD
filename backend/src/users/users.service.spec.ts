import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      users: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
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

  describe('createAdministrator', () => {
    it('reports a duplicate administrator email as a conflict', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: 7 });

      await expect(
        service.createAdministrator({
          name: 'Mostafa',
          email: 'elsrogy498@gmail.com',
          password: 'secure-password',
          role: 'super_admin',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.users.create).not.toHaveBeenCalled();
    });
  });

  describe('updateAdministrator', () => {
    it('allows a super admin to update an administrator name', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: 7, role: 'super_admin' });
      prisma.users.update.mockResolvedValue({ id: 7, name: 'Mostafa' });

      await service.updateAdministrator(7, { name: ' Mostafa ' });

      expect(prisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 7 },
          data: { name: 'Mostafa' },
        }),
      );
    });

    it('does not allow a super admin to change their own role', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: 7, role: 'super_admin' });

      await expect(
        service.updateAdministrator(7, { role: 'admin' }, 7),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.users.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteAdministrator', () => {
    it('does not allow an administrator to delete their own account', async () => {
      await expect(service.deleteAdministrator(7, 7)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.users.delete).not.toHaveBeenCalled();
    });

    it('deletes another administrator account', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: 7, role: 'admin' });

      await service.deleteAdministrator(7, 1);

      expect(prisma.users.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    });
  });
});
