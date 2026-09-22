# Haut SaaS Starter

Base executável para centralizar Chatwoot, Mautic e Evolution API atrás de um frontend/backend próprio.

## Incluído

- Next.js frontend
- NestJS API
- BullMQ worker
- PostgreSQL + Prisma
- Redis
- cadastro/login JWT
- organização multi-tenant inicial
- contatos
- pipeline CRM e negócios
- status das três integrações principais
- leitura segura de instâncias Evolution pelo backend
- visualização amigável das instâncias WhatsApp, sem expor tokens
- Dockerfiles para Easypanel
- Docker Compose para teste local

## Teste local

```bash
cp .env.example .env
docker compose up --build
```

Abra `http://localhost:3000`. A API responde em `http://localhost:3001/health`.

No primeiro cadastro, o sistema cria a organização e um pipeline padrão com Novo, Qualificação, Proposta e Ganho.

## Deploy

Veja `EASYPANEL.md`.

## Escopo desta versão

Isto é a fundação funcional do produto, não o SaaS final inteiro. Ainda faltam a inbox própria, webhooks, sincronização bidirecional de contatos/mensagens, campanhas Mautic, billing, Meta Cloud API e Google/Meta Ads. As automações centrais ficam no backend/worker próprio; não há dependência de Activepieces.

## Segurança

Não coloque chaves reais no Git. Use Environment do Easypanel e rotacione segredos já expostos em chats/logs. O backend filtra a resposta da Evolution antes de enviá-la ao navegador para não expor o token da instância.
