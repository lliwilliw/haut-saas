import { BadRequestException,Body,Controller,Get,Param,Patch,Post,Req,UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';
@UseGuards(JwtAuthGuard) @Controller()
export class CrmController{
  constructor(private prisma:PrismaService){}
  @Get('pipelines') list(@Req() req:any){return this.prisma.pipeline.findMany({where:{organizationId:req.user.organizationId},include:{stages:{orderBy:{position:'asc'}},deals:{include:{contact:true,stage:true},orderBy:{createdAt:'desc'}}},orderBy:{createdAt:'asc'}});}
  @Post('pipelines') createPipeline(@Req() req:any,@Body() b:any){const name=String(b.name||'').trim();if(!name) throw new BadRequestException('Nome obrigatório');const stages=(Array.isArray(b.stages)?b.stages:['Novo']).filter(Boolean);return this.prisma.pipeline.create({data:{organizationId:req.user.organizationId,name,stages:{create:stages.map((x:string,i:number)=>({name:String(x),position:i+1}))}},include:{stages:true}});}
  @Post('deals') async createDeal(@Req() req:any,@Body() b:any){const p=await this.prisma.pipeline.findFirst({where:{id:b.pipelineId,organizationId:req.user.organizationId}}),s=await this.prisma.pipelineStage.findFirst({where:{id:b.stageId,pipelineId:b.pipelineId}});if(!p||!s) throw new BadRequestException('Pipeline ou etapa inválidos');return this.prisma.deal.create({data:{organizationId:req.user.organizationId,pipelineId:b.pipelineId,stageId:b.stageId,contactId:b.contactId||null,title:String(b.title||'Negócio'),valueCents:Number(b.valueCents||0)}});}
  @Patch('deals/:id/stage') async move(@Req() req:any,@Param('id') id:string,@Body() b:any){const d=await this.prisma.deal.findFirst({where:{id,organizationId:req.user.organizationId}});if(!d) throw new BadRequestException('Negócio não encontrado');const s=await this.prisma.pipelineStage.findFirst({where:{id:b.stageId,pipelineId:d.pipelineId}});if(!s) throw new BadRequestException('Etapa inválida');return this.prisma.deal.update({where:{id},data:{stageId:b.stageId}});}
}
