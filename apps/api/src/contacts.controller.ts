import { BadRequestException,Body,Controller,Get,Post,Query,Req,UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';
@UseGuards(JwtAuthGuard) @Controller('contacts')
export class ContactsController{
  constructor(private prisma:PrismaService){}
  @Get() list(@Req() req:any,@Query('take') raw?:string){const take=Math.min(Math.max(Number(raw||100),1),200);return this.prisma.contact.findMany({where:{organizationId:req.user.organizationId},orderBy:{createdAt:'desc'},take});}
  @Post() create(@Req() req:any,@Body() b:any){const firstName=String(b.firstName||'').trim();if(!firstName) throw new BadRequestException('Nome é obrigatório');return this.prisma.contact.create({data:{organizationId:req.user.organizationId,firstName,lastName:String(b.lastName||'').trim()||null,email:String(b.email||'').trim().toLowerCase()||null,phone:String(b.phone||'').trim()||null,tags:Array.isArray(b.tags)?b.tags:[]}});}
}
