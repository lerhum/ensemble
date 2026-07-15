#!/usr/bin/env node
// Runs, per workspace, only the vitest suites related to the staged files
// touching that workspace — in --run (non-watch) mode. Invoked by lefthook's
// pre-commit hook (see lefthook.yml) with the staged files as argv.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const WORKSPACES = [
  { prefix: "apps/web/", pkg: "@ensemble/web" },
  { prefix: "apps/api/", pkg: "@ensemble/api" },
  { prefix: "packages/db/", pkg: "@ensemble/db" },
];

const stagedFiles = process.argv.slice(2).filter(existsSync);

let hadFailure = false;

for (const { prefix, pkg } of WORKSPACES) {
  const files = stagedFiles.filter((file) => file.startsWith(prefix)).map((file) => resolve(file));
  if (files.length === 0) continue;

  console.log(`\n→ vitest related (${pkg}): ${files.length} file(s)`);
  const result = spawnSync(
    "pnpm",
    ["--filter", pkg, "exec", "vitest", "related", "--run", ...files],
    {
      stdio: "inherit",
    },
  );

  if (result.status !== 0) hadFailure = true;
}

process.exit(hadFailure ? 1 : 0);
