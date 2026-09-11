# Estratégia SEO — Canção de Nós

Domínio canônico: `https://cancao.dflabs.app/`
Mercado principal: Brasil
Idioma: pt-BR
Objetivo: aquisição orgânica para músicas personalizadas e presentes românticos.

## 1. Regras de arquitetura

- Uma intenção principal por URL.
- Evitar criar duas páginas com o mesmo termo principal.
- Páginas comerciais recebem links dos conteúdos informacionais.
- Home concentra autoridade no termo amplo `música personalizada`.
- `/guias` funciona como hub de conteúdo.
- URLs curtas, sem `.html`, graças a `cleanUrls` da Vercel.
- Canonical sempre aponta para `https://cancao.dflabs.app/...`.

## 2. Cluster comercial — prioridade máxima

| URL | Palavra/intenção principal | Papel |
|---|---|---|
| `/` | música personalizada | Página principal / conversão |
| `/musica-personalizada-para-casal` | música personalizada para casal | Comercial |
| `/musica-personalizada-para-namorado` | música personalizada para namorado | Comercial |
| `/musica-personalizada-para-namorada` | música personalizada para namorada | Comercial |
| `/musica-com-nome-da-pessoa` | música com nome da pessoa | Comercial |
| `/homenagem-de-aniversario` | homenagem de aniversário | Comercial / inspiração |
| `/presente-de-aniversario-para-namorado` | presente de aniversário para namorado | Comercial |
| `/presente-de-aniversario-para-namorada` | presente de aniversário para namorada | Comercial |
| `/presente-de-aniversario-para-marido` | presente de aniversário para marido | Comercial |
| `/presente-de-aniversario-para-esposa` | presente de aniversário para esposa | Comercial |

## 3. Cluster informacional — geração de demanda

| URL | Intenção |
|---|---|
| `/guias` | hub de presentes e homenagens |
| `/ideias-de-presente-romantico` | ideias de presente romântico |
| `/como-surpreender-namorado-no-aniversario` | como surpreender namorado no aniversário |
| `/como-surpreender-namorada-no-aniversario` | como surpreender namorada no aniversário |
| `/presente-criativo-aniversario-de-namoro` | presente criativo aniversário de namoro |
| `/musica-para-aniversario-de-casamento` | música para aniversário de casamento |
| `/musica-para-pedido-de-casamento` | música para pedido de casamento |
| `/como-escrever-homenagem-de-aniversario` | como escrever homenagem de aniversário |

## 4. Funil de links internos

Informacional → Comercial:
- presente romântico → música para casal / namorado / namorada
- surpreender namorado → presente para namorado + música para namorado
- surpreender namorada → presente para namorada + música para namorada
- aniversário de namoro → música para casal
- aniversário de casamento → presente para marido/esposa + música para casal
- pedido de casamento → música para casal
- escrever homenagem → homenagem de aniversário + música com nome

Comercial → Hub:
- todas as páginas recebem links globais para `/guias` e páginas principais.

## 5. SEO técnico já implementado

- `robots.txt`
- `sitemap.xml`
- canonical absoluto
- `robots=index,follow`
- Open Graph
- Twitter Card
- `WebSite`, `WebPage`, `Organization`, `Product`, `Offer` e `FAQPage` na home
- `Article` e `BreadcrumbList` nos guias
- página 404 com `noindex,follow`
- `llms.txt`
- links internos globais
- build estático Vercel em `dist/`
- páginas mobile-first usando o CSS existente

## 6. Conteúdo — próximos 90 dias

### Semanas 1–4: ampliar intenção de compra
- música personalizada para marido
- música personalizada para esposa
- presente personalizado para namorado
- presente personalizado para namorada
- surpresa de aniversário para marido
- surpresa de aniversário para esposa
- música para bodas
- música para pedido de namoro

### Semanas 5–8: dúvidas e inspiração
- o que escrever para namorado no aniversário
- mensagem de aniversário para namorada
- como montar vídeo de aniversário para namorado
- como montar vídeo de aniversário para namorada
- presente romântico à distância
- ideias de surpresa simples e barata
- como escolher estilo musical para homenagem
- como contar a história do casal para criar uma música

### Semanas 9–12: sazonalidade
- presente de Dia dos Namorados personalizado
- surpresa para Dia dos Namorados
- presente de Natal para namorado/namorada
- presente para aniversário de casamento
- bodas por ano e ideias de homenagem
- pedido de casamento romântico

## 7. Critérios antes de criar nova página

Criar somente quando:
1. a intenção de busca é diferente de páginas existentes;
2. o conteúdo consegue responder melhor do que apenas trocar gênero/nome;
3. existe caminho de links internos para e da página;
4. há CTA coerente com a intenção.

Se o termo for apenas sinônimo de uma página existente, incorporar como subtítulo/texto na URL atual em vez de criar outra URL.

## 8. Métricas de acompanhamento

Semanal:
- páginas indexadas;
- impressões orgânicas;
- consultas novas;
- CTR por consulta;
- posição média;
- páginas com impressões e zero cliques;
- termos entre posições 4–20;
- conversões em clique de WhatsApp.

Mensal:
- tráfego orgânico por landing page;
- cluster comercial x informacional;
- páginas com queda de impressões;
- canibalização de palavras-chave;
- backlinks novos;
- Core Web Vitals / performance mobile.

## 9. Off-page / autoridade

Prioridade futura:
- perfis sociais oficiais usando a marca Canção de Nós;
- menções em blogs de casamento, namoro, presentes e eventos;
- parcerias com fotógrafos, celebrantes, cerimonialistas e criadores de conteúdo;
- conteúdos compartilháveis com exemplos de ocasiões e histórias, respeitando autorização dos clientes;
- links naturais para guias úteis, não compra massiva de backlinks.

## 10. Search Console

Assim que a propriedade `https://cancao.dflabs.app/` estiver cadastrada e verificada no Google Search Console:
- registrar no GSC Wizard;
- cadastrar `https://cancao.dflabs.app/sitemap.xml`;
- criar clusters: Música Personalizada, Presentes, Aniversário, Namoro/Casamento;
- acompanhar indexação de todas as URLs do sitemap;
- priorizar páginas entre posições 4–20 para atualização de conteúdo e CTR.
