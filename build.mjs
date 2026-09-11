import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { extname } from 'node:path';

const canonical = 'https://cancao.dflabs.app/';
const allowedExtensions = new Set(['.html', '.css', '.js', '.svg', '.txt', '.xml']);
const siteLinks = `<nav class="seo-site-links" aria-label="Conteúdos e páginas úteis">
  <a href="/guias">Guias</a>
  <a href="/musica-personalizada-para-casal">Música para casal</a>
  <a href="/musica-personalizada-para-namorado">Para namorado</a>
  <a href="/musica-personalizada-para-namorada">Para namorada</a>
  <a href="/ideias-de-presente-romantico">Presentes românticos</a>
  <a href="/homenagem-de-aniversario">Homenagem de aniversário</a>
</nav>`;

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

let html = await readFile('index.html', 'utf8');

html = html
  .replace(/<title>.*?<\/title>/s, '<title>Música Personalizada por R$ 49,90 | Canção de Nós</title>')
  .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="Crie uma música personalizada por R$ 49,90. Pague por PIX, envie sua história, aprove a letra com até 3 edições e só depois geramos a música." />')
  .replace('<meta name="theme-color" content="#681c43" />', '<meta name="theme-color" content="#681c43" />\n  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />\n  <meta name="author" content="Canção de Nós" />\n  <link rel="canonical" href="https://cancao.dflabs.app/" />')
  .replace(/<meta property="og:title"[^>]*>/, '<meta property="og:title" content="Música Personalizada por R$ 49,90 | Canção de Nós" />')
  .replace(/<meta property="og:description"[^>]*>/, '<meta property="og:description" content="Sua história vira letra. Você pode pedir até 3 edições e só após aprovar geramos a música." />')
  .replace('<meta property="og:type" content="website" />', '<meta property="og:type" content="website" />\n  <meta property="og:url" content="https://cancao.dflabs.app/" />\n  <meta property="og:site_name" content="Canção de Nós" />\n  <meta property="og:locale" content="pt_BR" />\n  <meta name="twitter:card" content="summary_large_image" />\n  <meta name="twitter:title" content="Música Personalizada por R$ 49,90 | Canção de Nós" />\n  <meta name="twitter:description" content="Pague no PIX, aprove a letra e só depois geramos a música." />\n  <meta name="twitter:image" content="https://images.pexels.com/photos/6800136/pexels-photo-6800136.jpeg?auto=compress&cs=tinysrgb&w=1200" />')
  .replace('<link rel="stylesheet" href="./enhancements.css" data-premium-layer />', '<link rel="stylesheet" href="./enhancements.css" data-premium-layer />\n  <link rel="stylesheet" href="./seo.css" />\n  <link rel="stylesheet" href="./checkout.css" />')
  .replace('<h1>O aniversário de quem você ama merece mais que um presente <em>qualquer.</em></h1>', '<h1>Música personalizada por <em>R$ 49,90</em>: sua história primeiro vira letra, depois vira música.</h1>')
  .replace('Transforme a história de vocês em uma música personalizada, feita para emocionar e lembrar à pessoa amada o quanto ela é especial na sua vida.', 'Conte a história de vocês, pague com PIX e receba primeiro a letra personalizada. Você pode solicitar até 3 edições antes de aprovar a versão final e autorizar a geração da música.')
  .replace('Você conta como tudo começou, os momentos marcantes, apelidos e frases de vocês. Nós transformamos essas lembranças em uma homenagem que ninguém mais poderia receber.', 'Assim você não perde tempo: a música só é produzida depois que a letra estiver exatamente como você quer.')
  .replace('<a class="button button-primary" href="#planos">Quero surpreender meu amor</a>', '<a class="button button-primary" href="#planos" data-start-order>Começar agora — R$ 49,90</a>')
  .replace('<a class="header-cta" href="#planos">Homenagear meu amor</a>', '<a class="header-cta" href="#planos" data-start-order>Começar — R$ 49,90</a>')
  .replace('<span>✓ PIX ou link InfinitePay</span>', '<span>✓ PIX pela InfinitePay</span>')
  .replace('<span>✓ Entrega digital</span>', '<span>✓ Até 3 edições da letra</span>')
  .replace('<div class="announcement">\n    <span>🎂 O aniversário está chegando?</span>\n    <strong>Confirme o prazo de entrega pelo WhatsApp.</strong>\n  </div>', '<div class="announcement">\n    <span>🎵 Sua história merece cuidado.</span>\n    <strong>R$ 49,90 no PIX • até 3 edições da letra antes da música.</strong>\n  </div>');

const faqItems = [
  ['Como funciona o pagamento?', 'O valor é único: R$ 49,90. O pagamento é feito somente por PIX no checkout seguro da InfinitePay. O formulário completo só é liberado depois que o pagamento for confirmado.'],
  ['Eu pago antes de contar toda a história?', 'Sim. Primeiro você informa apenas seu nome e WhatsApp, realiza o PIX e volta automaticamente para o site. Depois da confirmação, o formulário completo da história é liberado.'],
  ['Posso alterar a letra antes da música ser gerada?', 'Sim. Você pode solicitar até 3 edições da letra. A produção do áudio só começa depois da sua aprovação final da letra.'],
  ['O que conta como uma edição?', 'Uma edição é uma rodada de ajustes solicitados sobre a letra enviada para aprovação. Você pode reunir várias mudanças na mesma rodada para aproveitar melhor cada revisão.'],
  ['Quando a música é gerada?', 'Somente depois que você aprovar a letra final. Assim evitamos gerar uma música com versos que você ainda gostaria de mudar.'],
  ['Posso escolher o estilo musical e a voz?', 'Sim. Depois do PIX confirmado, você informa o estilo musical e a preferência de voz junto com a história.'],
  ['Como recebo a música?', 'Após a aprovação da letra e a produção, a música final é entregue digitalmente pelo atendimento.'],
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
        description: 'Música personalizada criada a partir da história do casal, com até 3 edições da letra antes da produção do áudio.',
        image: 'https://images.pexels.com/photos/6800136/pexels-photo-6800136.jpeg?auto=compress&cs=tinysrgb&w=1200',
        brand: { '@type': 'Brand', name: 'Canção de Nós' },
        offers: { '@type': 'Offer', name: 'Canção de Nós', url: `${canonical}#planos`, priceCurrency: 'BRL', price: '49.90', availability: 'https://schema.org/InStock' }
      },
      { '@type': 'FAQPage', mainEntity: faqItems.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) }
    ]
  })}
  </script>`;

html = html.replace('</head>', `${structuredData}\n</head>`);

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
      <div class="section-heading"><span class="eyebrow">SEM DESPERDIÇAR SEU TEMPO</span><h2>Primeiro você aprova a letra. Só depois a música é gerada.</h2><p>Um fluxo simples para garantir que nomes, datas e sentimentos estejam certos antes da produção final.</p></div>
      <div class="steps process-five">
        <article class="step-card"><span class="step-number">01</span><h3>Inicie o pedido</h3><p>Informe apenas seu nome e WhatsApp para identificarmos o pedido.</p></article>
        <article class="step-card"><span class="step-number">02</span><h3>Pague R$ 49,90 no PIX</h3><p>Você é levado ao checkout seguro da InfinitePay. O site confirma o pagamento automaticamente.</p></article>
        <article class="step-card"><span class="step-number">03</span><h3>Conte sua história</h3><p>Com o PIX confirmado, informe nomes, momentos, estilo, voz, apelidos e tudo que deve aparecer.</p></article>
        <article class="step-card"><span class="step-number">04</span><h3>Aprove a letra</h3><p>Receba a letra escrita e solicite até 3 edições para deixar cada detalhe do seu jeito.</p></article>
        <article class="step-card"><span class="step-number">05</span><h3>Geramos a música</h3><p>Somente após sua aprovação final da letra começa a geração da música e a entrega digital.</p></article>
      </div>
    </section>`;
html = html.replace(/    <section class="section section-soft" id="como-funciona">[\s\S]*?    <\/section>/, processSection);

const offerSection = `    <section class="section plans-section" id="planos">
      <div class="section-heading"><span class="eyebrow">UMA ÚNICA OFERTA. SEM COMPLICAÇÃO.</span><h2>Sua música personalizada por R$ 49,90</h2><p>Pagamento somente via PIX pela InfinitePay. Após a confirmação, você envia a história completa.</p></div>
      <div class="single-offer"><article class="price-card featured"><span class="popular-badge">VALOR ÚNICO</span><div><span class="plan-tag">MÚSICA PERSONALIZADA COMPLETA</span><h3>Canção de Nós</h3><p class="plan-description">Sua história organizada primeiro em uma letra para você revisar e aprovar antes da geração da música.</p></div><div class="price"><small>R$</small>49<sup>,90</sup></div><span class="payment-pill">✓ PIX pela InfinitePay</span><ul><li>Letra criada a partir da sua história</li><li>Nome, apelidos e momentos marcantes</li><li>Escolha do estilo musical</li><li>Preferência de voz</li><li>Até 3 edições da letra</li><li>Música gerada somente após sua aprovação</li><li>Entrega digital da música final</li></ul><button class="button button-primary plan-button" type="button">Começar meu pedido — R$ 49,90</button></article></div>
      <p class="payment-note"><strong>Importante:</strong> as 3 edições são da letra escrita. Depois que você aprovar a letra e autorizar a geração da música, a produção do áudio é iniciada.</p>
    </section>`;
html = html.replace(/    <section class="section plans-section" id="planos">[\s\S]*?    <\/section>/, offerSection);

const faqHtml = `    <section class="section faq-section" id="duvidas"><div class="section-heading left"><span class="eyebrow">DÚVIDAS FREQUENTES</span><h2>Pagamento, revisões e produção</h2></div><div class="faq-list">${faqItems.map(([q,a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></section>`;
html = html.replace(/    <section class="section faq-section" id="duvidas">[\s\S]*?    <\/section>/, faqHtml);

html = html
  .replace('Faça a pessoa que você ama ouvir o quanto ela é especial.', 'Aprove a letra primeiro. Depois faça quem você ama ouvir a história de vocês.')
  .replace('Conte a história de vocês. Nós transformamos tudo em uma homenagem feita para o aniversário dela.', 'Comece com o PIX de R$ 49,90, envie a história após a confirmação e revise a letra antes da produção.')
  .replace('<a class="button button-light" href="#planos">Criar a música do meu amor</a>', '<a class="button button-light" href="#planos" data-start-order>Começar por R$ 49,90</a>');

const modalStart = html.indexOf('  <div class="modal" id="order-modal"');
const floatingStart = html.indexOf('  <a class="floating-whatsapp"', modalStart);
if (modalStart !== -1 && floatingStart !== -1) {
  const paymentModal = `  <div class="modal" id="order-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-backdrop" data-close-modal></div>
    <div class="modal-card payment-modal">
      <button class="modal-close" type="button" data-close-modal aria-label="Fechar">×</button>
      <span class="eyebrow">MÚSICA PERSONALIZADA • R$ 49,90</span><h2 id="modal-title">Comece seu pedido</h2>
      <div class="checkout-flow">
        <section class="checkout-step is-active" id="checkout-payment-step">
          <div class="checkout-intro"><div class="checkout-price"><strong>R$ 49,90</strong><span>pagamento único</span></div><div class="checkout-badges"><span class="checkout-badge">✓ PIX pela InfinitePay</span><span class="checkout-badge">✓ Até 3 edições da letra</span><span class="checkout-badge">✓ Áudio só após aprovação</span></div><p>Para não tomar seu tempo agora, informe somente seu nome e WhatsApp. Depois do PIX confirmado, você volta para preencher a história completa.</p></div>
          <form id="checkout-form"><div class="checkout-form-grid"><label>Seu nome<input type="text" name="customerName" required maxlength="100" autocomplete="name" placeholder="Seu nome" /></label><label>Seu WhatsApp<input type="tel" name="customerPhone" required maxlength="20" autocomplete="tel" placeholder="(22) 99999-9999" /></label></div><div class="order-summary-mini"><div><strong>Música personalizada</strong><br><span>Letra + até 3 edições + música após aprovação</span></div><strong>R$ 49,90</strong></div><button class="button button-primary form-submit" type="submit">Ir para o PIX seguro</button><p class="checkout-note">Após pagar, toque em <strong>Continuar</strong> na InfinitePay para voltar ao site. A confirmação será feita automaticamente.</p><div class="checkout-error" id="payment-error" role="alert"></div><div class="checkout-loading" id="payment-loading"><span class="checkout-spinner"></span><span>Preparando seu PIX...</span></div></form>
        </section>
        <section class="checkout-step" id="checkout-details-step">
          <div class="payment-confirmed-card"><span class="checkout-badge success">✓ PIX confirmado</span><strong>Pagamento aprovado. Agora conte a história.</strong><p>Pedido: <span id="confirmed-order-id">confirmado</span></p></div>
          <div class="revision-policy"><h3>Como funcionam as revisões</h3><ol><li>Nós criamos a primeira versão da letra.</li><li>Você pode solicitar até 3 rodadas de edição da letra.</li><li>Quando você aprovar a letra final, você autoriza a geração da música.</li><li>O áudio só é produzido depois dessa aprovação.</li></ol></div>
          <form id="details-form"><div class="form-grid"><label>Nome da pessoa homenageada<input type="text" name="recipientName" required maxlength="80" placeholder="Nome de quem receberá a música" /></label><label>Ocasião<select name="occasion" required><option value="">Selecione</option><option>Aniversário da pessoa amada</option><option>Aniversário de namoro</option><option>Aniversário de casamento</option><option>Pedido de casamento</option><option>Casamento</option><option>Reconciliação</option><option>Declaração surpresa</option><option>Outra ocasião</option></select></label><label>Data da comemoração<input type="date" name="celebrationDate" required /></label><label>Estilo musical<select name="musicStyle" required><option value="">Selecione</option><option>Sertanejo romântico</option><option>Pagode romântico</option><option>Pop</option><option>MPB</option><option>Gospel</option><option>Forró</option><option>Rock romântico</option><option>Outro estilo</option></select></label><label>Preferência de voz<select name="voice" required><option value="">Selecione</option><option>Voz masculina</option><option>Voz feminina</option><option>Sem preferência</option></select></label><label>Como você chama essa pessoa? <span class="optional">(opcional)</span><input type="text" name="nickname" maxlength="80" placeholder="Amor, vida, apelido do casal..." /></label></div><label>A história de vocês<textarea name="story" required minlength="40" maxlength="3000" placeholder="Como vocês se conheceram? Quais momentos, lugares, dificuldades, conquistas, viagens, apelidos ou frases não podem faltar?"></textarea></label><label>O que você deseja que essa pessoa sinta ao ouvir? <span class="optional">(opcional)</span><textarea name="message" maxlength="1000" placeholder="Ex.: Quero que ela se sinta amada, valorizada e saiba que sou grato por tudo o que vivemos."></textarea></label><label class="consent"><input type="checkbox" required /><span>Entendi que tenho direito a até 3 edições da letra e que a música só será gerada depois da minha aprovação final.</span></label><button class="button button-primary form-submit" type="submit">Enviar dados da música</button><p class="form-help">Antes de enviar, o sistema confirma novamente o PIX de R$ 49,90.</p></form>
        </section>
      </div>
    </div>
  </div>\n\n`;
  html = html.slice(0, modalStart) + paymentModal + html.slice(floatingStart);
}

html = html.replace('<span>Homenagear no WhatsApp</span>', '<span>Começar por R$ 49,90</span>');
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
    await writeFile(`dist/${entry.name}`, page, 'utf8');
  } else {
    await cp(entry.name, `dist/${entry.name}`);
  }
  copied += 1;
}

console.log(`SEO + PIX build ready: ${copied} static files published to dist/`);
