# Paperclip — integrated pieces

Source: https://github.com/paperclipai/paperclip (MIT). Paperclip is a **standalone
full-stack app** (Node ≥24 + pnpm monorepo) for orchestrating teams of AI agents.
It is **not a library**, so only self-contained pieces were pulled in here.

## What was integrated & where

### 1. Skills → `.claude/skills/` (usable now in Claude Code)
Seven agent skills, copied to the project's `.claude/skills/` so Claude Code can invoke them:

| Skill | Purpose | Needs Paperclip backend? |
|---|---|---|
| `agentmail` | Read/send email from an assigned inbox | Yes (inbox assignment) |
| `slack` | Collaborate via an assigned Slack bot | Yes (Slack integration) |
| `paperclip` | Core Paperclip agent workflow | Yes |
| `paperclip-board` | Manage the Paperclip task board | Yes |
| `paperclip-create-agent` | Author new Paperclip agents (has rich `references/`) | Partially — templates are readable standalone |
| `paperclip-converting-plans-to-tasks` | Turn plans into board tasks | Yes |
| `para-memory-files` | PARA-style memory file management | No — general technique |

> These are valid Claude Code skills, but most assume the Paperclip runtime for full
> effect. `paperclip-create-agent/references/` and `para-memory-files` are useful on
> their own as patterns/templates.

### 2. Vendored source → `vendor/paperclip/` (reference / build separately)
These are TypeScript workspace packages with cross-dependencies; they **cannot run
inside this Next.js npm app**. Build them with pnpm + Node ≥24 if you want them live.

| Path | What it is | Standalone? |
|---|---|---|
| `packages/mcp-server` | MCP server exposing Paperclip tools (`@paperclipai/mcp-server`). Depends on `@paperclipai/shared`, `@modelcontextprotocol/sdk`, `zod`. | Buildable, but it's a **client to a running Paperclip server** — useless without one. |
| `packages/shared` | Shared types/utils used by the above | Library only |
| `packages/skills-catalog` | Catalog metadata for skills | Data package |
| `packages/teams-catalog` | Catalog metadata for teams | Data package |
| `ui/` | Paperclip's Vite + React web UI (components, storybook) | Reference for UI patterns; tied to Paperclip |

## Using the MCP server (optional)
It talks to a Paperclip instance over MCP (stdio). To try it:
```bash
cd vendor/paperclip/packages/mcp-server
# requires Node >=24 and the workspace's @paperclipai/shared built
pnpm install && pnpm build
# then register ./dist/stdio.js as an MCP server, pointed at your Paperclip server
```
Without a running Paperclip backend + credentials it has nothing to connect to.

## Note
For the full app (server, DB, dashboard), clone the repo standalone into its own
workspace and follow its Quickstart — don't try to run it from inside this project.
