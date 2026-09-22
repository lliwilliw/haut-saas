import { ForbiddenException } from '@nestjs/common';

export const roles = [
  'OWNER',
  'ADMIN',
  'MANAGER',
  'AGENT',
  'MARKETING',
  'VIEWER',
] as const;

export type HautRole = (typeof roles)[number];

export function assertRole(current: string, allowed: HautRole[]) {
  if (!allowed.includes(current as HautRole)) {
    throw new ForbiddenException('Você não tem permissão para esta ação');
  }
}
