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
  .replace(/<title>.*?<\/title>/s, '<title>Música Personalizada para Casal e Namorado(a) | Canção de Nós</title>')
  .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="Crie uma música personalizada com nome, história e momentos do casal. Presente romântico para namorado(a), marido ou esposa, aniversário de namoro e casamento." />')
  .replace('<meta name="theme-color" content="#681c43" />', '<meta name="theme-color" content="#681c43" />\n  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />\n  <meta name="author" content="Canção de Nós" />\n  <link rel="canonical" href="https://cancao.dflabs.app/" />')
  .replace(/<meta property="og:title"[^>]*>/, '<meta property="og:title" content="Música Personalizada para Casal e Namorado(a) | Canção de Nós" />')
  .replace(/<meta property="og:description"[^>]*>/, '<meta property="og:description" content="Transforme nomes, lembranças e a história de vocês em uma música personalizada para presentear quem você ama." />')
  .replace('<meta property="og:type" content="website" />', '<meta property="og:type" content="website" />\n  <meta property="og:url" content="https://cancao.dflabs.app/" />\n  <meta property="og:site_name" content="Canção de Nós" />\n  <meta property="og:locale" content="pt_BR" />\n  <meta name="twitter:card" content="summary_large_image" />\n  <meta name="twitter:title" content="Música Personalizada | Canção de Nós" />\n  <meta name="twitter:description" content="Sua história transformada em uma música feita para emocionar." />\n  <meta name="twitter:image" content="https://images.pexels.com/photos/6800136/pexels-photo-6800136.jpeg?auto=compress&cs=tinysrgb&w=1200" />')
  .replace('<link rel="stylesheet" href="./enhancements.css" data-premium-layer />', '<link rel="stylesheet" href="./enhancements.css" data-premium-layer />\n  <link rel="stylesheet" href="./seo.css" />')
  .replace('<h1>O aniversário de quem você ama merece mais que um presente <em>qualquer.</em></h1>', '<h1>Música personalizada para quem você ama: transforme a história de vocês em um presente <em>inesquecível.</em></h1>');

const faqEntities = [
  ['O aniversário está próximo. Ainda dá tempo?', 'Informe a data da comemoração no formulário. No WhatsApp, confirmamos o prazo disponível antes do pagamento.'],
  ['Como envio a história do casal?', 'Ao escolher um plano, você preenche um formulário rápido. As informações são organizadas em uma mensagem e enviadas diretamente para nosso WhatsApp.'],
  ['Preciso saber escrever uma letra?', 'Não. Conte a história com suas próprias palavras. Nós usamos os acontecimentos, sentimentos e detalhes enviados para construir a canção.'],
  ['Como funciona o pagamento?', 'No WhatsApp, enviamos a chave PIX ou um link de pagamento da InfinitePay. A produção começa após a confirmação.'],
  ['Posso escolher o estilo musical?', 'Sim. Você pode escolher estilos como sertanejo, pagode, pop, MPB, gospel, forró, rock e outros.'],
  ['Posso pedir alterações?', 'O plano Especial inclui uma rodada de alterações. No Express, corrigimos gratuitamente erros de nome ou informações diferentes do formulário.'],
  ['Como recebo a música?', 'A música é entregue digitalmente pelo WhatsApp, junto com a letra correspondente ao plano escolhido.']
].map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }));

const structuredData = `
  <script type="application/ld+json">
  ${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${canonical}#website`,
        name: 'Canção de Nós',
        url: canonical,
        inLanguage: 'pt-BR'
      },
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        name: 'Música Personalizada para Casal e Namorado(a)',
        url: canonical,
        isPartOf: { '@id': `${canonical}#website` },
        inLanguage: 'pt-BR'
      },
      {
        '@type': 'Organization',
        '@id': `${canonical}#organization`,
        name: 'Canção de Nós',
        url: canonical
      },
      {
        '@type': 'Product',
        name: 'Música Personalizada Canção de Nós',
        description: 'Música personalizada criada a partir do nome, história, lembranças e momentos de um casal.',
        image: 'https://images.pexels.com/photos/6800136/pexels-photo-6800136.jpeg?auto=compress&cs=tinysrgb&w=1200',
        brand: { '@type': 'Brand', name: 'Canção de Nós' },
        offers: [
          { '@type': 'Offer', name: 'Canção Express', url: `${canonical}#planos`, priceCurrency: 'BRL', price: '49.90', availability: 'https://schema.org/InStock' },
          { '@type': 'Offer', name: 'Canção Especial', url: `${canonical}#planos`, priceCurrency: 'BRL', price: '119.90', availability: 'https://schema.org/InStock' }
        ]
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqEntities
      }
    ]
  })}
  </script>`;

html = html.replace('</head>', `${structuredData}\n</head>`);

const seoSection = `    <section class="section seo-discovery-section" aria-labelledby="ideias-presente-title">
      <div class="section-heading">
        <span class="eyebrow">IDEIAS DE PRESENTE E HOMENAGEM</span>
        <h2 id="ideias-presente-title">Encontre a música personalizada certa para cada momento</h2>
        <p>Conteúdos para quem quer surpreender namorado, namorada, marido ou esposa com uma homenagem feita da própria história.</p>
      </div>
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
html = html.replace('</footer>', `${siteLinks}\n  </footer>`);

await writeFile('dist/index.html', html, 'utf8');

const entries = await readdir('.', { withFileTypes: true });
let copied = 1;
for (const entry of entries) {
  if (!entry.isFile() || entry.name === 'index.html' || entry.name === 'build.mjs') continue;
  if (!allowedExtensions.has(extname(entry.name))) continue;

  if (extname(entry.name) === '.html') {
    let page = await readFile(entry.name, 'utf8');
    if (!page.includes('seo-site-links')) {
      page = page.replace('</footer>', `${siteLinks}\n</footer>`);
    }
    await writeFile(`dist/${entry.name}`, page, 'utf8');
  } else {
    await cp(entry.name, `dist/${entry.name}`);
  }
  copied += 1;
}

console.log(`SEO static build ready: ${copied} files published to dist/`);
