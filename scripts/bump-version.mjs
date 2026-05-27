import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function formatSemver({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

async function main() {
  const repoRoot = process.cwd();
  const packageJsonPath = path.join(repoRoot, "package.json");

  const raw = await fs.readFile(packageJsonPath, "utf8");
  const pkg = JSON.parse(raw);

  if (typeof pkg.version !== "string") {
    throw new Error("package.json version is missing or not a string");
  }

  const current = parseSemver(pkg.version);
  if (!current) {
    throw new Error(
      `package.json version must be strict semver (x.y.z). Got: ${pkg.version}`,
    );
  }

  const next = { ...current, patch: current.patch + 1 };
  pkg.version = formatSemver(next);

  await fs.writeFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

  process.stdout.write(`Bumped version: ${formatSemver(current)} -> ${pkg.version}\n`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});

