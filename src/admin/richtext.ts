// The word-processor style editor, used for notes and album stories. It shows formatting as
// you type and saves plain Markdown, so the site reads the files exactly as before.
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Markdown } from '@tiptap/markdown';
import { el, icon, iconButton, toast, askBox } from './ui';
import { addPhoto, type Ctx } from './forms';
import { showImage, PHOTO_ACCEPT } from './images';

// Photos in the text are shown through showImage, so photos only saved in drafts still appear.
const PhotoImage = Image.extend({
  addNodeView() {
    return ({ node }) => {
      const img = document.createElement('img');
      img.alt = node.attrs.alt || '';
      showImage(img, node.attrs.src);
      return { dom: img };
    };
  },
});

/**
 * Creates the editor. `folder` is where photos added to the text are stored (public/images/<folder>).
 * Returns the element to show, a way to read the text as Markdown, and a clean-up function.
 */
export function richText(
  markdown: string,
  ctx: Ctx,
  folder: string,
  label: string,
  placeholder = 'Start writing…',
  /** Optional: offer a choice of photos (e.g. the album's own) instead of going straight to an upload. */
  pickPhoto?: () => Promise<{ src: string; alt: string } | null>,
) {
  const mount = el('div', { cls: 'ed-doc note-body' });
  const editor = new Editor({
    element: mount,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, underline: false, link: { openOnClick: false, autolink: true } }),
      PhotoImage.configure({ inline: false }),
      Markdown,
    ],
    content: markdown,
    contentType: 'markdown',
    editorProps: { attributes: { 'aria-label': label, class: 'ed-prose', 'data-placeholder': placeholder } },
    onUpdate: ctx.onChange,
  });

  const photoInput = el('input', { type: 'file', accept: PHOTO_ACCEPT, cls: 'ed-file' });
  photoInput.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    photoInput.value = '';
    if (!file) return;
    try {
      const src = await addPhoto(file, folder, ctx);
      const alt = (await askBox('Describe the photo', 'A few words for people who can’t see it (optional)')) || '';
      editor.chain().focus().setImage({ src, alt }).run();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  });

  const tool = (name: string, title: string, run: () => void, isActive?: () => boolean) => {
    const b = iconButton(name, title, () => {
      run();
      editor.commands.focus();
    }, { cls: 'ed-tool' });
    if (isActive) {
      const sync = () => b.setAttribute('aria-pressed', String(isActive()));
      editor.on('transaction', sync);
      sync();
    }
    return b;
  };
  const c = () => editor.chain().focus();
  const toolbar = el(
    'div',
    { cls: 'ed-toolbar', role: 'toolbar', 'aria-label': 'Formatting' },
    tool('bold', 'Bold', () => c().toggleBold().run(), () => editor.isActive('bold')),
    tool('italic', 'Italic', () => c().toggleItalic().run(), () => editor.isActive('italic')),
    tool('h2', 'Heading', () => c().toggleHeading({ level: 2 }).run(), () => editor.isActive('heading', { level: 2 })),
    tool('h3', 'Small heading', () => c().toggleHeading({ level: 3 }).run(), () => editor.isActive('heading', { level: 3 })),
    tool('ul', 'Bulleted list', () => c().toggleBulletList().run(), () => editor.isActive('bulletList')),
    tool('ol', 'Numbered list', () => c().toggleOrderedList().run(), () => editor.isActive('orderedList')),
    tool('quote', 'Quote', () => c().toggleBlockquote().run(), () => editor.isActive('blockquote')),
    tool(
      'link',
      'Link',
      async () => {
        const prev = editor.getAttributes('link').href || '';
        const href = await askBox('Link', 'Web address (leave empty to remove the link)', prev, 'https://');
        if (href === null) return;
        if (!href) c().extendMarkRange('link').unsetLink().run();
        else c().extendMarkRange('link').setLink({ href: /^(https?:|mailto:|\/|#)/.test(href) ? href : `https://${href}` }).run();
      },
      () => editor.isActive('link'),
    ),
    pickPhoto
      ? tool('photo', 'Add a photo', async () => {
          const chosen = await pickPhoto();
          if (chosen) editor.chain().focus().setImage(chosen).run();
        })
      : el('label', { cls: 'ed-icon ed-tool', title: 'Add a photo', 'aria-label': 'Add a photo' }, icon('photo'), photoInput),
    el('span', { cls: 'ed-toolbar-gap' }),
    tool('undo', 'Undo', () => c().undo().run()),
    tool('redo', 'Redo', () => c().redo().run()),
  );

  return {
    element: el('div', { cls: 'ed-docwrap' }, toolbar, mount),
    getMarkdown: () => editor.getMarkdown(),
    destroy: () => editor.destroy(),
  };
}
