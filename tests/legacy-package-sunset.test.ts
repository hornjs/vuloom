import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("legacy package sunset", () => {
  it("removes legacy workspace runtime packages", async () => {
    await expect(exists(resolve(repoRoot, "packages/routing"))).resolves.toBe(false);
    await expect(exists(resolve(repoRoot, "packages/routing/package.json"))).resolves.toBe(false);
    await expect(exists(resolve(repoRoot, "packages/srvx"))).resolves.toBe(false);
    await expect(exists(resolve(repoRoot, "packages/srvx/package.json"))).resolves.toBe(false);
    await expect(exists(resolve(repoRoot, "packages/vue"))).resolves.toBe(false);
    await expect(exists(resolve(repoRoot, "packages/vue/package.json"))).resolves.toBe(false);
  });
});
