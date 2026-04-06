import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";

const execFileAsync = promisify(execFile);
const DEFAULT_INPUT_DIR = "output/obsidian";
const OBSIDIAN_CLI_PREFS = path.join(os.homedir(), "Library/Application Support/obsidian-cli/preferences.json");
const OBSIDIAN_APP_PREFS = path.join(os.homedir(), "Library/Application Support/obsidian/obsidian.json");

function parseArgs(argv) {
  const args = {
    dir: DEFAULT_INPUT_DIR,
    file: "",
    vault: "",
    prefix: "WeRead",
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") args.help = true;
    if (token === "--dir") args.dir = argv[index + 1];
    if (token === "--file") args.file = argv[index + 1];
    if (token === "--vault") args.vault = argv[index + 1];
    if (token === "--prefix") args.prefix = argv[index + 1];
  }

  if (!args.file && !args.dir) {
    throw new Error("Provide --file or --dir");
  }

  return args;
}

async function collectMarkdownFiles(inputDir) {
  try {
    const entries = await fs.readdir(inputDir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const fullPath = path.join(inputDir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await collectMarkdownFiles(fullPath)));
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }

    return files.sort();
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error(`Markdown directory not found: ${inputDir}. Run weread:export-obsidian first or pass --file.`);
    }
    throw error;
  }
}

function detectInputRoot(filePath) {
  const normalized = path.resolve(filePath);
  const marker = `${path.sep}output${path.sep}obsidian${path.sep}`;
  const index = normalized.indexOf(marker);
  if (index >= 0) {
    return normalized.slice(0, index + marker.length - 1);
  }
  return path.dirname(normalized);
}

function printHelp() {
  console.log(`
Publish exported WeRead Markdown into an Obsidian vault via obsidian-cli.

Usage:
  npm run weread:publish-obsidian -- --dir output/obsidian
  npm run weread:publish-obsidian -- --file output/obsidian/books/my-book.md
  npm run weread:publish-obsidian -- --dir output/obsidian --vault claw_notes --prefix WeRead
`);
}

function noteNameFromPath(filePath, inputRoot, prefix) {
  const relative = path.relative(inputRoot, filePath).replace(/\\/g, "/");
  const withoutExt = relative.replace(/\.md$/i, "");
  return prefix ? `${prefix}/${withoutExt}` : withoutExt;
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function resolveVaultPath(vaultName) {
  const cliPrefs = await readJsonIfExists(OBSIDIAN_CLI_PREFS);
  const appPrefs = await readJsonIfExists(OBSIDIAN_APP_PREFS);
  const desiredName = vaultName || cliPrefs?.default_vault_name || "";

  const vaultEntries = Object.values(appPrefs?.vaults || {});
  const exactMatch = vaultEntries.find((entry) => entry && path.basename(entry.path || "") === desiredName);
  if (exactMatch?.path) return exactMatch.path;

  if (!vaultName && vaultEntries.length === 1 && vaultEntries[0]?.path) {
    return vaultEntries[0].path;
  }

  const fallback = vaultEntries.find((entry) => entry?.open)?.path || vaultEntries[0]?.path;
  return fallback || "";
}

async function writeNoteDirectly(noteName, content, vaultPath) {
  if (!vaultPath) {
    throw new Error("Could not resolve Obsidian vault path for direct-write fallback");
  }

  const filePath = path.join(vaultPath, `${noteName}.md`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

async function publishOne(filePath, inputRoot, { vault, prefix }) {
  const content = await fs.readFile(filePath, "utf8");
  const noteName = noteNameFromPath(filePath, inputRoot, prefix);
  const args = ["create", "--content", content, "--overwrite"];

  if (vault) {
    args.push("--vault", vault);
  }

  args.push(noteName);

  try {
    const { stdout } = await execFileAsync("obsidian-cli", args, {
      maxBuffer: 1024 * 1024 * 8,
    });

    return {
      noteName,
      source: filePath,
      mode: "obsidian-cli",
      stdout: (stdout || "").trim(),
    };
  } catch (error) {
    const vaultPath = await resolveVaultPath(vault);
    const directPath = await writeNoteDirectly(noteName, content, vaultPath);

    return {
      noteName,
      source: filePath,
      mode: "direct-write",
      vaultPath: directPath,
      stdout: error?.stdout?.trim?.() || "",
      stderr: error?.stderr?.trim?.() || "",
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const inputFiles = args.file ? [path.resolve(args.file)] : await collectMarkdownFiles(path.resolve(args.dir));

  if (!inputFiles.length) {
    throw new Error("No Markdown files found to publish");
  }

  const inputRoot = args.file ? detectInputRoot(args.file) : path.resolve(args.dir);
  const results = [];

  for (const filePath of inputFiles) {
    results.push(await publishOne(filePath, inputRoot, args));
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        count: results.length,
        results: results.map((item) => ({
          noteName: item.noteName,
          source: item.source,
          mode: item.mode,
          vaultPath: item.vaultPath || null,
        })),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
