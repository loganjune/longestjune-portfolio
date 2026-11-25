// Renders nothing. Pages whose own scripts use React (the editor) include this so Astro sets React up
// on that page; without it, the editor's React screens can't load while developing (`npm run dev`).
export default function ReactReady() {
  return null;
}
