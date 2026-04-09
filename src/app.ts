/**
 * App Routes - 页面路由开发
 *
 * 用于开发 Vue 页面路由（app-routes），包括：
 * - 页面组件 (page.vue, layout.vue)
 * - 数据加载 (loader.ts)
 * - 表单处理 (action.ts)
 * - 中间件 (middleware.ts)
 * - 应用配置 (app.vue, error.vue)
 */

// 客户端组件
export {
  ClientOnly,
  DevOnly,
  RouterLink,
  RouterView,
} from "vuepagelet";

// 客户端 Composables (Hooks)
export {
  // Head
  useHead,
  useTitle,
  useMeta,
  useLink,
  useStyle,
  useScript,
  // App 数据
  useAppData,
  useAppError,
  // 路由
  useRoute,
  useRouter,
  usePageRoute,
  useCurrentPageRoute,
  // Loader 数据
  useLoaderData,
  useRouteLoaderData,
  useDeferredData,
  useDeferredError,
  // Action
  useActionData,
  // 导航
  useNavigation,
  // 状态
  useState,
  // 表单提交
  useSubmit,
  useFetcher,
  useFormAction,
} from "vuepagelet";

export type {
  HeadAttributes,
  HeadInput,
  HeadLinkDescriptor,
  HeadMetaDescriptor,
  HeadScriptDescriptor,
  HeadStyleDescriptor,
} from "vuepagelet";

// 服务端/Loader/Action 上下文类型
export type {
  LoaderContext,
  ActionContext,
  MiddlewareContext,
} from "vuepagelet/integration";

// 函数类型
export type {
  PageMiddleware,
  PageRouteRecord,
  LoaderResult,
  ActionResult,
} from "vuepagelet/integration";

// Deferred 数据工具
export {
  defer,
  type DeferredDataRecord,
} from "vuepagelet/integration";

export type MaybePromise<T> = T | Promise<T>;
export type Maybe<T> = T | undefined;
