// The Projects screen and the project editor (case studies). The screens are React components
// (src/admin/react/); this file loads and saves their data.
//
// Files:
// - src/data/projects.json: the order of projects ("order"). The first three are featured on the homepage.
// - src/content/projects/<id>.md: one project. Details and images in the header; the write-up below.
import type { GitHub, Change } from './github';
import { parseFrontmatter, serializeFrontmatter } from './frontmatter';
import { button, busy, toast, confirmBox } from './ui';
import { saveBar } from './forms';
import { text as str, readItems, mount, itemSaveBar } from './items';
import type { View } from './app';
import type { Photo } from './albums';
import ProjectsEditor from './react/ProjectsEditor';
import ProjectEditor from './react/ProjectEditor';

const DIR = 'src/content/projects';
const ORDER = 'src/data/projects.json';

export type Project = {
  id: string;
  title: string;
  status: 'Building' | 'Shipped' | 'Idea';
  year: string;
  role: string;
  tools: string;
  link: string;
  description: string;
  picture: string;
  photo: string;
  draft: boolean;
  images: Photo[];
  body: string;
};

function parseProject(id: string, text: string): Project {
  const { data, body } = parseFrontmatter(text);
  const status = ['Building', 'Shipped', 'Idea'].includes(str(data.status)) ? (str(data.status) as Project['status']) : 'Building';
  const images = Array.isArray(data.images) ? data.images.map((p: any) => ({ photo: str(p?.photo), caption: str(p?.caption) })) : [];
  return {
    id,
    title: str(data.title),
    status,
    year: str(data.year),
    role: str(data.role),
    tools: str(data.tools),
    link: str(data.link),
    description: str(data.description),
    picture: str(data.picture) || 'sea',
    photo: str(data.photo),
    draft: data.draft === true,
    images,
    body,
  };
}

const loadProjects = (gh: GitHub) => readItems(gh, DIR, parseProject);

async function readOrder(gh: GitHub): Promise<string[]> {
  return JSON.parse((await gh.readText(ORDER)) || '{"order":[]}').order || [];
}
const orderFile = (order: string[]): Change => ({ path: ORDER, text: JSON.stringify({ order }, null, 2) + '\n' });

// ---------- Projects screen ----------

export async function projectsView(gh: GitHub, onSaved: () => void): Promise<View> {
  const projects = await loadProjects(gh);
  const ids = new Set(projects.map((p) => p.id));
  const known = (await readOrder(gh)).filter((id) => ids.has(id));
  const order = [...known, ...projects.map((p) => p.id).filter((id) => !known.includes(id)).sort()];

  let latest = order;
  const bar = saveBar('All changes saved', async (photos) => {
    await gh.commit([orderFile(latest), ...photos], 'Reorder projects');
    onSaved();
  });
  const { host, unmount } = mount(ProjectsEditor, {
    projects,
    order,
    onChange: (next: string[]) => {
      latest = next;
      bar.ctx.onChange();
    },
  });
  return {
    title: 'Projects',
    jp: '制作',
    intro: 'Each project has its own case-study page. The first three are featured on the homepage. Drag to reorder.',
    body: host,
    footer: bar.footer,
    isDirty: bar.isDirty,
    flush: bar.flush,
    destroy: unmount,
  };
}

// ---------- Project editor ----------

export async function projectView(gh: GitHub, id: string | null, go: (hash: string) => void, onSaved: () => void): Promise<View> {
  const isNew = id === null;
  const path = isNew ? '' : `${DIR}/${id}.md`;
  let project: Project = {
    id: id || '',
    title: '',
    status: 'Building',
    year: String(new Date().getFullYear()),
    role: '',
    tools: '',
    link: '',
    description: '',
    picture: 'sea',
    photo: '',
    draft: false,
    images: [],
    body: '',
  };
  if (!isNew) {
    const text = await gh.readText(path);
    if (text === null) throw new Error('That project doesn’t exist any more.');
    project = parseProject(id, text);
  }

  let latest = project;
  let getWriteUp = () => project.body;

  const del = isNew
    ? null
    : button(
        'Delete project',
        async () => {
          if (!(await confirmBox('Delete this project?', `“${latest.title || id}” and its page will be removed when you publish.`, 'Delete', true))) return;
          await busy(del!, 'Deleting…', async () => {
            await gh.commit([{ path, remove: true }, orderFile((await readOrder(gh)).filter((x) => x !== id))], `Delete project “${latest.title || id}”`);
            toast('Project deleted from drafts.');
            onSaved();
            go('#/projects');
          });
        },
        'ed-btn danger quiet',
      );

  const bar = itemSaveBar({
    gh,
    dir: DIR,
    route: 'projects',
    noun: 'project',
    id,
    path,
    title: () => latest.title,
    extra: del,
    onSaved,
    write: async ({ path, id: newId, title, fresh, photos }) => {
      const p = latest;
      const text = serializeFrontmatter(
        {
          title,
          status: p.status,
          year: p.year.trim(),
          description: p.description.trim(),
          role: p.role.trim(),
          tools: p.tools.trim(),
          link: p.link.trim(),
          picture: p.picture,
          photo: p.photo,
          draft: p.draft,
          images: p.images.filter((x) => x.photo).map((x) => ({ photo: x.photo, caption: x.caption.trim() })),
        },
        getWriteUp(),
      );
      const changes: Change[] = [{ path, text }, ...photos];
      if (fresh) changes.push(orderFile([...(await readOrder(gh)), newId]));
      await gh.commit(changes, `${fresh ? 'Add' : 'Update'} project “${title}”`);
    },
  });

  const { host, unmount } = mount(ProjectEditor, {
    project,
    ctx: bar.ctx,
    onChange: (next: Project) => {
      latest = next;
      bar.ctx.onChange();
    },
    registerWriteUp: (get: () => string) => (getWriteUp = get),
  });

  return {
    title: isNew ? 'New project' : 'Edit project',
    jp: '制作',
    back: { href: '#/projects', label: 'All projects' },
    isDirty: bar.isDirty,
    flush: bar.flush,
    destroy: unmount,
    body: host,
    footer: bar.footer,
  };
}
