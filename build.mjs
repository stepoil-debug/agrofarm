import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { extname } from 'node:path';

const canonical = 'https://cancao.dflabs.app/';
const allowedExtensions = new Set(['.html', '.css', '.js', '.svg', '.txt', '.xml']);

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

let html = await readFile('index.html', 'utf8');

html = html
  .replace(/<title>.*?<\/title>/s, '<title>Música Personalizada para Casal e Namorado(a) | Canção de Nós</title>')
  .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="Crie uma música personalizada com nome, história e momentos do casal. Presente romântico para namorado(a), marido ou esposa, aniversário de namoro e casamento." />')
  .replace('<meta name="theme-color" content="#681c43" />', '<meta name="theme-color" content="#681c43" />\n  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />\n  <link rel="canonical" href="https://cancao.dflabs.app/" />')
  .replace(/<meta property="og:title"[^>]*>/, '<meta property="og:title" content="Música Personalizada para Casal e Namorado(a) | Canção de Nós" />')
  .replace(/<meta property="og:description"[^>]*>/, '<meta property="og:description" content="Transforme nomes, lembranças e a história de vocês em uma música personalizada para presentear quem você ama." />')
  .replace('<meta property="og:type" content="website" />', '<meta property="og:type" content="website" />\n  <meta property="og:url" content="https://cancao.dflabs.app/" />\n  <meta property="og:locale" content="pt_BR" />\n  <meta name="twitter:card" content="summary_large_image" />\n  <meta name="twitter:title" content="Música Personalizada | Canção de Nós" />\n  <meta name="twitter:description" content="Sua história transformada em uma música feita para emocionar." />')
  .replace('<link rel="stylesheet" href="./enhancements.css" data-premium-layer />', '<link rel="stylesheet" href="./enhancements.css" data-premium-layer />\n  <link rel="stylesheet" href="./seo.css" />')
  .replace('<h1>O aniversário de quem você ama merece mais que um presente <em>qualquer.</em></h1>', '<h1>Música personalizada para quem você ama: transforme a história de vocês em um presente <em>inesquecível.</em></h1>');

const structuredData = `
  <script type="application/ld+json">
  ${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'Canção de Nós',
        url: canonical,
        inLanguage: 'pt-BR'
      },
      {
        '@type': 'Organization',
        name: 'Canção de Nós',
        url: canonical,
        logo: 'https://cancao.dflabs.app/favicon.svg'
      },
      {
        '@type': 'Product',
        name: 'Música Personalizada Canção de Nós',
        description: 'Música personalizada criada a partir do nome, história, lembranças e momentos de um casal.',
        image: 'https://images.pexels.com/photos/6800136/pexels-photo-6800136.jpeg?auto=compress&cs=tinysrgb&w=1200',
        brand: { '@type': 'Brand', name: 'Canção de Nós' },
        offers: {
          '@type': 'AggregateOffer',
          url: canonical,
          priceCurrency: 'BRL',
          lowPrice: '49.90',
          highPrice: '119.90',
          offerCount: '2',
          availability: 'https://schema.org/InStock'
        }
      }
    ]
  })}
  </script>`;

html = html.replace('</head>', `${structuredData}\n</head>`);

const seoSection = `    <section class="section seo-discovery-section" aria-labelledby="ideias-presente-title">
      <div class="section-heading">
        <span class="eyebrow">IDEIAS DE PRESENTE E HOMENAGEM</span>
        <h2 id="ideias-presente-title">Encontre a música personalizada certa para cada momento</h2>
        <p>Guias rápidos para quem quer surpreender namorado, namorada, marido ou esposa com uma homenagem feita da própria história.</p>
      </div>
      <div class="seo-topic-grid">
        <article class="seo-topic-card"><span>PARA CASAIS</span><h3>Música personalizada para casal</h3><p>Transforme o primeiro encontro, viagens, apelidos e momentos marcantes em uma canção só de vocês.</p><a href="/musica-personalizada-para-casal">Ver ideias para casal →</a></article>
        <article class="seo-topic-card"><span>PARA ELE</span><h3>Música personalizada para namorado</h3><p>Um presente romântico ou divertido, com as referências que fazem parte da relação de vocês.</p><a href="/musica-personalizada-para-namorado">Criar surpresa para namorado →</a></article>
        <article class="seo-topic-card"><span>PARA ELA</span><h3>Música personalizada para namorada</h3><p>Uma declaração com o nome dela e os detalhes que mostram o quanto você presta atenção.</p><a href="/musica-personalizada-para-namorada">Criar surpresa para namorada →</a></article>
        <article class="seo-topic-card"><span>ANIVERSÁRIO DELE</span><h3>Presente de aniversário para namorado</h3><p>Ideias para sair do óbvio e transformar o aniversário dele em uma lembrança que pode ser ouvida.</p><a href="/presente-de-aniversario-para-namorado">Ver presente para namorado →</a></article>
        <article class="seo-topic-card"><span>COM O NOME</span><h3>Música com nome da pessoa</h3><p>Entenda como usar nome, apelido, lugares e memórias para deixar a homenagem realmente única.</p><a href="/musica-com-nome-da-pessoa">Ver como funciona →</a></article>
        <article class="seo-topic-card"><span>DATA ESPECIAL</span><h3>Homenagem de aniversário</h3><p>Uma forma diferente de dizer parabéns usando sentimentos e lembranças reais em uma música.</p><a href="/homenagem-de-aniversario">Ver ideias de homenagem →</a></article>
      </div>
    </section>`;

html = html.replace('</section>\n\n    <section class="section emotional-section">', `</section>\n\n${seoSection}\n\n    <section class="section emotional-section">`);

await writeFile('dist/index.html', html, 'utf8');

const entries = await readdir('.', { withFileTypes: true });
let copied = 1;
for (const entry of entries) {
  if (!entry.isFile() || entry.name === 'index.html' || entry.name === 'build.mjs') continue;
  if (!allowedExtensions.has(extname(entry.name))) continue;
  await cp(entry.name, `dist/${entry.name}`);
  copied += 1;
}

console.log(`SEO static build ready: ${copied} files published to dist/`);
