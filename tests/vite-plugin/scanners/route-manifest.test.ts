import { describe, expect, test } from "vitest";
import {
  collectAppPagePaths,
  createRouteManifest,
  type ScannedRouteModule,
} from "../../../src/lib/vite-plugin/scanners/index.ts";

describe("route-manifest", () => {
  test("creates a route manifest from scanned route modules", () => {
    const modules: ScannedRouteModule[] = [
      {
        id: "layout",
        kind: "layout",
        file: "app/pages/layout.vue",
        absoluteFile: "/app/pages/layout.vue",
        directoryMiddleware: [],
        path: "/",
        files: {
          layout: "app/pages/layout.vue",
        },
      },
      {
        id: "page",
        kind: "page",
        file: "app/pages/page.vue",
        absoluteFile: "/app/pages/page.vue",
        directoryMiddleware: [],
        path: "",
        parentId: "layout",
        index: true,
        files: {
          page: "app/pages/page.vue",
        },
      },
    ];

    expect(createRouteManifest(modules)).toEqual([
      {
        id: "layout",
        kind: "layout",
        path: "/",
        file: "app/pages/layout.vue",
        parentId: undefined,
        index: undefined,
      },
      {
        id: "page",
        kind: "page",
        path: "",
        file: "app/pages/page.vue",
        parentId: "layout",
        index: true,
      },
    ]);
  });

  test("collects full paths for page modules only", () => {
    const modules: ScannedRouteModule[] = [
      {
        id: "layout",
        kind: "layout",
        file: "app/pages/layout.vue",
        absoluteFile: "/app/pages/layout.vue",
        directoryMiddleware: [],
        path: "/",
        files: {
          layout: "app/pages/layout.vue",
        },
      },
      {
        id: "page",
        kind: "page",
        file: "app/pages/page.vue",
        absoluteFile: "/app/pages/page.vue",
        directoryMiddleware: [],
        path: "",
        parentId: "layout",
        index: true,
        files: {
          page: "app/pages/page.vue",
        },
      },
      {
        id: "posts/layout",
        kind: "layout",
        file: "app/pages/posts/layout.vue",
        absoluteFile: "/app/pages/posts/layout.vue",
        directoryMiddleware: [],
        path: "posts",
        parentId: "layout",
        files: {
          layout: "app/pages/posts/layout.vue",
        },
      },
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
    ];

    expect(collectAppPagePaths(modules)).toEqual(["/", "/posts/:slug"]);
  });
});
