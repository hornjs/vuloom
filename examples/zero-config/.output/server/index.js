import { Server, runMiddleware } from "@hornjs/fest";
import { NodeRuntimeAdapter } from "@hornjs/fest/node";
import { serveStatic } from "@hornjs/fest/static";
import { computed, createSSRApp, createTextVNode, createVNode, defineComponent, h, hasInjectionContext, inject, mergeProps, nextTick, onErrorCaptured, provide, ref, shallowReactive, shallowRef, toRaw, unref, useSSRContext, watch, withCtx } from "vue";
import { RouterLink, RouterView, START_LOCATION, createMemoryHistory, createRouter, createRouterMatcher, createWebHistory, useRoute } from "vue-router";
import { parse, stringify, uneval } from "devalue";
import { renderToString } from "@vue/server-renderer";
import { ssrInterpolate, ssrRenderAttr, ssrRenderAttrs, ssrRenderComponent, ssrRenderSlot, ssrRenderStyle } from "vue/server-renderer";
import { createContextKey } from "@hornjs/fest/utils";
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region ../vuepagelet/src/lib/dom/components/app-error-boundary.ts
var AppErrorBoundary = defineComponent({
	name: "AppErrorBoundary",
	props: {
		errorComponent: {
			type: [Object, Function],
			default: null
		},
		externalError: {
			type: null,
			default: null
		},
		boundaryKey: {
			type: String,
			required: true
		},
		onCaptureError: {
			type: Function,
			default: null
		}
	},
	setup(props, { slots }) {
		const capturedError = ref(null);
		watch(() => props.boundaryKey, () => {
			capturedError.value = null;
		});
		onErrorCaptured((errorValue) => {
			capturedError.value = errorValue;
			props.onCaptureError?.(errorValue);
			return false;
		});
		return () => {
			const activeError = props.externalError ?? capturedError.value;
			if (activeError && props.errorComponent) return h(props.errorComponent, { error: activeError });
			return normalizeSlotContent(slots.default?.() ?? null);
		};
	}
});
function normalizeSlotContent(value) {
	if (Array.isArray(value)) return value.length <= 1 ? value[0] ?? null : value;
	return value;
}
//#endregion
//#region ../vuepagelet/src/lib/dom/components/route-view.ts
var RouterView$1 = defineComponent({
	name: "PageRendererRouterView",
	setup() {
		return () => h(RouterView);
	}
});
//#endregion
//#region ../vuepagelet/src/lib/dom/composables/use-state.ts
var stateStoreKey = Symbol("route-state-store");
var clientStateStore = createStateStore();
function createStateStore(initialState = {}) {
	const values = /* @__PURE__ */ new Map();
	for (const [key, value] of Object.entries(initialState)) values.set(key, shallowRef(value));
	return { values };
}
function initializeClientStateStore(initialState = {}) {
	clientStateStore = createStateStore(initialState);
	return clientStateStore;
}
function serializeStateStore(store) {
	return Object.fromEntries(Array.from(store.values.entries()).map(([key, value]) => [key, value.value]));
}
//#endregion
//#region ../vuepagelet/src/lib/router/location.ts
function createRouteLocationKey(route) {
	const query = new URLSearchParams(route.query).toString();
	return `${route.pathname}${query ? `?${query}` : ""}${route.hash}`;
}
//#endregion
//#region ../vuepagelet/src/lib/runtime/types.ts
var pageRuntimeStateKey = Symbol("page-runtime-state");
//#endregion
//#region ../vuepagelet/src/lib/runtime/route-errors.ts
var PageRouteExecutionError = class extends Error {
	constructor(options) {
		super(options.error instanceof Error ? options.error.message : `page route ${options.phase} failed for ${options.routeId}`);
		this.name = "PageRouteExecutionError";
		this.phase = options.phase;
		this.routeId = options.routeId;
		this.error = normalizeRouteError(options.error);
		this.loaderData = options.loaderData;
		this.pending = options.pending;
	}
};
function isPageRouteExecutionError(error) {
	return error instanceof PageRouteExecutionError;
}
function normalizeRouteError(error) {
	if (error instanceof Error) return {
		name: error.name,
		message: error.message,
		stack: error.stack
	};
	return error;
}
function resolveNearestErrorBoundary(matches, failedRouteId) {
	const startIndex = matches.findIndex((route) => route.id === failedRouteId);
	if (startIndex === -1) return null;
	for (let index = startIndex; index >= 0; index -= 1) {
		const route = matches[index];
		if (route?.module.error) return route;
	}
	return null;
}
function assignNearestRouteError(options) {
	const boundary = resolveNearestErrorBoundary(options.matches, options.failedRouteId);
	if (!boundary) return options.routeErrors;
	return {
		...options.routeErrors,
		[boundary.id]: normalizeRouteError(options.error)
	};
}
function clearMatchedRouteErrors(routeErrors, matches) {
	const boundaryRouteIds = new Set(matches.filter((route) => Boolean(route.module.error)).map((route) => route.id));
	return Object.fromEntries(Object.entries(routeErrors).filter(([routeId]) => !boundaryRouteIds.has(routeId)));
}
function deriveRouteErrors(matches, snapshot) {
	let routeErrors = { ...snapshot?.routeErrors };
	for (const [routeId, deferredErrors] of Object.entries(snapshot?.deferredErrors ?? {})) for (const error of Object.values(deferredErrors)) routeErrors = assignNearestRouteError({
		routeErrors,
		matches,
		failedRouteId: routeId,
		error
	});
	return routeErrors;
}
//#endregion
//#region ../vuepagelet/src/lib/runtime/transition-manager.ts
var compatTransitionState = shallowRef({
	state: "idle",
	location: "/",
	action: "push",
	startTime: Date.now(),
	isReady: true
});
function createTransitionState(location, action = "push") {
	return shallowRef(createTransitionSnapshot(location, action));
}
function initializeTransition(locationOrState, nextLocation, action = "push") {
	const target = resolveWritableTransitionState(locationOrState);
	target.value = createTransitionSnapshot(typeof locationOrState === "string" ? locationOrState : typeof nextLocation === "string" ? nextLocation : target.value.location, typeof locationOrState === "string" ? normalizeAction(nextLocation, action) : action);
}
function startNavigation(toOrState, maybeTo, action = "push") {
	const target = resolveWritableTransitionState(toOrState);
	const current = target.value;
	target.value = {
		state: "navigating",
		location: typeof toOrState === "string" ? toOrState : typeof maybeTo === "string" ? maybeTo : current.location,
		previousLocation: current.location,
		action: typeof toOrState === "string" ? normalizeAction(maybeTo, action) : action,
		startTime: Date.now(),
		isReady: false
	};
}
function finishNavigation(state) {
	finishTransition(state);
}
function startLoading(locationOrState = compatTransitionState.value.location, location) {
	setBusyTransition(resolveWritableTransitionState(locationOrState), "loading", typeof locationOrState === "string" ? locationOrState : location ?? locationOrState.transitionState.value.location);
}
function finishLoading(state) {
	finishTransition(state);
}
function startSubmitting(locationOrState = compatTransitionState.value.location, location) {
	setBusyTransition(resolveWritableTransitionState(locationOrState), "submitting", typeof locationOrState === "string" ? locationOrState : location ?? locationOrState.transitionState.value.location);
}
function finishSubmitting(state) {
	finishTransition(state);
}
function createTransitionSnapshot(location, action = "push") {
	return {
		state: "idle",
		location,
		previousLocation: void 0,
		action,
		startTime: Date.now(),
		isReady: true
	};
}
function finishTransition(state) {
	const target = resolveTransitionState(state);
	target.value = {
		...target.value,
		state: "idle",
		isReady: true,
		startTime: Date.now()
	};
}
function resolveTransitionState(state) {
	if (state) return state.transitionState;
	return (hasInjectionContext() ? inject(pageRuntimeStateKey, null) : null)?.transitionState ?? compatTransitionState;
}
function resolveWritableTransitionState(state) {
	return typeof state === "string" ? compatTransitionState : state.transitionState;
}
function normalizeAction(candidate, fallback = "push") {
	return candidate === "push" || candidate === "replace" || candidate === "pop" ? candidate : fallback;
}
function setBusyTransition(target, state, location) {
	target.value = {
		...target.value,
		state,
		location,
		isReady: false,
		startTime: Date.now()
	};
}
//#endregion
//#region ../vuepagelet/src/lib/runtime/state.ts
function createPageRuntimeState(route, routes = route.matches) {
	return shallowReactive({
		routes,
		route,
		transitionState: createTransitionState(createRouteLocationKey(route)),
		appData: null,
		appError: null,
		loaderData: {},
		actionData: {},
		deferredData: {},
		deferredErrors: {},
		pendingDeferredKeys: {},
		revalidatingRouteIds: [],
		routeErrors: {}
	});
}
function usePageRuntimeState() {
	const state = inject(pageRuntimeStateKey, null);
	if (!state) throw new Error("page runtime state is not available");
	return state;
}
function applyDeferredChunk(state, chunk) {
	removePendingDeferredKey(state, chunk.routeId, chunk.key);
	if (chunk.error !== void 0) {
		state.deferredErrors[chunk.routeId] = {
			...state.deferredErrors[chunk.routeId],
			[chunk.key]: chunk.error
		};
		state.routeErrors = assignNearestRouteError({
			routeErrors: state.routeErrors,
			matches: state.route.matches,
			failedRouteId: chunk.routeId,
			error: chunk.error
		});
		return;
	}
	state.deferredData[chunk.routeId] = {
		...state.deferredData[chunk.routeId],
		[chunk.key]: chunk.data
	};
}
function applyActionData(state, payload) {
	state.actionData = {
		...state.actionData,
		[payload.routeId]: payload.actionData ?? null
	};
}
function applyAppState(state, payload) {
	if ("appData" in payload) state.appData = payload.appData ?? null;
	if ("appError" in payload) state.appError = payload.appError ?? null;
}
function setPendingDeferredKeys(state, pending) {
	state.pendingDeferredKeys = Object.fromEntries(Object.entries(pending).filter(([, keys]) => keys.length > 0));
}
function removePendingDeferredKey(state, routeId, key) {
	const existing = state.pendingDeferredKeys[routeId];
	if (!existing || existing.length === 0) return;
	const nextKeys = existing.filter((entry) => entry !== key);
	if (nextKeys.length === existing.length) return;
	const nextPending = { ...state.pendingDeferredKeys };
	if (nextKeys.length === 0) delete nextPending[routeId];
	else nextPending[routeId] = nextKeys;
	state.pendingDeferredKeys = nextPending;
}
//#endregion
//#region ../vuepagelet/src/lib/router/matcher.ts
var cache = /* @__PURE__ */ new WeakMap();
function createRouteResolver(routes) {
	return {
		resolve(pathname) {
			return matchPageRoute(pathname, routes);
		},
		resolveLocation(pathname) {
			return resolveNavigationLocation(pathname, routes);
		},
		toVueRoutes() {
			return createVuePageRouteRecords(routes);
		}
	};
}
function matchPageRoute(pathname, routes) {
	const url = new URL(pathname, "http://local");
	const resolver = getCachedResolver(routes);
	const resolved = resolver.matcher.resolve({ path: normalizePath(url.pathname) }, START_LOCATION);
	const matched = mapMatchedRoutes(resolved.matched, resolver.routeMap);
	const route = matched[matched.length - 1];
	if (!route) return null;
	return {
		route,
		matches: matched,
		params: normalizeParams(resolved.params),
		pathname: normalizePath(url.pathname),
		query: normalizeUrlQuery(url.searchParams),
		hash: url.hash
	};
}
function resolveNavigationLocation(pathname, routes) {
	const match = matchPageRoute(pathname, routes);
	if (!match) return null;
	return {
		path: match.pathname,
		fullPath: createRouteLocationKey(match),
		params: match.params,
		query: match.query,
		hash: match.hash,
		matched: match.matches
	};
}
function createVuePageRouteRecords(routes) {
	return routes.map((route, index) => createVueRouteRecord(route, index === 0));
}
function getCachedResolver(routes) {
	const cached = cache.get(routes);
	if (cached) return cached;
	const created = {
		matcher: createRouterMatcher(createVuePageRouteRecords(routes), {}),
		routeMap: new Map(flattenRoutes$2(routes).map((route) => [route.id, route]))
	};
	cache.set(routes, created);
	return created;
}
function createVueRouteRecord(route, isRoot) {
	const routePath = route.path ?? "";
	return {
		path: isRoot ? withLeadingSlash(routePath) : stripLeadingSlash(routePath),
		name: route.id,
		component: createPageRouteComponent(route),
		meta: createPageRouteMeta(route),
		children: route.children.map((child) => createVueRouteRecord(child, false))
	};
}
function flattenRoutes$2(routes) {
	return routes.flatMap((route) => [route, ...flattenRoutes$2(route.children)]);
}
function mapMatchedRoutes(matched, routeMap) {
	return matched.map((record) => typeof record.name === "string" ? routeMap.get(record.name) : void 0).filter((record) => Boolean(record));
}
function normalizePath(pathname) {
	if (!pathname || pathname === "/") return "/";
	return pathname.startsWith("/") ? pathname : `/${pathname}`;
}
function withLeadingSlash(pathname) {
	return normalizePath(pathname);
}
function stripLeadingSlash(pathname) {
	if (!pathname) return "";
	return pathname === "/" ? "" : pathname.replace(/^\/+/, "");
}
function normalizeParams(params) {
	const resolved = {};
	for (const [key, value] of Object.entries(params)) {
		if (Array.isArray(value)) {
			resolved[key] = value.map((entry) => String(entry ?? "")).join("/");
			continue;
		}
		resolved[key] = String(value ?? "");
	}
	return resolved;
}
function normalizeQuery(query) {
	const resolved = {};
	for (const [key, value] of Object.entries(query)) {
		if (Array.isArray(value)) {
			resolved[key] = String(value[value.length - 1] ?? "");
			continue;
		}
		resolved[key] = String(value ?? "");
	}
	return resolved;
}
function normalizeUrlQuery(query) {
	return normalizeQuery(Object.fromEntries(query.entries()));
}
//#endregion
//#region ../vuepagelet/src/lib/dom/composables/use-route.ts
var currentRouteRecordKey = Symbol("current-route-record");
function useRoute$1() {
	const state = usePageRuntimeState();
	const nativeRoute = useRoute();
	return computed(() => {
		const resolvedRoute = resolvePageRouteRecord(nativeRoute);
		const matched = nativeRoute.matched.map((record) => record.meta?.pageRouteRecord).filter((record) => isPageRouteRecord$1(record));
		return {
			path: nativeRoute.path,
			fullPath: nativeRoute.fullPath,
			params: Object.fromEntries(Object.entries(nativeRoute.params).map(([key, value]) => [key, normalizeRouteParam(value)])),
			query: Object.fromEntries(Object.entries(nativeRoute.query).map(([key, value]) => [key, normalizeRouteQueryValue(value)])),
			hash: nativeRoute.hash,
			matched: matched.length > 0 ? matched : state.route.matches,
			route: resolvedRoute ?? state.route.route,
			native: nativeRoute
		};
	});
}
function useCurrentPageRoute() {
	return inject(currentRouteRecordKey, null);
}
function usePageRoute() {
	const route = useRoute$1();
	const currentPageRoute = useCurrentPageRoute();
	return computed(() => currentPageRoute ?? route.value.route);
}
function normalizeRouteParam(value) {
	if (Array.isArray(value)) return value.map((entry) => String(entry ?? "")).join("/");
	return String(value ?? "");
}
function normalizeRouteQueryValue(value) {
	if (Array.isArray(value)) return String(value[value.length - 1] ?? "");
	return String(value ?? "");
}
function isPageRouteRecord$1(value) {
	return typeof value === "object" && value !== null && "id" in value && "module" in value;
}
//#endregion
//#region ../vuepagelet/src/lib/runtime/route-state.ts
function pruneRouteStateMaps(routeIds, maps) {
	const nextMaps = {
		loaderData: maps.loaderData ? { ...maps.loaderData } : void 0,
		actionData: maps.actionData ? { ...maps.actionData } : void 0,
		deferredData: maps.deferredData ? { ...maps.deferredData } : void 0,
		deferredErrors: maps.deferredErrors ? { ...maps.deferredErrors } : void 0,
		pendingDeferredKeys: maps.pendingDeferredKeys ? { ...maps.pendingDeferredKeys } : void 0,
		routeErrors: maps.routeErrors ? { ...maps.routeErrors } : void 0
	};
	for (const routeId of routeIds) {
		delete nextMaps.loaderData?.[routeId];
		delete nextMaps.actionData?.[routeId];
		delete nextMaps.deferredData?.[routeId];
		delete nextMaps.deferredErrors?.[routeId];
		delete nextMaps.pendingDeferredKeys?.[routeId];
		delete nextMaps.routeErrors?.[routeId];
	}
	return nextMaps;
}
//#endregion
//#region ../vuepagelet/src/lib/runtime/revalidation.ts
function createRevalidationPlan(options) {
	const defaultRouteIds = createDefaultRevalidatedRouteIds(options);
	const isActionRevalidation = options.actionRouteId !== void 0;
	return { routeIds: options.nextMatch.matches.filter((route) => route.module.loader).filter((route) => shouldRevalidateRoute(route, isActionRevalidation ? createActionShouldRevalidateArgs(options, defaultRouteIds.has(route.id)) : createNavigationShouldRevalidateArgs(options, defaultRouteIds.has(route.id)))).map((route) => route.id) };
}
function createAppRevalidationPlan(app, options) {
	if (!app?.loader) return { shouldRevalidate: false };
	if (!app.shouldRevalidate) return { shouldRevalidate: createDefaultAppShouldRevalidate(options) };
	const args = options.actionRouteId !== void 0 ? createActionShouldRevalidateArgs(options, createDefaultAppShouldRevalidate(options)) : createNavigationShouldRevalidateArgs(options, createDefaultAppShouldRevalidate(options));
	return { shouldRevalidate: app.shouldRevalidate(args) };
}
function createDefaultRevalidatedRouteIds(options) {
	const { currentMatch, nextMatch, actionResult, actionRouteId } = options;
	if (!currentMatch) return new Set(nextMatch.matches.map((route) => route.id));
	if (actionResult !== void 0) {
		if (!actionRouteId) return /* @__PURE__ */ new Set();
		const actionRoute = nextMatch.matches.find((route) => route.id === actionRouteId);
		return new Set(actionRoute?.module.loader ? [actionRoute.id] : []);
	}
	const currentMatches = currentMatch.matches;
	const nextMatches = nextMatch.matches;
	const divergenceIndex = findDivergenceIndex(currentMatches, nextMatches);
	if (divergenceIndex < nextMatches.length) return new Set(nextMatches.slice(divergenceIndex).map((route) => route.id));
	if (currentMatch.pathname !== nextMatch.pathname || !isSameQuery(currentMatch.query, nextMatch.query)) {
		const leafRoute = nextMatch.route;
		return new Set(leafRoute.module.loader ? [leafRoute.id] : []);
	}
	return /* @__PURE__ */ new Set();
}
function createDefaultAppShouldRevalidate(options) {
	if (!options.currentUrl) return true;
	if (options.actionRouteId !== void 0) return false;
	return options.currentUrl.pathname !== options.nextUrl.pathname || options.currentUrl.search !== options.nextUrl.search;
}
function shouldRevalidateRoute(route, args) {
	if (!route.module.shouldRevalidate) return args.defaultShouldRevalidate;
	if (args.type === "action") return route.module.shouldRevalidate(args);
	return route.module.shouldRevalidate(args);
}
function createNavigationShouldRevalidateArgs(options, defaultShouldRevalidate) {
	return {
		type: "navigation",
		currentUrl: options.currentUrl,
		nextUrl: options.nextUrl,
		currentParams: options.currentMatch?.params ?? {},
		nextParams: options.nextMatch.params,
		defaultShouldRevalidate
	};
}
function createActionShouldRevalidateArgs(options, defaultShouldRevalidate) {
	if (!options.actionRouteId) throw new Error("actionRouteId is required for action revalidation");
	return {
		type: "action",
		currentUrl: options.currentUrl,
		nextUrl: options.nextUrl,
		currentParams: options.currentMatch?.params ?? {},
		nextParams: options.nextMatch.params,
		formMethod: options.formMethod ?? "POST",
		formAction: options.formAction ?? options.nextUrl.pathname,
		actionStatus: options.actionStatus ?? 200,
		actionRouteId: options.actionRouteId,
		actionResult: options.actionResult,
		defaultShouldRevalidate
	};
}
function findDivergenceIndex(currentMatches, nextMatches) {
	const length = Math.min(currentMatches.length, nextMatches.length);
	for (let index = 0; index < length; index += 1) if (currentMatches[index]?.id !== nextMatches[index]?.id) return index;
	return length;
}
function isSameQuery(currentQuery, nextQuery) {
	const currentEntries = Object.entries(currentQuery);
	const nextEntries = Object.entries(nextQuery);
	if (currentEntries.length !== nextEntries.length) return false;
	return currentEntries.every(([key, value]) => nextQuery[key] === value);
}
//#endregion
//#region ../vuepagelet/src/lib/runtime/serialization.ts
var ERROR_TYPE = "Error";
var ERROR_MARKER = "__vue_route_runtime_type";
function stringifyRuntimePayload(value) {
	return stringify(value, { [ERROR_TYPE]: (candidate) => {
		if (!(candidate instanceof Error)) return;
		return {
			name: candidate.name,
			message: candidate.message,
			stack: candidate.stack,
			cause: getErrorCause(candidate)
		};
	} });
}
function parseRuntimePayload(value) {
	try {
		return parse(value, { [ERROR_TYPE]: (candidate) => {
			const source = isSerializedErrorPayload(candidate) ? candidate : {
				name: "Error",
				message: String(candidate)
			};
			const error = new Error(source.message);
			error.name = source.name;
			if (source.cause !== void 0) error.cause = source.cause;
			if (source.stack) error.stack = source.stack;
			return error;
		} });
	} catch {
		return JSON.parse(value);
	}
}
function serializeRuntimeScriptValue(value) {
	return escapeScriptExpression(uneval(prepareRuntimeScriptValue(value)));
}
function prepareRuntimeScriptValue(value, seen = /* @__PURE__ */ new WeakMap()) {
	if (value instanceof Error) return {
		[ERROR_MARKER]: ERROR_TYPE,
		name: value.name,
		message: value.message,
		stack: value.stack,
		cause: getErrorCause(value) !== void 0 ? prepareRuntimeScriptValue(getErrorCause(value), seen) : void 0
	};
	if (value === null || typeof value !== "object") return value;
	if (value instanceof Date || value instanceof URL || value instanceof RegExp || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return value;
	if (seen.has(value)) return seen.get(value);
	if (Array.isArray(value)) {
		const copy = [];
		seen.set(value, copy);
		for (const entry of value) copy.push(prepareRuntimeScriptValue(entry, seen));
		return copy;
	}
	if (value instanceof Map) {
		const copy = /* @__PURE__ */ new Map();
		seen.set(value, copy);
		for (const [key, entry] of value.entries()) copy.set(prepareRuntimeScriptValue(key, seen), prepareRuntimeScriptValue(entry, seen));
		return copy;
	}
	if (value instanceof Set) {
		const copy = /* @__PURE__ */ new Set();
		seen.set(value, copy);
		for (const entry of value.values()) copy.add(prepareRuntimeScriptValue(entry, seen));
		return copy;
	}
	const copy = {};
	seen.set(value, copy);
	for (const [key, entry] of Object.entries(value)) copy[key] = prepareRuntimeScriptValue(entry, seen);
	return copy;
}
function isSerializedErrorPayload(value) {
	return typeof value === "object" && value !== null && "name" in value && "message" in value && typeof value.name === "string" && typeof value.message === "string";
}
function escapeScriptExpression(value) {
	return value.replace(/<\/script/gi, "<\\/script").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
function getErrorCause(error) {
	return error.cause;
}
//#endregion
//#region ../vuepagelet/src/lib/router/router.ts
var PAGE_ROUTE_META_KEY = "pageRouteRecord";
function createPageRouter(options) {
	const router = createRouter({
		history: options.history ?? (typeof window === "undefined" ? createMemoryHistory(options.base) : createWebHistory(options.base)),
		routes: createVuePageRouteRecords(options.routes)
	});
	instrumentRouter(router, options.routes, options.state, options.fetcher);
	return router;
}
function createPageRouteComponent(route) {
	return defineComponent({
		name: `PageRouteComponent:${route.id}`,
		setup() {
			provide(currentRouteRecordKey, route);
			const state = usePageRuntimeState();
			const renderError = ref(null);
			const hasPendingDeferred = computed(() => (state.pendingDeferredKeys[route.id]?.length ?? 0) > 0);
			const isRevalidating = computed(() => state.revalidatingRouteIds.includes(route.id));
			const routeError = computed(() => state.routeErrors[route.id] ?? null);
			const boundaryKey = computed(() => createRouteLocationKey(state.route));
			watch(boundaryKey, () => {
				renderError.value = null;
			});
			return () => {
				const component = route.module.component;
				const layout = route.module.layout;
				const loading = route.module.loading;
				const error = route.module.error;
				const subject = resolveRouteSubject({
					route,
					component,
					loading,
					hasPendingDeferred: hasPendingDeferred.value,
					isRevalidating: isRevalidating.value
				});
				const content = error ? h(PageRouteErrorBoundary, {
					errorComponent: error,
					externalError: renderError.value ?? routeError.value,
					route,
					boundaryKey: boundaryKey.value,
					onCaptureError(errorValue) {
						renderError.value = errorValue;
						state.routeErrors = assignNearestRouteError({
							routeErrors: state.routeErrors,
							matches: state.route.matches,
							failedRouteId: route.id,
							error: errorValue
						});
					}
				}, { default: () => subject }) : subject;
				if (!layout) return content;
				return h(layout, null, { default: () => content });
			};
		}
	});
}
function createPageRouteMeta(route) {
	return { [PAGE_ROUTE_META_KEY]: route };
}
function resolvePageRouteRecord(route) {
	for (let index = route.matched.length - 1; index >= 0; index -= 1) {
		const value = route.matched[index]?.meta?.[PAGE_ROUTE_META_KEY];
		if (isPageRouteRecord(value)) return value;
	}
	return null;
}
function instrumentRouter(router, routes, state, fetcher) {
	const browserFetcher = fetcher ?? (typeof fetch !== "undefined" ? fetch.bind(globalThis) : void 0);
	let hasHandledInitialNavigation = false;
	let activeRefreshController = null;
	let activeRefreshToken = 0;
	const originalPush = router.push.bind(router);
	const originalReplace = router.replace.bind(router);
	router.push = async (...args) => {
		beginNavigation(state, router.resolve(args[0]).fullPath, "push");
		try {
			return await originalPush(...args);
		} finally {
			finishNavigation(state);
		}
	};
	router.replace = async (...args) => {
		beginNavigation(state, router.resolve(args[0]).fullPath, "replace");
		try {
			return await originalReplace(...args);
		} finally {
			finishNavigation(state);
		}
	};
	router.afterEach((to, _from, failure) => {
		if (failure || !state || !browserFetcher || typeof window === "undefined") return;
		const currentMatch = state.route;
		const previousUrl = createNavigationReferer(currentMatch);
		const match = matchPageRoute(window.location.href, routes);
		if (match) state.route = match;
		else state.revalidatingRouteIds = [];
		if (!hasHandledInitialNavigation) {
			hasHandledInitialNavigation = true;
			state.revalidatingRouteIds = [];
			return;
		}
		if (match) {
			const plan = createRevalidationPlan({
				currentMatch,
				nextMatch: match,
				currentUrl: previousUrl ? new URL(previousUrl) : null,
				nextUrl: new URL(window.location.href)
			});
			state.revalidatingRouteIds = plan.routeIds;
			clearRevalidatingRouteState(state, plan.routeIds);
		}
		activeRefreshController?.abort();
		activeRefreshController = typeof AbortController === "undefined" ? null : new AbortController();
		activeRefreshToken += 1;
		const refreshToken = activeRefreshToken;
		refreshRouteData(to.fullPath, browserFetcher, state, previousUrl, {
			signal: activeRefreshController?.signal,
			isCurrent() {
				return refreshToken === activeRefreshToken;
			}
		}).finally(() => {
			if (refreshToken === activeRefreshToken) activeRefreshController = null;
		});
	});
	if (typeof window !== "undefined") window.addEventListener("popstate", () => {
		beginNavigation(state, window.location.pathname + window.location.search + window.location.hash, "pop");
	});
}
async function refreshRouteData(target, fetcher, state, previousUrl, options) {
	const isCurrent = options?.isCurrent ?? (() => true);
	startLoading(state, target);
	try {
		const requestInit = {
			headers: { accept: "application/json" },
			signal: options?.signal
		};
		if (previousUrl) requestInit.referrer = previousUrl;
		const response = await fetcher(target, requestInit);
		if (!isCurrent()) return;
		const nextLoaderData = { ...state.loaderData };
		const nextDeferredData = { ...state.deferredData };
		const nextDeferredErrors = { ...state.deferredErrors };
		const nextPendingDeferredKeys = { ...state.pendingDeferredKeys };
		const nextRouteErrors = clearMatchedRouteErrors(state.routeErrors, state.route.matches);
		if ((response.headers.get("content-type") ?? "").includes("application/x-ndjson") && response.body) {
			await consumeNavigationStream(response.body, (envelope) => {
				if (!isCurrent()) return;
				if (envelope.type === "navigation") {
					applyNavigationPayload(state, envelope.payload, {
						nextLoaderData,
						nextDeferredData,
						nextDeferredErrors,
						nextPendingDeferredKeys,
						nextRouteErrors
					});
					return;
				}
				if (envelope.type === "deferred") applyDeferredChunk(state, envelope.chunk);
			}, {
				signal: options?.signal,
				shouldContinue: isCurrent
			});
			return;
		}
		if (!isCurrent()) return;
		const payload = parseRuntimePayload(await response.text());
		if (!isCurrent()) return;
		applyNavigationPayload(state, payload, {
			nextLoaderData,
			nextDeferredData,
			nextDeferredErrors,
			nextPendingDeferredKeys,
			nextRouteErrors
		});
	} catch (error) {
		if (isAbortError(error)) return;
		throw error;
	} finally {
		if (isCurrent()) {
			state.revalidatingRouteIds = [];
			finishLoading(state);
		}
	}
}
function isPageRouteRecord(value) {
	return typeof value === "object" && value !== null && "id" in value && "module" in value;
}
function isAbortError(error) {
	return Boolean(error && typeof error === "object" && "name" in error && error.name === "AbortError");
}
function createNavigationReferer(route) {
	if (typeof window === "undefined") return;
	return new URL(createRouteLocationKey(route), window.location.origin).href;
}
function resolveRouteSubject(options) {
	if ((options.hasPendingDeferred || options.isRevalidating) && options.loading) return h(options.loading, { route: options.route });
	if (!options.component) return h(RouterView);
	return h(options.component, null, { default: () => h(RouterView) });
}
function beginNavigation(state, location, action) {
	if (state) {
		startNavigation(state, location, action);
		return;
	}
	startNavigation(location, action);
}
function clearRevalidatingRouteState(state, routeIds) {
	if (routeIds.length === 0) return;
	const nextState = pruneRouteStateMaps(routeIds, {
		loaderData: state.loaderData,
		actionData: state.actionData,
		deferredData: state.deferredData,
		deferredErrors: state.deferredErrors,
		pendingDeferredKeys: state.pendingDeferredKeys,
		routeErrors: state.routeErrors
	});
	state.loaderData = nextState.loaderData ?? {};
	state.actionData = nextState.actionData ?? {};
	state.deferredData = nextState.deferredData ?? {};
	state.deferredErrors = nextState.deferredErrors ?? {};
	state.pendingDeferredKeys = nextState.pendingDeferredKeys ?? {};
	state.routeErrors = nextState.routeErrors ?? {};
}
function applyNavigationPayload(state, payload, cache) {
	applyAppState(state, payload);
	state.revalidatingRouteIds = [];
	const nextState = pruneRouteStateMaps(payload.revalidatedRouteIds ?? [], {
		deferredData: cache.nextDeferredData,
		deferredErrors: cache.nextDeferredErrors,
		pendingDeferredKeys: cache.nextPendingDeferredKeys,
		routeErrors: cache.nextRouteErrors
	});
	state.loaderData = {
		...cache.nextLoaderData,
		...payload.loaderData
	};
	state.actionData = {};
	state.deferredData = {
		...nextState.deferredData,
		...payload.deferredData
	};
	state.deferredErrors = nextState.deferredErrors ?? {};
	state.pendingDeferredKeys = {
		...nextState.pendingDeferredKeys,
		...payload.pendingDeferredKeys
	};
	state.routeErrors = {
		...nextState.routeErrors,
		...payload.routeErrors
	};
}
async function consumeNavigationStream(body, onEnvelope, options) {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	const cancelReader = async () => {
		try {
			await reader.cancel();
		} catch {}
	};
	try {
		while (true) {
			if (options?.signal?.aborted || options?.shouldContinue && !options.shouldContinue()) {
				await cancelReader();
				break;
			}
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			buffer = flushNavigationBuffer(buffer, onEnvelope);
			if (options?.signal?.aborted || options?.shouldContinue && !options.shouldContinue()) {
				await cancelReader();
				break;
			}
		}
		buffer += decoder.decode();
		flushNavigationBuffer(buffer, onEnvelope);
	} catch (error) {
		if (!isAbortError(error)) throw error;
	} finally {
		reader.releaseLock();
	}
}
function flushNavigationBuffer(buffer, onEnvelope) {
	const lines = buffer.split("\n");
	const remainder = lines.pop() ?? "";
	for (const line of lines) {
		if (!line.trim()) continue;
		onEnvelope(parseRuntimePayload(line));
	}
	return remainder;
}
var PageRouteErrorBoundary = defineComponent({
	name: "PageRouteErrorBoundary",
	props: {
		errorComponent: {
			type: [Object, Function],
			required: true
		},
		externalError: {
			type: null,
			default: null
		},
		route: {
			type: Object,
			required: true
		},
		boundaryKey: {
			type: String,
			required: true
		},
		onCaptureError: {
			type: Function,
			default: null
		}
	},
	setup(props, { slots }) {
		const capturedError = ref(null);
		watch(() => props.boundaryKey, () => {
			capturedError.value = null;
		});
		onErrorCaptured((errorValue) => {
			capturedError.value = errorValue;
			props.onCaptureError?.(errorValue);
			return false;
		});
		return () => {
			const activeError = props.externalError ?? capturedError.value;
			if (activeError) return h(props.errorComponent, {
				error: activeError,
				route: props.route
			});
			return slots.default ? slots.default() : null;
		};
	}
});
//#endregion
//#region ../vuepagelet/src/lib/dom/client.ts
var PAYLOAD_GLOBAL$1 = "__VUEPAGELET__";
var APP_RUNTIME_HMR_GLOBAL = "__APP_RUNTIME_HMR__";
var DOCUMENT_MARKER$1 = "data-vuepagelet";
var ROOT_MARKER$1 = "[data-vuepagelet-root]";
var DOCUMENT_HYDRATION_ERROR = "the vuepagelet runtime requires an app shell that renders a full document with <html>, <head>, and <body>.";
function hydratePage(options) {
	const route = matchCurrentRoute(options.routes);
	if (!route) throw new Error("unable to match current location for page hydration");
	const runtime = getClientRuntime();
	const hydrationSnapshot = runtime?.hydrationState ?? runtime?.state;
	const state = createPageRuntimeState(route, options.routes);
	const stateStore = initializeClientStateStore(hydrationSnapshot?.state ?? {});
	const appShell = shallowRef(resolveComponent(options.app?.shell));
	const appErrorComponent = shallowRef(resolveComponent(options.app?.error));
	const hmrVersion = shallowRef(0);
	applyClientSnapshot(state, hydrationSnapshot, {
		includeLoaderData: true,
		includeActionData: true
	});
	initializeTransition(state, createRouteLocationKey(route));
	const app = createSSRApp(defineComponent({
		name: "HydratedPageRoot",
		setup() {
			return () => {
				const routeTree = h(RouterView$1, {
					key: hmrVersion.value,
					matches: route.matches
				});
				const boundaryKey = createRouteLocationKey(state.route);
				return h(AppErrorBoundary, {
					errorComponent: appErrorComponent.value,
					externalError: state.appError,
					boundaryKey,
					onCaptureError(errorValue) {
						state.appError = errorValue;
					}
				}, { default: () => {
					if (!appShell.value) return routeTree;
					return h(appShell.value, null, { default: () => routeTree });
				} });
			};
		}
	}));
	const router = createPageRouter({
		routes: options.routes,
		state
	});
	app.use(router);
	app.provide(pageRuntimeStateKey, state);
	app.provide(stateStoreKey, stateStore);
	let unsubscribe;
	let restoreAppRuntimeHmr;
	return {
		app,
		async mount() {
			const root = document.querySelector(ROOT_MARKER$1);
			const container = options.app?.shell ? resolveDocumentHydrationContainer() : (() => {
				if (!root) throw new Error("unable to find hydration root");
				return root;
			})();
			await router.isReady();
			app.mount(container);
			restoreAppRuntimeHmr = installAppRuntimeHotUpdateHook({
				state,
				routes: options.routes,
				appShell,
				appErrorComponent,
				hmrVersion
			}, typeof window !== "undefined" ? window : void 0);
			applyDeferredSnapshot(state, runtime?.state);
			if (runtime?.subscribe) unsubscribe = runtime.subscribe((envelope) => {
				const resolved = envelope;
				if (resolved?.type === "deferred" && resolved.chunk) applyDeferredChunk(state, resolved.chunk);
			});
			const originalUnmount = app.unmount.bind(app);
			app.unmount = () => {
				unsubscribe?.();
				unsubscribe = void 0;
				restoreAppRuntimeHmr?.();
				restoreAppRuntimeHmr = void 0;
				originalUnmount();
			};
		}
	};
}
function matchCurrentRoute(routes) {
	if (typeof window === "undefined") return null;
	return matchPageRoute(window.location.href, routes);
}
function getClientRuntime() {
	if (typeof window === "undefined") return;
	return window[PAYLOAD_GLOBAL$1];
}
function resolveDocumentHydrationContainer() {
	if (typeof document === "undefined") throw new Error(DOCUMENT_HYDRATION_ERROR);
	if (!document.documentElement.hasAttribute(DOCUMENT_MARKER$1)) throw new Error(DOCUMENT_HYDRATION_ERROR);
	return {
		firstChild: document.documentElement,
		hasChildNodes() {
			return true;
		}
	};
}
function resolveComponent(component) {
	return typeof component === "object" && component !== null ? toRaw(component) : component;
}
function installAppRuntimeHotUpdateHook(context, target) {
	if (!target) return () => {};
	const previous = target[APP_RUNTIME_HMR_GLOBAL];
	const applyHotUpdate = async (payload = {}) => {
		if ("appComponent" in payload) context.appShell.value = resolveComponent(payload.appComponent);
		if ("errorComponent" in payload) context.appErrorComponent.value = resolveComponent(payload.errorComponent);
		if (payload.routes) {
			syncHotUpdatedRoutes(context.routes, payload.routes);
			const nextMatch = matchCurrentRoute(context.routes);
			if (nextMatch) context.state.route = nextMatch;
		}
		context.hmrVersion.value += 1;
		await nextTick();
	};
	target[APP_RUNTIME_HMR_GLOBAL] = applyHotUpdate;
	return () => {
		if (previous === void 0) {
			delete target[APP_RUNTIME_HMR_GLOBAL];
			return;
		}
		target[APP_RUNTIME_HMR_GLOBAL] = previous;
	};
}
function syncHotUpdatedRoutes(currentRoutes, nextRoutes) {
	const currentRouteMap = new Map(flattenRoutes$1(currentRoutes).map((route) => [route.id, route]));
	for (const nextRoute of flattenRoutes$1(nextRoutes)) {
		const currentRoute = currentRouteMap.get(nextRoute.id);
		if (!currentRoute) continue;
		currentRoute.path = nextRoute.path;
		currentRoute.name = nextRoute.name;
		currentRoute.module = nextRoute.module;
	}
}
function flattenRoutes$1(routes) {
	return routes.flatMap((route) => [route, ...flattenRoutes$1(route.children)]);
}
function applyDeferredSnapshot(state, snapshot) {
	applyClientSnapshot(state, snapshot, {
		includeDeferredData: true,
		includeDeferredErrors: true
	});
}
function applyClientSnapshot(state, snapshot, options = {}) {
	const appSnapshot = {};
	if (snapshot && "appData" in snapshot) appSnapshot.appData = snapshot.appData;
	if (snapshot && "appError" in snapshot) appSnapshot.appError = snapshot.appError;
	applyAppState(state, appSnapshot);
	setPendingDeferredKeys(state, snapshot?.pendingDeferredKeys ?? {});
	state.routeErrors = deriveRouteErrors(state.route.matches, snapshot);
	if (options.includeLoaderData) state.loaderData = { ...snapshot?.loaderData };
	if (options.includeActionData) state.actionData = { ...snapshot?.actionData };
	if (options.includeDeferredData) state.deferredData = { ...snapshot?.deferredData };
	if (options.includeDeferredErrors) state.deferredErrors = { ...snapshot?.deferredErrors };
}
//#endregion
//#region ../vuepagelet/src/lib/runtime/deferred.ts
function isDeferredData(value) {
	return Boolean(value && typeof value === "object" && "__deferred_data__" in value && value.__deferred_data__ === true);
}
async function loadRouteData(match, request, routeIds) {
	const loaderData = {};
	const pending = [];
	const targetRouteIds = routeIds ? new Set(routeIds) : null;
	for (const route of match.matches) {
		const loader = route.module.loader;
		if (!loader || targetRouteIds && !targetRouteIds.has(route.id)) continue;
		let result;
		try {
			result = await loader(createLoaderContext(match, request, route));
		} catch (error) {
			throw new PageRouteExecutionError({
				phase: "loader",
				routeId: route.id,
				error,
				loaderData,
				pending
			});
		}
		if (result instanceof Response) return result;
		if (isDeferredData(result)) {
			loaderData[route.id] = { ...result.critical };
			pending.push(...createPendingChunks(route.id, result.deferred));
			continue;
		}
		loaderData[route.id] = result;
	}
	return {
		loaderData,
		pending
	};
}
function encodeDeferredChunk(chunk) {
	return {
		type: "deferred",
		chunk
	};
}
async function* iterateResolvedDeferredChunks(pending, signal) {
	if (signal?.aborted) return;
	const active = pending.map((chunk, index) => ({
		id: index,
		promise: chunk.promise.then((resolved) => ({
			id: index,
			resolved
		}))
	}));
	while (active.length > 0) {
		const settled = await Promise.race([...active.map((entry) => entry.promise), createAbortResult(signal)]);
		if (!settled || "aborted" in settled) return;
		const index = active.findIndex((entry) => entry.id === settled.id);
		if (index !== -1) active.splice(index, 1);
		yield settled.resolved;
	}
}
async function collectResolvedDeferredChunks(pending, signal) {
	const resolved = [];
	for await (const chunk of iterateResolvedDeferredChunks(pending, signal)) resolved.push(chunk);
	return resolved;
}
function createAbortResult(signal) {
	if (!signal) return new Promise(() => {});
	if (signal.aborted) return Promise.resolve({ aborted: true });
	return new Promise((resolve) => {
		signal.addEventListener("abort", () => {
			resolve({ aborted: true });
		}, { once: true });
	});
}
function createPendingChunks(routeId, deferred) {
	return Object.entries(deferred).map(([key, value]) => ({
		routeId,
		key,
		promise: Promise.resolve(value).then((data) => ({
			routeId,
			key,
			data
		}), (error) => ({
			routeId,
			key,
			error: normalizeRouteError(error)
		}))
	}));
}
function createLoaderContext(match, request, route) {
	const url = new URL(request.url);
	return {
		request,
		params: match.params,
		query: url.searchParams,
		route,
		matches: match.matches
	};
}
//#endregion
//#region ../vuepagelet/src/lib/runtime/middleware.ts
async function runWithRouteMiddleware(route, request, phase, handler) {
	const stack = collectRouteMiddleware(route.matches);
	let index = -1;
	return dispatch(0);
	async function dispatch(position) {
		if (position <= index) throw new Error("middleware next() called multiple times");
		index = position;
		const middleware = stack[position];
		if (!middleware) return handler({
			request,
			params: route.params,
			query: new URL(request.url).searchParams,
			route: route.route,
			matches: route.matches,
			phase
		}, async () => void 0);
		let downstreamResult;
		const middlewareResult = await middleware({
			request,
			params: route.params,
			query: new URL(request.url).searchParams,
			route: route.route,
			matches: route.matches,
			phase
		}, async () => {
			downstreamResult = await dispatch(position + 1);
			return downstreamResult instanceof Response ? downstreamResult : void 0;
		});
		if (middlewareResult instanceof Response) return middlewareResult;
		return downstreamResult;
	}
}
function collectRouteMiddleware(matches) {
	return matches.flatMap((route) => route.module.middleware ?? []);
}
//#endregion
//#region ../vuepagelet/src/lib/dom/ssr/renderer.ts
var DOCUMENT_MARKER = "data-vuepagelet";
var PAYLOAD_GLOBAL = "__VUEPAGELET__";
var ROOT_MARKER = "data-vuepagelet-root";
var DOCUMENT_SHELL_ERROR = "the vuepagelet runtime requires app.shell to render a full document with <html>, <head>, and <body>.";
async function renderPageResponse(options) {
	const matchedRoute = options.route ?? matchPageRoute(options.request.url, options.routes);
	if (!matchedRoute) return new Response("Not Found", { status: 404 });
	return runWithRouteMiddleware(matchedRoute, options.request, "render", async () => {
		try {
			const loaded = await loadRouteData(matchedRoute, options.request);
			if (loaded instanceof Response) return loaded;
			const state = createPageRuntimeState(matchedRoute, options.routes);
			const stateStore = createStateStore();
			const appState = await resolveAppState$1(options.request, options.app, true);
			state.appData = appState.data;
			state.appError = appState.error;
			state.loaderData = loaded.loaderData;
			state.actionData = { ...options.actionData };
			state.routeErrors = { ...options.routeErrors };
			setPendingDeferredKeys(state, collectPendingDeferredKeys$1(loaded.pending));
			const stream = createChunkedDocumentStream(await renderApplicationToString(matchedRoute, state, stateStore, options.app, options.routes), {
				routeId: matchedRoute.route.id,
				appData: state.appData,
				appError: state.appError,
				state: serializeStateStore(stateStore),
				loaderData: state.loaderData,
				actionData: state.actionData,
				pendingDeferredKeys: state.pendingDeferredKeys,
				routeErrors: state.routeErrors
			}, loaded.pending, options.request.signal, options.clientEntryPath);
			return new Response(stream, {
				status: options.status ?? (Object.keys(state.routeErrors).length > 0 || state.appError ? 500 : 200),
				headers: {
					"content-type": "text/html; charset=utf-8",
					"transfer-encoding": "chunked"
				}
			});
		} catch (error) {
			if (!isPageRouteExecutionError(error)) throw error;
			const boundaryErrors = assignNearestRouteError({
				routeErrors: { ...options.routeErrors },
				matches: matchedRoute.matches,
				failedRouteId: error.routeId,
				error: error.error
			});
			if (Object.keys(boundaryErrors).length === 0) return new Response("Internal Server Error", { status: 500 });
			const state = createPageRuntimeState(matchedRoute, options.routes);
			const stateStore = createStateStore();
			const appState = await resolveAppState$1(options.request, options.app, true);
			state.appData = appState.data;
			state.appError = appState.error;
			state.loaderData = { ...error.loaderData };
			state.actionData = { ...options.actionData };
			state.routeErrors = boundaryErrors;
			setPendingDeferredKeys(state, collectPendingDeferredKeys$1(error.pending ?? []));
			const html = await renderApplicationToString(matchedRoute, state, stateStore, options.app, options.routes);
			const payload = {
				routeId: matchedRoute.route.id,
				appData: state.appData,
				appError: state.appError,
				state: serializeStateStore(stateStore),
				loaderData: state.loaderData,
				actionData: state.actionData,
				pendingDeferredKeys: state.pendingDeferredKeys,
				routeErrors: state.routeErrors
			};
			return new Response(injectBootstrapPayload(html, payload, options.clientEntryPath), {
				status: options.status ?? 500,
				headers: { "content-type": "text/html; charset=utf-8" }
			});
		}
	});
}
async function renderApplicationToString(route, state, stateStore, appModule, routes, attempt = 0) {
	const app = createSSRApp(defineComponent({
		name: "PageRendererRoot",
		setup() {
			return () => {
				const routeTree = h(RouterView$1, { matches: route.matches });
				const component = resolveAppComponent$1(appModule?.shell);
				const appErrorComponent = resolveAppComponent$1(appModule?.error);
				const boundaryKey = createRouteLocationKey(route);
				return h(AppErrorBoundary, {
					errorComponent: appErrorComponent,
					externalError: state.appError,
					boundaryKey,
					onCaptureError(errorValue) {
						state.appError = errorValue;
					}
				}, { default: () => {
					if (!component) return routeTree;
					return h(component, null, { default: () => routeTree });
				} });
			};
		}
	}));
	const initialRouteErrorCount = Object.keys(state.routeErrors).length;
	const initialAppError = state.appError;
	initializeTransition(state, createRouteLocationKey(route));
	const router = createPageRouter({
		routes: routes ?? state.routes,
		state,
		history: createMemoryHistory()
	});
	await router.push(route.pathname);
	await router.isReady();
	app.use(router);
	app.provide(pageRuntimeStateKey, state);
	app.provide(stateStoreKey, stateStore);
	let capturedError;
	let capturedRouteId;
	app.config.errorHandler = (error, instance) => {
		capturedError = error;
		if (!capturedRouteId) capturedRouteId = resolveRenderErrorRouteId(route.matches, instance?.$?.type);
	};
	try {
		const rendered = await renderToString(app);
		if ((Object.keys(state.routeErrors).length > initialRouteErrorCount || state.appError !== initialAppError) && attempt === 0) return renderApplicationToString(route, state, stateStore, appModule, routes, attempt + 1);
		if (capturedError) throw new PageRouteExecutionError({
			phase: "render",
			routeId: capturedRouteId ?? route.route.id,
			error: capturedError,
			loaderData: state.loaderData
		});
		if (appModule?.shell) {
			if (!isDocumentShellHtml(rendered)) throw new Error(DOCUMENT_SHELL_ERROR);
			return ensureDocumentMarker(rendered);
		}
		return `<!DOCTYPE html><html ${DOCUMENT_MARKER}><head></head><body><div ${ROOT_MARKER}>${rendered}</div></body></html>`;
	} catch (error) {
		if (isPageRouteExecutionError(error)) throw error;
		throw new PageRouteExecutionError({
			phase: "render",
			routeId: capturedRouteId ?? route.route.id,
			error: capturedError ?? error,
			loaderData: state.loaderData
		});
	}
}
function createChunkedDocumentStream(html, payload, pending, signal, clientEntryPath) {
	return new ReadableStream({ async start(controller) {
		controller.enqueue(encodeText$1(injectBootstrapPayload(html, payload, clientEntryPath)));
		for await (const resolved of iterateResolvedDeferredChunks(pending, signal)) controller.enqueue(encodeText$1(createDeferredPatchScript(resolved)));
		controller.close();
	} });
}
function injectBootstrapPayload(html, payload, clientEntryPath) {
	const script = [
		"<script>",
		"var __VUE_OPTIONS_API__=true;",
		"var __VUE_PROD_DEVTOOLS__=false;",
		"var __VUE_PROD_HYDRATION_MISMATCH_DETAILS__=false;",
		`window.${PAYLOAD_GLOBAL}=window.${PAYLOAD_GLOBAL}||createPageRendererRuntime();`,
		`window.${PAYLOAD_GLOBAL}.bootstrap(${serializeRuntimeScriptValue(payload)});`,
		`${createRuntimeFactoryScript()}`,
		"<\/script>"
	].join("");
	const clientEntry = clientEntryPath ? `<script type="module" src="${escapeHtml(clientEntryPath)}"><\/script>` : "";
	return html.includes("</body>") ? html.replace("</body>", `${script}${clientEntry}</body>`) : `${html}${script}${clientEntry}`;
}
function createDeferredPatchScript(chunk) {
	return `<script>window.${PAYLOAD_GLOBAL}.resolve(${serializeRuntimeScriptValue(encodeDeferredChunk(chunk))});<\/script>`;
}
function createRuntimeFactoryScript() {
	return `function createPageRendererRuntime(){return{state:{appData:null,appError:null,state:{},loaderData:{},actionData:{},deferredData:{},deferredErrors:{},pendingDeferredKeys:{},routeErrors:{}},hydrationState:{appData:null,appError:null,state:{},loaderData:{},actionData:{},deferredData:{},deferredErrors:{},pendingDeferredKeys:{},routeErrors:{}},listeners:new Set(),bootstrap(payload){this.state.appData=payload.appData??null;this.state.appError=payload.appError??null;this.state.state=payload.state||{};this.state.loaderData=payload.loaderData||{};this.state.actionData=payload.actionData||{};this.state.pendingDeferredKeys=payload.pendingDeferredKeys||{};this.state.routeErrors=payload.routeErrors||{};this.hydrationState={appData:this.state.appData,appError:this.state.appError,state:Object.assign({},this.state.state),loaderData:Object.assign({},this.state.loaderData),actionData:Object.assign({},this.state.actionData),deferredData:{},deferredErrors:{},pendingDeferredKeys:Object.assign({},this.state.pendingDeferredKeys),routeErrors:Object.assign({},this.state.routeErrors)};},subscribe(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);},resolve(envelope){if(!envelope||envelope.type!=="deferred"){return;}const chunk=envelope.chunk;const target=chunk.error!==undefined?"deferredErrors":"deferredData";if(this.state.pendingDeferredKeys&&this.state.pendingDeferredKeys[chunk.routeId]){this.state.pendingDeferredKeys[chunk.routeId]=this.state.pendingDeferredKeys[chunk.routeId].filter(function(entry){return entry!==chunk.key;});if(this.state.pendingDeferredKeys[chunk.routeId].length===0){delete this.state.pendingDeferredKeys[chunk.routeId];}}this.state[target][chunk.routeId]=Object.assign({},this.state[target][chunk.routeId],{[chunk.key]:chunk.error!==undefined?chunk.error:chunk.data});this.listeners.forEach((listener)=>listener(envelope));}}}`;
}
function encodeText$1(value) {
	return new TextEncoder().encode(value);
}
function escapeHtml(value) {
	return value.replace(/"/g, "&quot;");
}
function collectPendingDeferredKeys$1(pending) {
	const grouped = {};
	for (const chunk of pending) grouped[chunk.routeId] = [...grouped[chunk.routeId] ?? [], chunk.key];
	return grouped;
}
function resolveAppComponent$1(component) {
	return typeof component === "object" && component !== null ? toRaw(component) : component;
}
async function resolveAppState$1(request, app, shouldRevalidate = true) {
	if (!app?.loader || !shouldRevalidate) return {
		data: null,
		error: null
	};
	try {
		return {
			data: await app.loader(request),
			error: null
		};
	} catch (error) {
		return {
			data: null,
			error
		};
	}
}
function isDocumentShellHtml(html) {
	return /<html[\s>]/i.test(html) && /<head[\s>]/i.test(html) && /<body[\s>]/i.test(html);
}
function ensureDocumentMarker(html) {
	if (new RegExp(`\\s${DOCUMENT_MARKER}(?:=(["']).*?\\1)?`, "i").test(html)) return html;
	return html.replace(/<html\b/i, `<html ${DOCUMENT_MARKER}`);
}
function resolveRenderErrorRouteId(matches, componentType) {
	const normalizedComponent = resolveAppComponent$1(componentType);
	if (normalizedComponent === void 0) return matches[matches.length - 1]?.id;
	for (let index = matches.length - 1; index >= 0; index -= 1) {
		const route = matches[index];
		if (resolveAppComponent$1(route.module.component) === normalizedComponent) return route.id;
		if (resolveAppComponent$1(route.module.error) === normalizedComponent) return route.id;
		if (resolveAppComponent$1(route.module.loading) === normalizedComponent) return route.id;
		if (resolveAppComponent$1(route.module.layout) === normalizedComponent) return matches[index - 1]?.id ?? route.id;
	}
	return matches[matches.length - 1]?.id;
}
//#endregion
//#region ../vuepagelet/src/lib/runtime/action.ts
async function executeActionForMatch(request, match) {
	const actionRoute = [...match.matches].reverse().find((route) => route.module.action);
	if (!actionRoute?.module.action) return null;
	const formData = await readRequestFormData(request);
	let result;
	try {
		result = await actionRoute.module.action(createActionContext(request, formData, match, actionRoute));
	} catch (error) {
		throw new PageRouteExecutionError({
			phase: "action",
			routeId: actionRoute.id,
			error
		});
	}
	if (result instanceof Response) return {
		match,
		route: actionRoute,
		response: result
	};
	return {
		match,
		route: actionRoute,
		data: result
	};
}
async function readRequestFormData(request) {
	try {
		return await request.clone().formData();
	} catch {
		return new FormData();
	}
}
function createActionContext(request, formData, match, route) {
	const url = new URL(request.url);
	return {
		request,
		formData,
		params: match.params,
		query: url.searchParams,
		route,
		matches: match.matches
	};
}
//#endregion
//#region ../vuepagelet/src/lib/runtime/request.ts
async function handlePageRequest(request, options) {
	const match = matchPageRoute(request.url, options.routes);
	if (!match) return new Response("Not Found", { status: 404 });
	if (isNavigationDataRequest(request)) return createNavigationDataResponse(request, match, options.routes, options.app);
	if (isActionMethod(request.method)) {
		let actionResult;
		try {
			actionResult = await runWithRouteMiddleware(match, request, "action", async () => executeActionForMatch(request, match));
		} catch (error) {
			const routeErrors = assignNearestRouteError({
				routeErrors: {},
				matches: match.matches,
				failedRouteId: isPageRouteExecutionError(error) ? error.routeId : match.route.id,
				error: isPageRouteExecutionError(error) ? error.error : error
			});
			if (isActionDataRequest(request)) return createJsonPayloadResponse({
				routeId: match.route.id,
				ok: false,
				status: 500,
				actionData: null,
				revalidatedRouteIds: [],
				loaderData: {},
				deferredData: {},
				routeErrors
			}, 500);
			return renderPageResponse({
				request,
				routes: options.routes,
				app: options.app,
				route: match,
				clientEntryPath: options.clientEntryPath,
				routeErrors,
				status: 500
			});
		}
		if (actionResult instanceof Response) return actionResult;
		if (actionResult?.response) return actionResult.response;
		if (isActionDataRequest(request)) return createActionDataResponse(request, match, options.app, actionResult);
		return renderPageResponse({
			request,
			routes: options.routes,
			app: options.app,
			route: match,
			clientEntryPath: options.clientEntryPath,
			actionData: actionResult && actionResult.route ? { [actionResult.route.id]: actionResult.data } : {}
		});
	}
	return renderPageResponse({
		request,
		routes: options.routes,
		app: options.app,
		route: match,
		clientEntryPath: options.clientEntryPath
	});
}
function isActionMethod(method) {
	return !["GET", "HEAD"].includes(method.toUpperCase());
}
function isActionDataRequest(request) {
	return isActionMethod(request.method) && acceptsJson(request);
}
function isNavigationDataRequest(request) {
	return !isActionMethod(request.method) && acceptsJson(request);
}
function acceptsJson(request) {
	return (request.headers.get("accept") ?? "").includes("application/json");
}
async function createActionDataResponse(request, match, app, actionResult) {
	const plan = createRevalidationPlan({
		currentMatch: match,
		nextMatch: match,
		currentUrl: new URL(request.url),
		nextUrl: new URL(request.url),
		actionRouteId: actionResult?.route.id,
		formMethod: request.method,
		formAction: new URL(request.url).pathname,
		actionStatus: actionResult?.response?.status ?? 200,
		actionResult: actionResult?.data
	});
	const appState = await resolveAppState(request, app, createAppRevalidationPlan(app, {
		currentMatch: match,
		nextMatch: match,
		currentUrl: new URL(request.url),
		nextUrl: new URL(request.url),
		actionRouteId: actionResult?.route.id,
		formMethod: request.method,
		formAction: new URL(request.url).pathname,
		actionStatus: actionResult?.response?.status ?? 200,
		actionResult: actionResult?.data
	}).shouldRevalidate);
	try {
		const loaded = await loadRouteData(match, request, plan.routeIds);
		if (loaded instanceof Response) return loaded;
		const routeErrors = {};
		const deferredData = {};
		for (const resolved of await collectResolvedDeferredChunks(loaded.pending, request.signal)) {
			if (resolved.error !== void 0) {
				Object.assign(routeErrors, assignNearestRouteError({
					routeErrors,
					matches: match.matches,
					failedRouteId: resolved.routeId,
					error: resolved.error
				}));
				continue;
			}
			deferredData[resolved.routeId] = {
				...deferredData[resolved.routeId],
				[resolved.key]: resolved.data
			};
		}
		return createJsonPayloadResponse({
			routeId: actionResult?.route.id ?? "",
			ok: true,
			status: 200,
			actionData: actionResult?.data ?? null,
			revalidatedRouteIds: plan.routeIds,
			loaderData: loaded.loaderData,
			deferredData,
			routeErrors,
			...serializeAppState(appState)
		});
	} catch (error) {
		const routeErrors = assignNearestRouteError({
			routeErrors: {},
			matches: match.matches,
			failedRouteId: isPageRouteExecutionError(error) ? error.routeId : match.route.id,
			error: isPageRouteExecutionError(error) ? error.error : error
		});
		return createJsonPayloadResponse({
			routeId: actionResult?.route.id ?? match.route.id,
			ok: false,
			status: 500,
			actionData: actionResult?.data ?? null,
			revalidatedRouteIds: [],
			loaderData: {},
			deferredData: {},
			routeErrors,
			...serializeAppState(appState)
		}, 500);
	}
}
async function createNavigationDataResponse(request, match, routes, app) {
	const currentUrl = readCurrentUrl(request);
	const currentMatch = currentUrl ? matchPageRoute(currentUrl.href, routes) : null;
	const nextUrl = new URL(request.url);
	const plan = createRevalidationPlan({
		currentMatch,
		nextMatch: match,
		currentUrl,
		nextUrl
	});
	const appState = await resolveAppState(request, app, createAppRevalidationPlan(app, {
		currentMatch,
		nextMatch: match,
		currentUrl,
		nextUrl
	}).shouldRevalidate);
	try {
		const loaded = await loadRouteData(match, request, plan.routeIds);
		if (loaded instanceof Response) return loaded;
		const routeErrors = {};
		const pendingDeferredKeys = collectPendingDeferredKeys(loaded.pending);
		if (loaded.pending.length > 0) {
			const payload = {
				routeId: match.route.id,
				ok: true,
				status: 200,
				pathname: match.pathname,
				revalidatedRouteIds: plan.routeIds,
				loaderData: loaded.loaderData,
				deferredData: {},
				pendingDeferredKeys,
				routeErrors,
				...serializeAppState(appState)
			};
			return new Response(createNavigationDataStream(payload, loaded.pending, request.signal), {
				status: 200,
				headers: {
					"content-type": "application/x-ndjson; charset=utf-8",
					"transfer-encoding": "chunked"
				}
			});
		}
		const deferredData = {};
		for (const resolved of await collectResolvedDeferredChunks(loaded.pending, request.signal)) {
			if (resolved.error !== void 0) {
				Object.assign(routeErrors, assignNearestRouteError({
					routeErrors,
					matches: match.matches,
					failedRouteId: resolved.routeId,
					error: resolved.error
				}));
				continue;
			}
			deferredData[resolved.routeId] = {
				...deferredData[resolved.routeId],
				[resolved.key]: resolved.data
			};
		}
		return createJsonPayloadResponse({
			routeId: match.route.id,
			ok: true,
			status: 200,
			pathname: match.pathname,
			revalidatedRouteIds: plan.routeIds,
			loaderData: loaded.loaderData,
			deferredData,
			pendingDeferredKeys,
			routeErrors,
			...serializeAppState(appState)
		});
	} catch (error) {
		const routeErrors = assignNearestRouteError({
			routeErrors: {},
			matches: match.matches,
			failedRouteId: isPageRouteExecutionError(error) ? error.routeId : match.route.id,
			error: isPageRouteExecutionError(error) ? error.error : error
		});
		return createJsonPayloadResponse({
			routeId: match.route.id,
			ok: false,
			status: 500,
			pathname: match.pathname,
			revalidatedRouteIds: [],
			loaderData: {},
			deferredData: {},
			routeErrors,
			...serializeAppState(appState)
		}, 500);
	}
}
async function resolveAppState(request, app, shouldRevalidate = true) {
	if (!app?.loader || !shouldRevalidate) return {
		data: null,
		error: null
	};
	try {
		return {
			data: await app.loader(request),
			error: null
		};
	} catch (error) {
		return {
			data: null,
			error
		};
	}
}
function serializeAppState(appState) {
	const payload = {};
	if (appState.data !== null && appState.data !== void 0) payload.appData = appState.data;
	if (appState.error !== null && appState.error !== void 0) payload.appError = appState.error;
	return payload;
}
function createNavigationDataStream(payload, pending, signal) {
	return new ReadableStream({ async start(controller) {
		controller.enqueue(encodeText(`${stringifyRuntimePayload({
			type: "navigation",
			payload
		})}\n`));
		for await (const resolved of iterateResolvedDeferredChunks(pending, signal)) controller.enqueue(encodeText(`${stringifyRuntimePayload(encodeDeferredChunk(resolved))}\n`));
		controller.close();
	} });
}
function createJsonPayloadResponse(payload, status = 200) {
	return new Response(stringifyRuntimePayload(payload), {
		status,
		headers: { "content-type": "application/json; charset=utf-8" }
	});
}
function collectPendingDeferredKeys(pending) {
	const grouped = {};
	for (const chunk of pending) grouped[chunk.routeId] = [...grouped[chunk.routeId] ?? [], chunk.key];
	return grouped;
}
function encodeText(value) {
	return new TextEncoder().encode(value);
}
function readCurrentUrl(request) {
	const referer = request.headers.get("referer");
	if (!referer) return null;
	try {
		return new URL(referer);
	} catch {
		return null;
	}
}
//#endregion
//#region ../vuepagelet/src/lib/integration/factory.ts
function createRouteRuntimeIntegration(options) {
	const resolver = createRouteResolver(options.routes);
	return {
		routes: options.routes,
		app: options.app,
		clientEntryPath: options.clientEntryPath,
		hydrate() {
			return hydratePage(createHydrateOptions(options));
		},
		handleRequest(request) {
			return handlePageRequest(request, createRequestOptions(options));
		},
		render(request) {
			return renderPageResponse({
				request,
				routes: options.routes,
				app: options.app,
				clientEntryPath: options.clientEntryPath
			});
		},
		createRouter(routerOptions = {}) {
			return createPageRouter({
				...routerOptions,
				routes: options.routes
			});
		},
		match(url) {
			return resolver.resolve(url);
		},
		resolveLocation(url) {
			return resolver.resolveLocation(url);
		}
	};
}
function createHydrateOptions(options) {
	return {
		routes: options.routes,
		app: options.app
	};
}
function createRequestOptions(options) {
	return {
		routes: options.routes,
		app: options.app,
		clientEntryPath: options.clientEntryPath
	};
}
//#endregion
//#region \0phial/generated-routes-manifest
var manifest = [
	{
		"id": "layout",
		"kind": "layout",
		"path": "/",
		"file": "app/pages/layout.ts"
	},
	{
		"id": "page",
		"kind": "page",
		"path": "",
		"file": "app/pages/page.ts",
		"parentId": "layout",
		"index": true
	},
	{
		"id": "blog/[slug]/page",
		"kind": "page",
		"path": "blog/:slug",
		"file": "app/pages/blog/[slug]/page.ts",
		"parentId": "layout",
		"index": false
	},
	{
		"id": "jsx/page",
		"kind": "page",
		"path": "jsx",
		"file": "app/pages/jsx/page.tsx",
		"parentId": "layout",
		"index": false
	},
	{
		"id": "sfc/page",
		"kind": "page",
		"path": "sfc",
		"file": "app/pages/sfc/page.vue",
		"parentId": "layout",
		"index": false
	}
];
//#endregion
//#region ../vuepagelet/src/lib/dom/components/route-link.ts
var RouterLink$1 = defineComponent({
	name: "PageRendererRouterLink",
	props: {
		to: {
			type: [String, Object],
			required: true
		},
		replace: {
			type: Boolean,
			required: false
		},
		activeClass: {
			type: String,
			required: false
		},
		exactActiveClass: {
			type: String,
			required: false
		}
	},
	setup(props, { slots }) {
		const resolvedTo = computed(() => props.to);
		return () => h(RouterLink, {
			to: resolvedTo.value,
			replace: props.replace,
			activeClass: props.activeClass,
			exactActiveClass: props.exactActiveClass,
			custom: true
		}, (linkProps) => h("a", {
			href: linkProps.href,
			onClick: linkProps.navigate,
			class: [props.activeClass && linkProps.isActive ? props.activeClass : "", props.exactActiveClass && linkProps.isExactActive ? props.exactActiveClass : ""].filter(Boolean).join(" ") || void 0,
			"data-allow-mismatch": "class"
		}, slots.default?.()));
	}
});
//#endregion
//#region ../vuepagelet/src/lib/dom/composables/use-action-data.ts
function useActionData(routeId) {
	const state = usePageRuntimeState();
	const currentPageRoute = useCurrentPageRoute();
	const pageRoute = usePageRoute();
	return computed(() => {
		const resolvedRouteId = routeId ?? currentPageRoute?.id ?? pageRoute.value?.id;
		if (!resolvedRouteId) return null;
		return state.actionData[resolvedRouteId] ?? null;
	});
}
//#endregion
//#region ../vuepagelet/src/lib/dom/composables/use-app.ts
function useAppData() {
	const state = usePageRuntimeState();
	return computed(() => state.appData ?? null);
}
//#endregion
//#region ../vuepagelet/src/lib/dom/composables/use-loader-data.ts
function useLoaderData(routeId) {
	const state = usePageRuntimeState();
	const currentPageRoute = useCurrentPageRoute();
	const pageRoute = usePageRoute();
	return computed(() => {
		const resolvedRouteId = routeId ?? currentPageRoute?.id ?? pageRoute.value?.id;
		if (!resolvedRouteId) return null;
		return state.loaderData[resolvedRouteId] ?? null;
	});
}
function useRouteLoaderData(routeId) {
	const state = usePageRuntimeState();
	return computed(() => {
		if (!routeId) return null;
		return state.loaderData[routeId] ?? null;
	});
}
//#endregion
//#region ../vuepagelet/src/lib/dom/composables/use-navigation.ts
function useNavigation() {
	const transitionState = usePageRuntimeState().transitionState;
	return {
		state: computed(() => transitionState.value.state),
		location: computed(() => transitionState.value.location),
		previousLocation: computed(() => transitionState.value.previousLocation),
		action: computed(() => transitionState.value.action),
		isLoading: computed(() => transitionState.value.state === "loading"),
		isSubmitting: computed(() => transitionState.value.state === "submitting"),
		isNavigating: computed(() => transitionState.value.state === "navigating" || transitionState.value.state === "loading")
	};
}
//#endregion
//#region ../vuepagelet/src/lib/dom/composables/use-submit.ts
function useSubmit() {
	const state = usePageRuntimeState();
	const route = useRoute$1();
	const currentPageRoute = useCurrentPageRoute();
	const pageRoute = usePageRoute();
	return async (target, options = {}) => {
		const method = normalizeMethod(options.method);
		const action = options.action ?? route.value.path;
		const request = createSubmitRequest(action, method, target, options.signal);
		const headers = new Headers(request.headers);
		headers.set("accept", "application/json");
		startSubmitting(state, action);
		try {
			const response = await (options.fetcher ?? fetch)(request, {
				headers,
				signal: options.signal
			});
			const payload = parseRuntimePayload(await response.text());
			const routeMatch = matchPageRoute(action, state.routes);
			const routeId = payload.routeId || routeMatch?.route.id || currentPageRoute?.id || pageRoute.value?.id || state.route.route.id;
			const normalizedPayload = {
				...payload,
				routeId,
				status: payload.status ?? response.status,
				ok: payload.ok ?? response.ok
			};
			const nextState = pruneRouteStateMaps(normalizedPayload.revalidatedRouteIds ?? [], {
				deferredData: state.deferredData,
				deferredErrors: state.deferredErrors,
				pendingDeferredKeys: state.pendingDeferredKeys,
				routeErrors: clearMatchedRouteErrors(state.routeErrors, state.route.matches)
			});
			state.loaderData = {
				...state.loaderData,
				...normalizedPayload.loaderData
			};
			applyAppState(state, normalizedPayload);
			state.deferredData = {
				...nextState.deferredData,
				...normalizedPayload.deferredData
			};
			state.deferredErrors = nextState.deferredErrors ?? {};
			state.pendingDeferredKeys = nextState.pendingDeferredKeys ?? {};
			state.routeErrors = {
				...nextState.routeErrors,
				...normalizedPayload.routeErrors
			};
			applyActionData(state, normalizedPayload);
			return normalizedPayload;
		} finally {
			finishSubmitting(state);
		}
	};
}
function createSubmitRequest(action, method, target, signal) {
	const base = typeof window === "undefined" ? "http://local" : window.location.origin;
	const url = new URL(action, base);
	const body = toFormData(target);
	if (method === "GET") {
		for (const [key, value] of body.entries()) url.searchParams.append(key, String(value));
		return new Request(url, {
			method,
			signal
		});
	}
	return new Request(url, {
		method,
		body,
		signal
	});
}
function toFormData(target) {
	if (target instanceof FormData) return target;
	if (typeof HTMLFormElement !== "undefined" && target instanceof HTMLFormElement) return new FormData(target);
	if (target instanceof URLSearchParams) {
		const formData = new FormData();
		target.forEach((value, key) => {
			formData.append(key, value);
		});
		return formData;
	}
	const formData = new FormData();
	if (!target) return formData;
	for (const [key, value] of Object.entries(target)) {
		if (Array.isArray(value)) {
			for (const entry of value) if (entry != null) formData.append(key, String(entry));
			continue;
		}
		if (value != null) formData.append(key, String(value));
	}
	return formData;
}
function normalizeMethod(method) {
	return (method ?? "post").toUpperCase();
}
//#endregion
//#region examples/zero-config/app/pages/layout.ts
var layout_exports = /* @__PURE__ */ __exportAll({ default: () => layout_default });
var layout_default = defineComponent({
	name: "ExampleRootLayout",
	setup(_, { slots }) {
		const appData = useAppData();
		const requestedAt = computed(() => appData.value?.requestedAt ?? "");
		const theme = computed(() => appData.value?.theme ?? "sepia");
		return () => h("div", { style: "font-family: ui-sans-serif, system-ui; margin: 0 auto; max-width: 720px; padding: 48px 24px; line-height: 1.6;" }, [h("header", { style: "display: flex; gap: 16px; align-items: center; margin-bottom: 32px; flex-wrap: wrap;" }, [
			h("strong", null, "phial"),
			h(RouterLink$1, { to: "/" }, { default: () => "h()" }),
			h(RouterLink$1, { to: "/jsx" }, { default: () => "JSX" }),
			h(RouterLink$1, { to: "/sfc" }, { default: () => "SFC" }),
			h(RouterLink$1, { to: "/blog/hello-world" }, { default: () => "Dynamic Route" }),
			h("span", { style: "margin-left: auto; font-size: 13px; color: #6e665d;" }, `theme=${theme.value} · shell=${requestedAt.value}`)
		]), h("main", null, slots.default?.())]);
	}
});
//#endregion
//#region examples/zero-config/app/pages/loading.ts
var loading_exports$1 = /* @__PURE__ */ __exportAll({ default: () => loading_default$1 });
var loading_default$1 = defineComponent({
	name: "ExampleRootLoading",
	props: {
		routeId: {
			type: String,
			required: true
		},
		location: {
			type: String,
			required: true
		},
		previousLocation: {
			type: String,
			default: ""
		},
		action: {
			type: String,
			required: true
		}
	},
	setup(props) {
		const description = computed(() => {
			const previous = props.previousLocation ? ` from ${props.previousLocation}` : "";
			return `Navigating to ${props.location}${previous} (${props.action})`;
		});
		return () => h("section", { style: "margin-top: 24px; padding: 18px; border: 1px dashed #c9bda9; border-radius: 14px; background: #f7f1e8; color: #6a5843;" }, [h("strong", null, "Root layout loading..."), h("p", { style: "margin: 10px 0 0;" }, description.value)]);
	}
});
//#endregion
//#region examples/zero-config/app/pages/action.ts
var action_exports = /* @__PURE__ */ __exportAll({ action: () => action });
async function action({ formData }) {
	const name = String(formData.get("name") ?? "").trim();
	if (!name) return {
		ok: false,
		message: "Please enter a name before submitting the demo form."
	};
	return {
		ok: true,
		message: `Saved a greeting for ${name}.`,
		submittedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
//#endregion
//#region examples/zero-config/app/pages/loader.ts
var loader_exports$2 = /* @__PURE__ */ __exportAll({ loader: () => loader$1 });
async function loader$1({ request }) {
	await new Promise((resolve) => setTimeout(resolve, 120));
	return {
		fromAppMiddleware: true,
		requestPath: new URL(request.url).pathname,
		message: "Hello from the root page loader.",
		renderedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
//#endregion
//#region examples/zero-config/app/pages/page.ts
var page_exports$3 = /* @__PURE__ */ __exportAll({ default: () => page_default$2 });
var page_default$2 = defineComponent({
	name: "HomePage",
	setup() {
		const data = useLoaderData();
		const layoutData = useRouteLoaderData("layout");
		const actionData = useActionData();
		const layoutActionData = useActionData("layout");
		const navigation = useNavigation();
		const submit = useSubmit();
		const renderedAt = computed(() => layoutData.value?.renderedAt ?? "");
		const submittedAt = computed(() => layoutActionData.value?.submittedAt ?? "");
		const feedbackTone = computed(() => layoutActionData.value?.ok === false ? "#8a2d1f" : "#1f5f3b");
		async function handleSubmit(event) {
			const form = event.currentTarget;
			if (!form) return;
			event.preventDefault();
			try {
				await submit(form);
			} catch {}
		}
		return () => h("section", null, [
			h("h1", null, "Vue h() example"),
			h("p", null, "This homepage is implemented with a render function and also demonstrates loader/action data."),
			h("p", null, ["Current page loader: ", h("strong", null, data.value ? "available" : "none")]),
			h("p", null, layoutData.value?.message ?? ""),
			h("p", null, `App middleware active: ${layoutData.value?.fromAppMiddleware ? "yes" : "no"}`),
			h("p", null, `Request path seen by middleware: ${layoutData.value?.requestPath ?? "/"}`),
			h("p", null, `SSR time: ${renderedAt.value}`),
			h("ul", null, [
				h("li", null, "Visit /jsx for the Vue JSX example."),
				h("li", null, "Visit /sfc for the Vue single-file component example."),
				h("li", null, "Visit /blog/hello-world for the dynamic route example.")
			]),
			h("form", {
				method: "post",
				onSubmit: handleSubmit,
				style: "display: grid; gap: 12px; margin-top: 28px; padding: 18px; border: 1px solid #d9d0c2; border-radius: 14px; background: #fffdfa;"
			}, [
				h("strong", null, "Action demo"),
				h("label", { style: "display: grid; gap: 6px;" }, [h("span", null, "Your name?"), h("input", {
					name: "name",
					type: "text",
					placeholder: "Ada Lovelace",
					style: "padding: 10px 12px; border: 1px solid #c9bda9; border-radius: 10px; font: inherit;"
				})]),
				h("div", { style: "display: flex; gap: 12px; align-items: center; flex-wrap: wrap;" }, [h("button", {
					type: "submit",
					disabled: navigation.isSubmitting.value,
					style: "padding: 10px 14px; border: 0; border-radius: 999px; background: #1b1b18; color: #f7f4ef; font: inherit; cursor: pointer;"
				}, navigation.isSubmitting.value ? "Submitting..." : "Submit action"), h("span", { style: "font-size: 14px; color: #6e665d;" }, `Action state: ${navigation.isSubmitting.value ? "submitting" : layoutActionData.value ? "success" : "idle"}`)]),
				h("p", { style: "margin: 0; color: #6e665d;" }, `Current page action data: ${actionData.value ? "available" : "none"}`),
				layoutActionData.value ? h("p", { style: `margin: 0; color: ${feedbackTone.value};` }, layoutActionData.value.message) : null,
				layoutActionData.value?.submittedAt ? h("p", { style: "margin: 0; font-size: 14px; color: #6e665d;" }, `Submitted at: ${submittedAt.value}`) : null
			])
		]);
	}
});
//#endregion
//#region examples/zero-config/app/pages/blog/[slug]/page.ts
var page_exports$2 = /* @__PURE__ */ __exportAll({ default: () => page_default$1 });
var page_default$1 = defineComponent({
	name: "BlogPostPage",
	setup() {
		const route = useRoute$1();
		const data = useLoaderData();
		return () => h("section", null, [
			h("h1", null, data.value?.slug ?? "Unknown post"),
			h("p", null, data.value?.summary ?? ""),
			h("p", null, `Middleware trace: ${data.value?.middlewareTrace ?? "missing"}`),
			h("p", null, `Current route path: ${route.value.fullPath}`)
		]);
	}
});
//#endregion
//#region examples/zero-config/app/pages/blog/[slug]/loading.ts
var loading_exports = /* @__PURE__ */ __exportAll({ default: () => loading_default });
var loading_default = defineComponent({
	name: "ExampleBlogLoading",
	props: {
		routeId: {
			type: String,
			required: true
		},
		location: {
			type: String,
			required: true
		}
	},
	setup(props) {
		return () => h("article", { style: "display: grid; gap: 12px; margin-top: 12px; padding: 18px; border-radius: 14px; background: #f5f5f2; border: 1px solid #dad8d1;" }, [h("h1", { style: "margin: 0;" }, "Loading blog article..."), h("p", { style: "margin: 0; color: #6c6c66;" }, `Preparing ${props.location}`)]);
	}
});
//#endregion
//#region examples/zero-config/app/pages/blog/[slug]/loader.ts
var loader_exports$1 = /* @__PURE__ */ __exportAll({ loader: () => loader });
async function loader({ params }) {
	await new Promise((resolve) => setTimeout(resolve, 220));
	const slug = params.slug ?? "unknown";
	return {
		slug,
		middlewareTrace: `directory:${slug} > route:${slug}`,
		summary: `Loaded post "${slug}" through a file route.`
	};
}
//#endregion
//#region examples/zero-config/app/pages/blog/[slug]/middleware.ts
var middleware_exports = /* @__PURE__ */ __exportAll({ default: () => middleware_default });
var middleware_default = ["post-trace"];
//#endregion
//#region examples/zero-config/app/pages/blog/_middleware.ts
var _middleware_exports$1 = /* @__PURE__ */ __exportAll({ default: () => _middleware_default$1 });
var _middleware_default$1 = ["blog-trace"];
//#endregion
//#region ../../../../../../../__vue-jsx-ssr-register-helper
var ssrRegisterHelper = function ssrRegisterHelper(comp, filename) {
	const setup = comp.setup;
	comp.setup = (props, ctx) => {
		const ssrContext = useSSRContext();
		(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add(filename);
		if (setup) return setup(props, ctx);
	};
};
//#endregion
//#region examples/zero-config/app/pages/jsx/page.tsx
var page_exports$1 = /* @__PURE__ */ __exportAll({ default: () => __default__ });
var __default__ = defineComponent({
	name: "JsxExamplePage",
	setup() {
		const route = useRoute$1();
		const appData = useAppData();
		const theme = computed(() => appData.value?.theme ?? "sepia");
		return () => createVNode("section", null, [
			createVNode("h1", null, [createTextVNode("Vue JSX example")]),
			createVNode("p", null, [
				createTextVNode("This route is implemented with a "),
				createVNode("code", null, [createTextVNode(".tsx")]),
				createTextVNode(" file.")
			]),
			createVNode("ul", null, [createVNode("li", null, [createTextVNode("Current path: "), createVNode("strong", null, [route.value.fullPath])]), createVNode("li", null, [createTextVNode("Theme from app loader: "), createVNode("strong", null, [theme.value])])]),
			createVNode("p", null, [
				createTextVNode("Navigate to the "),
				createVNode(RouterLink$1, { "to": "/sfc" }, { default: () => [createTextVNode("SFC example")] }),
				createTextVNode(" or back to the"),
				" ",
				createVNode(RouterLink$1, { "to": "/" }, { default: () => [createTextVNode("h() example")] }),
				createTextVNode(".")
			])
		]);
	}
});
ssrRegisterHelper(__default__, "app/pages/jsx/page.tsx");
//#endregion
//#region examples/zero-config/app/pages/sfc/page.vue?vue&type=script&setup=true&lang.ts
var page_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "page",
	__ssrInlineRender: true,
	setup(__props) {
		const route = useRoute$1();
		const appData = useAppData();
		const theme = computed(() => appData.value?.theme ?? "sepia");
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(_attrs)}><h1>Vue SFC example</h1><p>This route is implemented with a <code>.vue</code> file.</p><ul><li> Current path: <strong>${ssrInterpolate(unref(route).fullPath)}</strong></li><li> Theme from app loader: <strong>${ssrInterpolate(theme.value)}</strong></li></ul><p> Navigate to the `);
			_push(ssrRenderComponent(unref(RouterLink$1), { to: "/jsx" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`JSX example`);
					else return [createTextVNode("JSX example")];
				}),
				_: 1
			}, _parent));
			_push(` or back to the `);
			_push(ssrRenderComponent(unref(RouterLink$1), { to: "/" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`h() example`);
					else return [createTextVNode("h() example")];
				}),
				_: 1
			}, _parent));
			_push(`. </p></section>`);
		};
	}
});
//#endregion
//#region examples/zero-config/app/pages/sfc/page.vue
var page_exports = /* @__PURE__ */ __exportAll({ default: () => page_default });
var _sfc_setup$2 = page_vue_vue_type_script_setup_true_lang_default.setup;
page_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("app/pages/sfc/page.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var page_default = page_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region \0phial/generated-routes-modules
var routeFileModule0 = layout_exports;
var routeFileModule1 = loading_exports$1;
var routeFileModule2 = action_exports;
var routeFileModule3 = loader_exports$2;
var routeFileModule4 = page_exports$3;
var routeFileModule5 = page_exports$2;
var routeFileModule6 = loading_exports;
var routeFileModule7 = loader_exports$1;
var routeFileModule8 = middleware_exports;
var routeFileModule9 = _middleware_exports$1;
var routeFileModule10 = page_exports$1;
var routeFileModule11 = page_exports;
var routeDefinitions = {
	"layout": {
		id: "layout",
		kind: "layout",
		files: [
			"/app/pages/layout.ts",
			"/app/pages/loading.ts",
			"/app/pages/action.ts",
			"/app/pages/loader.ts"
		],
		entryFiles: {
			"layout": "/app/pages/layout.ts",
			"loading": "/app/pages/loading.ts",
			"action": "/app/pages/action.ts",
			"loader": "/app/pages/loader.ts"
		},
		directoryMiddlewareFiles: []
	},
	"page": {
		id: "page",
		kind: "page",
		files: ["/app/pages/page.ts"],
		entryFiles: { "page": "/app/pages/page.ts" },
		directoryMiddlewareFiles: []
	},
	"blog/[slug]/page": {
		id: "blog/[slug]/page",
		kind: "page",
		files: [
			"/app/pages/blog/[slug]/page.ts",
			"/app/pages/blog/[slug]/loading.ts",
			"/app/pages/blog/[slug]/loader.ts",
			"/app/pages/blog/[slug]/middleware.ts",
			"/app/pages/blog/_middleware.ts"
		],
		entryFiles: {
			"page": "/app/pages/blog/[slug]/page.ts",
			"loading": "/app/pages/blog/[slug]/loading.ts",
			"loader": "/app/pages/blog/[slug]/loader.ts",
			"middleware": "/app/pages/blog/[slug]/middleware.ts"
		},
		directoryMiddlewareFiles: ["/app/pages/blog/_middleware.ts"]
	},
	"jsx/page": {
		id: "jsx/page",
		kind: "page",
		files: ["/app/pages/jsx/page.tsx"],
		entryFiles: { "page": "/app/pages/jsx/page.tsx" },
		directoryMiddlewareFiles: []
	},
	"sfc/page": {
		id: "sfc/page",
		kind: "page",
		files: ["/app/pages/sfc/page.vue"],
		entryFiles: { "page": "/app/pages/sfc/page.vue" },
		directoryMiddlewareFiles: []
	}
};
var routeModules = {
	"layout": createResolvedRouteModule("layout"),
	"page": createResolvedRouteModule("page"),
	"blog/[slug]/page": createResolvedRouteModule("blog/[slug]/page"),
	"jsx/page": createResolvedRouteModule("jsx/page"),
	"sfc/page": createResolvedRouteModule("sfc/page")
};
function createResolvedRouteModule(id) {
	const definition = routeDefinitions[id];
	if (!definition) return;
	return createPhialRouteModule(definition, definition.files.map((file) => getLoadedRouteFileModule(file)));
}
function getLoadedRouteFileModule(file) {
	const fileIndex = {
		"/app/pages/layout.ts": 0,
		"/app/pages/loading.ts": 1,
		"/app/pages/action.ts": 2,
		"/app/pages/loader.ts": 3,
		"/app/pages/page.ts": 4,
		"/app/pages/blog/[slug]/page.ts": 5,
		"/app/pages/blog/[slug]/loading.ts": 6,
		"/app/pages/blog/[slug]/loader.ts": 7,
		"/app/pages/blog/[slug]/middleware.ts": 8,
		"/app/pages/blog/_middleware.ts": 9,
		"/app/pages/jsx/page.tsx": 10,
		"/app/pages/sfc/page.vue": 11
	}[file];
	if (fileIndex === void 0) return;
	return [
		routeFileModule0,
		routeFileModule1,
		routeFileModule2,
		routeFileModule3,
		routeFileModule4,
		routeFileModule5,
		routeFileModule6,
		routeFileModule7,
		routeFileModule8,
		routeFileModule9,
		routeFileModule10,
		routeFileModule11
	][fileIndex];
}
function createPhialRouteModule(definition, loadedModules) {
	const modules = Object.fromEntries(definition.files.map((file, index) => [file, loadedModules[index]]));
	const primaryModule = resolvePrimaryModule(definition, modules);
	const errorModule = resolveEntryModule(definition, modules, "error");
	const loadingModule = resolveEntryModule(definition, modules, "loading");
	const loaderModule = resolveEntryModule(definition, modules, "loader");
	const actionModule = resolveEntryModule(definition, modules, "action");
	const middlewareModule = resolveEntryModule(definition, modules, "middleware");
	const directoryMiddlewareModules = definition.directoryMiddlewareFiles.map((file) => modules[file]);
	return {
		default: resolveDefaultExport$1(primaryModule),
		directoryMiddleware: directoryMiddlewareModules.flatMap((module) => resolveMiddlewareExport(module) ?? []),
		loader: resolveHandlerExport(loaderModule, "loader") ?? resolveNamedExport(primaryModule, "loader"),
		action: resolveHandlerExport(actionModule, "action") ?? resolveNamedExport(primaryModule, "action"),
		middleware: resolveMiddlewareExport(middlewareModule) ?? resolveMiddlewareExport(primaryModule, false),
		shouldRevalidate: resolveNamedExport(primaryModule, "shouldRevalidate"),
		meta: resolveNamedExport(primaryModule, "meta"),
		ErrorBoundary: resolveDefaultExport$1(errorModule) ?? resolveNamedExport(primaryModule, "ErrorBoundary"),
		Loading: resolveDefaultExport$1(loadingModule) ?? resolveNamedExport(primaryModule, "Loading"),
		onError: resolveHandlerExport(errorModule, "onError") ?? resolveNamedExport(primaryModule, "onError")
	};
}
function resolvePrimaryModule(definition, modules) {
	const primaryFile = definition.entryFiles[definition.kind];
	return primaryFile ? modules[primaryFile] : void 0;
}
function resolveEntryModule(definition, modules, key) {
	const file = definition.entryFiles[key];
	return file ? modules[file] : void 0;
}
function resolveDefaultExport$1(module) {
	return module?.default;
}
function resolveNamedExport(module, name) {
	return module?.[name];
}
function resolveHandlerExport(module, name) {
	if (!module) return;
	return module[name] ?? module.default;
}
function resolveMiddlewareExport(module, allowDefault = true) {
	if (!module) return;
	const middleware = module.middleware ?? (allowDefault ? module.default : void 0);
	if (middleware === void 0) return;
	return Array.isArray(middleware) ? middleware : [middleware];
}
//#endregion
//#region examples/zero-config/app/middleware/blog-trace.ts
var blog_trace_exports = /* @__PURE__ */ __exportAll({ default: () => blogTraceMiddleware });
async function blogTraceMiddleware(context, next) {
	context.params;
	return next();
}
//#endregion
//#region examples/zero-config/app/middleware/post-trace.ts
var post_trace_exports = /* @__PURE__ */ __exportAll({ default: () => postTraceMiddleware });
async function postTraceMiddleware(context, next) {
	context.params;
	return next();
}
//#endregion
//#region examples/zero-config/app/middleware/request-meta.ts
var request_meta_exports = /* @__PURE__ */ __exportAll({ default: () => requestMetaMiddleware });
async function requestMetaMiddleware(context, next) {
	context.request;
	return next();
}
//#endregion
//#region \0phial/generated-app-middleware
var appMiddlewareRegistry = {
	"blog-trace": resolveMiddleware$1(blog_trace_exports, "blog-trace"),
	"post-trace": resolveMiddleware$1(post_trace_exports, "post-trace"),
	"request-meta": resolveMiddleware$1(request_meta_exports, "request-meta")
};
function resolveMiddleware$1(module, name) {
	const middleware = module?.middleware ?? module?.default;
	if (typeof middleware !== "function") throw new Error(`Invalid middleware module "${name}". Expected a default export or named "middleware" export.`);
	return middleware;
}
//#endregion
//#region examples/zero-config/app/app.vue?vue&type=script&setup=true&lang.ts
var app_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "app",
	__ssrInlineRender: true,
	setup(__props) {
		const appData = useAppData();
		const theme = computed(() => appData.value?.theme ?? "sepia");
		const bodyStyle = computed(() => theme.value === "light" ? "margin: 0; background: #f5f7fb; color: #172033;" : "margin: 0; background: #f7f4ef; color: #1b1b18;");
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<html${ssrRenderAttrs(mergeProps({
				lang: "en",
				"data-allow-mismatch": "children"
			}, _attrs))}><head data-allow-mismatch="children"><title>phial</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body${ssrRenderAttr("data-theme", theme.value)} style="${ssrRenderStyle(bodyStyle.value)}" data-allow-mismatch="children">`);
			ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
			_push(`</body></html>`);
		};
	}
});
//#endregion
//#region examples/zero-config/app/app.vue
var app_exports = /* @__PURE__ */ __exportAll({ default: () => app_default });
var _sfc_setup$1 = app_vue_vue_type_script_setup_true_lang_default.setup;
app_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("app/app.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var app_default = app_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region examples/zero-config/app/error.vue?vue&type=script&setup=true&lang.ts
var error_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "error",
	__ssrInlineRender: true,
	props: {
		error: {},
		routeId: {}
	},
	setup(__props) {
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<main${ssrRenderAttrs(mergeProps({
				"data-phial-error": "",
				style: {
					"margin": "0 auto",
					"max-width": "720px",
					"padding": "48px 24px",
					"font-family": "ui-sans-serif, system-ui",
					"line-height": "1.6"
				}
			}, _attrs))}><h1>Something broke</h1><p>${ssrInterpolate(typeof __props.error === "string" ? __props.error : __props.error?.message ?? "Unexpected error")}</p>`);
			if (__props.routeId) _push(`<p style="${ssrRenderStyle({ "color": "#6e665d" })}">Failed route: ${ssrInterpolate(__props.routeId)}</p>`);
			else _push(`<!---->`);
			_push(`</main>`);
		};
	}
});
//#endregion
//#region examples/zero-config/app/error.vue
var error_exports = /* @__PURE__ */ __exportAll({ default: () => error_default });
var _sfc_setup = error_vue_vue_type_script_setup_true_lang_default.setup;
error_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("app/error.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var error_default = error_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region examples/zero-config/app/loader.ts
var loader_exports = /* @__PURE__ */ __exportAll({ default: () => loadAppData });
async function loadAppData(request) {
	return {
		theme: new URL(request.url).searchParams.get("theme") === "light" ? "light" : "sepia",
		requestedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
//#endregion
//#region examples/zero-config/app/app.config.ts
var app_config_exports = /* @__PURE__ */ __exportAll({ default: () => app_config_default });
var app_config_default = { middleware: ["request-meta"] };
//#endregion
//#region \0phial/generated-app-runtime
var appComponentModule = app_exports;
var errorComponentModule = error_exports;
var appLoaderModule = loader_exports;
var appConfigModule = app_config_exports;
var appComponent = resolveAppComponent(typeof appComponentModule !== "undefined" ? appComponentModule : void 0);
var errorComponent = resolveErrorComponent(typeof errorComponentModule !== "undefined" ? errorComponentModule : void 0);
var appLoader = resolveAppLoader(typeof appLoaderModule !== "undefined" ? appLoaderModule : void 0);
var appConfig = resolveAppConfig(typeof appConfigModule !== "undefined" ? appConfigModule : void 0);
var app = createAppModule(appComponent, errorComponent, appLoader);
var routes = createRouteRecords(manifest, routeModules);
function createIntegration(runtimeOptions = {}) {
	return createRouteRuntimeIntegration({
		app,
		routes,
		...runtimeOptions
	});
}
createIntegration();
installRouteModuleHmrBridge();
function resolveAppComponent(module) {
	return module?.default;
}
function resolveErrorComponent(module) {
	return module?.default;
}
function resolveAppLoader(module) {
	const loader = module?.loader ?? module?.default;
	if (loader !== void 0 && typeof loader !== "function") throw new Error("Invalid app loader module. Expected a default export or named \"loader\" export.");
	return loader;
}
function resolveAppConfig(module) {
	return module?.default ?? module?.appConfig ?? {};
}
function createAppModule(shell, error, loader) {
	return {
		shell,
		error,
		loader
	};
}
function createRouteRecords(routeManifest, loadedRouteModules) {
	const records = routeManifest.map((entry) => ({
		id: entry.id,
		path: entry.path,
		module: createRouteModule(entry, loadedRouteModules[entry.id]),
		children: []
	}));
	const recordMap = new Map(records.map((record) => [record.id, record]));
	const roots = [];
	for (const entry of routeManifest) {
		const record = recordMap.get(entry.id);
		if (!record) continue;
		if (entry.parentId) {
			const parent = recordMap.get(entry.parentId);
			if (parent) {
				parent.children.push(record);
				continue;
			}
		}
		roots.push(record);
	}
	return attachAppMiddleware(roots, resolveGlobalMiddleware(appConfig, appMiddlewareRegistry));
}
function installRouteModuleHmrBridge() {
	if (typeof globalThis === "undefined") return;
	globalThis.__ROUTE_MODULE_HMR__ = async () => {
		syncRouteRecords(routes, createRouteRecords(manifest, routeModules));
		createIntegration();
		await notifyAppRuntimeHotUpdate({
			appComponent,
			errorComponent,
			config: appConfig,
			routes
		});
	};
}
async function notifyAppRuntimeHotUpdate(payload) {
	if (typeof globalThis === "undefined") return false;
	const applyAppRuntimeHotUpdate = globalThis.__APP_RUNTIME_HMR__;
	if (typeof applyAppRuntimeHotUpdate !== "function") return false;
	await applyAppRuntimeHotUpdate(payload);
	return true;
}
function syncRouteRecords(targetRoutes, nextRoutes) {
	const targetRouteMap = new Map(flattenRoutes(targetRoutes).map((route) => [route.id, route]));
	for (const nextRoute of flattenRoutes(nextRoutes)) {
		const targetRoute = targetRouteMap.get(nextRoute.id);
		if (!targetRoute) continue;
		targetRoute.path = nextRoute.path;
		targetRoute.name = nextRoute.name;
		targetRoute.module = nextRoute.module;
	}
}
function flattenRoutes(routes) {
	return routes.flatMap((route) => [route, ...flattenRoutes(route.children ?? [])]);
}
function createRouteModule(entry, module) {
	const resolvedModule = module ?? {};
	const routeModule = entry.kind === "layout" ? { layout: resolveDefaultExport(resolvedModule) } : { component: resolveDefaultExport(resolvedModule) };
	const middleware = resolveMiddlewareReferences([...resolvedModule.directoryMiddleware ?? [], ...resolvedModule.middleware ?? []], appMiddlewareRegistry);
	if (resolvedModule.Loading !== void 0) routeModule.loading = resolvedModule.Loading;
	if (resolvedModule.ErrorBoundary !== void 0) routeModule.error = resolvedModule.ErrorBoundary;
	if (resolvedModule.loader !== void 0) routeModule.loader = resolvedModule.loader;
	if (resolvedModule.action !== void 0) routeModule.action = resolvedModule.action;
	if (middleware.length > 0) routeModule.middleware = middleware;
	if (resolvedModule.shouldRevalidate !== void 0) routeModule.shouldRevalidate = resolvedModule.shouldRevalidate;
	return routeModule;
}
function resolveDefaultExport(module) {
	return module?.default;
}
function resolveGlobalMiddleware(config, registry) {
	return resolveMiddlewareReferences(config?.middleware ?? [], registry);
}
function resolveMiddlewareReferences(references, registry) {
	const entries = Array.isArray(references) ? references : [references];
	const middleware = [];
	for (const reference of entries) {
		if (reference === void 0) continue;
		if (typeof reference === "function") {
			middleware.push(reference);
			continue;
		}
		const handler = registry[reference];
		if (!handler) throw new Error(`Unknown middleware reference "${reference}".`);
		middleware.push(handler);
	}
	return middleware;
}
function attachAppMiddleware(routes, middleware) {
	if (!Array.isArray(middleware) || middleware.length === 0) return routes;
	return routes.map((route) => ({
		...route,
		module: {
			...route.module,
			middleware: [...middleware, ...route.module.middleware ?? []]
		}
	}));
}
//#endregion
//#region \0phial/generated-app-plugin
function createAppRouteMiddleware(getIntegration) {
	return async (request, next) => {
		const integration = await getIntegration();
		if (!integration.match(new URL(request.url).pathname)) return next(request);
		return integration.handleRequest(request);
	};
}
function createAppRouteServerPlugin(options = {}) {
	let integrationPromise;
	return (server) => {
		server.options.middleware.push(createAppRouteMiddleware(() => {
			if (!integrationPromise) integrationPromise = Promise.resolve(createIntegration(options));
			return integrationPromise;
		}));
	};
}
function createAppPlugin(options = {}) {
	return createAppRouteServerPlugin(options);
}
createAppPlugin();
//#endregion
//#region \0phial/generated-config
var config = {
	"server": { "middleware": ["server-trace"] },
	"dev": { "port": 3e3 }
};
//#endregion
//#region examples/zero-config/server/context.ts
var serverTraceKey = createContextKey([]);
//#endregion
//#region examples/zero-config/server/middleware/server-trace.ts
var server_trace_exports = /* @__PURE__ */ __exportAll({ default: () => serverTrace });
var serverTrace = async (request, next) => {
	const url = new URL(request.url);
	const nextTrace = [...request.context.get(serverTraceKey), `global:${url.pathname}:${request.method}`];
	request.context.set(serverTraceKey, nextTrace);
	return next(request);
};
//#endregion
//#region examples/zero-config/server/middleware/server-trace-route.ts
var server_trace_route_exports = /* @__PURE__ */ __exportAll({ default: () => serverTraceRoute });
var serverTraceRoute = async (request, next) => {
	const url = new URL(request.url);
	const nextTrace = [...request.context.get(serverTraceKey), `route:${url.pathname}:${request.method}`];
	request.context.set(serverTraceKey, nextTrace);
	return next(request);
};
//#endregion
//#region examples/zero-config/server/middleware/server-trace-scope.ts
var server_trace_scope_exports = /* @__PURE__ */ __exportAll({ default: () => serverTraceScope });
var serverTraceScope = async (request, next) => {
	const url = new URL(request.url);
	const nextTrace = [...request.context.get(serverTraceKey), `directory:${url.pathname}:${request.method}`];
	request.context.set(serverTraceKey, nextTrace);
	return next(request);
};
//#endregion
//#region \0phial/generated-server-middleware
var serverMiddlewareRegistry = {
	"server-trace": resolveMiddleware(server_trace_exports, "server-trace"),
	"server-trace-route": resolveMiddleware(server_trace_route_exports, "server-trace-route"),
	"server-trace-scope": resolveMiddleware(server_trace_scope_exports, "server-trace-scope")
};
function resolveMiddleware(module, name) {
	const middleware = module?.middleware ?? module?.default;
	if (typeof middleware !== "function") throw new Error(`Invalid server middleware module "${name}". Expected a default export or named "middleware" export.`);
	return middleware;
}
//#endregion
//#region examples/zero-config/server/routes/api/ping.ts
var ping_exports = /* @__PURE__ */ __exportAll({ default: () => ping_default });
var ping_default = {
	middleware: ["server-trace-route"],
	meta: { kind: "api" },
	GET(request) {
		const { searchParams } = new URL(request.url);
		const trace = request.context.get(serverTraceKey);
		return {
			ok: true,
			method: "GET",
			query: searchParams.get("message") ?? null,
			trace
		};
	},
	async POST(request) {
		const trace = request.context.get(serverTraceKey);
		return {
			ok: true,
			method: "POST",
			body: await request.text() || null,
			trace
		};
	}
};
//#endregion
//#region examples/zero-config/server/routes/api/_middleware.ts
var _middleware_exports = /* @__PURE__ */ __exportAll({ default: () => _middleware_default });
var _middleware_default = ["server-trace-scope"];
//#endregion
//#region examples/zero-config/server/routes/robots.txt.ts
var robots_txt_exports = /* @__PURE__ */ __exportAll({ default: () => robots_txt_default });
var robots_txt_default = { GET() {
	return new Response("User-agent: *\nAllow: /\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
} };
//#endregion
//#region \0phial/generated-server-routes
var serverFileModule0 = ping_exports;
var serverFileModule1 = _middleware_exports;
var serverFileModule2 = robots_txt_exports;
var serverRoutes = [{
	"id": "api/ping",
	"path": "/api/ping",
	"file": "server/routes/api/ping.ts",
	"definition": resolveServerRoute(getLoadedServerModule("server/routes/api/ping.ts"), "server/routes/api/ping.ts"),
	"directoryMiddlewareNames": resolveDirectoryMiddlewareNames(["server/routes/api/_middleware.ts"])
}, {
	"id": "robots.txt",
	"path": "/robots.txt",
	"file": "server/routes/robots.txt.ts",
	"definition": resolveServerRoute(getLoadedServerModule("server/routes/robots.txt.ts"), "server/routes/robots.txt.ts"),
	"directoryMiddlewareNames": resolveDirectoryMiddlewareNames([])
}];
function resolveDirectoryMiddlewareNames(files) {
	return files.flatMap((file) => resolveMiddlewareNames(getLoadedServerModule(file), file));
}
function resolveServerRoute(module, file) {
	const route = module?.default ?? module?.route;
	if (!route || typeof route !== "object") throw new Error(`Invalid server route module "${file}". Expected a default export or named "route" export.`);
	return {
		middlewareNames: normalizeMiddlewareNames(route?.middleware),
		meta: route?.meta && typeof route.meta === "object" ? route.meta : void 0,
		handler: asHandler(route?.handler),
		GET: asHandler(route?.GET),
		POST: asHandler(route?.POST),
		PUT: asHandler(route?.PUT),
		PATCH: asHandler(route?.PATCH),
		DELETE: asHandler(route?.DELETE),
		HEAD: asHandler(route?.HEAD),
		OPTIONS: asHandler(route?.OPTIONS)
	};
}
function resolveMiddlewareNames(module, file) {
	if (!module) return [];
	const middleware = module?.middleware ?? module?.default;
	if (middleware === void 0) return [];
	if (!Array.isArray(middleware) || middleware.some((name) => typeof name !== "string")) throw new Error(`Invalid server route directory middleware "${file}". Expected a default export or named "middleware" export with a string array.`);
	return middleware;
}
function normalizeMiddlewareNames(value) {
	if (value === void 0) return;
	if (!Array.isArray(value) || value.some((name) => typeof name !== "string")) throw new Error("Server route \"middleware\" must be a string array.");
	return value;
}
function asHandler(value) {
	return typeof value === "function" ? value : void 0;
}
function getLoadedServerModule(file) {
	const fileIndex = {
		"server/routes/api/ping.ts": 0,
		"server/routes/api/_middleware.ts": 1,
		"server/routes/robots.txt.ts": 2
	}[file];
	if (fileIndex === void 0) return;
	return [
		serverFileModule0,
		serverFileModule1,
		serverFileModule2
	][fileIndex];
}
//#endregion
//#region \0phial/generated-server-plugin
function createServerRoutesPlugin(options) {
	return (server) => {
		server.options.middleware.unshift(createServerRoutesMiddleware(options));
	};
}
function createServerRoutesMiddleware(options) {
	return async (request, next) => {
		const route = findServerRoute(options.routes, new URL(request.url).pathname);
		if (!route) return next(request);
		const handler = getRouteHandler(route, request.method);
		if (!handler) return new Response("Method Not Allowed", { status: 405 });
		const middleware = resolveMiddlewareChain(route, options.middlewareRegistry, options.globalMiddlewareNames);
		if (middleware.length === 0) return handleRoute(request, handler);
		return runMiddleware(middleware, request, (nextRequest) => handleRoute(nextRequest, handler));
	};
}
async function handleRoute(request, handler) {
	const result = await handler(request);
	if (result instanceof Response) return result;
	return Response.json(result);
}
function resolveMiddlewareChain(route, registry, globalMiddlewareNames = []) {
	return [
		...globalMiddlewareNames,
		...route.directoryMiddlewareNames ?? [],
		...route.definition.middlewareNames ?? []
	].map((name) => {
		const middleware = registry[name];
		if (!middleware) throw new Error(`Unknown server middleware "${name}" referenced by route "${route.id}".`);
		return middleware;
	});
}
function findServerRoute(routes, pathname) {
	const normalizedPathname = normalizePathname(pathname);
	return routes.find((route) => matchesServerRoutePath(route.path, normalizedPathname));
}
function matchesServerRoutePath(pattern, pathname) {
	const normalizedPattern = normalizePathname(pattern);
	if (normalizedPattern === pathname) return true;
	const patternSegments = splitPathSegments(normalizedPattern);
	const pathnameSegments = splitPathSegments(pathname);
	if (patternSegments.length !== pathnameSegments.length) return false;
	for (let index = 0; index < patternSegments.length; index += 1) {
		const patternSegment = patternSegments[index];
		const pathnameSegment = pathnameSegments[index];
		if (!patternSegment) return false;
		if (patternSegment.startsWith(":")) continue;
		if (patternSegment !== pathnameSegment) return false;
	}
	return true;
}
function getRouteHandler(route, method) {
	const resolvedMethod = method.toUpperCase();
	const definition = route.definition;
	switch (resolvedMethod) {
		case "GET": return definition.GET ?? definition.handler;
		case "POST": return definition.POST ?? definition.handler;
		case "PUT": return definition.PUT ?? definition.handler;
		case "PATCH": return definition.PATCH ?? definition.handler;
		case "DELETE": return definition.DELETE ?? definition.handler;
		case "HEAD": return definition.HEAD ?? definition.handler;
		case "OPTIONS": return definition.OPTIONS ?? definition.handler;
		default: return definition.handler;
	}
}
function normalizePathname(pathname) {
	if (!pathname) return "/";
	if (!pathname.startsWith("/")) return `/${pathname}`;
	if (pathname.length > 1 && pathname.endsWith("/")) return pathname.replace(/\/+$/, "");
	return pathname;
}
function splitPathSegments(pathname) {
	const normalized = normalizePathname(pathname);
	if (normalized === "/") return [];
	return normalized.replace(/^\/+|\/+$/g, "").split("/");
}
function createServerPlugin() {
	return createServerRoutesPlugin({
		routes: serverRoutes,
		middlewareRegistry: serverMiddlewareRegistry,
		globalMiddlewareNames: config.server?.middleware ?? []
	});
}
createServerPlugin();
//#endregion
//#region \0virtual:phial-server-entry
var generatedAppPluginId = "phial/generated-app-plugin";
var generatedServerPluginId = "phial/generated-server-plugin";
function createServerApp(options = {}) {
	const { manual = false, clientEntryPath, publicDir, fetch = createNotFoundResponse, middleware = [], plugins = [], adapter = new NodeRuntimeAdapter(), ...serverOptions } = options;
	return new Server({
		manual,
		adapter,
		...serverOptions,
		middleware: [...publicDir ? [serveStatic({ dir: publicDir })] : [], ...middleware],
		plugins: [
			createServerPlugin(),
			createAppPlugin({ clientEntryPath }),
			...plugins
		],
		fetch
	});
}
function createNotFoundResponse() {
	return new Response("Not Found", { status: 404 });
}
//#endregion
export { createServerApp, createServerApp as default, generatedAppPluginId, generatedServerPluginId };
