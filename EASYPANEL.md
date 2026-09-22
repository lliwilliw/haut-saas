# Deploy no Easypanel

Crie no mesmo projeto cinco serviços novos:

- `saas-db` — PostgreSQL
- `saas-redis` — Redis
- `saas-api` — App
- `saas-worker` — App
- `saas-web` — App

## 1) saas-db

Crie PostgreSQL, database `haut_saas`, usuário `postgres`, senha gerada pelo Easypanel. Em **Credentials**, copie a **Internal Connection URL**. Não exponha o banco publicamente.

## 2) saas-redis

Crie Redis, deixe o Easypanel gerar a senha e copie a **Internal Connection URL**. Não exponha Redis publicamente.

## 3) saas-api

Source: GitHub ou Git.

- Build Path: `/`
- Builder: Dockerfile
- Dockerfile: `apps/api/Dockerfile`
- Porta: `3001`

Environment:

```env
PORT=3001
DATABASE_URL=COLE_A_INTERNAL_CONNECTION_URL_DO_SAAS_DB
REDIS_URL=COLE_A_INTERNAL_CONNECTION_URL_DO_SAAS_REDIS
JWT_SECRET=GERE_UM_SEGREDO_ALEATORIO_LONGO
CORS_ORIGIN=https://DOMINIO_DO_SAAS_WEB

CHATWOOT_URL=https://DOMINIO_DO_CHATWOOT
CHATWOOT_API_TOKEN=
CHATWOOT_ACCOUNT_ID=

MAUTIC_URL=https://DOMINIO_DO_MAUTIC
MAUTIC_CLIENT_ID=
MAUTIC_CLIENT_SECRET=

EVOLUTION_API_URL=https://DOMINIO_DA_EVOLUTION
EVOLUTION_API_KEY=SUA_CHAVE_GLOBAL
```

Crie domínio temporário e teste `https://DOMINIO_DA_API/health`. Deve retornar `{"status":"ok",...}`.

A API executa `prisma migrate deploy` automaticamente ao iniciar.

## 4) saas-worker

- Build Path: `/`
- Dockerfile: `apps/worker/Dockerfile`
- Environment: `REDIS_URL=...` usando a Internal Connection URL do Redis
- Não precisa de domínio

Nos logs deve aparecer `waiting for integration-sync jobs`.

## 5) saas-web

- Build Path: `/`
- Dockerfile: `apps/web/Dockerfile`
- Porta: `3000`
- Environment: `API_URL=https://DOMINIO_PUBLICO_DA_API`

Crie domínio temporário. Depois volte ao `saas-api`, ajuste `CORS_ORIGIN` para esse domínio e faça redeploy.

## Teste funcional

1. Abra `saas-web`.
2. Crie a primeira conta/empresa.
3. Entre no Dashboard.
4. Crie um contato.
5. Crie um negócio no CRM.
6. Abra Integrações.
7. Chatwoot, Mautic e Evolution devem aparecer alcançáveis quando configurados.
8. A seção WhatsApp mostra as instâncias Evolution sem token ou dados internos.
9. Use o botão **Abrir Evolution Manager** para verificar conexão, QR Code e estado da sessão.

## Próximo módulo

- webhook Evolution -> backend
- contato unificado
- sincronização Chatwoot
- envio/recebimento de mensagens
- inbox em tempo real
