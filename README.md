# longest june

The source of **[longestjune.com](https://longestjune.com)**, my personal site: a hub for my projects, photos and writing. It also has a web editor built from scratch, so I can publish from my phone without touching code.

This repo is a read-only copy for showing how the site is built. The live site deploys from a private repo that holds the same code.

## How I built this

I designed this site and built it with [Claude Code](https://claude.com/claude-code) as my pair programmer. I'd tell it what I wanted, how it should look and work, and which tools to use. Claude wrote most of the code, then I'd check every page on my laptop and phone and keep tweaking until it felt right.

Stuff I picked:
- The stack: Astro, React for the interactive bits, TypeScript, plain CSS. Content lives in Git, a Cloudflare Worker + database handles the contact form and backups, and it's hosted on Hostinger.
- The look: minimal, kind of like a Japanese design studio. Pale pink-sand background, warm brown text, big serif capitals, little Japanese labels on each page. No black backgrounds.
- Fonts: Marcellus for the big titles, STIX Two Text for reading (I tried EB Garamond first but wanted something a little more scientific and put together), Jost for labels and dates, Shippori Mincho for the Japanese.
- The dragon: 龍 (*lóng*) on the homepage is a pun on the "long" in longest june.
- The photos: they're mine. Some have little drawings on top, like the sunset on the Solstice one.
- The editor: I wanted to post from my phone without dealing with Git, so it saves drafts on its own and there's one Publish button. You can crop, straighten, add filters and frames, and add iPhone photos straight from the camera roll.

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
