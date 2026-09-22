import { Controller,Get,UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
@UseGuards(JwtAuthGuard) @Controller('integrations')
export class IntegrationsController{
  private trim(v?:string){return (v||'').replace(/\/+$/,'');}
  private async probe(url?:string){if(!url)return {configured:false,reachable:false};const c=new AbortController(),t=setTimeout(()=>c.abort(),4000);try{const r=await fetch(url,{signal:c.signal,redirect:'follow'});return {configured:true,reachable:r.status<500,statusCode:r.status};}catch{return {configured:true,reachable:false};}finally{clearTimeout(t);}}
  @Get('status') async status(){const cw=this.trim(process.env.CHATWOOT_URL),ma=this.trim(process.env.MAUTIC_URL),ev=this.trim(process.env.EVOLUTION_API_URL),ap=this.trim(process.env.ACTIVEPIECES_URL);const [a,b,c,d]=await Promise.all([this.probe(cw),this.probe(ma),this.probe(ev),this.probe(ap)]);return {chatwoot:{...a,credentialsConfigured:!!process.env.CHATWOOT_API_TOKEN},mautic:{...b,credentialsConfigured:!!(process.env.MAUTIC_CLIENT_ID&&process.env.MAUTIC_CLIENT_SECRET)},evolution:{...c,credentialsConfigured:!!process.env.EVOLUTION_API_KEY},activepieces:{...d,credentialsConfigured:!!process.env.ACTIVEPIECES_API_KEY}};}
  @Get('evolution/instances') async instances(){const base=this.trim(process.env.EVOLUTION_API_URL),key=process.env.EVOLUTION_API_KEY;if(!base||!key)return {configured:false,instances:[]};try{const r=await fetch(`${base}/instance/fetchInstances`,{headers:{apikey:key}});if(!r.ok)return {configured:true,error:`Evolution HTTP ${r.status}`,instances:[]};return {configured:true,instances:await r.json()};}catch{return {configured:true,error:'Evolution indisponível',instances:[]};}}
}
