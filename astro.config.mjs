// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// The site is published at https://longestjune.com (served from the domain root, so no `base`).
// React is used only for a few interactive pieces (src/components/react/); Astro sends it to the
// browser only on pages that use one of them.
export default defineConfig({
  site: 'https://longestjune.com',
  integrations: [react()],
});
