import { describe, expect, test } from "vitest";
import {
  createRouteRuntimeModules,
  type AppModule,
  type ModuleResolver,
  type PageRouteRecord,
  type ScannedAppRoutesInput,
  type ScannedAppRuntimeInput,
} from "../src/lib/app-routes/index.ts";

function createModuleResolver(modules: Record<string, unknown>): ModuleResolver {
  return {
    resolve(file) {
      if (!(file in modules)) {
        throw new Error(`Unknown module "${file}".`);
      }

      return modules[file];
    },
  };
}

function asRoute(records: PageRouteRecord[], id: string): PageRouteRecord {
  for (const record of records) {
    if (record.id === id) {
      return record;
    }

    if (record.children.length > 0) {
      try {
        return asRoute(record.children, id);
      } catch {}
    }
  }

  throw new Error(`Missing route "${id}".`);
}

describe("createRouteRuntimeModules", () => {
  test("builds app and nested route modules from scanned inputs", async () => {
    const appShell = { name: "AppShell" };
    const appError = { name: "AppError" };
    const rootLayout = { name: "RootLayout" };
    const homePage = { name: "HomePage" };
    const postsLayout = { name: "PostsLayout" };
    const postPage = { name: "PostPage" };
    const postLoading = { name: "PostLoading" };
    const postError = { name: "PostError" };
    const appLoader = async () => ({ app: true });
    const postLoader = async () => ({ slug: "hello" });
    const postAction = async () => ({ ok: true });
    const traceMiddleware = async (_context: unknown, next: () => Promise<void>) => next();
    const authMiddleware = async (_context: unknown, next: () => Promise<void>) => next();
    const localMiddleware = async (_context: unknown, next: () => Promise<void>) => next();

    const app: ScannedAppRuntimeInput = {
      app: "app.vue",
      error: "error.vue",
      loader: "loader.ts",
      middleware: {
        trace: "middleware/trace.ts",
        auth: "middleware/auth.ts",
      },
    };
    const routes: ScannedAppRoutesInput = {
      entries: [
        { file: "layout.vue" },
        { file: "index/page.vue" },
        { file: "posts/layout.vue" },
        { file: "posts/middleware.ts" },
        { file: "posts/[slug]/page.vue" },
        { file: "posts/[slug]/loader.ts" },
        { file: "posts/[slug]/action.ts" },
        { file: "posts/[slug]/loading.vue" },
        { file: "posts/[slug]/error.vue" },
        { file: "posts/[slug]/middleware.ts" },
      ],
    };
    const resolver = createModuleResolver({
      "app.vue": { default: appShell },
      "error.vue": { default: appError },
      "loader.ts": { default: appLoader },
      "middleware/trace.ts": { default: traceMiddleware },
      "middleware/auth.ts": { default: authMiddleware },
      "layout.vue": { default: rootLayout },
      "index/page.vue": { default: homePage },
      "posts/layout.vue": { default: postsLayout },
      "posts/middleware.ts": { default: ["trace"] },
      "posts/[slug]/page.vue": { default: postPage },
      "posts/[slug]/loader.ts": { loader: postLoader },
      "posts/[slug]/action.ts": { action: postAction },
      "posts/[slug]/loading.vue": { default: postLoading },
      "posts/[slug]/error.vue": { default: postError },
      "posts/[slug]/middleware.ts": { default: ["auth", localMiddleware] },
    });

    const result = await createRouteRuntimeModules({
      app,
      routes,
      resolveModule: resolver.resolve,
    });

    expect(result.app).toEqual<AppModule>({
      shell: appShell,
      error: appError,
      loader: appLoader,
    });
    expect(result.tree.nodes).toHaveLength(1);
    expect(result.tree.nodes[0]?.id).toBe("");

    expect(result.routes).toHaveLength(1);
    expect(result.routes[0]).toMatchObject({
      id: "layout",
      path: "/",
    });
    expect(result.routes[0]?.module.layout).toBe(rootLayout);

    const homeRoute = asRoute(result.routes, "page");
    expect(homeRoute.path).toBe("/");
    expect(homeRoute.module.component).toBe(homePage);

    const postsRoute = asRoute(result.routes, "posts/layout");
    expect(postsRoute.path).toBe("posts");
    expect(postsRoute.module.layout).toBe(postsLayout);
    expect(postsRoute.module.middleware).toEqual([traceMiddleware]);

    const detailRoute = asRoute(result.routes, "posts/[slug]/page");
    expect(detailRoute.path).toBe(":slug");
    expect(detailRoute.module.component).toBe(postPage);
    expect(detailRoute.module.loader).toBe(postLoader);
    expect(detailRoute.module.action).toBe(postAction);
    expect(detailRoute.module.loading).toBe(postLoading);
    expect(detailRoute.module.error).toBe(postError);
    expect(detailRoute.module.middleware).toEqual([authMiddleware, localMiddleware]);
  });

  test("rejects action sidecars on layout-only route directories", async () => {
    const routes: ScannedAppRoutesInput = {
      entries: [{ file: "posts/layout.vue" }, { file: "posts/action.ts" }],
    };

    await expect(
      createRouteRuntimeModules({
        routes,
        resolveModule: createModuleResolver({
          "posts/layout.vue": { default: { name: "PostsLayout" } },
          "posts/action.ts": { action: async () => ({ ok: true }) },
        }).resolve,
      }),
    ).rejects.toThrow('Route directory "posts" defines action.ts but is missing page.vue.');
  });

  test("rejects sidecar files when the route directory has no layout or page entry", async () => {
    const routes: ScannedAppRoutesInput = {
      entries: [{ file: "posts/loader.ts" }],
    };

    await expect(
      createRouteRuntimeModules({
        routes,
        resolveModule: createModuleResolver({
          "posts/loader.ts": { loader: async () => ({ ok: true }) },
        }).resolve,
      }),
    ).rejects.toThrow(
      'Route directory "posts" contains loader.ts but is missing page.vue or layout.vue.',
    );
  });

  test("normalizes index route directories to their parent path", async () => {
    const usersPage = { name: "UsersPage" };
    const userPage = { name: "UserPage" };
    const indexLoader = async () => ({ users: true });
    const treeMiddleware = async (_context: unknown, next: () => Promise<void>) => next();
    const localMiddleware = async (_context: unknown, next: () => Promise<void>) => next();

    const routes: ScannedAppRoutesInput = {
      entries: [
        { file: "users/middleware.ts" },
        { file: "users/index/page.vue" },
        { file: "users/index/loader.ts" },
        { file: "users/index/middleware.ts" },
        { file: "users/[id]/page.vue" },
      ],
    };

    const result = await createRouteRuntimeModules({
      routes,
      resolveModule: createModuleResolver({
        "users/middleware.ts": { default: [treeMiddleware] },
        "users/index/page.vue": { default: usersPage },
        "users/index/loader.ts": { loader: indexLoader },
        "users/index/middleware.ts": { default: [localMiddleware] },
        "users/[id]/page.vue": { default: userPage },
      }).resolve,
    });

    const usersRoute = asRoute(result.routes, "users/page");
    expect(usersRoute.path).toBe("users");
    expect(usersRoute.module.component).toBe(usersPage);
    expect(usersRoute.module.loader).toBe(indexLoader);
    expect(usersRoute.module.middleware).toEqual([localMiddleware]);

    const userRoute = asRoute(result.routes, "users/[id]/page");
    expect(userRoute.path).toBe("users/:id");
    expect(userRoute.module.component).toBe(userPage);
    expect(userRoute.module.middleware).toEqual([treeMiddleware]);
  });

  test("rejects page files in directories that also own child routes", async () => {
    const routes: ScannedAppRoutesInput = {
      entries: [{ file: "users/page.vue" }, { file: "users/[id]/page.vue" }],
    };

    await expect(
      createRouteRuntimeModules({
        routes,
        resolveModule: createModuleResolver({
          "users/page.vue": { default: { name: "UsersPage" } },
          "users/[id]/page.vue": { default: { name: "UserPage" } },
        }).resolve,
      }),
    ).rejects.toThrow(
      'Route directory "users" defines page.vue alongside child routes. Move the route into users/index/.',
    );
  });
});
