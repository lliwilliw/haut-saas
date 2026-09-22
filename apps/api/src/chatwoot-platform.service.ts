import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from './prisma.service';
import { SecretService } from './secret.service';

@Injectable()
export class ChatwootPlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secrets: SecretService,
  ) {}

  private baseUrl() {
    return (process.env.CHATWOOT_URL || '').replace(/\/+$/, '');
  }

  private platformToken() {
    return process.env.CHATWOOT_PLATFORM_TOKEN || '';
  }

  private async request(path: string, body: any) {
    const base = this.baseUrl();
    const token = this.platformToken();

    if (!base || !token) {
      throw new BadRequestException(
        'A infraestrutura de atendimento ainda não está provisionada',
      );
    }

    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        api_access_token: token,
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(async () => ({
      message: await response.text().catch(() => ''),
    }));

    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        payload?.errors ||
        `Chatwoot HTTP ${response.status}`;

      throw new BadRequestException(
        Array.isArray(message) ? message.join(', ') : String(message),
      );
    }

    return payload;
  }

  async getTenantConnection(organizationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider: 'chatwoot',
        },
      },
    });

    if (!integration?.secretRef) return null;

    const config = (integration.config || {}) as any;

    if (!config.accountId) return null;

    return {
      accountId: String(config.accountId),
      userId: config.userId ? String(config.userId) : null,
      accessToken: this.secrets.decrypt(integration.secretRef),
      url: this.baseUrl(),
    };
  }

  async provisionForOrganization(organizationId: string) {
    const existing = await this.getTenantConnection(organizationId);
    if (existing) return existing;

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new BadRequestException('Organização não encontrada');
    }

    const account = await this.request('/platform/api/v1/accounts', {
      name: organization.name,
      locale: 'pt_BR',
      status: 'active',
      custom_attributes: {
        haut_organization_id: organization.id,
      },
    });

    const bridgeEmail = `bridge-${organization.id}@tenant.haut.local`;
    const bridgePassword =
      randomBytes(24).toString('base64url') + 'Aa1!';

    const user = await this.request('/platform/api/v1/users', {
      name: `HAUT Bridge - ${organization.name}`,
      display_name: 'HAUT',
      email: bridgeEmail,
      password: bridgePassword,
      custom_attributes: {
        haut_organization_id: organization.id,
        haut_service_user: true,
      },
    });

    if (!account?.id || !user?.id || !user?.access_token) {
      throw new BadRequestException(
        'O Chatwoot não retornou as credenciais esperadas para o tenant',
      );
    }

    await this.request(
      `/platform/api/v1/accounts/${account.id}/account_users`,
      {
        user_id: user.id,
        role: 'administrator',
      },
    );

    await this.prisma.integration.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider: 'chatwoot',
        },
      },
      create: {
        organizationId,
        provider: 'chatwoot',
        enabled: true,
        config: {
          accountId: String(account.id),
          userId: String(user.id),
        },
        secretRef: this.secrets.encrypt(String(user.access_token)),
      },
      update: {
        enabled: true,
        config: {
          accountId: String(account.id),
          userId: String(user.id),
        },
        secretRef: this.secrets.encrypt(String(user.access_token)),
      },
    });

    return {
      accountId: String(account.id),
      userId: String(user.id),
      accessToken: String(user.access_token),
      url: this.baseUrl(),
    };
  }
}
