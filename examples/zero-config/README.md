# Zero-Config Example

This example shows the current smallest working `phial` app with file routes, no manual route registration, `phial.config.ts` as the only bootstrap declaration, `app/loader.ts` shell data, `app/app.config.ts` named middleware registration, directory-scoped `_middleware.ts`, route loading boundaries, a page `action`, and `server/routes` HTTP handlers with global and directory-scoped server middleware.

`app/app.vue` is the full document shell (`html/head/body`), and the default client runtime hydrates that document shell automatically. `app/loader.ts` provides shell-level server data for `useAppData()`, while `app/app.config.ts` registers app-level middleware by name. `app/pages/layout.ts` handles the route layout, `loading.ts` files render during client navigation, the home page demonstrates a progressively enhanced `POST` form with `useSubmit()`, and server routes use `Request.context` via `@hornjs/fest` and `@hornjs/fest/utils`.

## Files

- `app/app.config.ts`: static app config and app-level middleware names
- `app/loader.ts`: app-shell server data for `useAppData()`
- `app/middleware/*.ts`: reusable named middleware implementations
- `app/app.vue`: document shell with `useAppData()` and static document metadata
- `app/error.vue`: app-level error fallback
- `app/pages/layout.ts`: root route layout with shared navigation
- `app/pages/page.ts`: home page component
- `app/pages/loader.ts`: home page loader
- `app/pages/loading.ts`: root loading boundary for client navigation
- `app/pages/action.ts`: home page action
- `app/pages/blog/_middleware.ts`: directory-scoped blog route middleware declaration by name
- `app/pages/blog/[slug]/middleware.ts`: route middleware declaration by name
- `app/pages/blog/[slug]/page.ts`: dynamic route component using `useLoaderData()` and `useRoute()`
- `app/pages/blog/[slug]/loader.ts`: dynamic route loader
- `app/pages/blog/[slug]/loading.ts`: nested loading boundary for dynamic post navigation
- `server/middleware/server-trace.ts`: reusable server middleware implementation
- `server/routes/api/_middleware.ts`: directory-scoped server middleware declaration by name
- `server/routes/api/ping.ts`: file-based server route with `GET` and `POST`
- `server/routes/robots.txt.ts`: plain text server route
- `phial.config.ts`: declares dev defaults and global `server.middleware`

## Run

From `repos/phial`:

```bash
pnpm example:zero-config
```

Then open `http://localhost:3000`.

The example imports `phial` by package name, so building first ensures `dist/` is available inside this repository checkout. The CLI then starts Vite, loads `phial` and `phial/vite-plugin` through Phial-owned generated virtual modules, and injects the default client runtime for you.

For a production asset build from the package root:

```bash
node bin/phial.mjs prepare examples/zero-config
node bin/phial.mjs build examples/zero-config
node bin/phial.mjs start examples/zero-config
```

`phial prepare` writes `.phial/types/middleware.d.ts` and `.phial/types/routes.d.ts`. Those power middleware-name autocomplete plus the generated app-route path/id/params types derived from `app/pages/`.

`server/routes` owns raw HTTP paths outright. If a `server/routes` pattern overlaps with an `app/pages` pattern, Phial will fail scanning instead of trying to split ownership by method.
