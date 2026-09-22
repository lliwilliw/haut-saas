import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const header = req.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token ausente');
    }

    let payload: any;

    try {
      payload = this.jwt.verify(header.slice(7));
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: payload.userId,
          organizationId: payload.organizationId,
        },
      },
    });

    if (!membership) {
      throw new UnauthorizedException('Acesso à organização revogado');
    }

    req.user = {
      ...payload,
      role: membership.role,
    };

    return true;
  }
}
