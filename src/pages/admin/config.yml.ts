// Builds /admin/config.yml, the settings file for the web editor (Sveltia CMS).
// JSON is valid YAML, so the editor reads this as-is.
// To add a field to the editor, add it here and to the matching file in src/data/.
import services from '../../data/services.json';
import { SCENES } from '../../lib/scene';

const drawing = {
  name: 'picture',
  label: 'Drawing',
  widget: 'select',
  options: SCENES,
  default: 'sea',
  hint: 'A built-in drawing. Shown when no photo is uploaded.',
};
const photo = {
  name: 'photo',
  label: 'Photo',
  widget: 'image',
  required: false,
  hint: 'Optional. Upload a photo to use instead of the drawing.',
};
const text = (name: string, label: string, extra: Record<string, unknown> = {}) => ({ name, label, widget: 'string', ...extra });
const longText = (name: string, label: string, extra: Record<string, unknown> = {}) => ({ name, label, widget: 'text', ...extra });

/** One editor page for a src/data/*.json file whose content sits under a single key. */
const dataFile = (name: string, label: string, field: Record<string, unknown>, ...more: Record<string, unknown>[]) => ({
  name,
  label,
  file: `src/data/${name}.json`,
  format: 'json',
  fields: [field, ...more],
});

// One source for the domain: `site` in astro.config.mjs.
const SITE = (import.meta.env.SITE || 'https://longestjune.com').replace(/\/$/, '');

const config = {
  backend: {
    name: 'github',
    repo: 'loganjune/longestjun-web',
    branch: 'main',
    ...(services.authUrl ? { base_url: services.authUrl } : {}),
    commit_messages: {
      create: 'Add {{collection}} “{{slug}}” (web editor)',
      update: 'Update {{collection}} “{{slug}}” (web editor)',
      delete: 'Delete {{collection}} “{{slug}}” (web editor)',
      uploadMedia: 'Upload “{{path}}” (web editor)',
      deleteMedia: 'Delete “{{path}}” (web editor)',
    },
  },
  site_url: SITE,
  display_url: SITE,
  // Uploaded photos land in public/images and are shown on the site as /images/…
  media_folder: 'public/images',
  public_folder: '/images',
  // Photos are converted to WebP and shrunk in the browser before upload, which keeps the repo small.
  media_libraries: {
    all: {
      transformations: {
        raster_image: { format: 'webp', quality: 85, width: 2400, height: 2400 },
      },
    },
  },
  collections: [
    {
      name: 'notes',
      label: 'Notes',
      label_singular: 'Note',
      folder: 'src/content/notes',
      extension: 'md',
      format: 'frontmatter',
      create: true,
      slug: '{{slug}}',
      identifier_field: 'title',
      summary: '{{title}} · {{date}}',
      sortable_fields: ['date', 'title'],
      media_folder: '/public/images/notes',
      public_folder: '/images/notes',
      fields: [
        text('title', 'Title'),
        {
          name: 'date',
          label: 'Date',
          widget: 'datetime',
          format: 'YYYY-MM-DD',
          date_format: 'YYYY-MM-DD',
          time_format: false,
        },
        text('description', 'Short description', { required: false, hint: 'Optional. Shown under the title in lists.' }),
        { name: 'cover', label: 'Cover', widget: 'image', required: false, hint: 'Optional. Shown on the Stories page and at the top of the note.' },
        { name: 'tags', label: 'Tags', widget: 'list', required: false, hint: 'Filters on the Stories page, e.g. Build, Travel.' },
        {
          name: 'draft',
          label: 'Draft',
          widget: 'boolean',
          default: false,
          required: false,
          hint: 'Drafts are saved but stay off the live site.',
        },
        { name: 'body', label: 'Note', widget: 'markdown' },
      ],
    },
    {
      name: 'projects',
      label: 'Projects',
      label_singular: 'Project',
      folder: 'src/content/projects',
      extension: 'md',
      format: 'frontmatter',
      create: true,
      slug: '{{slug}}',
      identifier_field: 'title',
      summary: '{{title}} · {{status}} · {{year}}',
      media_folder: '/public/images/projects',
      public_folder: '/images/projects',
      fields: [
        text('title', 'Title'),
        { name: 'status', label: 'Status', widget: 'select', options: ['Building', 'Shipped', 'Idea'], default: 'Building' },
        text('year', 'Year'),
        longText('description', 'Description'),
        text('role', 'Role', { required: false }),
        text('tools', 'Tools', { required: false }),
        text('link', 'Link', { required: false }),
        drawing,
        photo,
        { name: 'images', label: 'More images', widget: 'list', required: false, fields: [{ ...photo, name: 'photo', required: true }, text('caption', 'Caption', { required: false })] },
        { name: 'draft', label: 'Draft', widget: 'boolean', default: false, required: false },
        { name: 'body', label: 'Write-up', widget: 'markdown', required: false },
      ],
    },
    {
      name: 'content',
      label: 'Site content',
      files: [
        {
          name: 'site',
          label: 'Site text & About',
          file: 'src/data/site.json',
          format: 'json',
          fields: [
            text('tagline', 'Tagline', { hint: 'Over the homepage video.' }),
            longText('hello', 'Hello', { hint: 'The first statement on the homepage.' }),
            text('location', 'Location'),
            text('email', 'Email'),
            text('github', 'GitHub link'),
            {
              name: 'about',
              label: 'About page',
              widget: 'object',
              fields: [
                longText('statement', 'Opening statement'),
                { name: 'paragraphs', label: 'Paragraphs', widget: 'list', field: longText('paragraph', 'Paragraph') },
                drawing,
                photo,
                {
                  name: 'what',
                  label: 'What (how the site is made)',
                  widget: 'list',
                  required: false,
                  summary: '{{fields.label}}: {{fields.text}}',
                  fields: [text('label', 'Label'), text('text', 'Text')],
                },
              ],
            },
          ],
        },
        dataFile('gallery', 'Gallery', {
          name: 'gallery',
          label: 'Gallery',
          label_singular: 'Photo',
          widget: 'list',
          summary: '{{fields.caption}}',
          fields: [text('caption', 'Caption'), photo, drawing],
        }, {
          name: 'drawings',
          label: 'Drawings',
          label_singular: 'Drawing',
          widget: 'list',
          required: false,
          summary: '{{fields.caption}}',
          fields: [text('caption', 'Caption'), photo, drawing],
        }, {
          // Kept so saving here doesn't wipe the album order set in the main editor.
          name: 'albums',
          label: 'Album order (file names)',
          widget: 'list',
          required: false,
          hint: 'Set this in the main editor by dragging albums.',
        }, text('featured', 'Featured album (file name)', { required: false, hint: 'Set this in the main editor with the ★ on an album.' })),
        dataFile('now', 'Currently (About page)', {
          name: 'now',
          label: 'Currently',
          label_singular: 'Item',
          widget: 'list',
          summary: '{{fields.label}}: {{fields.text}}',
          fields: [text('label', 'Label', { hint: 'e.g. Building, Reading' }), text('text', 'Text')],
        }),
        dataFile('shop', 'Shop', {
          name: 'shop',
          label: 'Shop items',
          label_singular: 'Item',
          widget: 'list',
          summary: '{{fields.name}} · {{fields.price}}',
          fields: [text('name', 'Name'), text('price', 'Price', { hint: 'e.g. $28' }), text('details', 'Details'), drawing, photo],
        }),
        dataFile('resume', 'Resume', {
          name: 'resume',
          label: 'Resume sections',
          label_singular: 'Section',
          widget: 'list',
          summary: '{{fields.section}}',
          fields: [
            text('section', 'Section', { hint: 'e.g. Experience, Education' }),
            {
              name: 'items',
              label: 'Entries',
              label_singular: 'Entry',
              widget: 'list',
              summary: '{{fields.title}} · {{fields.years}}',
              fields: [text('title', 'Title'), longText('details', 'Details'), text('years', 'Years', { required: false })],
            },
          ],
        }),
      ],
    },
  ],
};

export function GET() {
  return new Response(JSON.stringify(config, null, 2) + '\n', {
    headers: { 'Content-Type': 'text/yaml; charset=utf-8' },
  });
}
