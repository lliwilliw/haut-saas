import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  private trim(v?: string) {
    return (v || '').replace(/\/+$/, '');
  }

  private async probe(url?: string) {
    if (!url) return false;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
      });
      return response.status < 500;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  @Get('status')
  async status() {
    const [messaging, marketing] = await Promise.all([
      this.probe(this.trim(process.env.EVOLUTION_API_URL)),
      this.probe(this.trim(process.env.MAUTIC_URL)),
    ]);

    return {
      messaging,
      marketing,
      tenantProvisioning:
        !!process.env.CHATWOOT_PLATFORM_TOKEN &&
        !!process.env.CHATWOOT_URL &&
        !!process.env.EVOLUTION_API_KEY,
    };
  }
}
