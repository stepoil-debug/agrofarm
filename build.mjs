import { cp, mkdir, rm } from 'node:fs/promises';

const files = [
  'index.html',
  'styles.css',
  'enhancements.css',
  'script.js',
  'favicon.svg'
];

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

for (const file of files) {
  await cp(file, `dist/${file}`);
}

console.log(`Static build ready: ${files.length} files copied to dist/`);
