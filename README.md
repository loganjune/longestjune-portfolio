# longest june

The source of **[longestjune.com](https://longestjune.com)**, my personal site: a hub for my projects, photos and writing. It also has a web editor built from scratch, so I can publish from my phone without touching code.

This repo is a read-only copy for showing how the site is built. The live site deploys from a private repo that holds the same code.

## How I built this

I designed and directed the site, and built it with [Claude Code](https://claude.com/claude-code) as my pair programmer. I decided what to build, how it should look and work, and checked every page on desktop and phone. Claude wrote most of the code to that brief, and we iterated in small steps until each piece was right.

The parts I shaped most:
- **The stack.** I chose the tools: Astro for a fast static site, React for the interactive pieces, TypeScript, plain CSS, Git as the place content lives, a Cloudflare Worker and database for the contact form, messages and backups, and Hostinger for hosting.
- **The design.** A minimal, Japanese-studio feel: a pale sand ground, warm brown ink, giant serif capitals and small Japanese labels. I picked the type: Marcellus for the display capitals, STIX Two Text for reading (chosen over EB Garamond for a more precise, scientific feel), Jost for labels and dates, and Shippori Mincho for the Japanese. Graphics are drawn over my own photos, and 龍 (*lóng*, dragon) on the hero is a pun on the "long" in "longest june".
- **The editor's workflow.** I wanted to post from my phone without ever seeing Git. So edits save themselves as drafts, and one Publish button puts them live. Photos are prepared on the device before they upload.
- **The photo tools.** I edit my own pictures, so the editor has cropping, straightening, filters and frames, plus HEIC support for iPhone photos.
- **Hosting and data.** Every change is a Git commit, so anything can be undone, and editors sign in with GitHub, with no passwords stored.

## What's in it

**The site** (`src/pages`, `src/components`, `src/lib`, `src/styles`)
- [Astro](https://astro.build) static site with plain CSS. React 19 is used only for small interactive islands, such as filters, the photo viewer and the homepage sunrise/sunset clock.
- Content lives in Git: Markdown for stories, projects and albums, and JSON for everything else, loaded through Astro content collections.
- Generated SVG drawings (`src/lib/scene.ts`) and SVG overlays drawn in each photo's own pixel coordinates (`src/lib/overlays.ts`), so they stay lined up at every screen size.
- Sunrise and sunset maths for the homepage, written without a library (`src/lib/sun.ts`).
- Hand-built type and layout: a fixed palette, fitted display type and a minimal studio-style grid.

**The editor** (`src/admin`, served at `/admin`)
- Vanilla TypeScript, plus React screens for the photo-heavy parts.
- **Sign-in:** GitHub, through a GitHub App and a small OAuth helper on Cloudflare Workers. The token is kept in sessionStorage only.
- **Storage:** it talks to the GitHub Git Data API directly. Edits autosave as commits on a drafts branch.
- **Publish:** merges any outside changes, then lands one squashed commit on `main`, which triggers the deploy.
- **Rich text:** TipTap, which still writes plain Markdown files.
- **Photo pipeline, all in the browser:**
  - HEIC conversion and resizing to WebP
  - crop, rotate and straighten
  - 17 filters and adjustment sliders, done in pixel maths on canvas
  - frames
- **Photo grids:** drag-to-reorder with keyboard support (`src/admin/sortable.ts`), and drag-and-drop between the gallery and albums.

**The API** (`worker/`)
- A Cloudflare Worker with a D1 (SQLite) database. It handles the contact form, with Turnstile and a honeypot against spam and email alerts via Resend.
- It also serves a messages inbox for editors and makes an hourly backup of published content into the database.
- Editor-only endpoints check that the caller's GitHub token can push to the repo, so no passwords are stored. Secrets are set with `wrangler secret put` and never committed.

## Run it locally

Requires Node.js 22 or newer.

```
npm install
npm run dev
```

Then open http://localhost:4321/. `npm run build` writes the static site to `dist/`.

The editor and contact form need their own services (GitHub App, sign-in helper, worker). See [docs/admin-setup.md](docs/admin-setup.md) for how they're set up.

## Notes

- Some projects, notes and shop items are placeholder content while the site is being filled in.
- The photos and drawings are my own. Please don't reuse them.

Contact: longestjune@gmail.com · [github.com/loganjune](https://github.com/loganjune)
