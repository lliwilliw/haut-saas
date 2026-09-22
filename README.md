# Haut SaaS Starter

Base executável para centralizar Chatwoot, Mautic, Evolution API e Activepieces atrás de um frontend/backend próprio.

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
- status das quatro integrações
- leitura de instâncias Evolution pelo backend
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

Isto é a fundação funcional do produto, não o SaaS final inteiro. Ainda faltam a inbox própria, webhooks, sincronização bidirecional de contatos/mensagens, campanhas Mautic, billing, Meta Cloud API e Google/Meta Ads. A estrutura já está separada para implementar esses módulos sem refazer o núcleo.

## Segurança

Não coloque chaves reais no Git. Use Environment do Easypanel e rotacione segredos já expostos em chats/logs.
