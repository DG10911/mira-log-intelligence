# UI Resources

A Next.js + TypeScript + Tailwind v4 app scaffolded as a base for these UI libraries.

## 🚀 Interactive launcher

```bash
npm run ui
```

A terminal menu (built with @clack/prompts) that lets you:
- **Install UI components** — pick a library, browse its live registry, multi-select, install into `src/components/`
- **Browse design resources** — open/copy any of the bookmarked sites
- **Agents & Skills catalog** — browse the Claude Code agents/skills and copy the exact invocation

Data lives in `scripts/data/*.json` — edit to add your own registries or entries.

## ✅ Installed (open-source, in this project)

| Library | How it was added | Usage |
|---|---|---|
| **shadcn/ui** | `npx shadcn@latest add <name>` | Components in `src/components/ui/` (button, card, dialog, dropdown-menu, input, label, tabs, tooltip, badge, avatar, accordion, sheet, sonner, skeleton, separator) |
| **Magic UI** | `npx shadcn@latest add "https://magicui.design/r/<name>.json"` | marquee, shimmer-button, animated-beam, border-beam, text-animate |
| **Aceternity UI** | `npx shadcn@latest add "https://ui.aceternity.com/registry/<name>.json"` | 3d-card, background-beams, spotlight |
| **Anime.js** | `npm install animejs` | `import anime from "animejs"` — lightweight DOM/JS animation |
| **motion (Framer Motion)** | pulled in as a dep | `import { motion } from "motion/react"` |
| **shadercn** | `npx shadcn add "https://shadercn.run/r/<name>.json"` | shader/WebGPU effects (note: `orb` needs manual `typegpu` setup) |
| **23rd** | `npx shadcn add "https://23rd.dev/r/<name>.json"` | ascii-logo, live-orb, gooey pickers (pick the React, not `-svelte`, variants) |
| **uselayouts** | `npx shadcn add "https://uselayouts.com/r/<name>.json"` | bento-card, 3d-book + 60 more |
| **gooey shyt** | `npx shadcn add "https://gooey-shyt.vercel.app/r/<name>.json"` | gooey-button, goo surface menus |

### Add more components later
```bash
# shadcn — full list at https://ui.shadcn.com/docs/components
npx shadcn@latest add <component>

# Magic UI — browse https://magicui.design/docs/components
npx shadcn@latest add "https://magicui.design/r/<component>.json"

# Aceternity — browse https://ui.aceternity.com/components
npx shadcn@latest add "https://ui.aceternity.com/registry/<component>.json"
```

## 📋 Copy-paste / asset resources (no install — use on demand)
These aren't npm packages; grab individual snippets/assets as needed. All open-source or free.

- **Uiverse** (https://uiverse.io) — thousands of MIT CSS/HTML elements. Copy per element.
- **3Dicons** (https://3dicons.co) — free (CC0) 3D icons. Download PNG/Blend per icon into `public/`.
- **CSS Text Effects** (https://text-effects.colorion.co) — copy CSS.
- **Kinetics** (https://kinetics.colorion.co) — copy motion-effect code.
- **Component Gallery** (https://component.gallery) — reference examples, not a library.
- **Navbar Gallery** (https://navbar.gallery) — navbar references.

## 🔒 Proprietary / account-gated (not installed — respect their terms)
Use their official CLI/exporter or a paid plan; do not bulk-scrape.

- **Scrolltide** (https://scrolltide.co) — paid prompt library.
- **21st.dev** (https://21st.dev) — component registry; integrate via its MCP server.
- **Spline** (https://spline.design) — design 3D, export to React with `@splinetool/react-spline`.
- **Unicorn Studio** (https://unicorn.studio) — embed via their SDK.
- **Theatre.js** (https://theatrejs.com) — `npm i @theatre/core @theatre/studio` when needed.
- **Motion Primitives**, **UIAble**, **mapcn**, **MicroKit UI**, **Liquid Glass** — copy from their sites per component.

## Run
```bash
npm run dev   # http://localhost:3000
```
