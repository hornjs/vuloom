# vuloom

`vuloom` is the public package surface for the Vue pagelet runtime and Vite plugin that powers vuloom apps.

## Install

```bash
pnpm add vuloom
```

## Configuration

### Vite Config (`vite.config.ts`)

```ts
import { vuloom } from "vuloom/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vuloom()],
});
```

### Vuloom Config (`vuloom.config.ts`)

```ts
import { defineConfig } from "vuloom/vite";

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

- `vuloom`
- `vuloom/vite`
- `vuloom/app`
- `vuloom/server`

`vuloom` exports the package version.  
`vuloom/vite` provides the Vite plugin, config utilities, and build tools.  
`vuloom/app` is for **app routes** — Vue pages, loaders, actions.  
`vuloom/server` is for **server routes** — API handlers, middleware.

### App Routes (`vuloom/app`)

For developing Vue page routes:

```ts
// loader.ts
import type { LoaderContext } from "vuloom/app";

export const loader = async (ctx: LoaderContext) => {
  return { data: await fetchData() };
};
```

```ts
// page.vue
import { useLoaderData, RouterView } from "vuloom/app";
```

### Server Routes (`vuloom/server`)

For developing API routes:

```ts
// route.ts
import type { ServerHandler } from "vuloom/server";

export const GET: ServerHandler = (ctx) => {
  return Response.json({ hello: "world" });
};
```

## CLI

The CLI ships as `vuloom` via the package `bin` field:

```bash
npx vuloom dev
npx vuloom build
npx vuloom start
```

CLI entry: `vuloom/cli`

```ts
import { runVuloomCli } from "vuloom/cli";
```

## TODO

- **TypeScript 7 Migration**: Remove `baseUrl` support from generated `.vuloom/tsconfig.typecheck.json` when TypeScript 7 is released. Currently using `ignoreDeprecations: "6.0"` to suppress the deprecation warning.
