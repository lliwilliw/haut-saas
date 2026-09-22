# Haut SaaS

Produto SaaS multi-tenant que usa engines internas de mensageria, atendimento e marketing sem expô-las ao cliente final.

## Arquitetura

O navegador fala somente com o backend do Haut SaaS.

- Next.js — frontend do produto
- NestJS — API multi-tenant
- PostgreSQL + Prisma — dados do produto
- Redis + worker — jobs e automações
- Evolution API — engine interna de WhatsApp
- Chatwoot — engine interna de atendimento
- Mautic — engine interna de marketing

O cliente não precisa acessar, conhecer ou configurar diretamente Evolution, Chatwoot ou Mautic.

## Fundação SaaS

- organizações isoladas por `organizationId`
- usuários e memberships
- papéis OWNER, ADMIN, MANAGER, AGENT, MARKETING e VIEWER
- convites de equipe com token de uso único e expiração
- revogação imediata de acesso: o membership é revalidado em cada requisição autenticada
- RBAC no backend
- cofre de credenciais por organização com AES-256-GCM
- credenciais nunca retornadas em texto puro depois de salvas
- auditoria por organização
- provisionamento de WhatsApp por tenant
- provisionamento de conta interna de atendimento por tenant
- contatos e CRM escopados por organização

## Desenvolvimento local

```bash
cp .env.example .env
docker compose up --build
```

Abra `http://localhost:3000`. A API responde em `http://localhost:3001/health`.

## Deploy

Veja `EASYPANEL.md`.

## Segurança

Segredos ficam apenas nos serviços backend. Não use credenciais privadas em `NEXT_PUBLIC_*`, não grave segredos no Git e não habilite a criação de arquivo `.env` no Easypanel para os serviços Haut.

Credenciais internas por tenant são criptografadas antes de persistirem no banco. Endpoints sensíveis também verificam organização e papel no backend; esconder controles no frontend não é considerado mecanismo de autorização.
