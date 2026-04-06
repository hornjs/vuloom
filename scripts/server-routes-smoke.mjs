#!/usr/bin/env node

import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const START_PORT = 3102;
const DEV_PORT = 3103;
const START_URL = `http://localhost:${START_PORT}`;
const DEV_URL = `http://localhost:${DEV_PORT}`;
const STARTUP_TIMEOUT_MS = 30_000;

async function main() {
  try {
    await verifyGeneratedMiddlewareTypes();
    await verifyExampleProjectTypes();
    await verifyProductionServerRoutes();
    await verifyDevServerRoutes();
    await verifyPathConflictDetection();
    await verifyAmbiguousServerRouteDetection();
    console.log("Server routes smoke passed.");
  } catch (error) {
    console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    process.exitCode = 1;
  }
}

async function verifyGeneratedMiddlewareTypes() {
  await runCommand("pnpm", ["exec", "tsx", "src/bin.ts", "prepare", "examples/zero-config"]);

  const typesFile = resolve(PACKAGE_ROOT, "examples/zero-config/.phial/types/middleware.d.ts");
  const source = await readFile(typesFile, "utf8");
  const routeTypesFile = resolve(PACKAGE_ROOT, "examples/zero-config/.phial/types/routes.d.ts");
  const routeSource = await readFile(routeTypesFile, "utf8");

  for (const expected of ['"blog-trace": true', '"post-trace": true', '"request-meta": true']) {
    if (!source.includes(expected)) {
      throw new Error(`Expected generated middleware types to contain ${expected}.`);
    }
  }

  for (const expected of [
    "declare module 'phial' {",
    "interface AppDataRegistry {",
    '"/": {}',
    '"/blog/:slug": {',
    '"slug": string',
    '"blog/[slug]/page": { path: "/blog/:slug"; targetPath: `/blog/${string}`; params: {',
    '"layout": { path: "/"; targetPath: "/"; params: {} }',
    "interface RouteLoaderDataRegistry {",
    "interface RouteActionDataRegistry {",
    '"page": ResolveRouteDataValue<ResolveRouteHandler<',
    '"layout": ResolveRouteDataValue<ResolveRouteHandler<',
  ]) {
    if (!routeSource.includes(expected)) {
      throw new Error(`Expected generated route types to contain ${expected}.`);
    }
  }
}

async function verifyExampleProjectTypes() {
  const typecheckConfigFile = resolve(
    PACKAGE_ROOT,
    "examples/zero-config/.phial/tsconfig.typecheck.json",
  );

  await runCommand("pnpm", ["exec", "vue-tsc", "--noEmit", "-p", typecheckConfigFile]);
}

async function verifyProductionServerRoutes() {
  await runCommand("pnpm", ["exec", "tsx", "src/bin.ts", "build", "examples/zero-config"]);

  const server = startServer({
    args: [
      "pnpm",
      "exec",
      "tsx",
      "src/bin.ts",
      "start",
      "examples/zero-config",
      "--port",
      String(START_PORT),
    ],
    url: START_URL,
  });

  try {
    await server.ready;
    await assertServerRoutes(START_URL);
  } finally {
    await server.close();
  }
}

async function verifyDevServerRoutes() {
  const server = startServer({
    args: [
      "pnpm",
      "exec",
      "tsx",
      "src/bin.ts",
      "dev",
      "examples/zero-config",
      "--port",
      String(DEV_PORT),
    ],
    url: DEV_URL,
  });

  try {
    await server.ready;
    await assertServerRoutes(DEV_URL);
  } finally {
    await server.close();
  }
}

async function assertServerRoutes(baseUrl) {
  const getResponse = await fetchJson(`${baseUrl}/api/ping?message=hello`);
  assertDeepEqual(
    getResponse,
    {
      ok: true,
      method: "GET",
      query: "hello",
      trace: ["global:/api/ping:GET", "directory:/api/ping:GET", "route:/api/ping:GET"],
    },
    `Unexpected GET /api/ping payload from ${baseUrl}`,
  );

  const postResponse = await fetchJson(`${baseUrl}/api/ping`, {
    method: "POST",
    body: "payload=posted",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
  });
  assertDeepEqual(
    postResponse,
    {
      ok: true,
      method: "POST",
      body: "payload=posted",
      trace: ["global:/api/ping:POST", "directory:/api/ping:POST", "route:/api/ping:POST"],
    },
    `Unexpected POST /api/ping payload from ${baseUrl}`,
  );

  const robotsResponse = await fetch(`${baseUrl}/robots.txt`);
  const robotsText = await robotsResponse.text();
  if (!robotsResponse.ok || robotsText !== "User-agent: *\nAllow: /\n") {
    throw new Error(
      `Unexpected /robots.txt response from ${baseUrl}: ${robotsResponse.status} ${JSON.stringify(robotsText)}`,
    );
  }

  const pageResponse = await fetch(`${baseUrl}/blog/hello-world`);
  const pageText = await pageResponse.text();
  const contentType = pageResponse.headers.get("content-type") ?? "";

  if (
    !pageResponse.ok ||
    !contentType.includes("text/html") ||
    !pageText.includes("Middleware trace: directory:hello-world") ||
    !pageText.includes("route:hello-world")
  ) {
    throw new Error(`Unexpected page response from ${baseUrl}/blog/hello-world`);
  }

  const homeResponse = await fetch(`${baseUrl}/`);
  const homeText = await homeResponse.text();

  if (!homeResponse.ok || !homeText.includes('href="/blog/hello-world"')) {
    throw new Error(
      `Expected ${baseUrl}/ to render the object navigation target for the dynamic route link.`,
    );
  }
}

async function verifyPathConflictDetection() {
  const root = await createTempProject("phial-path-conflict-");

  try {
    await writeProjectFiles(root, {
      "app/pages/users/[slug]/page.ts": "export default {}\n",
      "server/routes/users/[id].ts": [
        "export default {",
        "  GET() {",
        "    return { ok: true }",
        "  }",
        "}",
        "",
      ].join("\n"),
    });

    const result = await runCommand(
      "pnpm",
      [
        "exec",
        "tsx",
        "src/bin.ts",
        "prepare",
        root,
      ],
      {
        rejectOnFailure: false,
      },
    );

    if (result.code === 0 || !combinedOutput(result).includes("conflicts with app page path")) {
      throw new Error(
        "Expected path conflict detection to fail when app/pages and server/routes overlap.",
      );
    }
  } finally {
    await rm(root, {
      recursive: true,
      force: true,
    });
  }
}

async function verifyAmbiguousServerRouteDetection() {
  const root = await createTempProject("phial-ambiguous-server-route-");

  try {
    await writeProjectFiles(root, {
      "server/routes/users/[id].ts": createTempServerRouteSource(),
      "server/routes/users/[slug].ts": createTempServerRouteSource(),
    });

    const result = await runCommand(
      "pnpm",
      [
        "exec",
        "tsx",
        "src/bin.ts",
        "prepare",
        root,
      ],
      {
        rejectOnFailure: false,
      },
    );

    if (result.code === 0 || !combinedOutput(result).includes("Ambiguous server routes")) {
      throw new Error(
        "Expected ambiguous server route detection to fail for identical path signatures.",
      );
    }
  } finally {
    await rm(root, {
      recursive: true,
      force: true,
    });
  }
}

function createTempServerRouteSource() {
  return ["export default {", "  GET() {", "    return { ok: true }", "  }", "}", ""].join("\n");
}

async function createTempProject(prefix) {
  return mkdtemp(resolve(tmpdir(), prefix));
}

async function writeProjectFiles(root, files) {
  for (const [relativePath, source] of Object.entries(files)) {
    const file = resolve(root, relativePath);
    await mkdir(dirname(file), {
      recursive: true,
    });
    await writeFile(file, source, "utf8");
  }
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const source = await response.text();

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${source}`);
  }

  return JSON.parse(source);
}

function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`${message}\nExpected: ${expectedJson}\nReceived: ${actualJson}`);
  }
}

function startServer(options) {
  const child = spawn(options.args[0], options.args.slice(1), {
    cwd: PACKAGE_ROOT,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let resolved = false;
  let startupTimeout;

  const ready = new Promise((resolveReady, rejectReady) => {
    startupTimeout = setTimeout(() => {
      if (!resolved) {
        rejectReady(new Error(`Timed out waiting for server on ${options.url}`));
      }
    }, STARTUP_TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      process.stdout.write(`[server] ${chunk}`);
      if (!resolved && chunk.includes(options.readyText)) {
        resolved = true;
        clearTimeout(startupTimeout);
        resolveReady();
      }
    });

    child.stderr.on("data", (chunk) => {
      process.stderr.write(`[server:err] ${chunk}`);
    });

    child.once("exit", (code) => {
      if (!resolved) {
        clearTimeout(startupTimeout);
        rejectReady(new Error(`Server exited early with code ${code ?? "null"}`));
      }
    });

    waitForServerUrl(options.url, child)
      .then(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(startupTimeout);
          resolveReady();
        }
      })
      .catch((error) => {
        if (!resolved) {
          clearTimeout(startupTimeout);
          rejectReady(error);
        }
      });
  });

  return {
    ready,
    async close() {
      if (child.exitCode !== null) {
        return;
      }

      child.kill("SIGINT");
      await once(child, "exit");
    },
  };
}

async function waitForServerUrl(url, child) {
  while (child.exitCode === null) {
    try {
      const response = await fetch(url);
      await response.body?.cancel();
      return;
    } catch {
      await sleep(100);
    }
  }

  throw new Error(`Server exited before becoming reachable at ${url}`);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? PACKAGE_ROOT,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const [code] = await once(child, "exit");
  const result = {
    code: code ?? 0,
    stdout,
    stderr,
  };

  if ((options.rejectOnFailure ?? true) && result.code !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${combinedOutput(result)}`);
  }

  return result;
}

function combinedOutput(result) {
  return [result.stdout, result.stderr].filter(Boolean).join("\n");
}

await main();
