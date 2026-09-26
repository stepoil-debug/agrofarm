# Canção de Nós

Página de vendas para músicas personalizadas a partir da história de casais.

## Modelo comercial do MVP

- **Canção Express — R$ 49,90**
- **Canção Especial — R$ 119,90**
- Atendimento pelo WhatsApp após a confirmação do pagamento
- Pagamento por PIX de R$ 49,90 ou cartão em 12x de R$ 7,90 (total de R$ 94,80) via checkout da InfinitePay
- Sem login ou banco de dados nesta primeira versão

## Configuração de produção

Configure estas variáveis no Vercel, nos ambientes de produção e preview quando necessário:

```text
INFINITEPAY_HANDLE=sua_infinite_tag_sem_o_cifrao
WHATSAPP_NUMBER=55DDDNÚMERO
DELIVERY_SLA=Prazo real de entrega informado ao cliente
META_PIXEL_ID=opcional
GA_MEASUREMENT_ID=opcional
```

O número deve conter somente dígitos, com DDI e DDD. Sem `WHATSAPP_NUMBER`, o site bloqueia a abertura do WhatsApp para evitar que pedidos sejam direcionados ao contato errado. O site abre uma mensagem preenchida após a confirmação; o cliente confirma o envio no WhatsApp.

## Publicação

O site é estático. O repositório está preparado para publicação na Vercel com build via `npm run build` e saída em `dist/`, conforme `vercel.json`. O GitHub Pages também continua disponível pelo workflow `.github/workflows/deploy.yml` após alterações na branch `main`.

## Arquivos

- `index.html`: estrutura e conteúdo da página
- `styles.css`: identidade visual e responsividade
- `enhancements.css`: camada visual premium e microinterações
- `script.js`: inicialização do checkout único
- `infinitepay-flow.js`: formulário, checkout, validação do pagamento e envio ao atendimento
- `public-config.js`: configurações públicas fornecidas pela API
- `analytics.js`: eventos opcionais de Meta Pixel e Google Analytics
- `api/site-config.js`: expõe somente configurações públicas não sensíveis
- `favicon.svg`: ícone do site
- `build.mjs`: gera a pasta `dist/` usada no deploy da Vercel
- `vercel.json`: configuração de build, saída e headers da Vercel
