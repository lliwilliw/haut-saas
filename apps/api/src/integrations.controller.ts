import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  private trim(v?: string) {
    return (v || '').replace(/\/+$/, '');
  }

  private async probe(url?: string) {
    if (!url) return { configured: false, reachable: false };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
      });

      return {
        configured: true,
        reachable: response.status < 500,
        statusCode: response.status,
      };
    } catch {
      return { configured: true, reachable: false };
    } finally {
      clearTimeout(timeout);
    }
  }

  private sanitizeEvolutionInstance(instance: any) {
    const ownerJid =
      typeof instance?.ownerJid === 'string' ? instance.ownerJid : null;
    const phone =
      instance?.number ||
      (ownerJid && ownerJid.includes('@') ? ownerJid.split('@')[0] : null);

    return {
      id: instance?.id ?? null,
      name: instance?.name ?? null,
      connectionStatus: instance?.connectionStatus ?? null,
      connected: instance?.connectionStatus === 'open',
      phone,
      profileName: instance?.profileName ?? null,
      profilePicUrl: instance?.profilePicUrl ?? null,
      integration: instance?.integration ?? null,
      chatwootConnected: instance?.Chatwoot?.enabled === true,
      createdAt: instance?.createdAt ?? null,
      updatedAt: instance?.updatedAt ?? null,
      messageCount: instance?._count?.Message ?? 0,
      contactCount: instance?._count?.Contact ?? 0,
      chatCount: instance?._count?.Chat ?? 0,
    };
  }

  @Get('status')
  async status() {
    const chatwootUrl = this.trim(process.env.CHATWOOT_URL);
    const mauticUrl = this.trim(process.env.MAUTIC_URL);
    const evolutionUrl = this.trim(process.env.EVOLUTION_API_URL);

    const [chatwoot, mautic, evolution] = await Promise.all([
      this.probe(chatwootUrl),
      this.probe(mauticUrl),
      this.probe(evolutionUrl),
    ]);

    return {
      chatwoot: {
        ...chatwoot,
        credentialsConfigured: !!process.env.CHATWOOT_API_TOKEN,
        appUrl: chatwootUrl || null,
      },
      mautic: {
        ...mautic,
        credentialsConfigured: !!(
          process.env.MAUTIC_CLIENT_ID && process.env.MAUTIC_CLIENT_SECRET
        ),
      },
      evolution: {
        ...evolution,
        credentialsConfigured: !!process.env.EVOLUTION_API_KEY,
        managerUrl: evolutionUrl ? `${evolutionUrl}/manager` : null,
      },
    };
  }

  @Get('evolution/instances')
  async instances() {
    const base = this.trim(process.env.EVOLUTION_API_URL);
    const key = process.env.EVOLUTION_API_KEY;

    if (!base || !key) {
      return { configured: false, instances: [] };
    }

    try {
      const response = await fetch(`${base}/instance/fetchInstances`, {
        headers: { apikey: key },
      });

      if (!response.ok) {
        return {
          configured: true,
          error: `Evolution HTTP ${response.status}`,
          instances: [],
        };
      }

      const payload = await response.json();
      const instances = Array.isArray(payload) ? payload : [];

      return {
        configured: true,
        instances: instances.map((instance: any) =>
          this.sanitizeEvolutionInstance(instance),
        ),
      };
    } catch {
      return {
        configured: true,
        error: 'Evolution indisponível',
        instances: [],
      };
    }
  }

  @Post('evolution/instances/:instanceName/chatwoot')
  async connectEvolutionToChatwoot(
    @Param('instanceName') instanceName: string,
  ) {
    const evolutionUrl = this.trim(process.env.EVOLUTION_API_URL);
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const chatwootUrl = this.trim(process.env.CHATWOOT_URL);
    const chatwootToken = process.env.CHATWOOT_API_TOKEN;
    const chatwootAccountId = process.env.CHATWOOT_ACCOUNT_ID;

    if (!evolutionUrl || !evolutionKey) {
      throw new BadRequestException('Evolution API não está configurada');
    }

    if (!chatwootUrl || !chatwootToken || !chatwootAccountId) {
      throw new BadRequestException(
        'Chatwoot precisa de URL, token e Account ID configurados',
      );
    }

    const payload = {
      enabled: true,
      accountId: String(chatwootAccountId),
      token: chatwootToken,
      url: chatwootUrl,
      signMsg: false,
      signDelimiter: null,
      nameInbox: `WhatsApp - ${instanceName}`,
      reopenConversation: true,
      conversationPending: false,
      autoCreate: true,
      importContacts: false,
      mergeBrazilContacts: true,
      importMessages: false,
      daysLimitImportMessages: 7,
      ignoreJids: [],
    };

    const response = await fetch(
      `${evolutionUrl}/chatwoot/set/${encodeURIComponent(instanceName)}`,
      {
        method: 'POST',
        headers: {
          apikey: evolutionKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    const body = await response.json().catch(async () => ({
      message: await response.text().catch(() => ''),
    }));

    if (!response.ok) {
      const message =
        body?.response?.message?.[0] ||
        body?.message ||
        `Evolution HTTP ${response.status}`;
      throw new BadRequestException(
        Array.isArray(message) ? message.join(', ') : String(message),
      );
    }

    return {
      ok: true,
      instanceName,
      inboxName: payload.nameInbox,
      chatwootUrl,
      webhookUrl: body?.webhook_url ?? null,
    };
  }
}
