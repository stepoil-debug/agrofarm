// Build estático da Canção de Nós.
// - index.html é o template da home (com marcadores <!--@...-->).
// - As demais páginas .html são fontes de conteúdo: o build extrai título,
//   descrição, hero e artigo e aplica o layout único do site.
// - Gera schema.org, sitemap.xml e copia apenas os arquivos publicáveis.
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const SITE = 'https://cancao.dflabs.app';
const BRAND = 'Canção de Nós';
const OG_IMAGE = `${SITE}/assets/og-cancao-de-nos.jpg`;
const LOGO = `${SITE}/assets/logo-512.png`;
const BUILD_DATE = process.env.BUILD_DATE || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const PRICE = '49.90';
const FONTS = 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap';
const ASSET_VERSION = '20261010-1';

// Páginas de conteúdo. kind: servico (landing comercial) | guia (artigo).
const PAGES = [
  { slug: 'musica-personalizada-para-casal', kind: 'servico', label: 'Música para casal', tag: 'Para o casal', priority: 0.95 },
  { slug: 'musica-personalizada-para-namorada', kind: 'servico', label: 'Música para namorada', tag: 'Para ela', priority: 0.9 },
  { slug: 'musica-personalizada-para-namorado', kind: 'servico', label: 'Música para namorado', tag: 'Para ele', priority: 0.9 },
  { slug: 'musica-com-nome-da-pessoa', kind: 'servico', label: 'Música com nome da pessoa', tag: 'Com o nome', priority: 0.9 },
  { slug: 'homenagem-de-aniversario', kind: 'servico', label: 'Homenagem de aniversário', tag: 'Aniversário', priority: 0.9 },
  { slug: 'presente-de-aniversario-para-namorada', kind: 'servico', label: 'Presente para namorada', tag: 'Aniversário dela', priority: 0.9 },
  { slug: 'presente-de-aniversario-para-namorado', kind: 'servico', label: 'Presente para namorado', tag: 'Aniversário dele', priority: 0.9 },
  { slug: 'presente-de-aniversario-para-esposa', kind: 'servico', label: 'Presente para esposa', tag: 'Para a esposa', priority: 0.85 },
  { slug: 'presente-de-aniversario-para-marido', kind: 'servico', label: 'Presente para marido', tag: 'Para o marido', priority: 0.85 },
  { slug: 'musica-para-aniversario-de-casamento', kind: 'servico', label: 'Aniversário de casamento', tag: 'Bodas', priority: 0.85 },
  { slug: 'musica-para-pedido-de-casamento', kind: 'servico', label: 'Pedido de casamento', tag: 'Pedido', priority: 0.85 },
  { slug: 'ideias-de-presente-romantico', kind: 'guia', label: 'Ideias de presente romântico', tag: 'Presentes', priority: 0.8 },
  { slug: 'como-surpreender-namorada-no-aniversario', kind: 'guia', label: 'Surpreender a namorada', tag: 'Aniversário dela', priority: 0.8 },
  { slug: 'como-surpreender-namorado-no-aniversario', kind: 'guia', label: 'Surpreender o namorado', tag: 'Aniversário dele', priority: 0.8 },
  { slug: 'presente-criativo-aniversario-de-namoro', kind: 'guia', label: 'Aniversário de namoro', tag: 'Data do casal', priority: 0.8 },
  { slug: 'como-escrever-homenagem-de-aniversario', kind: 'guia', label: 'Como escrever homenagem', tag: 'Texto', priority: 0.75 },
];
const LEGAL = [
  { slug: 'privacidade', label: 'Privacidade' },
  { slug: 'termos', label: 'Termos de uso' },
];

const HOME_FAQ = [
  ['O que é uma música personalizada?', 'É uma canção original criada a partir da história que você conta: nomes, apelidos, lugares, datas e sentimentos. A letra e o clima da música são pensados para uma única pessoa — por isso ninguém mais recebe a mesma canção.'],
  ['Quanto custa uma música personalizada?', 'A música personalizada da Canção de Nós custa a partir de R$ 49,90. O valor final, o prazo e a forma de pagamento são confirmados no atendimento pelo WhatsApp antes de qualquer cobrança.'],
  ['Preciso pagar para preencher o briefing?', 'Não. Você preenche a história, escolhe uma direção musical e envia o pedido para o atendimento sem nenhuma cobrança no site.'],
  ['A música pode ter o nome da pessoa?', 'Sim. O nome, os apelidos e os detalhes que você informar podem aparecer na letra — inclusive no refrão, que é o momento em que a pessoa percebe que a música é só dela.'],
  ['Preciso saber escrever uma letra?', 'Não. Conte a história do seu jeito, com suas palavras. O briefing organiza os detalhes e nós transformamos tudo em letra e música.'],
  ['Posso escolher o estilo musical e a voz?', 'Sim. Você escolhe entre estilos como sertanejo romântico, pagode, MPB, pop, gospel, forró, rock romântico e voz e violão, além da preferência por voz masculina ou feminina.'],
  ['Quanto tempo leva para ficar pronta?', 'O prazo depende do estilo e da fila de produção. Informe a data da comemoração no briefing: o atendimento confirma se consegue entregar a tempo antes de fechar o pedido.'],
  ['Posso pedir alterações?', 'Sim. Você pode descrever ajustes já no briefing, e a quantidade de revisões é combinada com o atendimento antes da produção.'],
  ['Como recebo a música?', 'A música é entregue em formato digital pelo WhatsApp, pronta para tocar no jantar, enviar à meia-noite ou usar em um vídeo com fotos do casal.'],
  ['Como funciona o pagamento?', 'Depois de confirmar a proposta, o prazo e o valor com o atendimento, você paga por PIX ou cartão. A produção começa após a confirmação do pagamento.'],
];

// ---------- utilitários ----------
const esc = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const decode = (s) => String(s ?? '').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const strip = (s) => decode(String(s ?? '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const pick = (html, re) => (html.match(re) || [])[1] || '';
const url = (slug) => (slug ? `${SITE}/${slug}` : `${SITE}/`);
const ld = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
const dateBR = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const ORG = {
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: BRAND,
  url: `${SITE}/`,
  logo: { '@type': 'ImageObject', url: LOGO, width: 512, height: 512 },
  image: OG_IMAGE,
  description: 'Músicas personalizadas criadas a partir de histórias reais de casais e famílias.',
  areaServed: { '@type': 'Country', name: 'Brasil' },
};
const WEBSITE = { '@type': 'WebSite', '@id': `${SITE}/#website`, name: BRAND, url: `${SITE}/`, inLanguage: 'pt-BR', publisher: { '@id': `${SITE}/#organization` } };
const OFFER = {
  '@type': 'Offer',
  url: `${SITE}/#oferta`,
  priceCurrency: 'BRL',
  price: PRICE,
  priceSpecification: { '@type': 'UnitPriceSpecification', price: PRICE, priceCurrency: 'BRL', valueAddedTaxIncluded: true },
  availability: 'https://schema.org/InStock',
  seller: { '@id': `${SITE}/#organization` },
};
const SERVICE = {
  '@type': 'Service',
  '@id': `${SITE}/#servico`,
  name: 'Música personalizada',
  serviceType: 'Composição de música personalizada',
  description: 'Canção original criada a partir da história, dos nomes e das lembranças do cliente, com escolha de estilo musical e voz e entrega digital.',
  provider: { '@id': `${SITE}/#organization` },
  areaServed: { '@type': 'Country', name: 'Brasil' },
  availableChannel: { '@type': 'ServiceChannel', serviceUrl: `${SITE}/`, name: 'Briefing online e atendimento pelo WhatsApp' },
  offers: OFFER,
};
const faqSchema = (items, pageUrl) => ({
  '@type': 'FAQPage',
  '@id': `${pageUrl}#faq`,
  mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});
const faqHtml = (items) => `<div class="faq-list">\n${items.map(([q, a], i) => `          <details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}\n        </div>`;
const breadcrumbSchema = (trail) => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, href], i) => ({ '@type': 'ListItem', position: i + 1, name, item: href })),
});
const breadcrumbHtml = (trail) => `<nav class="breadcrumb" aria-label="Você está em"><ol>${trail.map(([name, href], i) => (i === trail.length - 1 ? `<li aria-current="page">${esc(name)}</li>` : `<li><a href="${href.replace(SITE, '') || '/'}">${esc(name)}</a></li>`)).join('')}</ol></nav>`;

// ---------- partials ----------
const headTags = ({ title, description, path, image = OG_IMAGE, type = 'website', robots = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' }) => {
  const canonical = path === '/' ? `${SITE}/` : `${SITE}${path}`;
  const img = image.startsWith('http') ? image : `${SITE}${image}`;
  return `<meta name="robots" content="${robots}" />
  <link rel="canonical" href="${canonical}" />
  <meta name="theme-color" content="#6b1d40" />
  <meta name="author" content="${BRAND}" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:site_name" content="${BRAND}" />
  <meta property="og:type" content="${type}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Casal abrindo um presente com uma música personalizada" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${img}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/assets/logo-180.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" as="style" href="${FONTS}" onload="this.onload=null;this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="${FONTS}" /></noscript>
  <link rel="stylesheet" href="/checkout.css?v=${ASSET_VERSION}" />
  <link rel="stylesheet" href="/site.css?v=${ASSET_VERSION}" />`;
};

const header = (isHome) => {
  const h = (hash) => (isHome ? hash : `/${hash}`);
  return `<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
  <div class="announcement"><span>🎵 Música personalizada <strong>a partir de R$ 49,90</strong></span><span class="sep">·</span><span class="hide-sm">Briefing sem custo e atendimento pelo WhatsApp</span></div>
  <header class="header">
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="${BRAND} — página inicial"><span class="brand-mark" aria-hidden="true">♪</span><span class="brand-name">Canção de <em>Nós</em></span></a>
      <nav class="nav" aria-label="Principal">
        <a href="${h('#como-funciona')}">Como funciona</a>
        <a href="${h('#exemplo')}">Ouvir exemplo</a>
        <a href="${h('#ocasioes')}">Ocasiões</a>
        <a href="${h('#duvidas')}">Dúvidas</a>
        <a href="/guias">Guias</a>
      </nav>
      <a class="button button-primary header-cta" href="${h('#oferta')}">Criar minha música</a>
    </div>
  </header>`;
};

const footer = () => {
  const services = PAGES.filter((p) => p.kind === 'servico');
  const guides = PAGES.filter((p) => p.kind === 'guia');
  const list = (items) => items.map((p) => `<li><a href="/${p.slug}">${esc(p.label)}</a></li>`).join('');
  return `<footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a class="brand" href="/"><span class="brand-mark" aria-hidden="true">♪</span><span class="brand-name">Canção de <em>Nós</em></span></a>
          <p>Músicas personalizadas que transformam a história de vocês em um presente para ouvir para sempre.</p>
        </div>
        <div class="footer-col"><h2>Músicas personalizadas</h2><ul>${list(services.slice(0, 6))}</ul></div>
        <div class="footer-col"><h2>Ocasiões</h2><ul>${list(services.slice(6))}</ul></div>
        <div class="footer-col"><h2>Guias</h2><ul><li><a href="/guias">Todos os guias</a></li>${list(guides)}<li><a href="/privacidade">Privacidade</a></li><li><a href="/termos">Termos de uso</a></li></ul></div>
      </div>
      <div class="footer-bottom"><span>© <span id="current-year">${BUILD_DATE.slice(0, 4)}</span> ${BRAND}. Todos os direitos reservados.</span><span>Imagens ilustrativas.</span></div>
    </div>
  </footer>

  <div class="modal" id="order-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-backdrop" data-close-modal></div>
    <div class="modal-card payment-modal x1-modal">
      <button class="modal-close" type="button" data-close-modal aria-label="Fechar">×</button>
      <span class="eyebrow">Música personalizada</span>
      <h2 id="modal-title">Prepare seu briefing</h2>
      <p>Conte sua história e escolha a direção da música. O atendimento recebe tudo pronto para conversar com você.</p>
    </div>
  </div>

  <a class="floating-whatsapp" href="/#oferta" aria-label="Criar minha música personalizada"><span>Criar minha música</span></a>

  <script src="/public-config.js?v=${ASSET_VERSION}" defer></script>
  <script src="/analytics.js?v=${ASSET_VERSION}" defer></script>
  <script src="/script.js?v=${ASSET_VERSION}" defer></script>`;
};

const asideCard = () => `<aside class="aside-card" aria-label="Criar música personalizada">
          <span class="eyebrow">Canção de Nós</span>
          <h2>Transforme a história de vocês em música</h2>
          <div class="price-mini"><small>a partir de</small>R$ 49,90</div>
          <button class="button button-primary plan-button" type="button" data-plan="Música personalizada" data-price="A confirmar no WhatsApp">Criar minha música</button>
          <ul><li>Briefing sem custo</li><li>Nome e detalhes na letra</li><li>Atendimento pelo WhatsApp</li></ul>
        </aside>`;

const ctaBand = (title, text) => `<section class="final-cta">
      <div class="container">
        <div class="final-card">
          <span class="eyebrow">Canção de Nós</span>
          <h2>${title}</h2>
          <p>${text}</p>
          <a class="button button-light" href="/#oferta" data-start-order>Criar minha música</a>
        </div>
      </div>
    </section>`;

const topicCards = (pages) => `<div class="topic-grid">${pages.map((p) => `
          <a class="topic-card" href="/${p.slug}"><small>${esc(p.tag)}</small><h3>${esc(p.h1Short || p.label)}</h3>${p.description ? `<p>${esc(p.description)}</p>` : ''}<span class="more">${p.kind === 'guia' ? 'Ler guia' : 'Ver ideias'}</span></a>`).join('')}
        </div>`;

const page = ({ title, description, path, type, robots, schema, bodyClass = '', main }) => `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  ${headTags({ title, description, path, type, robots })}
  ${schema ? ld(schema) : ''}
</head>
<body class="${bodyClass}">
  ${header(false)}

  <main id="conteudo">
${main}
  </main>

  ${footer()}
</body>
</html>
`;

// ---------- leitura das fontes ----------
const readSource = async (slug) => {
  const html = (await readFile(`${slug}.html`, 'utf8')).replace(/\r\n/g, '\n');
  const heroBlock = pick(html, /<section class="seo-article-hero">([\s\S]*?)<\/section>/);
  let article = pick(html, /<article class="seo-article[^"]*">([\s\S]*?)<\/article>/);
  article = article
    .replace(/<div class="cta-box">[\s\S]*?<\/div>/, '')
    .replace(/<div class="related">[\s\S]*?<\/div>/, '')
    .replace(/<nav class="seo-breadcrumb">[\s\S]*?<\/nav>/, '')
    .replace(/<span class="eyebrow">[\s\S]*?<\/span>/, '')
    .replace(/<h1>[\s\S]*?<\/h1>/, '')
    .trim();
  const ldRaw = pick(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  let published = '2026-09-11';
  try { published = JSON.parse(ldRaw)['@graph'].find((n) => n.datePublished)?.datePublished || published; } catch {}
  return {
    title: decode(pick(html, /<title>([\s\S]*?)<\/title>/)).trim(),
    description: decode(pick(html, /<meta name="description" content="([^"]*)"/)),
    eyebrow: strip(pick(heroBlock || html, /<span class="eyebrow">([\s\S]*?)<\/span>/)),
    h1: strip(pick(heroBlock || html, /<h1>([\s\S]*?)<\/h1>/)),
    lead: strip(pick(heroBlock, /<p>([\s\S]*?)<\/p>/)),
    article,
    published,
  };
};

const readingTime = (html) => Math.max(2, Math.round(strip(html).split(' ').length / 200));
const sentenceCase = (s) => (s && s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);

// ---------- build ----------
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

const sources = new Map();
for (const p of PAGES) {
  const src = await readSource(p.slug);
  sources.set(p.slug, src);
  p.description = src.description;
}

// Home
const homeUrl = `${SITE}/`;
let home = (await readFile('index.html', 'utf8')).replace(/\r\n/g, '\n');
const homeTitle = pick(home, /<title>([\s\S]*?)<\/title>/);
const homeDesc = decode(pick(home, /<meta name="description" content="([^"]*)"/));
home = home
  .replace(/<!--@head[^>]*-->/, headTags({ title: decode(homeTitle), description: homeDesc, path: '/' }))
  .replace('<!--@schema home-->', ld({
    '@context': 'https://schema.org',
    '@graph': [
      ORG,
      WEBSITE,
      { '@type': 'WebPage', '@id': `${homeUrl}#webpage`, url: homeUrl, name: decode(homeTitle), description: homeDesc, inLanguage: 'pt-BR', isPartOf: { '@id': `${SITE}/#website` }, about: { '@id': `${SITE}/#servico` }, primaryImageOfPage: OG_IMAGE, dateModified: BUILD_DATE },
      SERVICE,
      {
        '@type': 'Product',
        '@id': `${SITE}/#produto`,
        name: 'Música personalizada Canção de Nós',
        description: 'Música original com o nome e a história de quem você ama. Escolha de estilo musical, voz e direção criativa, com entrega digital.',
        image: OG_IMAGE,
        brand: { '@type': 'Brand', name: BRAND },
        category: 'Presentes personalizados > Música personalizada',
        offers: OFFER,
      },
      faqSchema(HOME_FAQ, homeUrl),
    ],
  }))
  .replace('<!--@header-->', header(true))
  .replace('<!--@footer-->', footer())
  .replace('<!--@faq home-->', faqHtml(HOME_FAQ));
await writeFile('dist/index.html', home, 'utf8');

// Landings e guias
for (const p of PAGES) {
  const src = sources.get(p.slug);
  const pageUrl = url(p.slug);
  const trail = p.kind === 'guia'
    ? [['Início', `${SITE}/`], ['Guias', `${SITE}/guias`], [p.label, pageUrl]]
    : [['Início', `${SITE}/`], [p.label, pageUrl]];
  // Rotaciona os relacionados para distribuir links internos entre todas as páginas.
  const idx = PAGES.indexOf(p);
  const pool = PAGES.filter((o) => o.slug !== p.slug);
  const rel = [0, 1, 2].map((k) => pool[(idx * 3 + k) % pool.length]);

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      ORG,
      WEBSITE,
      {
        '@type': p.kind === 'guia' ? 'BlogPosting' : 'Article',
        '@id': `${pageUrl}#article`,
        headline: src.h1.slice(0, 110),
        description: src.description,
        image: OG_IMAGE,
        inLanguage: 'pt-BR',
        datePublished: src.published,
        dateModified: BUILD_DATE,
        author: { '@id': `${SITE}/#organization` },
        publisher: { '@id': `${SITE}/#organization` },
        mainEntityOfPage: { '@id': `${pageUrl}#webpage` },
        ...(p.kind === 'servico' ? { about: { '@id': `${SITE}/#servico` } } : {}),
      },
      { '@type': 'WebPage', '@id': `${pageUrl}#webpage`, url: pageUrl, name: src.title, description: src.description, inLanguage: 'pt-BR', isPartOf: { '@id': `${SITE}/#website` }, breadcrumb: { '@id': `${pageUrl}#breadcrumb` } },
      { ...breadcrumbSchema(trail), '@id': `${pageUrl}#breadcrumb` },
      ...(p.kind === 'servico' ? [SERVICE] : []),
    ],
  };

  const main = `    <section class="page-hero">
      <div class="container">
        ${breadcrumbHtml(trail)}
        <span class="eyebrow">${esc(sentenceCase(src.eyebrow) || p.tag)}</span>
        <h1>${esc(src.h1)}</h1>
        ${src.lead ? `<p class="lead">${esc(src.lead)}</p>` : ''}
        <div class="page-meta"><span>Por ${BRAND}</span><span>Atualizado em <time datetime="${BUILD_DATE}">${dateBR(BUILD_DATE)}</time></span><span>${readingTime(src.article)} min de leitura</span></div>
      </div>
    </section>

    <div class="container article-layout">
      <article class="prose">
        ${src.article}
      </article>
      ${asideCard()}
    </div>

    <section class="related" aria-labelledby="relacionados">
      <div class="container">
        <div class="section-head"><span class="eyebrow">Continue lendo</span><h2 id="relacionados">Mais ideias para emocionar</h2></div>
        ${topicCards(rel)}
      </div>
    </section>

    ${ctaBand('Faça uma música só de vocês', 'Conte a história, escolha o tom da canção e receba atendimento personalizado pelo WhatsApp.')}`;

  await writeFile(`dist/${p.slug}.html`, page({ title: src.title, description: src.description, path: `/${p.slug}`, type: 'article', schema, bodyClass: `content-page ${p.kind}`, main }), 'utf8');
}

// Hub de guias
{
  const src = (await readFile('guias.html', 'utf8')).replace(/\r\n/g, '\n');
  const title = decode(pick(src, /<title>([\s\S]*?)<\/title>/)).trim();
  const description = decode(pick(src, /<meta name="description" content="([^"]*)"/));
  const hero = pick(src, /<section class="seo-article-hero">([\s\S]*?)<\/section>/);
  const pageUrl = url('guias');
  const trail = [['Início', `${SITE}/`], ['Guias', pageUrl]];
  const guides = PAGES.filter((p) => p.kind === 'guia');
  const services = PAGES.filter((p) => p.kind === 'servico');
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      ORG, WEBSITE,
      { '@type': 'CollectionPage', '@id': `${pageUrl}#webpage`, url: pageUrl, name: title, description, inLanguage: 'pt-BR', isPartOf: { '@id': `${SITE}/#website` }, breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
        mainEntity: { '@type': 'ItemList', itemListElement: [...guides, ...services].map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: url(p.slug), name: sources.get(p.slug).h1 })) } },
      { ...breadcrumbSchema(trail), '@id': `${pageUrl}#breadcrumb` },
    ],
  };
  const main = `    <section class="page-hero">
      <div class="container">
        ${breadcrumbHtml(trail)}
        <span class="eyebrow">${esc(sentenceCase(strip(pick(hero, /<span class="eyebrow">([\s\S]*?)<\/span>/))))}</span>
        <h1>${esc(strip(pick(hero, /<h1>([\s\S]*?)<\/h1>/)))}</h1>
        <p class="lead">${esc(strip(pick(hero, /<p>([\s\S]*?)<\/p>/)))}</p>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="section-head"><span class="eyebrow">Guias</span><h2>Surpresas, presentes e homenagens</h2></div>
        ${topicCards(guides)}
      </div>
    </section>
    <section class="section related">
      <div class="container">
        <div class="section-head"><span class="eyebrow">Para cada pessoa</span><h2>Música personalizada para cada momento</h2></div>
        ${topicCards(services)}
      </div>
    </section>
    ${ctaBand('Pronto para criar a sua?', 'Comece pelo briefing — sem custo — e escolha a direção da sua música.')}`;
  await writeFile('dist/guias.html', page({ title, description, path: '/guias', schema, bodyClass: 'content-page hub', main }), 'utf8');
}

// Páginas legais (noindex)
for (const l of LEGAL) {
  const src = (await readFile(`${l.slug}.html`, 'utf8')).replace(/\r\n/g, '\n');
  const title = decode(pick(src, /<title>([\s\S]*?)<\/title>/)).trim();
  let article = pick(src, /<article class="seo-article[^"]*">([\s\S]*?)<\/article>/)
    .replace(/<nav class="seo-breadcrumb">[\s\S]*?<\/nav>/, '')
    .replace(/<span class="eyebrow">[\s\S]*?<\/span>/, '');
  const h1 = strip(pick(article, /<h1>([\s\S]*?)<\/h1>/));
  article = article.replace(/<h1>[\s\S]*?<\/h1>/, '').trim();
  const main = `    <section class="page-hero"><div class="container">${breadcrumbHtml([['Início', `${SITE}/`], [l.label, url(l.slug)]])}<h1>${esc(h1)}</h1></div></section>
    <div class="container legal section-tight"><article class="prose">${article}</article></div>`;
  await writeFile(`dist/${l.slug}.html`, page({ title, description: `${l.label} da ${BRAND}.`, path: `/${l.slug}`, robots: 'noindex,follow', bodyClass: 'content-page legal-page', main }), 'utf8');
}

// 404
await writeFile('dist/404.html', page({
  title: `Página não encontrada | ${BRAND}`,
  description: 'A página que você procurou não foi encontrada.',
  path: '/404',
  robots: 'noindex,follow',
  bodyClass: 'content-page',
  main: `    <section class="page-hero"><div class="container"><span class="eyebrow">Erro 404</span><h1>Talvez a história tenha mudado de endereço.</h1><p class="lead">Volte para o início ou explore nossas ideias de músicas personalizadas.</p><p style="margin-top:24px"><a class="button button-primary" href="/">Ir para o início</a></p></div></section>
    <section class="section related"><div class="container">${topicCards(PAGES.filter((p) => p.kind === 'servico').slice(0, 6))}</div></section>`,
}), 'utf8');

// Arquivos estáticos publicados (lista explícita).
const STATIC = [
  'site.css', 'checkout.css', 'script.js', 'x1-flow.js', 'public-config.js', 'analytics.js',
  'favicon.svg', 'robots.txt', 'llms.txt', 'site.webmanifest', 'cancao-de-nos-theme.mp3', 'payment-return.html',
];
for (const file of STATIC) if (existsSync(file)) await cp(file, `dist/${file}`);
await cp('assets', 'dist/assets', { recursive: true });

// payment-return é do fluxo antigo: não deve ser indexado.
{
  const f = 'dist/payment-return.html';
  if (existsSync(f)) {
    const html = await readFile(f, 'utf8');
    if (!html.includes('noindex')) await writeFile(f, html.replace('<head>', '<head>\n  <meta name="robots" content="noindex,nofollow" />'), 'utf8');
  }
}

// Sitemap
const entries = [
  { loc: `${SITE}/`, priority: 1.0 },
  { loc: `${SITE}/guias`, priority: 0.8 },
  ...PAGES.map((p) => ({ loc: url(p.slug), priority: p.priority })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.map((e) => `  <url><loc>${e.loc}</loc><lastmod>${BUILD_DATE}</lastmod><priority>${e.priority.toFixed(2)}</priority>${e.loc === `${SITE}/` ? `<image:image><image:loc>${OG_IMAGE}</image:loc></image:image>` : ''}</url>`).join('\n')}
</urlset>
`;
await writeFile('dist/sitemap.xml', sitemap, 'utf8');

console.log(`Build ok: home + ${PAGES.length} páginas de conteúdo + guias + ${LEGAL.length} legais + 404 → dist/`);
