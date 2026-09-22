import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { assertRole } from './roles';

@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: any, @Query('take') rawTake?: string) {
    assertRole(req.user.role, ['OWNER', 'ADMIN']);

    const take = Math.min(Math.max(Number(rawTake || 100), 1), 200);

    return this.prisma.auditLog.findMany({
      where: { organizationId: req.user.organizationId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
