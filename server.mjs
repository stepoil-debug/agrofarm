import http from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const port = Number(process.env.PORT || 5173)
const root = process.cwd()
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

http.createServer((request, response) => {
  const requestPath = decodeURIComponent((request.url || '/').split('?')[0])
  const safePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, '')
  let filePath = join(root, safePath === '/' ? 'index.html' : safePath)
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) filePath = join(root, 'index.html')
  response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream' })
  createReadStream(filePath).pipe(response)
}).listen(port, '0.0.0.0', () => {
  console.log(`AgroFarm disponível em http://localhost:${port}`)
})
