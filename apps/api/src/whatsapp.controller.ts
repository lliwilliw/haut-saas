import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ChatwootPlatformService } from './chatwoot-platform.service';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard)
@Controller('integrations/whatsapp')
export class WhatsAppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatwoot: ChatwootPlatformService,
    private readonly audit: AuditService,
  ) {}

  private evolution() {
    const base = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
    const key = process.env.EVOLUTION_API_KEY || '';

    if (!base || !key) {
      throw new BadRequestException(
        'A infraestrutura de WhatsApp ainda não está configurada',
      );
    }

    return { base, key };
  }

  private async tenantMapping(organizationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider: 'whatsapp',
        },
      },
    });

    const config = (integration?.config || {}) as any;

    return {
      integration,
      instanceName:
        typeof config.instanceName === 'string' ? config.instanceName : null,
      inboxName:
        typeof config.inboxName === 'string' ? config.inboxName : null,
    };
  }

  private async fetchInstance(instanceName: string) {
    const { base, key } = this.evolution();
    const url = new URL(`${base}/instance/fetchInstances`);
    url.searchParams.set('instanceName', instanceName);

    const response = await fetch(url, {
      headers: { apikey: key },
    });

    if (!response.ok) {
      throw new BadRequestException(`Evolution HTTP ${response.status}`);
    }

    const payload = await response.json();
    return Array.isArray(payload) ? payload[0] || null : null;
  }

  private sanitize(instance: any) {
    if (!instance) return null;

    const ownerJid =
      typeof instance.ownerJid === 'string' ? instance.ownerJid : null;
    const phone =
      instance.number ||
      (ownerJid && ownerJid.includes('@') ? ownerJid.split('@')[0] : null);

    return {
      connected: instance.connectionStatus === 'open',
      status: instance.connectionStatus || 'close',
      phone,
      profileName: instance.profileName || null,
      profilePicUrl: instance.profilePicUrl || null,
    };
  }

  private qr(payload: any) {
    const source = payload?.qrcode || payload || {};

    return {
      base64: typeof source.base64 === 'string' ? source.base64 : null,
      pairingCode:
        typeof source.pairingCode === 'string' ? source.pairingCode : null,
    };
  }

  private async ensureChatwootBridge(
    instanceName: string,
    inboxName: string,
    tenant: {
      accountId: string;
      accessToken: string;
      url: string;
    },
  ) {
    const { base, key } = this.evolution();

    const response = await fetch(
      `${base}/chatwoot/set/${encodeURIComponent(instanceName)}`,
      {
        method: 'POST',
        headers: {
          apikey: key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: true,
          accountId: tenant.accountId,
          token: tenant.accessToken,
          url: tenant.url,
          signMsg: false,
          signDelimiter: null,
          nameInbox: inboxName,
          reopenConversation: true,
          conversationPending: false,
          autoCreate: true,
          importContacts: false,
          mergeBrazilContacts: true,
          importMessages: false,
          daysLimitImportMessages: 7,
          ignoreJids: [],
        }),
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new BadRequestException(
        body?.message || `Evolution HTTP ${response.status}`,
      );
    }
  }

  @Get()
  async status(@Req() req: any) {
    const mapping = await this.tenantMapping(req.user.organizationId);

    if (!mapping.instanceName) {
      return {
        configured: false,
        instance: null,
      };
    }

    try {
      const instance = await this.fetchInstance(mapping.instanceName);

      return {
        configured: true,
        instance: this.sanitize(instance),
      };
    } catch {
      return {
        configured: true,
        instance: null,
      };
    }
  }

  @Post('setup')
  async setup(@Req() req: any) {
    const organizationId = req.user.organizationId;
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new BadRequestException('Organização não encontrada');
    }

    const tenantChatwoot =
      await this.chatwoot.provisionForOrganization(organizationId);

    const mapping = await this.tenantMapping(organizationId);
    const { base, key } = this.evolution();

    let instanceName = mapping.instanceName;
    const inboxName =
      mapping.inboxName || `WhatsApp - ${organization.name}`;

    if (!instanceName) {
      instanceName = `haut-${organization.slug}-${organizationId.slice(-6)}`;

      let existing = null;
      try {
        existing = await this.fetchInstance(instanceName);
      } catch {
        existing = null;
      }

      if (!existing) {
        const createResponse = await fetch(`${base}/instance/create`, {
          method: 'POST',
          headers: {
            apikey: key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instanceName,
            qrcode: false,
            integration: 'WHATSAPP-BAILEYS',
            rejectCall: false,
            msgCall: '',
            groupsIgnore: false,
            alwaysOnline: false,
            readMessages: false,
            readStatus: false,
            syncFullHistory: false,
          }),
        });

        const createBody = await createResponse.json().catch(() => ({}));

        if (!createResponse.ok) {
          throw new BadRequestException(
            createBody?.message ||
              `Evolution HTTP ${createResponse.status}`,
          );
        }
      }

      await this.prisma.integration.upsert({
        where: {
          organizationId_provider: {
            organizationId,
            provider: 'whatsapp',
          },
        },
        create: {
          organizationId,
          provider: 'whatsapp',
          enabled: true,
          config: { instanceName, inboxName },
        },
        update: {
          enabled: true,
          config: { instanceName, inboxName },
        },
      });
    }

    await this.ensureChatwootBridge(
      instanceName,
      inboxName,
      tenantChatwoot,
    );

    const connectResponse = await fetch(
      `${base}/instance/connect/${encodeURIComponent(instanceName)}`,
      {
        headers: { apikey: key },
      },
    );

    const connectBody = await connectResponse.json().catch(() => ({}));

    if (!connectResponse.ok) {
      throw new BadRequestException(
        `Evolution HTTP ${connectResponse.status}`,
      );
    }

    const instance = await this.fetchInstance(instanceName);

    await this.audit.write({
      organizationId,
      userId: req.user.userId,
      action: 'channel.whatsapp.setup',
      resourceType: 'Integration',
      resourceId: mapping.integration?.id || null,
    });

    return {
      configured: true,
      instance: this.sanitize(instance),
      qrcode: this.qr(connectBody),
    };
  }

  @Post('connect')
  async connect(@Req() req: any) {
    const mapping = await this.tenantMapping(req.user.organizationId);

    if (!mapping.instanceName) {
      throw new BadRequestException('WhatsApp ainda não foi configurado');
    }

    const { base, key } = this.evolution();

    const response = await fetch(
      `${base}/instance/connect/${encodeURIComponent(mapping.instanceName)}`,
      {
        headers: { apikey: key },
      },
    );

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new BadRequestException(
        `Evolution HTTP ${response.status}`,
      );
    }

    await this.audit.write({
      organizationId: req.user.organizationId,
      userId: req.user.userId,
      action: 'channel.whatsapp.reconnect',
      resourceType: 'Integration',
      resourceId: mapping.integration?.id || null,
    });

    return {
      instance: this.sanitize(
        await this.fetchInstance(mapping.instanceName),
      ),
      qrcode: this.qr(body),
    };
  }
}
