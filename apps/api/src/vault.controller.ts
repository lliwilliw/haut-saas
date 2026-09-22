import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SecretService } from './secret.service';
import { AuditService } from './audit.service';
import { assertRole } from './roles';

@UseGuards(JwtAuthGuard)
@Controller('vault')
export class VaultController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secrets: SecretService,
    private readonly audit: AuditService,
  ) {}

  private normalize(value: any, field: string) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(normalized)) {
      throw new BadRequestException(`${field} inválido`);
    }
    return normalized;
  }

  private mask(value: string) {
    if (value.length <= 4) return '••••';
    return `••••••••${value.slice(-4)}`;
  }

  @Get()
  async list(@Req() req: any) {
    assertRole(req.user.role, ['OWNER', 'ADMIN']);

    return this.prisma.vaultSecret.findMany({
      where: { organizationId: req.user.organizationId },
      select: {
        id: true,
        namespace: true,
        key: true,
        maskedValue: true,
        createdAt: true,
        updatedAt: true,
        rotatedAt: true,
      },
      orderBy: [{ namespace: 'asc' }, { key: 'asc' }],
    });
  }

  @Put(':namespace/:key')
  async set(
    @Req() req: any,
    @Param('namespace') namespaceRaw: string,
    @Param('key') keyRaw: string,
    @Body() body: any,
  ) {
    assertRole(req.user.role, ['OWNER', 'ADMIN']);

    const organizationId = req.user.organizationId;
    const namespace = this.normalize(namespaceRaw, 'Namespace');
    const key = this.normalize(keyRaw, 'Chave');
    const value = String(body.value || '');

    if (!value || value.length > 20000) {
      throw new BadRequestException('Valor de credencial inválido');
    }

    const encrypted = this.secrets.encrypt(value);
    const maskedValue = this.mask(value);

    const secret = await this.prisma.vaultSecret.upsert({
      where: {
        organizationId_namespace_key: {
          organizationId,
          namespace,
          key,
        },
      },
      create: {
        organizationId,
        namespace,
        key,
        ciphertext: encrypted,
        maskedValue,
      },
      update: {
        ciphertext: encrypted,
        maskedValue,
        rotatedAt: new Date(),
      },
      select: {
        id: true,
        namespace: true,
        key: true,
        maskedValue: true,
        updatedAt: true,
        rotatedAt: true,
      },
    });

    await this.audit.write({
      organizationId,
      userId: req.user.userId,
      action: 'vault.secret.saved',
      resourceType: 'VaultSecret',
      resourceId: secret.id,
      metadata: { namespace, key },
    });

    return secret;
  }

  @Delete(':namespace/:key')
  async remove(
    @Req() req: any,
    @Param('namespace') namespaceRaw: string,
    @Param('key') keyRaw: string,
  ) {
    assertRole(req.user.role, ['OWNER', 'ADMIN']);

    const organizationId = req.user.organizationId;
    const namespace = this.normalize(namespaceRaw, 'Namespace');
    const key = this.normalize(keyRaw, 'Chave');

    const secret = await this.prisma.vaultSecret.findUnique({
      where: {
        organizationId_namespace_key: {
          organizationId,
          namespace,
          key,
        },
      },
    });

    if (!secret) throw new BadRequestException('Credencial não encontrada');

    await this.prisma.vaultSecret.delete({ where: { id: secret.id } });

    await this.audit.write({
      organizationId,
      userId: req.user.userId,
      action: 'vault.secret.deleted',
      resourceType: 'VaultSecret',
      resourceId: secret.id,
      metadata: { namespace, key },
    });

    return { ok: true };
  }
}
