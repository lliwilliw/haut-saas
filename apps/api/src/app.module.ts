import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth.controller';
import { ContactsController } from './contacts.controller';
import { CrmController } from './crm.controller';
import { IntegrationsController } from './integrations.controller';
import { HealthController } from './health.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
@Module({
  imports:[ConfigModule.forRoot({isGlobal:true}),JwtModule.register({global:true,secret:process.env.JWT_SECRET||'development-only-change-me',signOptions:{expiresIn:'7d'}})],
  controllers:[HealthController,AuthController,ContactsController,CrmController,IntegrationsController],
  providers:[PrismaService,JwtAuthGuard],
})
export class AppModule{}
