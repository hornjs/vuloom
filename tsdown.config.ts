import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/vite-plugin.ts",
    "src/cli.ts",
  ],
  platform: "node",
  dts: true,
  unbundle: true,
  tsconfig: true,
  fixedExtension: false,
  deps: {
    skipNodeModulesBundle: true,
  },
})
