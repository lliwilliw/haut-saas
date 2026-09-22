import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { assertRole, HautRole, roles } from './roles';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard)
@Controller('team')
export class TeamController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private normalizeRole(value: any): HautRole {
    const role = String(value || '').toUpperCase() as HautRole;
    if (!roles.includes(role)) throw new BadRequestException('Papel inválido');
    if (role === 'OWNER') {
      throw new BadRequestException('Use transferência de propriedade para definir outro OWNER');
    }
    return role;
  }

  @Get()
  async list(@Req() req: any) {
    const organizationId = req.user.organizationId;

    const [members, invitations] = await Promise.all([
      this.prisma.membership.findMany({
        where: { organizationId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.invitation.findMany({
        where: {
          organizationId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { members, invitations };
  }

  @Post('invitations')
  async invite(@Req() req: any, @Body() body: any) {
    assertRole(req.user.role, ['OWNER', 'ADMIN']);

    const organizationId = req.user.organizationId;
    const email = String(body.email || '').trim().toLowerCase();
    const role = this.normalizeRole(body.role || 'AGENT');

    if (!email.includes('@')) {
      throw new BadRequestException('E-mail inválido');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingMembership = await this.prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId,
          },
        },
      });

      if (existingMembership) {
        throw new BadRequestException('Este usuário já faz parte da organização');
      }
    }

    await this.prisma.invitation.updateMany({
      where: {
        organizationId,
        email,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId,
        email,
        role,
        tokenHash,
        expiresAt,
        invitedByUserId: req.user.userId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    await this.audit.write({
      organizationId,
      userId: req.user.userId,
      action: 'team.invitation.created',
      resourceType: 'Invitation',
      resourceId: invitation.id,
      metadata: { email, role },
    });

    return {
      invitation,
      token,
      invitePath: `/accept-invite?token=${encodeURIComponent(token)}`,
    };
  }

  @Patch('members/:membershipId')
  async updateRole(
    @Req() req: any,
    @Param('membershipId') membershipId: string,
    @Body() body: any,
  ) {
    assertRole(req.user.role, ['OWNER', 'ADMIN']);

    const organizationId = req.user.organizationId;
    const role = this.normalizeRole(body.role);

    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
    });

    if (!membership) throw new BadRequestException('Membro não encontrado');
    if (membership.role === 'OWNER') {
      throw new BadRequestException('O papel OWNER não pode ser alterado aqui');
    }

    const updated = await this.prisma.membership.update({
      where: { id: membership.id },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await this.audit.write({
      organizationId,
      userId: req.user.userId,
      action: 'team.member.role_changed',
      resourceType: 'Membership',
      resourceId: membership.id,
      metadata: { role },
    });

    return updated;
  }

  @Delete('members/:membershipId')
  async remove(
    @Req() req: any,
    @Param('membershipId') membershipId: string,
  ) {
    assertRole(req.user.role, ['OWNER', 'ADMIN']);

    const organizationId = req.user.organizationId;
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
    });

    if (!membership) throw new BadRequestException('Membro não encontrado');
    if (membership.role === 'OWNER') {
      throw new BadRequestException('O OWNER não pode ser removido');
    }
    if (membership.userId === req.user.userId) {
      throw new BadRequestException('Você não pode remover a si mesmo');
    }

    await this.prisma.membership.delete({ where: { id: membership.id } });

    await this.audit.write({
      organizationId,
      userId: req.user.userId,
      action: 'team.member.removed',
      resourceType: 'Membership',
      resourceId: membership.id,
    });

    return { ok: true };
  }

  @Delete('invitations/:id')
  async revoke(@Req() req: any, @Param('id') id: string) {
    assertRole(req.user.role, ['OWNER', 'ADMIN']);

    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId,
        acceptedAt: null,
        revokedAt: null,
      },
    });

    if (!invitation) throw new BadRequestException('Convite não encontrado');

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { revokedAt: new Date() },
    });

    await this.audit.write({
      organizationId: req.user.organizationId,
      userId: req.user.userId,
      action: 'team.invitation.revoked',
      resourceType: 'Invitation',
      resourceId: invitation.id,
    });

    return { ok: true };
  }
}
