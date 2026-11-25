import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Each note is a Markdown file in src/content/notes/. The file name becomes its URL:
// src/content/notes/first-swim.md  ->  /notes/first-swim
const notes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    /** Optional photo (or built-in drawing name) for the note's card on the Stories page. */
    cover: z.string().optional(),
    /** Topics for filtering on the Stories page, e.g. ["Build", "Process"]. */
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// Each gallery album is a Markdown file in src/content/albums/. The file name becomes its URL:
// src/content/albums/lisbon.md  ->  /gallery/lisbon
// The details and photo list sit at the top; the optional travel story is the text below.
const albums = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/albums' }),
  schema: z.object({
    title: z.string(),
    location: z.string().optional(),
    date: z.coerce.date().optional(),
    description: z.string().optional(),
    cover: z.string().optional(),
    /** Topics for filtering on the Gallery and Stories pages, e.g. ["Travel", "Japan"]. */
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    photos: z.array(z.object({ photo: z.string(), caption: z.string().default('') })).default([]),
  }),
});

// Each project is a Markdown file in src/content/projects/ (a case study). The file name becomes its URL:
// src/content/projects/solstice.md  ->  /projects/solstice
// Details at the top; the write-up below. Their order is "order" in src/data/projects.json.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    status: z.enum(['Building', 'Shipped', 'Idea']).default('Building'),
    year: z.coerce.string().default(''),
    description: z.string().default(''),
    role: z.string().optional(),
    tools: z.string().optional(),
    link: z.string().optional(),
    picture: z.string().default('sea'),
    photo: z.string().optional(),
    images: z.array(z.object({ photo: z.string(), caption: z.string().default('') })).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { notes, albums, projects };
