import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap(){
  const app=await NestFactory.create(AppModule);
  const origins=(process.env.CORS_ORIGIN||'').split(',').map(v=>v.trim()).filter(Boolean);
  app.enableCors({origin:origins.length?origins:true,credentials:true});
  app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true}));
  const port=Number(process.env.PORT||3001);
  await app.listen(port,'0.0.0.0');
  console.log(`API listening on ${port}`);
}
bootstrap();
