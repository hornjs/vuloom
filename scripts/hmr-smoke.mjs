#!/usr/bin/env node

import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const PACKAGE_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEV_PORT = 3100;
const DEV_URL = `http://localhost:${DEV_PORT}`;
const STARTUP_TIMEOUT_MS = 30_000;
const UPDATE_TIMEOUT_MS = 15_000;

async function main() {
  const server = startDevServer();
  let browser;

  try {
    await server.ready;

    browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage();
    page.on("pageerror", (error) => {
      console.error(`[pageerror] ${error.stack ?? error.message}`);
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        console.error(`[console:${message.type()}] ${message.text()}`);
      }
    });

    await page.addInitScript(() => {
      window.__phialHmrProbeLoads = (window.__phialHmrProbeLoads || 0) + 1;
    });

    await page.goto(DEV_URL, {
      waitUntil: "domcontentloaded",
    });
    await waitForHomePage(page);

    await runProbe(page, {
      name: "route page",
      file: "examples/zero-config/app/pages/index/page.ts",
      patch(source) {
        return source.replace(
          'h("h1", null, "Vue h() example")',
          'h("h1", null, "Vue h() example (HMR smoke)")',
        );
      },
      waitFor: () =>
        page.waitForFunction(
          () => {
            return document.querySelector("h1")?.textContent === "Vue h() example (HMR smoke)";
          },
          {
            timeout: UPDATE_TIMEOUT_MS,
          },
        ),
    });

    await runProbe(page, {
      name: "app shell",
      file: "examples/zero-config/app/app.vue",
      patch(source) {
        return source.replace(
          '<body :data-theme="theme" :style="bodyStyle" data-allow-mismatch="children">',
          '<body :data-theme="theme" :style="bodyStyle" data-allow-mismatch="children" data-hmr-shell="active">',
        );
      },
      waitFor: () =>
        page.waitForFunction(
          () => {
            return document.body.getAttribute("data-hmr-shell") === "active";
          },
          {
            timeout: UPDATE_TIMEOUT_MS,
          },
        ),
    });

    console.log("HMR smoke passed.");
  } finally {
    await browser?.close();
    await server.close();
  }
}

async function runProbe(page, options) {
  const file = resolve(PACKAGE_ROOT, options.file);
  const original = await readFile(file, "utf8");
  const next = options.patch(original);

  if (next === original) {
    throw new Error(`Probe "${options.name}" did not change ${options.file}`);
  }

  const baselineLoadCount = await readLoadCount(page);

  try {
    await writeFile(file, next);
    await options.waitFor();

    const nextLoadCount = await readLoadCount(page);
    if (nextLoadCount !== baselineLoadCount) {
      throw new Error(
        `Probe "${options.name}" triggered a full reload (${baselineLoadCount} -> ${nextLoadCount})`,
      );
    }

    console.log(`HMR probe passed: ${options.name}`);
  } finally {
    await writeFile(file, original);
    await page.reload({
      waitUntil: "domcontentloaded",
    });
    await waitForHomePage(page);
  }
}

async function waitForHomePage(page) {
  await page.waitForFunction(
    () => {
      return (
        document.querySelector("h1")?.textContent?.includes("Vue h() example") &&
        document.body.getAttribute("data-theme") === "sepia"
      );
    },
    {
      timeout: UPDATE_TIMEOUT_MS,
    },
  );
}

async function readLoadCount(page) {
  return page.evaluate(() => window.__phialHmrProbeLoads ?? 0);
}

function startDevServer() {
  const child = spawn(
    "pnpm",
    ["exec", "tsx", "src/bin.ts", "dev", "examples/zero-config", "--port", String(DEV_PORT)],
    {
      cwd: PACKAGE_ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let resolved = false;
  let startupTimeout;

  const ready = new Promise((resolveReady, rejectReady) => {
    startupTimeout = setTimeout(() => {
      if (!resolved) {
        rejectReady(new Error(`Timed out waiting for dev server on ${DEV_URL}`));
      }
    }, STARTUP_TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      process.stdout.write(`[dev] ${chunk}`);
      if (!resolved && chunk.includes(`phial dev server: ${DEV_URL}`)) {
        resolved = true;
        clearTimeout(startupTimeout);
        resolveReady();
      }
    });

    child.stderr.on("data", (chunk) => {
      process.stderr.write(`[dev:err] ${chunk}`);
    });

    child.once("exit", (code) => {
      if (!resolved) {
        clearTimeout(startupTimeout);
        rejectReady(new Error(`Dev server exited early with code ${code ?? "null"}`));
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

await main();
