import { basename, extname } from "node:path/posix";
import { build, type RouteTree } from "fs-route-ir";
import type { AppRouteEntryKind, ScannedAppRoutesInput } from "./types";

const ROUTE_ENTRY_BASENAMES = new Set([
  "layout",
  "page",
  "loading",
  "error",
  "loader",
  "action",
  "middleware",
]);

export function buildAppRouteTree(
  input: ScannedAppRoutesInput | undefined,
): RouteTree<unknown, AppRouteEntryKind> {
  const files = [...new Set((input?.entries ?? []).map((entry) => entry.file).sort())];

  if (files.length === 0) {
    return {
      profile: "directory-based",
      nodes: [],
    };
  }

  return build(files, {
    profile: "directory-based",
    root: "",
    defineEntry({ file }) {
      const extension = extname(file);
      const baseName = basename(file, extension);

      if (ROUTE_ENTRY_BASENAMES.has(baseName)) {
        return {
          kind: baseName as AppRouteEntryKind,
        };
      }

      return null;
    },
  }).tree;
}
