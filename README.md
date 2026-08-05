# Canção de Nós

Página de vendas para músicas personalizadas a partir da história de casais.

## Modelo comercial do MVP

- **Canção Express — R$ 49,90**
- **Canção Especial — R$ 119,90**
- Atendimento e fechamento pelo WhatsApp
- Pagamento por PIX ou link da InfinitePay
- Sem login, checkout ou banco de dados nesta primeira versão

## Configurar o WhatsApp

Abra o arquivo `script.js` e informe o número no campo `whatsappNumber`, usando somente números, com DDI e DDD.

Exemplo para um número brasileiro:

```js
const SITE_CONFIG = {
  whatsappNumber: "5522999999999",
};
```

Enquanto o número estiver vazio, o site abre o WhatsApp com a mensagem pronta e permite que o visitante escolha o contato.

## Publicação

O site é estático e publicado automaticamente no GitHub Pages pelo workflow `.github/workflows/deploy.yml` após cada alteração na branch `main`.

## Arquivos

- `index.html`: estrutura e conteúdo da página
- `styles.css`: identidade visual e responsividade
- `script.js`: formulário, seleção de plano e mensagem do WhatsApp
- `favicon.svg`: ícone do site
