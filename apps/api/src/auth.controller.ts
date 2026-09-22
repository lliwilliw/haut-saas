import { BadRequestException,Body,Controller,Get,Post,Req,UnauthorizedException,UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { compare,hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from './jwt-auth.guard';
@Controller('auth')
export class AuthController{
  constructor(private prisma:PrismaService,private jwt:JwtService){}
  private token(user:any,m:any){return this.jwt.sign({sub:user.id,userId:user.id,email:user.email,organizationId:m.organizationId,role:m.role});}
  @Post('register') async register(@Body() body:any){
    const name=String(body.name||'').trim(),email=String(body.email||'').trim().toLowerCase(),password=String(body.password||''),organizationName=String(body.organizationName||'').trim();
    if(name.length<2||organizationName.length<2||!email.includes('@')||password.length<8) throw new BadRequestException('Preencha nome, empresa, e-mail e senha de 8+ caracteres');
    if(await this.prisma.user.findUnique({where:{email}})) throw new BadRequestException('Este e-mail já está cadastrado');
    const passwordHash=await hash(password,12);
    const result=await this.prisma.$transaction(async tx=>{
      const user=await tx.user.create({data:{name,email,passwordHash}});
      const base=organizationName.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'empresa';
      const organization=await tx.organization.create({data:{name:organizationName,slug:`${base}-${randomUUID().slice(0,6)}`}});
      const membership=await tx.membership.create({data:{userId:user.id,organizationId:organization.id,role:'OWNER'}});
      await tx.pipeline.create({data:{organizationId:organization.id,name:'Vendas',stages:{create:[{name:'Novo',position:1},{name:'Qualificação',position:2},{name:'Proposta',position:3},{name:'Ganho',position:4}]}}});
      return {user,organization,membership};
    });
    return {accessToken:this.token(result.user,result.membership),user:{id:result.user.id,name:result.user.name,email:result.user.email},organization:result.organization,role:result.membership.role};
  }
  @Post('login') async login(@Body() body:any){
    const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
    const user=await this.prisma.user.findUnique({where:{email},include:{memberships:{include:{organization:true},orderBy:{createdAt:'asc'}}}});
    if(!user||!(await compare(password,user.passwordHash))) throw new UnauthorizedException('E-mail ou senha inválidos');
    const membership=user.memberships[0]; if(!membership) throw new UnauthorizedException('Usuário sem organização');
    return {accessToken:this.token(user,membership),user:{id:user.id,name:user.name,email:user.email},organization:membership.organization,role:membership.role};
  }
  @UseGuards(JwtAuthGuard) @Get('me') async me(@Req() req:any){
    const m=await this.prisma.membership.findUnique({where:{userId_organizationId:{userId:req.user.userId,organizationId:req.user.organizationId}},include:{user:{select:{id:true,email:true,name:true,createdAt:true}},organization:true}});
    if(!m) throw new UnauthorizedException(); return {user:m.user,organization:m.organization,role:m.role};
  }
}
