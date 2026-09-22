# Deploy no Easypanel

## Serviços Haut

- `saas-db` — PostgreSQL
- `saas-redis` — Redis
- `saas-api` — NestJS
- `saas-worker` — jobs
- `saas-web` — Next.js

Nos serviços Haut, deixe **Criar arquivo .env desmarcado**. O Easypanel deve injetar as variáveis diretamente no ambiente do container.

## saas-api

- Build Path: `/`
- Dockerfile: `apps/api/Dockerfile`
- Porta: `3001`

Environment:

```env
PORT=3001
DATABASE_URL=COLE_A_INTERNAL_CONNECTION_URL_DO_SAAS_DB
REDIS_URL=COLE_A_INTERNAL_CONNECTION_URL_DO_SAAS_REDIS

JWT_SECRET=SEGREDO_ALEATORIO_FORTE
INTEGRATION_ENCRYPTION_KEY=OUTRO_SEGREDO_ALEATORIO_FORTE
CORS_ORIGIN=https://DOMINIO_DO_SAAS_WEB

CHATWOOT_URL=https://DOMINIO_INTERNO_OU_PUBLICO_DO_CHATWOOT
CHATWOOT_PLATFORM_TOKEN=TOKEN_DA_PLATFORM_APP

MAUTIC_URL=https://DOMINIO_DO_MAUTIC
MAUTIC_CLIENT_ID=
MAUTIC_CLIENT_SECRET=

EVOLUTION_API_URL=https://DOMINIO_DA_EVOLUTION
EVOLUTION_API_KEY=CHAVE_GLOBAL_DA_EVOLUTION
```

Gere `JWT_SECRET` e `INTEGRATION_ENCRYPTION_KEY` separadamente. Não reutilize a mesma chave.

A API executa `prisma migrate deploy` ao iniciar. Portanto, um redeploy do `saas-api` aplica automaticamente as migrations novas de equipe, convites, cofre e auditoria.

## Chatwoot

No Chatwoot, o administrador da plataforma cria uma única **Platform App** para o Haut. O token desta Platform App fica somente no `saas-api`.

Na Evolution mantenha:

```env
CHATWOOT_ENABLED=true
```

Quando um cliente conecta o WhatsApp no Haut:

1. o Haut identifica a organização pelo JWT;
2. provisiona a conta interna de atendimento daquela organização;
3. cria a instância de WhatsApp daquela organização;
4. conecta as engines internamente;
5. devolve somente QR Code, estado e dados seguros para a interface Haut.

O cliente não recebe tokens ou URLs administrativas das engines.

## saas-worker

- Build Path: `/`
- Dockerfile: `apps/worker/Dockerfile`
- `REDIS_URL` deve usar a Internal Connection URL
- não precisa de domínio

## saas-web

- Build Path: `/`
- Dockerfile: `apps/web/Dockerfile`
- Porta: `3000`
- `API_URL=https://DOMINIO_PUBLICO_DA_API`

Não coloque tokens privados no `saas-web`.

## Testes após deploy

1. Faça login como OWNER.
2. Abra **Equipe** e crie um convite.
3. Abra o link do convite em janela anônima e aceite.
4. Confirme que o novo usuário aparece somente na organização correta.
5. Altere o papel e confirme que permissões sensíveis retornam 403 para papéis sem acesso.
6. Abra **Canais** e valide o WhatsApp da organização.
7. Confirme que o frontend não exibe token, nome técnico de instância, API key ou URL administrativa.

## Próximo módulo

Depois desta fundação, o próximo módulo de produto é a Inbox do Haut: conversas e mensagens dentro da própria interface, mantendo Chatwoot e Evolution invisíveis no backend.
