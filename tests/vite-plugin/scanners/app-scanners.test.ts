import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { scanAppPageRoutes, scanAppRuntime } from "../../../src/lib/vite/scanners/index.ts";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "horn-app-scan-"));
  tempRoots.push(root);
  return root;
}

async function writeFiles(root: string, files: Record<string, string>): Promise<void> {
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(root, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
  }
}

afterEach(async () => {
  for (const root of tempRoots.splice(0)) {
    await import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true }));
  }
});

describe("app scanners", () => {
  test("scanAppRuntime discovers app runtime files", async () => {
    const root = await createTempRoot();
    await writeFiles(root, {
      "app/app.vue": "<template><div /></template>",
      "app/error.vue": "<template><div /></template>",
      "app/loader.ts": "export default async function loader() {}",
      "app/middleware/auth.ts": "export default async function auth() {}",
      "app/middleware/trace.ts": "export default async function trace() {}",
      "app.config.ts": "export default {}",
    });

    const result = await scanAppRuntime({
      root,
      appDir: join(root, "app"),
      extensions: [".vue", ".ts"],
    });

    expect(result).toEqual({
      app: "app/app.vue",
      error: "app/error.vue",
      loader: "app/loader.ts",
      config: "app.config.ts",
      middleware: {
        auth: "app/middleware/auth.ts",
        trace: "app/middleware/trace.ts",
      },
    });
  });

  test("scanAppPageRoutes discovers nested layout/page modules", async () => {
    const root = await createTempRoot();
    await writeFiles(root, {
      "app/pages/layout.vue": "<template><div /></template>",
      "app/pages/index/page.vue": "<template><div /></template>",
      "app/pages/posts/layout.vue": "<template><div /></template>",
      "app/pages/posts/_middleware.ts": "export default ['auth']",
      "app/pages/posts/[slug]/page.vue": "<template><div /></template>",
      "app/pages/posts/[slug]/loader.ts": "export async function loader() {}",
      "app/pages/posts/[slug]/action.ts": "export async function action() {}",
      "app/pages/posts/[slug]/loading.vue": "<template><div /></template>",
    });

    const result = await scanAppPageRoutes({
      root,
      routesDir: join(root, "app/pages"),
      extensions: [".vue", ".ts"],
    });

    expect(result).toEqual([
      {
        absoluteFile: `${root}/app/pages/layout.vue`,
        directoryMiddleware: [],
        file: "app/pages/layout.vue",
        files: { layout: "app/pages/layout.vue" },
        id: "layout",
        index: undefined,
        kind: "layout",
        parentId: undefined,
        path: "/",
      },
      {
        absoluteFile: `${root}/app/pages/index/page.vue`,
        directoryMiddleware: [],
        file: "app/pages/index/page.vue",
        files: { page: "app/pages/index/page.vue" },
        id: "page",
        index: true,
        kind: "page",
        parentId: "layout",
        path: "/",
      },
      {
        absoluteFile: `${root}/app/pages/posts/layout.vue`,
        directoryMiddleware: ["app/pages/posts/_middleware.ts"],
        file: "app/pages/posts/layout.vue",
        files: { layout: "app/pages/posts/layout.vue" },
        id: "posts/layout",
        index: undefined,
        kind: "layout",
        parentId: "layout",
        path: "posts",
      },
      {
        absoluteFile: `${root}/app/pages/posts/[slug]/page.vue`,
        directoryMiddleware: [],
        file: "app/pages/posts/[slug]/page.vue",
        files: {
          action: "app/pages/posts/[slug]/action.ts",
          loader: "app/pages/posts/[slug]/loader.ts",
          loading: "app/pages/posts/[slug]/loading.vue",
          page: "app/pages/posts/[slug]/page.vue",
        },
        id: "posts/[slug]/page",
        index: false,
        kind: "page",
        parentId: "posts/layout",
        path: ":slug",
      },
    ]);
  });

  test("scanAppPageRoutes treats index directories as the parent route path", async () => {
    const root = await createTempRoot();
    await writeFiles(root, {
      "app/pages/users/middleware.ts": "export default ['auth']",
      "app/pages/users/index/page.vue": "<template><div /></template>",
      "app/pages/users/index/loader.ts": "export async function loader() {}",
      "app/pages/users/index/middleware.ts": "export default ['trace']",
      "app/pages/users/[id]/page.vue": "<template><div /></template>",
    });

    const result = await scanAppPageRoutes({
      root,
      routesDir: join(root, "app/pages"),
      extensions: [".vue", ".ts"],
    });

    expect(result).toEqual([
      {
        absoluteFile: `${root}/app/pages/users/[id]/page.vue`,
        directoryMiddleware: ["app/pages/users/middleware.ts"],
        file: "app/pages/users/[id]/page.vue",
        files: { page: "app/pages/users/[id]/page.vue" },
        id: "users/[id]/page",
        index: undefined,
        kind: "page",
        parentId: undefined,
        path: "users/:id",
      },
      {
        absoluteFile: `${root}/app/pages/users/index/page.vue`,
        directoryMiddleware: ["app/pages/users/middleware.ts"],
        file: "app/pages/users/index/page.vue",
        files: {
          loader: "app/pages/users/index/loader.ts",
          middleware: "app/pages/users/index/middleware.ts",
          page: "app/pages/users/index/page.vue",
        },
        id: "users/page",
        index: undefined,
        kind: "page",
        parentId: undefined,
        path: "users",
      },
    ]);
  });

  test("scanAppPageRoutes rejects page files in directories that also own child routes", async () => {
    const root = await createTempRoot();
    await writeFiles(root, {
      "app/pages/users/page.vue": "<template><div /></template>",
      "app/pages/users/[id]/page.vue": "<template><div /></template>",
    });

    await expect(
      scanAppPageRoutes({
        root,
        routesDir: join(root, "app/pages"),
        extensions: [".vue", ".ts"],
      }),
    ).rejects.toThrow(
      'Route directory users defines page.vue alongside child routes. Move the route into users/index/.',
    );
  });
});
