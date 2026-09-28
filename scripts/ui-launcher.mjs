#!/usr/bin/env node
import * as p from "@clack/prompts";
import c from "picocolors";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(readFileSync(join(__dir, "data", f), "utf8"));
const resources = load("resources.json");
const agents = load("agents.json");
const skills = load("skills.json");

const cancel = (v) => {
  if (p.isCancel(v)) { p.cancel("Closed."); process.exit(0); }
  return v;
};

function copy(text) {
  try { spawnSync("pbcopy", { input: text }); return true; } catch { return false; }
}
function openUrl(url) {
  try { spawnSync("open", [url], { stdio: "ignore" }); return true; } catch { return false; }
}

// Fetch a shadcn-style registry index -> array of component names
async function fetchNames(reg) {
  if (reg.mode === "name") return reg.fallback || [];
  if (!reg.index) return reg.fallback || [];
  try {
    const s = p.spinner();
    s.start(`Loading ${reg.label} registry…`);
    const res = await fetch(reg.index, { signal: AbortSignal.timeout(15000) });
    const json = await res.json();
    const items = json.items || json.registry || json;
    const arr = (Array.isArray(items) ? items : items.items || []).map((i) => i.name || i);
    s.stop(`${reg.label}: ${arr.length} components`);
    return arr.filter(Boolean);
  } catch {
    return reg.fallback || [];
  }
}

async function installFlow() {
  const reg = cancel(await p.select({
    message: "Which library?",
    options: resources.installable.map((r) => ({ value: r, label: r.label, hint: r.url })),
  }));

  let names = await fetchNames(reg);
  if (reg.mode === "name" && names.length === 0) {
    // curated shadcn list
    names = ["accordion","alert","alert-dialog","avatar","badge","button","calendar","card","carousel","checkbox","command","dialog","drawer","dropdown-menu","form","hover-card","input","label","menubar","navigation-menu","pagination","popover","progress","radio-group","scroll-area","select","separator","sheet","sidebar","skeleton","slider","sonner","switch","table","tabs","textarea","toggle","tooltip"];
  }
  if (names.length === 0) {
    p.note("No components found and no fallback. Add via a custom URL instead.", "Empty");
    return;
  }

  const picked = cancel(await p.multiselect({
    message: `Pick components from ${reg.label} (space to select)`,
    options: names.map((n) => ({ value: n, label: n })),
    required: true,
  }));

  const args = reg.mode === "name" ? picked : picked.map((n) => reg.item.replace("{name}", n));
  const cmd = ["shadcn@latest", "add", ...args, "--yes"];
  p.note(c.dim("npx " + cmd.join(" ")), "Running");
  const proceed = cancel(await p.confirm({ message: `Install ${picked.length} component(s)?` }));
  if (!proceed) return;

  const r = spawnSync("npx", ["--yes", ...cmd], { stdio: "inherit" });
  if (r.status === 0) p.log.success(c.green(`Installed into src/components/`));
  else p.log.error("Install failed — check output above.");
}

async function resourcesFlow() {
  const section = cancel(await p.select({
    message: "Browse which resources?",
    options: [
      { value: "libraries_copy_paste", label: "Copy-paste component libraries" },
      { value: "animation_3d", label: "Animation & 3D" },
      { value: "galleries_inspiration", label: "Galleries & inspiration" },
    ],
  }));
  const list = resources[section];
  const pick = cancel(await p.select({
    message: "Select a resource",
    options: list.map((x) => ({ value: x, label: x.name, hint: x.desc })),
  }));
  const action = cancel(await p.select({
    message: pick.name,
    options: [
      { value: "open", label: "Open in browser" },
      { value: "copy", label: "Copy URL" },
      { value: "back", label: "Back" },
    ],
  }));
  if (action === "open") { openUrl(pick.url); p.log.info(`Opened ${c.cyan(pick.url)}`); }
  if (action === "copy") { copy(pick.url); p.log.info(`Copied ${c.cyan(pick.url)}`); }
}

async function catalogFlow(data, kind) {
  p.note(data.note, kind);
  const group = cancel(await p.select({
    message: `${kind} — pick a group`,
    options: Object.keys(data.groups).map((g) => ({ value: g, label: g })),
  }));
  const item = cancel(await p.select({
    message: group,
    options: data.groups[group].map((x) => ({ value: x, label: x.id, hint: x.desc })),
  }));
  const invocation = kind === "Agents"
    ? `Agent tool → subagent_type: "${item.id}"`
    : `Skill tool → skill: "${item.id}"   (or /${item.id})`;
  p.note(invocation, `How to use "${item.id}"`);
  const cp = cancel(await p.confirm({ message: "Copy invocation to clipboard?" }));
  if (cp) copy(invocation);
}

async function main() {
  console.clear();
  p.intro(c.bgMagenta(c.black(" UI Toolkit Launcher ")));
  p.log.message(c.dim("Next.js + Tailwind + shadcn base • pick, install & integrate"));

  while (true) {
    const choice = cancel(await p.select({
      message: "What do you want to do?",
      options: [
        { value: "install",   label: "🎨 Install UI components", hint: "shadcn, Magic UI, Aceternity, shadercn, 23rd, uselayouts, gooey" },
        { value: "resources", label: "🔗 Browse design resources", hint: "libraries, 3D, galleries" },
        { value: "agents",    label: "🤖 Agents catalog",          hint: "Claude Code sub-agents" },
        { value: "skills",    label: "🧩 Skills catalog",          hint: "Claude Code skills" },
        { value: "exit",      label: "🚪 Exit" },
      ],
    }));
    if (choice === "exit") break;
    if (choice === "install") await installFlow();
    if (choice === "resources") await resourcesFlow();
    if (choice === "agents") await catalogFlow(agents, "Agents");
    if (choice === "skills") await catalogFlow(skills, "Skills");
  }
  p.outro(c.magenta("Happy building. Run `npm run ui` anytime."));
}

main().catch((e) => { console.error(e); process.exit(1); });
