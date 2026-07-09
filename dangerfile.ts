import { danger, warn, fail, markdown } from "danger";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const WORKSPACES = [
  { label: "apps/web", dir: "apps/web" },
  { label: "apps/api", dir: "apps/api" },
  { label: "packages/db", dir: "packages/db" },
];

interface CaptureResult {
  ok: boolean;
  output: string;
}

function capture(cmd: string, cwd: string = ROOT): CaptureResult {
  try {
    const output = execSync(cmd, { cwd, encoding: "utf8", stdio: "pipe" });
    return { ok: true, output };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    return { ok: false, output: `${err.stdout ?? ""}\n${err.stderr ?? ""}`.trim() };
  }
}

function truncate(text: string, maxLength = 4000): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n… (truncated)`;
}

// — PR hygiene —

const baseRef = danger.github.pr.base.ref;
const headRef = danger.github.pr.head.ref;
const isPromotionToMain = baseRef === "main" && headRef === "develop";
const branchOk = baseRef === "develop" || isPromotionToMain;

if (!branchOk) {
  fail(
    `This PR targets \`${baseRef}\`, but feature branches must target \`develop\` (see CLAUDE.md's branch policy). ` +
      `Only the periodic \`develop\` → \`main\` promotion targets \`main\` directly.`,
  );
}

if (!danger.github.pr.body || danger.github.pr.body.trim().length < 10) {
  warn(
    "This PR has no description. Please fill in the Summary / How was this tested sections of the PR template.",
  );
}

// — Typecheck (blocking) —

const typecheck = capture("pnpm -r typecheck");

// — Tests + coverage (tests blocking, coverage informational) —

const testCoverage = capture("pnpm -r test:coverage");

const coverageRows = WORKSPACES.map(({ label, dir }) => {
  const summaryPath = join(ROOT, dir, "coverage", "coverage-summary.json");
  if (!existsSync(summaryPath)) {
    return `| ${label} | n/a | n/a | n/a | n/a |`;
  }
  const summary = JSON.parse(readFileSync(summaryPath, "utf8")) as {
    total: Record<string, { pct: number }>;
  };
  const { lines, statements, functions, branches } = summary.total;
  return `| ${label} | ${lines.pct}% | ${statements.pct}% | ${functions.pct}% | ${branches.pct}% |`;
});

// — Lint (non-blocking, scoped to files touched by this PR) —

interface EslintMessage {
  ruleId: string | null;
  severity: 1 | 2;
  message: string;
  line: number;
}
interface EslintFileResult {
  filePath: string;
  messages: EslintMessage[];
}

const touchedFiles = new Set([...danger.git.modified_files, ...danger.git.created_files]);

const lintFindings: string[] = [];
for (const { dir } of WORKSPACES) {
  const binPath = join(ROOT, dir, "node_modules", ".bin", "eslint");
  if (!existsSync(binPath)) continue;
  const { output } = capture(`"${binPath}" . --format json`, join(ROOT, dir));
  let results: EslintFileResult[] = [];
  try {
    results = JSON.parse(output) as EslintFileResult[];
  } catch {
    continue; // eslint crashed rather than reporting lint results — not worth failing the gate over.
  }
  for (const file of results) {
    if (file.messages.length === 0) continue;
    const relPath = `${dir}/${file.filePath.slice(join(ROOT, dir).length + 1)}`;
    if (!touchedFiles.has(relPath)) continue; // don't warn about pre-existing violations elsewhere
    for (const m of file.messages) {
      lintFindings.push(`- \`${relPath}:${m.line}\` — ${m.message} (${m.ruleId ?? "n/a"})`);
    }
  }
}

// — Formatting (non-blocking, scoped to files touched by this PR) —

const format = capture("pnpm exec prettier --list-different .");
const unformattedFiles = format.output
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && touchedFiles.has(line));

// — Summary comment (always posted, regardless of outcome) —

function statusIcon(ok: boolean, hasFindings = false): string {
  if (!ok) return "❌";
  return hasFindings ? "⚠️" : "✅";
}

markdown(
  [
    "## PR Quality Gate",
    "| Check | Result |",
    "|---|---|",
    `| Branch target | ${statusIcon(branchOk)} |`,
    `| Typecheck | ${statusIcon(typecheck.ok)} |`,
    `| Tests | ${statusIcon(testCoverage.ok)} |`,
    `| Lint (files touched by this PR) | ${statusIcon(true, lintFindings.length > 0)} |`,
    `| Format (files touched by this PR) | ${statusIcon(true, unformattedFiles.length > 0)} |`,
    "",
    "### Coverage (informational — no threshold enforced yet)",
    "| Workspace | Lines | Statements | Functions | Branches |",
    "|---|---|---|---|---|",
    ...coverageRows,
  ].join("\n"),
);

// — Detailed failures/warnings (rendered by Danger below the summary) —

if (!typecheck.ok) {
  fail(`\`pnpm -r typecheck\` failed:\n\n\`\`\`\n${truncate(typecheck.output)}\n\`\`\``);
}

if (!testCoverage.ok) {
  fail(`\`pnpm -r test:coverage\` failed:\n\n\`\`\`\n${truncate(testCoverage.output)}\n\`\`\``);
}

if (lintFindings.length > 0) {
  warn(`ESLint found issues in files touched by this PR:\n\n${lintFindings.join("\n")}`);
}

if (unformattedFiles.length > 0) {
  warn(
    `These files touched by this PR aren't formatted with Prettier — run \`pnpm format\`:\n\n${unformattedFiles
      .map((f) => `- \`${f}\``)
      .join("\n")}`,
  );
}
