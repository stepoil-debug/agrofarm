# Agro Farm 3D — criação profissional

Esta etapa inicia a criação real do **Agro Farm 3D**, separada do protótipo antigo em bloco.

## Decisão técnica

A base correta para o jogo de verdade passa a ser:

- Unity 6
- Universal Render Pipeline
- foco mobile primeiro
- visual 3D estilizado e leve
- personagens baseados nas artes oficiais enviadas
- estrutura preparada para Android, iOS e WebGL

## O que foi criado no pacote Unity

- Projeto Unity organizado.
- Cena inicial `Assets/AgroFarm3D/Scenes/AgroFarm3D.unity`.
- Tela de capa usando a arte oficial.
- Criação de perfil com nome do personagem.
- Escolha entre personagem masculino e feminino.
- Personagem inicial em formato billboard 2.5D usando as imagens oficiais.
- Fazenda 3D inicial com terreno, estrada, casa, loja e lotes.
- 4 lotes iniciais.
- Expansão até 36 lotes.
- Sistema de plantar, regar, colher e vender.
- Loja com construções: Galinheiro, Estábulo, Chiqueiro, Silo e Galpão.
- Animais bloqueados por construção.
- Mini mapa funcional.
- HUD mobile.
- Save local.

## Padrão visual

A referência visual oficial passa a ser:

- capa Agro Farm enviada pelo Douglas;
- personagem masculino fazendeiro;
- personagem feminina fazendeira;
- fazenda brasileira;
- estilo colorido, premium e otimizado.

## Próximas etapas

1. Trocar billboards por modelos 3D reais.
2. Criar rig humanoide masculino e feminino.
3. Criar animações: andar, correr, plantar, regar, colher, interagir.
4. Criar cenário definitivo com terreno, vegetação, casa, loja, galinheiro e estábulo.
5. Criar build Android/iOS/WebGL.
6. Otimizar com profiling real em celular.

## Observação importante

O pacote criado é a fundação correta do jogo 3D. Ele já é jogável como starter, mas ainda não substitui a fase artística final, que exige modelos 3D reais, animações e assets otimizados.