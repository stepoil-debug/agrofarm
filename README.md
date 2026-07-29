# AgroFarm RPG

Jogo 2D de vida rural para computador e celular, publicado como PWA no GitHub Pages.

## Experiência atual

- Mapa aberto com personagem controlável.
- Movimento por WASD, setas ou joystick no celular.
- Casa, galpão, mercado, oficina, lago, árvores, caminhos e animais.
- Interação por proximidade usando `E`, espaço ou o botão **Ação**.
- 16 terrenos cultiváveis dentro do mapa.
- Enxada, sementes, regador, defensivo e ferramenta de colheita.
- Milho, mandioca e abacaxi com estágios visuais de crescimento.
- Saldo inicial de 100 moedas.
- Galpão inicial com 10 espaços.
- Venda da produção presencialmente no Mercado Rural.
- Melhoria da sede consumindo saldo e aumentando o multiplicador das vendas.
- Ampliação do galpão.
- Oficina com irrigador, plantadeira e colheitadeira.
- Automação, desgaste, defeitos e reparos.
- Modo Livre e modo Realista com seca, pragas e perdas.
- Missões guiando os primeiros passos.
- Ciclo visual de iluminação.
- Salvamento automático no navegador.
- Interface adaptada para computador e telefone.

## Executar localmente

Requisito: Node.js 20 ou superior.

```bash
npm run validate
npm run dev
```

Abra `http://localhost:5173`.

## Banco separado

A estrutura Supabase permanece completamente isolada no schema `agrofarm`. Nenhuma tabela do jogo é criada em `public`.

Para configurar um projeto Supabase:

1. Execute as migrations da pasta `supabase/migrations`.
2. Adicione `agrofarm` em **Project Settings → API → Exposed schemas**.
3. Habilite o Google em **Authentication → Providers**.
4. Configure as URLs de redirecionamento.
5. Preencha `public/config.js`.

A versão 2D atualmente mantém o progresso local durante a fase de validação da jogabilidade. As migrations e RPCs permanecem no repositório para a etapa de sincronização online.

## Build e publicação

```bash
npm run build
```

O GitHub Actions valida o código, gera `dist/` e publica automaticamente no GitHub Pages.

## Segurança econômica

O jogo ainda não oferece depósito, saque ou dinheiro real. O modo Realista usa moeda virtual até existir validação jurídica, financeira, antifraude e de jogo responsável.

Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para exclusão e migração do schema separado.
