import { cp, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const audioSource = 'se-as-palavras-forem-poucas.mp3';
const audioDest = join('dist', audioSource);

await cp(audioSource, audioDest);

const entries = await readdir('dist', { withFileTypes: true });
let pagesUpdated = 0;

for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith('.html')) continue;

  const filePath = join('dist', entry.name);
  let html = await readFile(filePath, 'utf8');

  const scripts = [
    ['public-config.js', '  <script src="./public-config.js" defer></script>'],
    ['analytics.js', '  <script src="./analytics.js" defer></script>'],
    ['audio.js', '  <script src="./audio.js" defer></script>'],
  ];
  for (const [needle, tag] of scripts) {
    if (!html.includes(needle)) html = html.replace('</body>', `${tag}\n</body>`);
  }
  if (html !== await readFile(filePath, 'utf8')) {
    await writeFile(filePath, html, 'utf8');
    pagesUpdated += 1;
  }
}

console.log(`Audio ready: MP3 copied and audio.js injected into ${pagesUpdated} HTML pages.`);
