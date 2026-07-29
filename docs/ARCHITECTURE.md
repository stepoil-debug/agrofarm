# Arquitetura do AgroFarm

## Objetivo

O AgroFarm é uma PWA responsiva. A mesma conta funciona no computador e no celular. O cliente apresenta o jogo, enquanto o Supabase mantém autenticação, estado oficial, economia e auditoria.

## Separação no Supabase

Todo o domínio do jogo utiliza o schema `agrofarm`. Nenhuma tabela do jogo é criada em `public`.

Dependências externas intencionais:

- `auth.users`: identidade do login Google.
- `extensions.gen_random_uuid()`: geração de UUID.

Para remover o domínio do banco em ambiente de desenvolvimento:

```sql
drop schema agrofarm cascade;
```

Isso remove tabelas, tipos, funções, políticas e gatilhos do domínio. O usuário de autenticação permanece no Supabase Auth.

## Exposição pela API

No painel do Supabase, inclua `agrofarm` em **Project Settings → API → Exposed schemas**. As requisições usam os cabeçalhos `Accept-Profile: agrofarm` e `Content-Profile: agrofarm`.

## Autoridade do servidor

As ações que alteram saldo são RPCs transacionais:

- `bootstrap_player`
- `upgrade_headquarters`
- `upgrade_warehouse`
- `plant_crop`
- `care_crop`
- `harvest_crop`
- `sell_crop`
- `buy_machine`
- `repair_machine`
- `set_machine_automation`
- `run_automation_cycle`

O frontend não atualiza `coins` diretamente quando está conectado.

## Migração futura

1. Exportar o schema: `supabase db dump --schema agrofarm --file agrofarm.sql`.
2. Exportar os dados do schema conforme a estratégia do ambiente.
3. Criar o novo projeto e configurar Google OAuth.
4. Executar a migration.
5. Importar dados preservando os UUIDs dos usuários ou criar um mapa de IDs.
6. Alterar somente `public/config.js`.

## Estado do MVP

Sem configuração Supabase, o jogo entra em demonstração e persiste no `localStorage`. Com a configuração preenchida, o login Google, a criação automática da fazenda e as ações por RPC são habilitados.
