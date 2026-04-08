import { basename, extname } from "node:path/posix";
import { build, type RouteTree } from "fs-route-ir";
import { rethrowServerRouteBuildError } from "./errors";
import type { ScannedServerRoutesInput, ServerRouteEntryKind } from "./types";

export function buildServerRouteTree(
  input: ScannedServerRoutesInput | undefined,
): RouteTree<unknown, ServerRouteEntryKind> {
  const files = [...new Set((input?.entries ?? []).map((entry) => entry.file).sort())];

  if (files.length === 0) {
    return {
      profile: "file-based",
      nodes: [],
    };
  }

  try {
    return build(files, {
      profile: "file-based",
      root: "",
      defineEntry({ file }) {
        const extension = extname(file);
        const baseName = basename(file, extension);

        if (baseName === "_middleware") {
          return {
            kind: "middleware",
            scope: "directory",
          };
        }

        return {
          kind: "route",
        };
      },
      isRouteFile(file) {
        return basename(file, extname(file)) !== "_middleware";
      },
    }).tree;
  } catch (error) {
    rethrowServerRouteBuildError(error);
  }
}
