# cleanup-orphans

Remove do bucket privado `books` as sobras de arquivos:

1. pastas de usuários que não existem mais em `auth.users`;
2. pastas de livros sem linha em `public.books` (mesmo `id` e `user_id`), só se
   **todos** os arquivos tiverem mais de 24 h. Nada com menos de 24 h é apagado
   (um envio em andamento ainda não tem linha no banco).

Limites por chamada: no máximo 500 arquivos removidos e ~50 s de execução. Se
sobrar trabalho, a resposta traz `"truncado": true`; a próxima execução continua.

**Segurança:** a função usa a chave `service_role`, que o Supabase injeta sozinho
no ambiente da função. Essa chave e o `CLEANUP_SECRET` ficam apenas no servidor
(secrets da função e Vault do banco). Nunca coloque nenhum dos dois no app, em
`NEXT_PUBLIC_*` ou no navegador.

## 1. Criar o segredo

Gere um valor longo e aleatório e guarde-o (você vai usá-lo de novo no passo 4):

```bash
openssl rand -hex 32
supabase secrets set CLEANUP_SECRET=<valor-gerado> --project-ref <PROJECT_REF>
```

## 2. Deploy

```bash
supabase functions deploy cleanup-orphans --no-verify-jwt --project-ref <PROJECT_REF>
```

`--no-verify-jwt` é necessário porque quem chama é o agendador do banco, não um
usuário logado. A proteção é o header `x-cleanup-secret` (401 se faltar ou errar).

## 3. Testar primeiro em modo dry (não apaga nada)

```bash
curl -s -X POST \
  -H "x-cleanup-secret: <valor-gerado>" \
  "https://<PROJECT_REF>.supabase.co/functions/v1/cleanup-orphans?dry=1"
```

Resposta: `{ dry, removed: 0, removeria, bytes_estimados, usuarios_orfaos, livros_orfaos, truncado, erros }`.
Os ids vêm abreviados (8 primeiros caracteres do usuário). Confira se a lista faz
sentido. Sem o header (ou com valor errado) deve responder 401. Só depois rode
sem `?dry=1` para apagar de verdade. `?max=50` reduz o limite da execução.

## 4. Agendar uma vez por dia (pg_cron + pg_net)

1. No painel: **Database > Extensions**, ative `pg_cron` e `pg_net`.
2. Guarde o segredo no Vault (SQL Editor), usando o mesmo valor do passo 1:
   `select vault.create_secret('<valor-gerado>', 'cleanup_secret');`
3. Abra `supabase/migrations/20261107000001_cleanup_orphans_cron.sql.example`,
   troque `<PROJECT_REF>` e rode o conteúdo no SQL Editor. O arquivo é `.example`
   de propósito: não deve rodar como migration automática.
4. Verifique: `select * from cron.job;` e, no dia seguinte,
   `select * from cron.job_run_details order by start_time desc limit 5;`.
   O resultado da chamada HTTP fica em `select * from net._http_response order by created desc limit 5;`.

Para desligar: `select cron.unschedule('cleanup-orphans-daily');`.
