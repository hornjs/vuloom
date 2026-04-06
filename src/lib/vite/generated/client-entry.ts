const DEFAULT_ID_PREFIX = "/@id/";

export interface ClientEntryModuleOptions {
  idPrefix?: string;
}

export function createClientEntryModule(options: ClientEntryModuleOptions = {}): string {
  const idPrefix = options.idPrefix ?? DEFAULT_ID_PREFIX;

  return [
    `import integration from "${idPrefix}phial/generated-app-runtime"`,
    "",
    "integration.hydrate().mount()",
    "",
    "let hotReloadScheduled = false",
    "",
    "function reloadPage(reason) {",
    "  if (hotReloadScheduled) {",
    "    return",
    "  }",
    "",
    "  hotReloadScheduled = true",
    "  console.info(`[phial] ${reason}. Reloading the page to apply route changes.`)",
    "  window.location.reload()",
    "}",
    "",
    "if (import.meta.hot) {",
    "  import.meta.hot.accept([",
    `    "${idPrefix}phial/generated-app-runtime",`,
    `    "${idPrefix}phial/generated-app-plugin",`,
    `    "${idPrefix}phial/generated-server-plugin"`,
    "  ], () => {",
    '    reloadPage("App runtime or server plugin update detected")',
    "  })",
    "}",
  ].join("\n");
}
