import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { compare, hash } from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private token(user: any, membership: any) {
    return this.jwt.sign({
      sub: user.id,
      userId: user.id,
      email: user.email,
      organizationId: membership.organizationId,
      role: membership.role,
    });
  }

  private authResult(user: any, membership: any, organization: any) {
    return {
      accessToken: this.token(user, membership),
      user: { id: user.id, name: user.name, email: user.email },
      organization,
      role: membership.role,
    };
  }

  @Post('register')
  async register(@Body() body: any) {
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const organizationName = String(body.organizationName || '').trim();

    if (
      name.length < 2 ||
      organizationName.length < 2 ||
      !email.includes('@') ||
      password.length < 8
    ) {
      throw new BadRequestException(
        'Preencha nome, empresa, e-mail e senha de 8+ caracteres',
      );
    }

    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Este e-mail já está cadastrado');
    }

    const passwordHash = await hash(password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash },
      });

      const base =
        organizationName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40) || 'empresa';

      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug: `${base}-${randomUUID().slice(0, 6)}`,
        },
      });

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: 'OWNER',
        },
      });

      await tx.pipeline.create({
        data: {
          organizationId: organization.id,
          name: 'Vendas',
          stages: {
            create: [
              { name: 'Novo', position: 1 },
              { name: 'Qualificação', position: 2 },
              { name: 'Proposta', position: 3 },
              { name: 'Ganho', position: 4 },
            ],
          },
        },
      });

      return { user, organization, membership };
    });

    return this.authResult(
      result.user,
      result.membership,
      result.organization,
    );
  }

  @Post('login')
  async login(@Body() body: any) {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const membership = user.memberships[0];
    if (!membership) throw new UnauthorizedException('Usuário sem organização');

    return this.authResult(user, membership, membership.organization);
  }

  @Post('accept-invite')
  async acceptInvite(@Body() body: any) {
    const token = String(body.token || '');
    const name = String(body.name || '').trim();
    const password = String(body.password || '');

    if (!token || password.length < 8) {
      throw new BadRequestException('Convite e senha são obrigatórios');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');

    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: { organization: true },
    });

    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt <= new Date()
    ) {
      throw new BadRequestException('Convite inválido ou expirado');
    }

    let user = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (user) {
      if (!(await compare(password, user.passwordHash))) {
        throw new UnauthorizedException(
          'Use a senha da sua conta existente para aceitar o convite',
        );
      }
    } else {
      if (name.length < 2) {
        throw new BadRequestException('Informe seu nome');
      }

      user = await this.prisma.user.create({
        data: {
          name,
          email: invitation.email,
          passwordHash: await hash(password, 12),
        },
      });
    }

    const membership = await this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.upsert({
        where: {
          userId_organizationId: {
            userId: user!.id,
            organizationId: invitation.organizationId,
          },
        },
        create: {
          userId: user!.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
        update: {
          role: invitation.role,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          organizationId: invitation.organizationId,
          userId: user!.id,
          action: 'team.invitation.accepted',
          resourceType: 'Invitation',
          resourceId: invitation.id,
          metadata: {
            email: invitation.email,
            role: invitation.role,
          },
        },
      });

      return membership;
    });

    return this.authResult(user, membership, invitation.organization);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.userId,
          organizationId: req.user.organizationId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
        organization: true,
      },
    });

    if (!membership) throw new UnauthorizedException();

    return {
      user: membership.user,
      organization: membership.organization,
      role: membership.role,
    };
  }
}
