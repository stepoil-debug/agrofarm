# AgroFarm RPG

Jogo isométrico de vida e gestão rural para computador e celular, publicado como PWA no GitHub Pages.

## Base técnica

- **Phaser 3** para renderização, câmera, profundidade, física e controles.
- Projeção isométrica para o mapa, construções e terrenos.
- **Kenney Isometric Miniature Farm** e **Isometric Miniature Bases** como pacote visual CC0.
- Build automático que baixa os assets, registra a licença e os publica em `dist/assets/kenney`.
- Salvamento local durante a validação da jogabilidade.
- Supabase preparado no schema independente `agrofarm`.

## Experiência atual

- Fazenda isométrica com câmera acompanhando o personagem.
- Movimento por WASD, setas ou joystick no celular.
- Zoom pelo scroll do mouse.
- Casa, galpão, Mercado Rural, oficina, rio, ponte, árvores, cercas, animais e elementos decorativos.
- Interação por proximidade com `E`, espaço ou botão **Ação**.
- Clique ou toque direto nos terrenos para trabalhar.
- 16 lotes cultiváveis.
- Enxada, sementes, regador, defensivo e ferramenta de colheita.
- Milho, mandioca e abacaxi com crescimento visual.
- Saldo inicial de 100 moedas.
- Galpão inicial com 10 espaços.
- Venda presencial no Mercado Rural.
- Evolução da casa consumindo saldo e aumentando o multiplicador das vendas.
- Ampliação do galpão.
- Oficina com irrigador, plantadeira e colheitadeira.
- Automação, desgaste, defeitos e reparos.
- Modo Livre e modo Realista com seca, pragas e perdas.
- Missões guiando os primeiros passos.
- Interface adaptada para computador e telefone.

## Executar localmente

Requisito: Node.js 20 ou superior.

```bash
npm run validate
npm run build
npm run dev
```

O servidor local abre em `http://localhost:5173`. Para visualizar os assets Kenney, execute `npm run build`; eles serão baixados para `dist/assets/kenney`.

## Licença dos assets

Os pacotes visuais da Kenney usados no build são disponibilizados sob **CC0 1.0 Universal**. O arquivo `ASSET-LICENSE.txt` é gerado junto aos assets publicados. O código próprio do AgroFarm permanece separado desses arquivos.

## Banco separado

A estrutura Supabase permanece completamente isolada no schema `agrofarm`. Nenhuma tabela do jogo é criada em `public`.

Para configurar um projeto Supabase:

1. Execute as migrations da pasta `supabase/migrations`.
2. Adicione `agrofarm` em **Project Settings → API → Exposed schemas**.
3. Habilite o Google em **Authentication → Providers**.
4. Configure as URLs de redirecionamento.
5. Preencha `public/config.js`.

A versão atual mantém o progresso local durante a fase de validação da jogabilidade. As migrations e RPCs permanecem no repositório para a etapa de sincronização online.

## Build e publicação

O GitHub Actions valida o código, baixa os assets CC0, gera `dist/` e publica automaticamente no GitHub Pages.

## Segurança econômica

O jogo ainda não oferece depósito, saque ou dinheiro real. O modo Realista usa moeda virtual até existir validação jurídica, financeira, antifraude e de jogo responsável.

Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para exclusão e migração do schema separado.
