import { getCollection, type CollectionEntry } from 'astro:content';
import projectOrder from '../data/projects.json';

export type Project = CollectionEntry<'projects'>;

/**
 * Projects in the order set in the editor (src/data/projects.json "order"); any not listed come last.
 * Drafts show while you run `npm run dev` but never on the live site.
 */
export async function getProjects(): Promise<Project[]> {
  const all = await getCollection('projects', ({ data }) => (import.meta.env.PROD ? !data.draft : true));
  const order: string[] = projectOrder.order ?? [];
  const rank = (id: string) => (order.includes(id) ? order.indexOf(id) : Infinity);
  return all.sort((a, b) => rank(a.id) - rank(b.id) || a.data.title.localeCompare(b.data.title));
}

/** An uploaded photo wins over the built-in drawing. */
export const projectPicture = (p: Project) => p.data.photo?.trim() || p.data.picture || 'sea';
