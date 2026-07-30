# AgroFarm 3D — reconstrução visual

## Objetivo

Substituir o protótipo isométrico 2D por uma fazenda 3D estilizada, com câmera ortográfica, iluminação, sombras, animações e modelos reais. A referência visual é um jogo casual de fazenda moderno; não serão copiados nomes, artes, mapas ou interfaces de jogos comerciais.

## Decisão técnica

- Motor: PlayCanvas Engine.
- Linguagem: TypeScript.
- Renderização: WebGL2, com WebGPU quando disponível.
- Modelos: glTF/GLB otimizados para navegador e celular.
- Backend: Supabase no schema isolado `agrofarm`.
- Publicação: GitHub Pages para web; empacotamento móvel poderá ser feito posteriormente.

Java/libGDX foi descartado para a versão web. O backend HTML5 do libGDX transpila Java para JavaScript via GWT e adiciona restrições sem melhorar a qualidade visual. O problema atual é direção de arte, modelos, animações, câmera e iluminação.

## Fontes legais de assets

- Quaternius Ultimate Crops Pack — CC0 — 100+ culturas em cinco estágios.
- Quaternius Farm Animal Pack — CC0 — animais com animações.
- Quaternius Ultimate Stylized Nature Pack — CC0 — árvores, pedras e vegetação.
- KayKit Character Pack — CC0 — personagem rigado e animado.
- Kenney assets — CC0 — interface, efeitos e objetos auxiliares.

Cada arquivo incorporado deverá ter origem e licença registradas em `apps/agrofarm-3d/public/assets/credits.json`.

## Critério para substituir a versão pública

A branch só poderá entrar em `main` quando a fatia vertical tiver:

1. Uma cena de fazenda visualmente completa, sem objetos provisórios aparentes.
2. Câmera ortográfica com zoom e movimento suave.
3. Personagem animado caminhando por clique, teclado e toque.
4. Casa, galpão, mercado, oficina, cercas, árvores e água com modelos 3D.
5. Plantio com pelo menos quatro estágios visuais por cultura.
6. Vacas e galinhas animadas.
7. Sombras, iluminação, partículas e feedback de interação.
8. HUD responsivo sem cobrir a fazenda.
9. Desempenho mínimo de 45 FPS em Android intermediário e 60 FPS em desktop.
10. Economia atual preservada: 100 moedas, galpão 10, upgrades, perdas, máquinas e automação.

## Fases

### Fase 1 — Fatia vertical

Uma única área de fazenda com casa, seis lotes, uma vaca, uma galinha, milho, mercado e personagem.

### Fase 2 — Sistemas econômicos

Galpão, upgrades, multiplicador de venda, máquinas, manutenção e modo realista.

### Fase 3 — Conta e persistência

Login Google e sincronização no schema `agrofarm`.

### Fase 4 — Expansão

Construção livre, novas cadeias produtivas, funcionários, veículos e múltiplas propriedades.
