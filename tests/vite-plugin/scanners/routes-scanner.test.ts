import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { scanRoutes } from "../../../src/lib/vite-plugin/scanners/index.ts";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "horn-route-scan-"));
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
    await rm(root, { recursive: true, force: true });
  }
});

describe("scanRoutes", () => {
  test("scans app and server sources into a full route manifest result", async () => {
    const root = await createTempRoot();
    await writeFiles(root, {
      "app/app.vue": "<template><div /></template>",
      "app/error.vue": "<template><div /></template>",
      "app/loader.ts": "export default async function loader() {}",
      "app/pages/layout.vue": "<template><div /></template>",
      "app/pages/page.vue": "<template><div /></template>",
      "app/pages/posts/layout.vue": "<template><div /></template>",
      "app/pages/posts/[slug]/page.vue": "<template><div /></template>",
      "server/routes/api/ping.ts": "export default {}",
      "server/middleware/trace.ts": "export default async function trace() {}",
    });

    const result = await scanRoutes({
      root,
      extensions: [".vue", ".ts"],
    });

    expect(result.app).toMatchObject({
      app: "app/app.vue",
      error: "app/error.vue",
      loader: "app/loader.ts",
    });
    expect(result.modules.map((module) => module.id)).toEqual([
      "layout",
      "page",
      "posts/layout",
      "posts/[slug]/page",
    ]);
    expect(result.manifest.map((entry) => entry.id)).toEqual([
      "layout",
      "page",
      "posts/layout",
      "posts/[slug]/page",
    ]);
    expect(result.server.routes).toEqual([
      {
        absoluteFile: `${root}/server/routes/api/ping.ts`,
        directoryMiddleware: [],
        file: "server/routes/api/ping.ts",
        id: "api/ping",
        path: "/api/ping",
      },
    ]);
    expect(result.server.middleware).toEqual({
      trace: "server/middleware/trace.ts",
    });
  });
});
