// The editable parts of the site, besides notes, the gallery (albums.ts) and projects (projects.ts). Each maps to one file in src/data/.
// To add a field, add it to the data file and here (and to src/pages/admin/config.yml.ts for the classic editor).
import type { Field } from './forms';

export type Section = {
  id: string;
  title: string;
  jp: string;
  intro: string;
  file: string;
  fields: Field[];
};

const DRAWING_HINT = 'Upload a photo, or pick one of the built-in drawings.';

export const SECTIONS: Section[] = [
  {
    id: 'site',
    title: 'Text & About',
    jp: '自己紹介',
    intro: 'The words around the site: the homepage lines, your contact details and the About page.',
    file: 'src/data/site.json',
    fields: [
      { kind: 'text', key: 'tagline', label: 'Tagline', hint: 'Over the homepage video.' },
      { kind: 'textarea', key: 'hello', label: 'Hello', hint: 'The first statement on the homepage.' },
      { kind: 'text', key: 'location', label: 'Location' },
      { kind: 'text', key: 'email', label: 'Email' },
      { kind: 'text', key: 'github', label: 'GitHub link' },
      {
        kind: 'object',
        key: 'about',
        label: 'About page',
        fields: [
          { kind: 'textarea', key: 'statement', label: 'Opening statement' },
          { kind: 'paragraphs', key: 'paragraphs', label: 'Paragraphs' },
          { kind: 'picture', label: 'Wide picture', folder: 'about', hint: DRAWING_HINT },
          {
            kind: 'list',
            key: 'what',
            label: 'What (how the site is made)',
            itemName: 'Line',
            summary: (w) => [w.label, w.text].filter(Boolean).join(': '),
            newItem: () => ({ label: '', text: '' }),
            fields: [
              { kind: 'text', key: 'label', label: 'Label', placeholder: 'Built with' },
              { kind: 'text', key: 'text', label: 'Text' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'now',
    title: 'Currently',
    jp: '近況',
    intro: 'The short “Currently” list on the About page.',
    file: 'src/data/now.json',
    fields: [
      {
        kind: 'list',
        key: 'now',
        label: 'Currently',
        itemName: 'Line',
        summary: (n) => [n.label, n.text].filter(Boolean).join(': '),
        newItem: () => ({ label: '', text: '' }),
        fields: [
          { kind: 'text', key: 'label', label: 'Label', placeholder: 'Reading' },
          { kind: 'text', key: 'text', label: 'Text' },
        ],
      },
    ],
  },
  {
    id: 'shop',
    title: 'Shop',
    jp: 'ショップ',
    intro: 'Items on the Shop page. Their buttons say “Coming soon” until the shop opens.',
    file: 'src/data/shop.json',
    fields: [
      {
        kind: 'list',
        key: 'shop',
        label: 'Items',
        itemName: 'Item',
        thumbs: true,
        summary: (x) => [x.name, x.price].filter(Boolean).join(' · '),
        newItem: () => ({ name: '', price: '', details: '', picture: 'sea', photo: '' }),
        fields: [
          { kind: 'text', key: 'name', label: 'Name' },
          { kind: 'text', key: 'price', label: 'Price', placeholder: '$20' },
          { kind: 'text', key: 'details', label: 'Details' },
          { kind: 'picture', folder: 'shop', hint: DRAWING_HINT },
        ],
      },
    ],
  },
  {
    id: 'resume',
    title: 'Resume',
    jp: '経歴',
    intro: 'Sections like Experience or Education, each with its own entries.',
    file: 'src/data/resume.json',
    fields: [
      {
        kind: 'list',
        key: 'resume',
        label: 'Sections',
        itemName: 'Section',
        summary: (r) => `${r.section || 'Untitled'} · ${(r.items || []).length} entries`,
        newItem: () => ({ section: '', items: [] }),
        fields: [
          { kind: 'text', key: 'section', label: 'Section name', placeholder: 'Experience' },
          {
            kind: 'list',
            key: 'items',
            label: 'Entries',
            itemName: 'Entry',
            summary: (it) => [it.title, it.years].filter(Boolean).join(' · '),
            newItem: () => ({ title: '', details: '', years: '' }),
            fields: [
              { kind: 'text', key: 'title', label: 'Title' },
              { kind: 'textarea', key: 'details', label: 'Details' },
              { kind: 'text', key: 'years', label: 'Years', placeholder: '2024–' },
            ],
          },
        ],
      },
    ],
  },
];
