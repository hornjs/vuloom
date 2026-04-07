# phial

`phial` is the public package surface for the Vue pagelet runtime and Vite plugin that powers phial apps.

## Install

```bash
pnpm add phial
```

## Configuration

### Vite Config (`vite.config.ts`)

```ts
import { phialVitePlugin } from "phial/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [phialVitePlugin()],
});
```

### Phial Config (`phial.config.ts`)

```ts
import { defineConfig } from "phial/vite-plugin";

// Static config
export default defineConfig({
  app: {
    middlewares: ["auth"],
  },
  server: {
    middleware: ["logger"],
  },
  dev: {
    port: 3000,
  },
});

// Or function config based on command/mode
export default defineConfig(({ command, mode }) => ({
  app: {
    middlewares: mode === "production" ? ["auth", "compress"] : ["auth"],
  },
  dev: {
    port: command === "serve" ? 3000 : 4000,
  },
}));

// Or async function for dynamic config
export default defineConfig(async ({ mode }) => {
  const dbConfig = await loadDbConfig();
  return {
    app: {
      middlewares: ["auth"],
    },
    server: {
      middleware: dbConfig.middlewares,
    },
  };
});
```

## Public entry points

- `phial`
- `phial/vite-plugin`
- `phial/app`
- `phial/server`

`phial` exports the package version.  
`phial/vite-plugin` provides the Vite plugin, config utilities, and build tools.  
`phial/app` is for **app routes** — Vue pages, loaders, actions.  
`phial/server` is for **server routes** — API handlers, middleware.

### App Routes (`phial/app`)

For developing Vue page routes:

```ts
// loader.ts
import type { LoaderContext } from "phial/app";

export const loader = async (ctx: LoaderContext) => {
  return { data: await fetchData() };
};
```

```ts
// page.vue
import { useLoaderData, RouterView } from "phial/app";
```

### Server Routes (`phial/server`)

For developing API routes:

```ts
// route.ts
import type { ServerHandler } from "phial/server";

export const GET: ServerHandler = (ctx) => {
  return Response.json({ hello: "world" });
};
```

## CLI

The CLI ships as `phial` via the package `bin` field:

```bash
npx phial dev
npx phial build
npx phial start
```

CLI entry: `phial/cli`

```ts
import { runPhialCli } from "phial/cli";
```

## TODO

- **TypeScript 7 Migration**: Remove `baseUrl` support from generated `.phial/tsconfig.typecheck.json` when TypeScript 7 is released. Currently using `ignoreDeprecations: "6.0"` to suppress the deprecation warning.
