# AgroFarm RPG — Unity 6.3 URP

Nova base do AgroFarm criada em **Unity 6.3 LTS**, com foco em Android/Google Play, PC e WebGL.

> A versão Godot publicada continua ativa até esta versão Unity passar por compilação, teste em aparelho real e aprovação visual.

## Abrir o projeto

1. Instale **Unity 6000.3.18f1** pelo Unity Hub.
2. Adicione os módulos:
   - Android Build Support;
   - Android SDK & NDK Tools;
   - OpenJDK;
   - WebGL Build Support.
3. Abra a pasta `apps/agrofarm-unity`.
4. Aguarde a instalação dos pacotes.
5. O menu `AgroFarm > Configurar projeto completo` cria a cena, configura Android e gera/aplica o URP automaticamente.
6. Abra `Assets/AgroFarm/Scenes/Main.unity` e pressione Play.

O jogo é inicializado em runtime por `AgroFarmBootstrap`; a cena pode permanecer vazia.

## Controles

### Computador

- Clique no chão: caminhar.
- Clique em um canteiro ou construção: caminhar e interagir.
- WASD ou setas: controle direto alternativo.
- Espaço: pular.
- Botão direito ou botão do meio + arrastar: girar câmera.
- Scroll: zoom.

### Android

- Toque no chão: caminhar.
- Toque em elemento: caminhar e interagir.
- Pinça com dois dedos: zoom.
- Todos os menus usam botões grandes e Canvas responsivo.

## Sistemas implementados

- Movimento com Rigidbody, forças, aceleração e frenagem por curvas.
- Inércia, atrito dinâmico e rotação suave.
- Coyote time, jump buffer e pulo variável.
- Câmera ortográfica com follow, zoom e rotação.
- Clique e toque unificados.
- Modos Livre e Realista.
- Temporizador persistente nas plantações.
- Milho, mandioca e abacaxi.
- Perdas por falta de irrigação e defensivo no modo Realista.
- Currais bovino, galinheiro e chiqueiro vazios no início.
- Compra, alimentação, cuidado e coleta dos animais.
- Lago para peixes construível.
- Funcionários: colhedor, vendedor e tratador.
- Editor de mapa para mover construções, cercas, canteiros e lago.
- Árvores fixas: somente removidas após compra do machado e pagamento do corte.
- Expansões pagas nas bordas.
- Save JSON local e compatível com progresso offline.
- Perfis gráficos Econômico, Equilibrado e Alto.
- URP, ACES, bloom leve, color grading e materiais PBR.

## Economia Realista

| Nível | Upgrade | Teto otimista de margem |
|---:|---:|---:|
| 1 | inicial | 2% |
| 2 | 150 | 4% |
| 3 | 300 | 6% |
| 4 | 600 | 8% |
| 5 | 1.000 | 10% |

Tempos do modo Realista:

- Milho: 2 horas.
- Mandioca: 4 horas.
- Abacaxi: 6 horas.
- Ovos: 3 horas.
- Leite: 5 horas.
- Porcos: 8 horas.
- Peixes: 10 horas.

## Builds locais

No editor:

- `AgroFarm > Build > WebGL`
- `AgroFarm > Build > Android APK de teste`
- `AgroFarm > Build > Google Play AAB`

Para o AAB, configure:

```text
AGROFARM_KEYSTORE_PATH
AGROFARM_KEYSTORE_PASSWORD
AGROFARM_KEY_ALIAS
AGROFARM_KEY_ALIAS_PASSWORD
```

O AAB usa ARM64, IL2CPP, orientação paisagem e package id `com.stepoil.agrofarm`.

## GitHub Actions

O workflow `.github/workflows/unity-build.yml` valida a estrutura em Pull Requests.

A geração real de WebGL ou Android é manual e exige os secrets:

```text
UNITY_LICENSE
UNITY_EMAIL
UNITY_PASSWORD
```

Execute em `Actions > Unity 6 Build > Run workflow`.

## Materiais PBR

Use `AgroFarm > Auditar materiais PBR` para localizar materiais incompletos ou excessivamente brilhantes.

Mapas esperados:

- Base Color/Albedo em sRGB;
- Normal Map;
- Metallic linear;
- Roughness convertida para Smoothness (`1 - roughness`);
- Ambient Occlusion linear;
- Height opcional.

A classe `PBRSurfaceSet` padroniza essas conexões para URP/Lit.

## Próxima etapa visual

A lógica e a arquitetura estão prontas para receber modelos finais. Os objetos procedurais atuais são placeholders funcionais. A passagem de arte final deve substituir apenas as malhas e texturas, preservando física, interação, economia e save.
