import { Server, createContextKey, runMiddleware } from "sevok";
import { NodeRuntimeAdapter } from "sevok/node";
import { serveStatic } from "sevok/static";
import { createRouteRuntimeIntegration } from "vuepagelet/integration";
import { computed, createTextVNode, createVNode, defineComponent, h, mergeProps, unref, useSSRContext, withCtx } from "vue";
import { RouterLink, RouterLink as RouterLink$1, useActionData, useAppData, useAppData as useAppData$1, useLoaderData, useNavigation, useRoute, useRoute as useRoute$1, useRouteLoaderData, useSubmit } from "vuepagelet";
import { ssrInterpolate, ssrRenderAttr, ssrRenderAttrs, ssrRenderComponent, ssrRenderSlot, ssrRenderStyle } from "vue/server-renderer";
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
//#region examples/zero-config/app/pages/layout.ts
var layout_exports = /* @__PURE__ */ __exportAll({ default: () => layout_default });
var layout_default = defineComponent({
	name: "ExampleRootLayout",
	setup() {
		const appData = useAppData();
		return {
			requestedAt: computed(() => appData.value?.requestedAt ?? ""),
			theme: computed(() => appData.value?.theme ?? "sepia")
		};
	},
	render() {
		return h("div", { style: "font-family: ui-sans-serif, system-ui; margin: 0 auto; max-width: 720px; padding: 48px 24px; line-height: 1.6;" }, [h("header", { style: "display: flex; gap: 16px; align-items: center; margin-bottom: 32px; flex-wrap: wrap;" }, [
			h("strong", null, "phial"),
			h(RouterLink, { to: "/" }, { default: () => "h()" }),
			h(RouterLink, { to: "/jsx" }, { default: () => "JSX" }),
			h(RouterLink, { to: "/sfc" }, { default: () => "SFC" }),
			h(RouterLink, { to: "/blog/hello-world" }, { default: () => "Dynamic Route" }),
			h("span", { style: "margin-left: auto; font-size: 13px; color: #6e665d;" }, `theme=${this.theme} · shell=${this.requestedAt}`)
		]), h("main", null, this.$slots.default?.())]);
	}
});
//#endregion
//#region examples/zero-config/app/pages/loading.ts
var loading_exports$1 = /* @__PURE__ */ __exportAll({ default: () => loading_default$1 });
var loading_default$1 = defineComponent({
	name: "ExampleRootLoading",
	props: { route: {
		type: Object,
		required: true
	} },
	setup(props) {
		return { description: computed(() => `Navigating to ${props.route.path ?? "/"}`) };
	},
	render() {
		return h("section", { style: "margin-top: 24px; padding: 18px; border: 1px dashed #c9bda9; border-radius: 14px; background: #f7f1e8; color: #6a5843;" }, [h("strong", null, "Root layout loading..."), h("p", { style: "margin: 10px 0 0;" }, this.description)]);
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
		return {
			data,
			layoutData,
			actionData,
			layoutActionData,
			navigation,
			submit,
			renderedAt,
			submittedAt,
			feedbackTone,
			handleSubmit
		};
	},
	render() {
		return h("section", null, [
			h("h1", null, "Vue h() example"),
			h("p", null, "This homepage is implemented with a render function and also demonstrates loader/action data."),
			h("p", null, ["Current page loader: ", h("strong", null, this.data ? "available" : "none")]),
			h("p", null, this.layoutData?.message ?? ""),
			h("p", null, `App middleware active: ${this.layoutData?.fromAppMiddleware ? "yes" : "no"}`),
			h("p", null, `Request path seen by middleware: ${this.layoutData?.requestPath ?? "/"}`),
			h("p", null, `SSR time: ${this.renderedAt}`),
			h("ul", null, [
				h("li", null, "Visit /jsx for the Vue JSX example."),
				h("li", null, "Visit /sfc for the Vue single-file component example."),
				h("li", null, "Visit /blog/hello-world for the dynamic route example.")
			]),
			h("form", {
				method: "post",
				onSubmit: this.handleSubmit,
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
					disabled: this.navigation.isSubmitting.value,
					style: "padding: 10px 14px; border: 0; border-radius: 999px; background: #1b1b18; color: #f7f4ef; font: inherit; cursor: pointer;"
				}, this.navigation.isSubmitting.value ? "Submitting..." : "Submit action"), h("span", { style: "font-size: 14px; color: #6e665d;" }, `Action state: ${this.navigation.isSubmitting.value ? "submitting" : this.layoutActionData ? "success" : "idle"}`)]),
				h("p", { style: "margin: 0; color: #6e665d;" }, `Current page action data: ${this.actionData ? "available" : "none"}`),
				this.layoutActionData ? h("p", { style: `margin: 0; color: ${this.feedbackTone};` }, this.layoutActionData.message) : null,
				this.layoutActionData?.submittedAt ? h("p", { style: "margin: 0; font-size: 14px; color: #6e665d;" }, `Submitted at: ${this.submittedAt}`) : null
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
		return {
			route: useRoute(),
			data: useLoaderData()
		};
	},
	render() {
		return h("section", null, [
			h("h1", null, this.data?.slug ?? "Unknown post"),
			h("p", null, this.data?.summary ?? ""),
			h("p", null, `Middleware trace: ${this.data?.middlewareTrace ?? "missing"}`),
			h("p", null, `Current route path: ${this.route?.fullPath ?? ""}`)
		]);
	}
});
//#endregion
//#region examples/zero-config/app/pages/blog/[slug]/loading.ts
var loading_exports = /* @__PURE__ */ __exportAll({ default: () => loading_default });
var loading_default = defineComponent({
	name: "ExampleBlogLoading",
	props: { route: {
		type: Object,
		required: true
	} },
	setup(props) {
		return { props };
	},
	render() {
		return h("article", { style: "display: grid; gap: 12px; margin-top: 12px; padding: 18px; border-radius: 14px; background: #f5f5f2; border: 1px solid #dad8d1;" }, [h("h1", { style: "margin: 0;" }, "Loading blog article..."), h("p", { style: "margin: 0; color: #6c6c66;" }, `Preparing ${this.props.route.path ?? "blog article"}`)]);
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
//#region ../../../../../../__vue-jsx-ssr-register-helper
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
		const appData = useAppData$1();
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
		const appData = useAppData$1();
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
		const appData = useAppData$1();
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
	return async (context, next) => {
		const request = context.request;
		const integration = await getIntegration();
		if (!integration.match(new URL(request.url).pathname)) return next(context);
		try {
			return await integration.handleRequest(request);
		} catch (error) {
			console.error("[app route error]", error);
			throw error;
		}
	};
}
function createAppPlugin(options = {}) {
	let integrationPromise;
	return createAppRouteMiddleware(() => {
		if (!integrationPromise) integrationPromise = Promise.resolve(createIntegration(options));
		return integrationPromise;
	});
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
var serverTrace = async (ctx, next) => {
	const url = new URL(ctx.request.url);
	const nextTrace = [...ctx.get(serverTraceKey), `global:${url.pathname}:${ctx.request.method}`];
	ctx.set(serverTraceKey, nextTrace);
	return next(ctx);
};
//#endregion
//#region examples/zero-config/server/middleware/server-trace-route.ts
var server_trace_route_exports = /* @__PURE__ */ __exportAll({ default: () => serverTraceRoute });
var serverTraceRoute = async (ctx, next) => {
	const url = new URL(ctx.request.url);
	const nextTrace = [...ctx.get(serverTraceKey), `route:${url.pathname}:${ctx.request.method}`];
	ctx.set(serverTraceKey, nextTrace);
	return next(ctx);
};
//#endregion
//#region examples/zero-config/server/middleware/server-trace-scope.ts
var server_trace_scope_exports = /* @__PURE__ */ __exportAll({ default: () => serverTraceScope });
var serverTraceScope = async (ctx, next) => {
	const url = new URL(ctx.request.url);
	const nextTrace = [...ctx.get(serverTraceKey), `directory:${url.pathname}:${ctx.request.method}`];
	ctx.set(serverTraceKey, nextTrace);
	return next(ctx);
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
	GET(ctx) {
		const { searchParams } = new URL(ctx.request.url);
		const trace = ctx.get(serverTraceKey);
		return Response.json({
			ok: true,
			method: "GET",
			query: searchParams.get("message") ?? null,
			trace
		});
	},
	async POST(ctx) {
		const trace = ctx.get(serverTraceKey);
		const body = await ctx.request.text();
		return Response.json({
			ok: true,
			method: "POST",
			body: body || null,
			trace
		});
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
function createServerRoutesMiddleware(options) {
	return async (context, next) => {
		const request = context.request;
		const route = findServerRoute(options.routes, new URL(request.url).pathname);
		if (!route) return next(context);
		const handler = getRouteHandler(route, request.method);
		if (!handler) return new Response("Method Not Allowed", { status: 405 });
		const middleware = resolveMiddlewareChain(route, options.middlewareRegistry, options.globalMiddlewareNames);
		if (middleware.length === 0) return handleRoute(context, handler);
		return runMiddleware({
			context,
			middleware,
			terminal: (nextContext) => handleRoute(nextContext, handler)
		});
	};
}
async function handleRoute(context, handler) {
	const result = await handler(context);
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
	return createServerRoutesMiddleware({
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
	const { manual = false, clientEntryPath, publicDir, fetch = createNotFoundResponse, middleware = [], adapter = new NodeRuntimeAdapter(), ...serverOptions } = options;
	return new Server({
		manual,
		adapter,
		...serverOptions,
		middleware: [
			...publicDir ? [serveStatic({ dir: publicDir })] : [],
			createServerPlugin(),
			createAppPlugin({ clientEntryPath }),
			...middleware
		],
		fetch
	});
}
function createNotFoundResponse() {
	return new Response("Not Found", { status: 404 });
}
//#endregion
export { createServerApp, createServerApp as default, generatedAppPluginId, generatedServerPluginId };
