# AgroFarm RPG

MVP jogável de gerenciamento rural para computador e celular.

## O que já funciona

- Saldo inicial de 100 moedas.
- Sede nível 1 com multiplicador de venda.
- Galpão inicial com 10 espaços.
- Milho, mandioca e abacaxi.
- Plantio, irrigação, defensivo, crescimento, colheita e venda.
- Modo Livre e modo Realista com moeda virtual.
- Risco de seca, pragas, perda de produção e falta de espaço.
- Evolução da sede consumindo saldo e aumentando o lucro.
- Ampliação do galpão.
- Compra, automação, desgaste, defeito e reparo de máquinas.
- Interface responsiva para computador e celular.
- PWA instalável e funcionamento offline no modo demonstração.
- Login Google e sincronização preparados com Supabase.
- Banco completamente isolado no schema `agrofarm`.
- Ledger financeiro, RLS e RPCs transacionais no servidor.

## Executar localmente

Requisito: Node.js 20 ou superior.

```bash
npm run validate
npm run dev
```

Abra `http://localhost:5173`.

## Configurar o Supabase

1. Execute `supabase/migrations/20260729190000_agrofarm_init.sql` no projeto.
2. Em **Project Settings → API → Exposed schemas**, adicione `agrofarm`.
3. Em **Authentication → Providers**, habilite Google.
4. Configure as URLs de redirecionamento do ambiente local e do domínio publicado.
5. Preencha `public/config.js`:

```js
window.AGROFARM_CONFIG = {
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabaseAnonKey: 'SUA_CHAVE_ANON',
}
```

Sem essa configuração, o jogo funciona em modo demonstração e salva no navegador.

## Build e deploy

```bash
npm run build
```

O resultado será criado em `dist/`. O arquivo `netlify.toml` já está preparado para publicação na Netlify.

## Segurança econômica

Quando conectado, o navegador não altera saldo diretamente. Plantio, cuidados, colheita, venda, upgrades, compra e reparo de máquinas passam por funções SQL transacionais do schema `agrofarm`.

O MVP não oferece depósito, saque ou dinheiro real. O modo Realista utiliza moeda virtual até existir validação jurídica, financeira e de jogo responsável.

Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para exclusão, migração e funcionamento do schema separado.
