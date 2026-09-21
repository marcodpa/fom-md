import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../', import.meta.url))
const server = await createServer({
  configFile: false,
  root,
  envDir: fileURLToPath(new URL('./empty-env/', import.meta.url)),
  plugins: [react(), { name: 'local-review-fixtures', transform(code, id) {
    if (id.replaceAll('\\', '/').endsWith('/src/panel/datos/repo.js')) return code + '\nimport { applyReviewFixtures } from "/output/design-review/fixtures.js"; applyReviewFixtures(repo);'
  }}],
  define: { 'import.meta.env.VITE_FOM_API': JSON.stringify('') },
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
})
await server.listen()
console.log('Local design review, demo data only: http://127.0.0.1:5174')
