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

  if (!html.includes('audio.js')) {
    html = html.replace('</body>', '  <script src="./audio.js" defer></script>\n</body>');
    await writeFile(filePath, html, 'utf8');
    pagesUpdated += 1;
  }
}

console.log(`Audio ready: MP3 copied and audio.js injected into ${pagesUpdated} HTML pages.`);
