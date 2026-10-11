import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { extname } from 'node:path';

const canonical = 'https://cancao.dflabs.app/';
const allowedExtensions = new Set(['.html', '.css', '.js', '.svg', '.txt', '.xml', '.mp3', '.mp4', '.webm']);
const deferGoogleFonts = (page) => page.replace(
  /<link href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)" rel="stylesheet"\s*\/>/g,
  (_match, href) => `<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'" /><noscript><link rel="stylesheet" href="${href}" /></noscript>`
);
const siteLinks = `<nav class="seo-site-links" aria-label="Conteúdos e páginas úteis">
  <a href="/guias">Guias</a>
  <a href="/musica-personalizada-para-casal">Música para casal</a>
  <a href="/musica-personalizada-para-namorado">Para namorado</a>
  <a href="/musica-personalizada-para-namorada">Para namorada</a>
  <a href="/ideias-de-presente-romantico">Presentes românticos</a>
  <a href="/homenagem-de-aniversario">Homenagem de aniversário</a>
  <a href="/privacidade">Privacidade</a>
  <a href="/termos">Termos e reembolso</a>
</nav>`;

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

let html = await readFile('index.html', 'utf8');
// Os arquivos podem estar em CRLF no checkout do Windows; normalize antes
// das substituições para que a versão publicada seja determinística.
html = html.replace(/\r\n/g, '\n');

html = html
  .replace(/<title>.*?<\/title>/s, '<title>Música Personalizada por R$ 49,90 | Canção de Nós</title>')
  .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="Conte a história de vocês, escolha uma direção musical e receba atendimento personalizado pelo WhatsApp para fechar sua música." />')
  .replace('<meta name="theme-color" content="#681c43" />', '<meta name="theme-color" content="#681c43" />\n  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />\n  <meta name="author" content="Canção de Nós" />\n  <link rel="canonical" href="https://cancao.dflabs.app/" />')
  .replace(/<meta property="og:title"[^>]*>/, '<meta property="og:title" content="Música Personalizada por R$ 49,90 | Canção de Nós" />')
  .replace(/<meta property="og:description"[^>]*>/, '<meta property="og:description" content="Preencha o briefing, escolha uma proposta de música e fale com o atendimento pelo WhatsApp." />')
  .replace('<meta property="og:type" content="website" />', '<meta property="og:type" content="website" />\n  <meta property="og:url" content="https://cancao.dflabs.app/" />\n  <meta property="og:site_name" content="Canção de Nós" />\n  <meta property="og:locale" content="pt_BR" />\n  <meta name="twitter:card" content="summary_large_image" />\n  <meta name="twitter:title" content="Música Personalizada | Canção de Nós" />\n  <meta name="twitter:description" content="Escolha uma direção para a sua música e converse com o atendimento pelo WhatsApp." />\n  <meta name="twitter:image" content="https://images.pexels.com/photos/6800136/pexels-photo-6800136.jpeg?auto=compress&cs=tinysrgb&w=1200" />')
  .replace('<link rel="stylesheet" href="./enhancements.css" data-premium-layer />', '<link rel="stylesheet" href="./enhancements.css" data-premium-layer />\n  <link rel="stylesheet" href="./seo.css" />\n  <link rel="stylesheet" href="./checkout.css?v=20260926-6" />')
  .replace('<h1>O aniversário de quem você ama merece mais que um presente <em>qualquer.</em></h1>', '<h1>Música personalizada por <em>R$ 49,90</em>: sua história primeiro vira letra, depois vira música.</h1>')
  .replace('Transforme a história de vocês em uma música personalizada, feita para emocionar e lembrar à pessoa amada o quanto ela é especial na sua vida.', 'Conte a história de vocês, escolha uma direção musical e receba atendimento personalizado pelo WhatsApp para fechar o pedido.')
  .replace('Você conta como tudo começou, os momentos marcantes, apelidos e frases de vocês. Nós transformamos essas lembranças em uma homenagem que ninguém mais poderia receber.', 'Você só conversa sobre prazo, valor e pagamento depois de escolher a proposta que mais combina com a história de vocês.')
  .replace('<a class="button button-primary" href="#planos">Quero surpreender meu amor</a>', '<a class="button button-primary" href="#planos" data-start-order>Começar agora — R$ 49,90</a>')
  .replace('<a class="header-cta" href="#planos">Homenagear meu amor</a>', '<a class="header-cta" href="#planos" data-start-order>Começar — R$ 49,90</a>')
  .replace('<span>✓ PIX ou link InfinitePay</span>', '<span>✓ Atendimento pelo WhatsApp</span>')
  .replace('<span>✓ Entrega digital</span>', '<span>✓ Você escolhe a direção musical</span>')
  .replace('<div class="announcement">\n    <span>🎂 O aniversário está chegando?</span>\n    <strong>Confirme o prazo de entrega pelo WhatsApp.</strong>\n  </div>', '<div class="announcement">\n    <span>🎵 Sua história merece cuidado.</span>\n    <strong>R$ 49,90 no PIX • ou até 12x de R$ 4,99 no cartão.</strong>\n  </div>');

// Alinha toda a comunicação pública ao valor-base de R$ 49,90 no cartão;
// os juros do parcelamento são calculados pela InfinitePay para o cliente.
html = html
  .replaceAll('Crie uma música personalizada a partir de R$ 49,90 no PIX ou parcele em até 12x de R$ 7,90 no cartão. Aprove a letra antes da música.', 'Crie uma música personalizada por R$ 49,90 no PIX ou em até 12x de R$ 4,99 no cartão. Os juros do parcelamento ficam por conta do cliente.')
  .replaceAll('R$ 49,90 no PIX • ou 12x de R$ 7,90 no cartão.', 'R$ 49,90 no PIX • ou até 12x de R$ 4,99 no cartão.')
  .replaceAll('Você pode pagar R$ 49,90 no PIX ou escolher o cartão de crédito em até 12x de R$ 7,90. O formulário completo só é liberado depois que a InfinitePay confirmar o pagamento.', 'Você pode pagar R$ 49,90 no PIX ou escolher o cartão de crédito em até 12x de R$ 4,99. Os juros são calculados pela InfinitePay e ficam por conta do cliente. O formulário completo só é liberado depois que a InfinitePay confirmar o pagamento.')
  .replaceAll('Use PIX por R$ 49,90 ou cartão em até 12x de R$ 7,90. A InfinitePay confirma o pagamento automaticamente.', 'Use PIX por R$ 49,90 ou cartão em até 12x de R$ 4,99. Os juros do cartão ficam por conta do cliente e a InfinitePay confirma o pagamento automaticamente.')
  .replaceAll('PIX à vista por R$ 49,90 ou cartão em até 12x de R$ 7,90. Após a confirmação, você envia a história completa.', 'PIX por R$ 49,90 ou cartão em até 12x de R$ 4,99. Os juros do cartão ficam por conta do cliente. Após a confirmação, você envia a história completa.')
  .replaceAll('<h2>Sua música personalizada a partir de R$ 49,90</h2>', '<h2>Sua música personalizada por R$ 49,90</h2>')
  .replaceAll('<strong>12x R$ 7,90</strong><span>no cartão</span>', '<strong>12x R$ 4,99</strong><span>no cartão + juros</span>')
  .replaceAll('<button class="button button-primary plan-button" type="button">Escolher pagamento</button>', '<button class="button button-primary plan-button" type="button" onclick="const m=document.getElementById(\'order-modal\');m?.classList.add(\'is-open\');m?.setAttribute(\'aria-hidden\',\'false\');document.body.classList.add(\'modal-open\');return false;">Escolher pagamento</button>');

const faqItems = [
  ['Preciso pagar para preencher o briefing?', 'Não. Você preenche a história, escolhe uma direção musical e envia o pedido para o atendimento. O vendedor confirma prazo, valor e forma de pagamento com você antes do fechamento.'],
  ['O que acontece depois que eu envio?', 'O WhatsApp abre com seu briefing completo e a proposta escolhida. O vendedor continua a conversa, tira dúvidas e combina os próximos passos.'],
  ['Posso escolher a direção da música?', 'Sim. O site apresenta cinco propostas: narrativa romântica, declaração cinematográfica, pop memorável, intimista e autoral.'],
  ['Posso pedir alterações?', 'Sim. Use o campo de ajustes antes de enviar e explique ao vendedor o que deseja mudar. A quantidade de revisões e o prazo são combinados no atendimento.'],
  ['Preciso saber escrever uma letra?', 'Não. Conte a história do seu jeito. O briefing organiza os detalhes para o vendedor transformar as lembranças em uma proposta de música.'],
  ['Posso escolher o estilo musical e a voz?', 'Sim. Você informa o estilo e a preferência de voz no questionário.'],
  ['Como funciona o pagamento?', 'O pagamento é combinado diretamente com o vendedor depois que ele confirmar a proposta, o prazo e o valor final.'],
  ['Como recebo a música?', 'Depois do fechamento e da produção, a música final é entregue digitalmente pelo atendimento.'],
];

const structuredData = `
  <script type="application/ld+json">
  ${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${canonical}#website`, name: 'Canção de Nós', url: canonical, inLanguage: 'pt-BR' },
      { '@type': 'WebPage', '@id': `${canonical}#webpage`, name: 'Música Personalizada por R$ 49,90', url: canonical, isPartOf: { '@id': `${canonical}#website` }, inLanguage: 'pt-BR' },
      { '@type': 'Organization', '@id': `${canonical}#organization`, name: 'Canção de Nós', url: canonical },
      {
        '@type': 'Product',
        name: 'Música Personalizada Canção de Nós',
        description: 'Música personalizada criada a partir da história do casal, com atendimento individual pelo WhatsApp.',
        image: 'https://images.pexels.com/photos/6800136/pexels-photo-6800136.jpeg?auto=compress&cs=tinysrgb&w=1200',
        brand: { '@type': 'Brand', name: 'Canção de Nós' },
        offers: { '@type': 'Offer', name: 'Música personalizada Canção de Nós', url: `${canonical}#planos`, priceCurrency: 'BRL', price: '49.90', availability: 'https://schema.org/InStock' }
      },
      { '@type': 'FAQPage', mainEntity: faqItems.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) }
    ]
  })}
  </script>`;

html = html.replace('</head>', `${structuredData}\n</head>`);
html = deferGoogleFonts(html);

const seoSection = `    <section class="section seo-discovery-section" aria-labelledby="ideias-presente-title">
      <div class="section-heading"><span class="eyebrow">IDEIAS DE PRESENTE E HOMENAGEM</span><h2 id="ideias-presente-title">Encontre a música personalizada certa para cada momento</h2><p>Conteúdos para quem quer surpreender namorado, namorada, marido ou esposa com uma homenagem feita da própria história.</p></div>
      <div class="seo-topic-grid">
        <article class="seo-topic-card"><span>PARA CASAIS</span><h3>Música personalizada para casal</h3><p>Transforme o primeiro encontro, viagens, apelidos e momentos marcantes em uma canção só de vocês.</p><a href="/musica-personalizada-para-casal">Ver ideias para casal →</a></article>
        <article class="seo-topic-card"><span>PARA ELE</span><h3>Música personalizada para namorado</h3><p>Um presente romântico ou divertido, com as referências que fazem parte da relação de vocês.</p><a href="/musica-personalizada-para-namorado">Criar surpresa para namorado →</a></article>
        <article class="seo-topic-card"><span>PARA ELA</span><h3>Música personalizada para namorada</h3><p>Uma declaração com o nome dela e os detalhes que mostram o quanto você presta atenção.</p><a href="/musica-personalizada-para-namorada">Criar surpresa para namorada →</a></article>
        <article class="seo-topic-card"><span>ANIVERSÁRIO</span><h3>Homenagem de aniversário</h3><p>Uma forma diferente de dizer parabéns usando sentimentos e lembranças reais em uma música.</p><a href="/homenagem-de-aniversario">Ver ideias de homenagem →</a></article>
        <article class="seo-topic-card"><span>PRESENTES</span><h3>Ideias de presente romântico</h3><p>Opções para sair do presente genérico e criar uma experiência com significado.</p><a href="/ideias-de-presente-romantico">Ver ideias românticas →</a></article>
        <article class="seo-topic-card"><span>GUIAS</span><h3>Surpresas, namoro e casamento</h3><p>Explore conteúdos para aniversário, aniversário de namoro, casamento e pedido de casamento.</p><a href="/guias">Explorar todos os guias →</a></article>
      </div>
      <p class="seo-hub-link"><a href="/guias">Ver todos os guias de presentes e homenagens →</a></p>
    </section>`;

html = html.replace('</section>\n\n    <section class="section emotional-section">', `</section>\n\n${seoSection}\n\n    <section class="section emotional-section">`);

const processSection = `    <section class="section section-soft" id="como-funciona">
      <div class="section-heading"><span class="eyebrow">ATENDIMENTO DE PESSOA PARA PESSOA</span><h2>Você prepara tudo. O vendedor fecha com você.</h2><p>Um fluxo simples para entender sua história antes de falar sobre prazo, valor e pagamento.</p></div>
      <div class="steps process-five">
        <article class="step-card"><span class="step-number">01</span><h3>Conte a história</h3><p>Informe nomes, momentos, datas, apelidos, estilo musical e tudo que torna vocês únicos.</p></article>
        <article class="step-card"><span class="step-number">02</span><h3>Escolha uma proposta</h3><p>Veja cinco direções criativas e escolha a que mais combina com a homenagem.</p></article>
        <article class="step-card"><span class="step-number">03</span><h3>Revise seu pedido</h3><p>Confira os dados e escreva qualquer ajuste que queira conversar com o atendimento.</p></article>
        <article class="step-card"><span class="step-number">04</span><h3>Fale com o vendedor</h3><p>Seu briefing chega organizado no WhatsApp para o vendedor tirar dúvidas e confirmar a proposta.</p></article>
        <article class="step-card"><span class="step-number">05</span><h3>Feche e acompanhe</h3><p>Depois de combinar pagamento e prazo, a produção começa com tudo alinhado.</p></article>
      </div>
    </section>`;
html = html.replace(/    <section class="section section-soft" id="como-funciona">[\s\S]*?    <\/section>/, processSection);

const offerSection = `    <section class="section plans-section" id="planos">
      <div class="section-heading"><span class="eyebrow">COMECE SEM COMPROMISSO</span><h2>Prepare sua música personalizada</h2><p>Preencha o briefing, escolha a direção da música e fale com o vendedor. O valor e o pagamento são confirmados no atendimento.</p></div>
      <div class="single-offer"><article class="price-card featured"><span class="popular-badge">ATENDIMENTO PERSONALIZADO</span><div><span class="plan-tag">CANÇÃO DE NÓS</span><h3>Sua história vira uma proposta de música</h3><p class="plan-description">Você faz tudo pelo site até a escolha da direção. Depois, o vendedor recebe seu pedido no WhatsApp e fecha os detalhes com você.</p></div><div class="offer-payment-options"><div><strong>A partir de R$ 49,90</strong><span>valor de referência</span></div><div><strong>Pagamento combinado</strong><span>direto com o atendimento</span></div></div><span class="payment-pill">✓ Sem cobrança no site</span><ul><li>Questionário completo da história</li><li>Escolha entre 5 direções musicais</li><li>Nome, apelidos e momentos marcantes</li><li>Escolha do estilo e da voz</li><li>Campo para ajustes e observações</li><li>Briefing enviado pronto para o vendedor</li><li>Prazo e pagamento alinhados no WhatsApp</li></ul><button class="button button-primary plan-button" type="button" data-plan="Música personalizada" data-price="A confirmar no WhatsApp">Preparar meu briefing</button></article></div>
      <p class="payment-note"><strong>Transparência:</strong> nenhuma cobrança acontece ao preencher o site. O atendimento confirma a proposta, o prazo, o valor final e a forma de pagamento antes de fechar.</p>
    </section>`;
html = html.replace(/    <section class="section plans-section" id="planos">[\s\S]*?    <\/section>/, offerSection);

// O bloco de oferta acima é inserido depois das substituições iniciais; por isso
// normalizamos também o conteúdo final antes de gravar a página publicada.
html = html
  .replaceAll('Use PIX por R$ 49,90 ou cartão em até 12x de R$ 7,90. A InfinitePay confirma o pagamento automaticamente.', 'Use PIX por R$ 49,90 ou cartão em até 12x de R$ 4,99. Os juros do cartão ficam por conta do cliente e a InfinitePay confirma o pagamento automaticamente.')
  .replaceAll('PIX à vista por R$ 49,90 ou cartão em até 12x de R$ 7,90. Após a confirmação, você envia a história completa.', 'PIX por R$ 49,90 ou cartão em até 12x de R$ 4,99. Os juros do cartão ficam por conta do cliente. Após a confirmação, você envia a história completa.')
  .replaceAll('<h2>Sua música personalizada a partir de R$ 49,90</h2>', '<h2>Sua música personalizada por R$ 49,90</h2>')
  .replaceAll('<strong>12x R$ 7,90</strong><span>no cartão</span>', '<strong>12x R$ 4,99</strong><span>no cartão + juros</span>')
  .replaceAll('<button class="button button-primary plan-button" type="button">Escolher pagamento</button>', '<button class="button button-primary plan-button" type="button" onclick="const m=document.getElementById(\'order-modal\');m?.classList.add(\'is-open\');m?.setAttribute(\'aria-hidden\',\'false\');document.body.classList.add(\'modal-open\');return false;">Escolher pagamento</button>');

const faqHtml = `    <section class="section faq-section" id="duvidas"><div class="section-heading left"><span class="eyebrow">DÚVIDAS FREQUENTES</span><h2>Briefing, atendimento e produção</h2></div><div class="faq-list">${faqItems.map(([q,a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></section>`;
html = html.replace(/    <section class="section faq-section" id="duvidas">[\s\S]*?    <\/section>/, faqHtml);

html = html
  .replace('Faça a pessoa que você ama ouvir o quanto ela é especial.', 'Faça a pessoa que você ama ouvir a história de vocês.')
  .replace('Conte a história de vocês. Nós transformamos tudo em uma homenagem feita para o aniversário dela.', 'Prepare o briefing, escolha a proposta e converse com o vendedor pelo WhatsApp.')
  .replace('<a class="button button-light" href="#planos">Criar a música do meu amor</a>', '<a class="button button-light" href="#planos" data-start-order>Preparar meu briefing</a>');

const modalStart = html.indexOf('  <div class="modal" id="order-modal"');
const floatingStart = html.indexOf('  <a class="floating-whatsapp"', modalStart);
if (modalStart !== -1 && floatingStart !== -1) {
  const x1Modal = `  <div class="modal" id="order-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-backdrop" data-close-modal></div>
    <div class="modal-card payment-modal x1-modal">
      <button class="modal-close" type="button" data-close-modal aria-label="Fechar">×</button>
      <span class="eyebrow">MÚSICA PERSONALIZADA • ATENDIMENTO NO WHATSAPP</span>
      <h2 id="modal-title">Prepare seu briefing</h2>
      <p>Conte sua história e escolha a direção da música. O atendimento recebe tudo pronto para conversar com você.</p>
    </div>
  </div>\n\n`;
  html = html.slice(0, modalStart) + x1Modal + html.slice(floatingStart);
}

html = html.replace('<span>Homenagear no WhatsApp</span>', '<span>Preparar meu briefing</span>');
html = html.replace('</footer>', `${siteLinks}\n  </footer>`);

await writeFile('dist/index.html', html, 'utf8');

const entries = await readdir('.', { withFileTypes: true });
let copied = 1;
for (const entry of entries) {
  if (!entry.isFile() || entry.name === 'index.html' || entry.name === 'build.mjs') continue;
  if (!allowedExtensions.has(extname(entry.name))) continue;
  if (extname(entry.name) === '.html') {
    let page = await readFile(entry.name, 'utf8');
    if (!page.includes('seo-site-links')) page = page.replace('</footer>', `${siteLinks}\n</footer>`);
    page = deferGoogleFonts(page);
    await writeFile(`dist/${entry.name}`, page, 'utf8');
  } else {
    await cp(entry.name, `dist/${entry.name}`);
  }
  copied += 1;
}

console.log(`SEO + PIX build ready: ${copied} static files published to dist/`);
