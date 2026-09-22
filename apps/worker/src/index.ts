import { Worker } from 'bullmq';
const u=new URL(process.env.REDIS_URL||'redis://localhost:6379');
const connection:any={host:u.hostname,port:Number(u.port||6379),username:u.username||undefined,password:u.password||undefined,maxRetriesPerRequest:null};
const worker=new Worker('integration-sync',async job=>{console.log('[worker]',job.name,job.data);return {ok:true,processedAt:new Date().toISOString()};},{connection});
worker.on('completed',job=>console.log('[worker] completed',job.id));
worker.on('failed',(job,error)=>console.error('[worker] failed',job?.id,error));
console.log('[worker] waiting for integration-sync jobs');
const shutdown=async()=>{await worker.close();process.exit(0)};process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
