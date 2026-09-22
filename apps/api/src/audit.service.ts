import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: {
    organizationId: string;
    userId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    metadata?: Record<string, any> | null;
  }) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId || null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId || null,
        metadata: input.metadata || undefined,
      },
    });
  }
}
