import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth.controller';
import { ContactsController } from './contacts.controller';
import { CrmController } from './crm.controller';
import { IntegrationsController } from './integrations.controller';
import { WhatsAppController } from './whatsapp.controller';
import { TeamController } from './team.controller';
import { VaultController } from './vault.controller';
import { AuditController } from './audit.controller';
import { HealthController } from './health.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SecretService } from './secret.service';
import { ChatwootPlatformService } from './chatwoot-platform.service';
import { AuditService } from './audit.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'development-only-change-me',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    HealthController,
    AuthController,
    ContactsController,
    CrmController,
    IntegrationsController,
    WhatsAppController,
    TeamController,
    VaultController,
    AuditController,
  ],
  providers: [
    PrismaService,
    JwtAuthGuard,
    SecretService,
    ChatwootPlatformService,
    AuditService,
  ],
})
export class AppModule {}
