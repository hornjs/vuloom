/**
 * Server Routes - API 路由开发
 *
 * 用于开发服务器端 API 路由（server-routes），包括：
 * - API 处理器 (route.ts)
 * - 中间件 (middleware.ts)
 * - HTTP 方法处理器 (GET, POST, PUT, DELETE, etc.)
 * - 服务器启动和配置
 */

 // 工具类型
export {
  raceRequestAbort,
  type HTTPMethod,
} from "sevok";

// 核心 handler 类型
export {
  type ServerHandler,
  type ServerHandlerFunction,
  type ServerHandlerObject,
  type ServerMethodHandlers,
  isServerHandlerObject,
  toServerHandlerObject,
} from "sevok";

// 中间件类型
export {
  runMiddleware,
  type ServerMiddleware,
  type ServerMiddlewareFunction,
  type ServerMiddlewareName,
  type ServerMiddlewareResolver,
} from "sevok";

// 请求上下文
export {
  createContextKey,
  InvocationContext,
  type InvocationContextInit,
  type InvocationContextKey,
} from "sevok";

export type MaybePromise<T> = T | Promise<T>;
export type Maybe<T> = T | undefined;
