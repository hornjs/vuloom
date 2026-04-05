# phial

`phial` is the public package surface for the Vue pagelet runtime and Vite plugin that powers phial apps.

## Install

```bash
pnpm add phial
```

## Use the plugin

```ts
import { defineConfig, phialVitePlugin } from "phial/vite-plugin";

export default defineConfig({
  plugins: [phialVitePlugin()],
});
```

## Public entry points

- `phial`
- `phial/vite-plugin`

The CLI ships as `phial` via the package `bin` field and also lives at `bin/phial.mjs`.
`phial` re-exports the `vuepagelet` runtime surface.
