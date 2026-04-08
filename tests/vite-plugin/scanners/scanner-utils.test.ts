import { describe, expect, test } from "vitest";
import {
  assertServerRouteConflicts,
  normalizeDirectoryMiddlewareExtensions,
  normalizeExtensions,
  resolveSingleEntryFile,
  type ScannedRouteModule,
  type ScannedServerRoute,
} from "../../../src/lib/vite/scanners/index.ts";

describe("scanner-utils", () => {
  test("normalizes extension arrays and strips vue from directory middleware extensions", () => {
    expect(normalizeExtensions(["vue", ".ts", ".ts"])).toEqual([".vue", ".ts"]);
    expect(normalizeDirectoryMiddlewareExtensions([".vue", ".ts", ".js"])).toEqual([".ts", ".js"]);
  });

  test("throws on duplicate entry files for the same route label", () => {
    expect(() =>
      resolveSingleEntryFile(["posts/page.ts", "posts/page.js"], "posts", "page"),
    ).toThrow("Duplicate page files found in posts: page.ts, page.js");
  });

  test("detects app page and server route path conflicts", () => {
    const appModules: ScannedRouteModule[] = [
      {
        id: "posts/[slug]/page",
        kind: "page",
        file: "app/pages/posts/[slug]/page.vue",
        absoluteFile: "/app/pages/posts/[slug]/page.vue",
        directoryMiddleware: [],
        path: ":slug",
        parentId: "posts/layout",
        files: {
          page: "app/pages/posts/[slug]/page.vue",
        },
      },
      {
        id: "posts/layout",
        kind: "layout",
        file: "app/pages/posts/layout.vue",
        absoluteFile: "/app/pages/posts/layout.vue",
        directoryMiddleware: [],
        path: "posts",
        files: {
          layout: "app/pages/posts/layout.vue",
        },
      },
    ];
    const serverRoutes: ScannedServerRoute[] = [
      {
        id: "server/posts/:id",
        file: "server/routes/posts/[id].ts",
        absoluteFile: "/server/routes/posts/[id].ts",
        middleware: [],
        path: "/posts/:id",
      },
    ];

    expect(() => assertServerRouteConflicts(appModules, serverRoutes)).toThrow(
      'Server route "/posts/:id" from server/routes/posts/[id].ts conflicts with app page path "/posts/:slug". Phial does not split path ownership between app/pages and server/routes, even across different HTTP methods.',
    );
  });
});
