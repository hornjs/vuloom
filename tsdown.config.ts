import { defineConfig } from 'tsdown'
import fs from 'node:fs'
import path from 'node:path'

export default defineConfig({
  entry: [
    "src/app.ts",
    "src/bin.ts",
    "src/index.ts",
    "src/integration.ts",
    "src/server.ts",
    "src/vite.ts",
  ],
  platform: "node",
  dts: true,
  unbundle: true,
  tsconfig: true,
  fixedExtension: false,
  deps: {
    skipNodeModulesBundle: true,
  },
  onSuccess() {
    // Copy generated-routes.d.ts to dist for virtual module type support
    const source = path.resolve("src/lib/generated-routes.d.ts")
    const target = path.resolve("dist/lib/generated-routes.d.ts")
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, target)
      console.log(`Copied generated-routes.d.ts to dist/`)
    }
  },
})
