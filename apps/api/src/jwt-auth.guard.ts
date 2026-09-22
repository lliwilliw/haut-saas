import { CanActivate,ExecutionContext,Injectable,UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class JwtAuthGuard implements CanActivate{
  constructor(private readonly jwt:JwtService){}
  canActivate(context:ExecutionContext){
    const req=context.switchToHttp().getRequest();
    const header=req.headers.authorization||'';
    if(!header.startsWith('Bearer ')) throw new UnauthorizedException('Token ausente');
    try{req.user=this.jwt.verify(header.slice(7));return true;}catch{throw new UnauthorizedException('Token inválido ou expirado');}
  }
}
