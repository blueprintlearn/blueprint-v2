import path from "node:path"
import { fileURLToPath } from "node:url"
import { createServer } from "vite"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const server = await createServer({
  configFile: false,
  root,
  server: { middlewareMode: true },
  appType: "custom",
  resolve: {
    alias: {
      "@": root,
    },
  },
})

try {
  await server.ssrLoadModule("/scripts/import-legacy-curriculum.ts")
} finally {
  await server.close()
}
