import { cpSync, mkdirSync, rmSync } from 'node:fs'

rmSync('dist', { recursive: true, force: true })
mkdirSync('dist', { recursive: true })
for (const entry of ['index.html', 'src', 'public', 'sw.js']) cpSync(entry, `dist/${entry}`, { recursive: true })
console.log('Build estático criado em dist/.')
