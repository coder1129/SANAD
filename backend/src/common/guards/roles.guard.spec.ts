import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../enums';

const contextFor = (user: unknown): ExecutionContext =>
  ({
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() } as unknown as Reflector;
    guard = new RolesGuard(reflector);
  });

  const requireRoles = (roles: UserRole[] | undefined) =>
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(roles);

  it('allows a handler that declares no roles', () => {
    requireRoles(undefined);

    expect(guard.canActivate(contextFor(undefined))).toBe(true);
  });

  it('allows a user holding the required role', () => {
    requireRoles([UserRole.ADMIN]);

    expect(guard.canActivate(contextFor({ role: 'admin' }))).toBe(true);
  });

  it('rejects a customer on an admin handler', () => {
    requireRoles([UserRole.ADMIN]);

    expect(guard.canActivate(contextFor({ role: 'customer' }))).toBe(false);
  });

  it('rejects an unauthenticated request on a role-guarded handler', () => {
    requireRoles([UserRole.ADMIN]);

    expect(guard.canActivate(contextFor(undefined))).toBe(false);
  });

  it('rejects a user whose role claim is missing', () => {
    requireRoles([UserRole.ADMIN]);

    expect(guard.canActivate(contextFor({ id: 7 }))).toBe(false);
  });

  // super_admin is a deliberate superset: admin handlers must accept it without
  // every @Roles() call having to list both.
  it('lets super_admin through an admin-only handler', () => {
    requireRoles([UserRole.ADMIN]);

    expect(guard.canActivate(contextFor({ role: 'super_admin' }))).toBe(true);
  });

  it('lets super_admin through a handler it does not explicitly list', () => {
    requireRoles([UserRole.CUSTOMER]);

    expect(guard.canActivate(contextFor({ role: 'super_admin' }))).toBe(true);
  });

  it('accepts any one of several allowed roles', () => {
    requireRoles([UserRole.ADMIN, UserRole.CUSTOMER]);

    expect(guard.canActivate(contextFor({ role: 'customer' }))).toBe(true);
  });

  it('rejects an empty role list rather than defaulting to open', () => {
    requireRoles([]);

    expect(guard.canActivate(contextFor({ role: 'customer' }))).toBe(false);
  });
});
