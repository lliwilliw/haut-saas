import { Controller,Get,UseGuards } from '@nestjs/common';
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
}
