# InfinitePay — configuração de produção

## Fluxo implementado

1. Cliente inicia o pedido informando apenas nome e WhatsApp.
2. O backend cria um checkout InfinitePay no valor fixo de R$ 49,90 (4990 centavos).
3. O cliente paga via PIX.
4. A InfinitePay redireciona para `https://cancao.dflabs.app/?pagamento=retorno`.
5. O backend chama `payment_check` e só libera o formulário completo quando confirma:
   - `success = true`
   - `paid = true`
   - `amount = 4990`
   - `capture_method = pix`
6. O cliente envia a história completa.
7. O atendimento cria a letra.
8. O cliente pode solicitar até 3 rodadas de edição da letra.
9. Somente após a aprovação final da letra a música é gerada.

## Variável obrigatória na Vercel

Criar em Project Settings > Environment Variables:

```text
INFINITEPAY_HANDLE=sua_infinite_tag_sem_o_cifrao
```

A InfiniteTag é pública e deve ser informada sem `$`.

## InfinitePay: deixar somente PIX

No app ou painel InfinitePay:

Vendas > Checkout > Configurações > Meios de Pagamentos

- PIX: ativado
- Cartão de crédito: desativado

O backend também rejeita qualquer retorno que não tenha `capture_method = pix`.

## Checkout Integrado

O Checkout Integrado precisa estar habilitado na conta InfinitePay:

Vendas > Checkout > Configurações > Habilitar Checkout Integrado

## WhatsApp de recebimento

Criar a variável pública de configuração na Vercel:

```text
WHATSAPP_NUMBER=55DDDNÚMERO
```

O valor deve conter somente números, incluindo DDI e DDD. Se estiver vazio, o botão de envio será bloqueado para evitar perda de pedidos.

## Variáveis opcionais

```text
DELIVERY_SLA=Prazo real de entrega
META_PIXEL_ID=ID do Pixel da Meta
GA_MEASUREMENT_ID=ID do Google Analytics 4
```

Os identificadores de analytics só são carregados quando configurados. Nenhum evento de compra é enviado com identificadores pessoais.

## Endpoints

- `POST /api/create-payment`
- `POST /api/check-payment`

Nunca liberar o formulário completo apenas pelos parâmetros da URL. A confirmação válida é feita server-side contra `https://api.checkout.infinitepay.io/payment_check`.
