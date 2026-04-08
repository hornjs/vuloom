import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  scanServerMiddlewareFiles,
  scanServerRoutes,
} from "../../../src/lib/vite/scanners/index.ts";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "phial-server-scan-"));
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

describe("server scanners", () => {
  test("scanServerRoutes discovers route files and directory middleware", async () => {
    const root = await createTempRoot();
    await writeFiles(root, {
      "server/routes/api/_middleware.ts": "export default ['scope']",
      "server/routes/api/ping.ts": "export default {}",
      "server/routes/robots.txt.ts": "export default {}",
    });

    const result = await scanServerRoutes({
      root,
      routesDir: join(root, "server/routes"),
      extensions: [".ts"],
    });

    expect(result).toEqual([
      {
        absoluteFile: `${root}/server/routes/api/ping.ts`,
        middleware: ["server/routes/api/_middleware.ts"],
        file: "server/routes/api/ping.ts",
        id: "api/ping",
        path: "/api/ping",
      },
      {
        absoluteFile: `${root}/server/routes/robots.txt.ts`,
        middleware: [],
        file: "server/routes/robots.txt.ts",
        id: "robots.txt",
        path: "/robots.txt",
      },
    ]);
  });

  test("scanServerMiddlewareFiles discovers middleware registry files", async () => {
    const root = await createTempRoot();
    await writeFiles(root, {
      "server/middleware/auth.ts": "export default async function auth() {}",
      "server/middleware/trace.ts": "export default async function trace() {}",
    });

    const result = await scanServerMiddlewareFiles({
      root,
      middlewareDir: join(root, "server/middleware"),
      extensions: [".ts"],
    });

    expect(result).toEqual({
      auth: "server/middleware/auth.ts",
      trace: "server/middleware/trace.ts",
    });
  });

  test("scanServerRoutes reports ambiguous parameterized signatures with a phial-level error", async () => {
    const root = await createTempRoot();
    await writeFiles(root, {
      "server/routes/users/[id].ts": "export default {}",
      "server/routes/users/[slug].ts": "export default {}",
    });

    await expect(
      scanServerRoutes({
        root,
        routesDir: join(root, "server/routes"),
        extensions: [".ts"],
      }),
    ).rejects.toThrow(/Ambiguous server routes/);
  });
});
