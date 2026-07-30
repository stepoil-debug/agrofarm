# AgroFarm 3D

RPG de gestão rural em **3D real**, desenvolvido com Godot 4 e preparado desde a base para navegador, Android e publicação futura na Google Play.

## Direção atual

A antiga versão 2.5D foi substituída por um projeto mobile-first em `apps/agrofarm-godot`.

A prioridade é construir um jogo divertido e visualmente consistente antes de integrar login, Supabase, depósitos ou qualquer modalidade financeira.

## Tecnologia

- **Godot 4.7.1** com GDScript.
- Renderizador **GL Compatibility**, adequado para navegador e celulares Android intermediários.
- Câmera ortográfica/isométrica em 3D.
- Controle principal por **mouse no computador** e **toque no celular**.
- Exportação Web para GitHub Pages.
- Presets Android para APK de teste e AAB da Google Play.
- Salvamento local em `user://agrofarm_save.json`.
- Banco online preservado no schema isolado `agrofarm`, mas ainda desativado no jogo.

## Conteúdo implementado

### Cenário 3D

- Terreno orgânico cercado por água.
- Caminhos rurais curvos.
- Rio e ponte de madeira.
- Casa da fazenda com varanda, janelas, flores e chaminé.
- Celeiro rural, silo, fardos e depósito.
- Oficina agrícola com trator e ferramentas.
- Feira rural com banca e produtos.
- Galinheiro cercado.
- Curral com vacas 3D animadas.
- Galinhas e aves em movimento.
- Pomar, árvores frutíferas, vegetação, flores e objetos decorativos.
- Iluminação dinâmica, sombras, clima e ciclo de dia/noite.

### Jogabilidade

- Clique ou toque no chão para o personagem caminhar.
- Clique ou toque em um canteiro para caminhar até ele e executar a ferramenta selecionada.
- Clique ou toque nas construções para abrir seus sistemas.
- Preparar terreno, plantar, regar, aplicar defensivo e colher.
- Milho, mandioca e abacaxi com estágios visuais de crescimento em 3D.
- 100 moedas iniciais.
- Galpão inicial com 10 espaços.
- Venda na feira rural.
- Evolução da sede com multiplicador de lucro.
- Ampliação do galpão.
- Irrigador, plantadeira e colheitadeira.
- Automação, desgaste, defeitos e reparos.
- Modo Livre e modo Realista.
- Missões de onboarding.
- Salvamento automático.

## Estrutura

```text
apps/agrofarm-godot/
├── project.godot
├── export_presets.cfg
├── scenes/
│   └── main.tscn
└── scripts/
    ├── main.gd
    ├── farm_world.gd
    ├── crop_plot.gd
    ├── farm_animal.gd
    └── visual_factory.gd
```

A aplicação anterior permanece em `apps/agrofarm-3d` apenas como histórico e não é mais a versão publicada.

## Executar no computador

1. Instale o Godot 4.7.1 ou uma versão compatível da série 4.7.
2. Abra `apps/agrofarm-godot/project.godot`.
3. Pressione **F6/F5** para executar.

Pelo terminal:

```bash
godot --path apps/agrofarm-godot --editor
```

Validação sem interface:

```bash
godot --headless --path apps/agrofarm-godot --editor --quit
```

## Exportar para Web

Instale os templates de exportação do Godot e execute:

```bash
mkdir -p dist
godot --headless --path apps/agrofarm-godot --export-release Web ../../dist/index.html
```

A workflow `pages.yml` faz isso automaticamente ao integrar alterações na `main`.

## Android e Google Play

O projeto é configurado em modo paisagem, usa ARM64 e renderer compatível com dispositivos móveis.

Para exportar localmente:

1. Instale OpenJDK 17 e Android Studio/SDK.
2. Configure os caminhos do Java e Android SDK no Godot.
3. Instale os templates de exportação.
4. Crie um keystore de produção.
5. Preencha as credenciais do preset **Google Play**.
6. Exporte como **AAB**.

O keystore e suas senhas nunca devem ser enviados ao GitHub.

## Otimização mobile

- GL Compatibility em vez de Forward+.
- Geometria procedural low-poly.
- Materiais compartilhados em cache.
- Poucos segmentos em cilindros e esferas.
- Sombras limitadas à área jogável.
- Apenas ARM64 no pacote de produção.
- Interface dimensionada para toque e orientação paisagem.
- Atualizações de HUD, automação e salvamento em frequências reduzidas.
- Sem login, rede ou serviços em segundo plano durante esta fase.

## Schema separado

A estrutura Supabase continua isolada em `agrofarm`. Nenhuma tabela do jogo é criada no schema `public`.

Para remover o domínio futuramente:

```sql
drop schema agrofarm cascade;
```

Login Google e sincronização só serão integrados depois que a jogabilidade e o visual estiverem aprovados.

## Segurança econômica

O jogo não oferece depósito, saque ou dinheiro real. O modo Realista utiliza moeda virtual até existir validação jurídica, financeira, antifraude e de jogo responsável.
