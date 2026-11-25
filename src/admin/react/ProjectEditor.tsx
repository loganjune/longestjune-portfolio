// The editor's project screen: a case study. Details, main picture, extra images and the write-up.
import { useCallback, useEffect, useRef, useState } from 'react';
import PhotoGrid from './PhotoGrid';
import PictureField from './PictureField';
import { richText } from '../richtext';
import type { Ctx } from '../forms';
import type { Photo } from '../albums';
import type { Project } from '../projects';

type Props = { project: Project; ctx: Ctx; onChange: (p: Project) => void; registerWriteUp: (get: () => string) => void };

export default function ProjectEditor({ project: initial, ctx, onChange, registerWriteUp }: Props) {
  const [p, setP] = useState<Project>(initial);
  const latest = useRef(p);
  latest.current = p;

  const update = useCallback(
    (patch: Partial<Project>) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      setP(next);
      onChange(next);
    },
    [onChange],
  );
  const setImages = useCallback((images: Photo[]) => update({ images }), [update]);

  const writeUpHost = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!writeUpHost.current) return;
    const doc = richText(initial.body, ctx, 'projects', 'Write-up', 'What it is, why you made it, how it works, what you learned…');
    writeUpHost.current.replaceChildren(doc.element);
    registerWriteUp(doc.getMarkdown);
    return doc.destroy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const text = (key: 'year' | 'role' | 'tools' | 'link', label: string, placeholder: string, hint?: string) => (
    <label className="ed-field">
      <span className="lab">{label}</span>
      <input value={p[key]} placeholder={placeholder} onChange={(e) => update({ [key]: e.target.value } as Partial<Project>)} />
      {hint && <span className="ed-hint">{hint}</span>}
    </label>
  );

  return (
    <div className="ed-note">
      <input className="ed-title-input" value={p.title} placeholder="Project title" aria-label="Project title" onChange={(e) => update({ title: e.target.value })} />
      <div className="ed-note-meta album">
        <label className="ed-field">
          <span className="lab">Status</span>
          <select value={p.status} onChange={(e) => update({ status: e.target.value as Project['status'] })}>
            <option>Building</option>
            <option>Shipped</option>
            <option>Idea</option>
          </select>
        </label>
        {text('year', 'Year', '2026')}
        <label className="ed-check">
          <input type="checkbox" checked={p.draft} onChange={(e) => update({ draft: e.target.checked })} />
          <span>
            <span className="lab">Draft</span>
            <span className="ed-hint">Hidden from the live site</span>
          </span>
        </label>
      </div>
      <label className="ed-field">
        <span className="lab">Short description</span>
        <textarea rows={2} value={p.description} placeholder="One or two lines, shown in the project list and at the top of its page." onChange={(e) => update({ description: e.target.value })} />
      </label>
      <div className="ed-split-2">
        {text('role', 'Role', 'Design and development', 'Optional. What you did.')}
        {text('tools', 'Tools', 'Swift, SwiftUI', 'Optional. What it’s made with.')}
      </div>
      {text('link', 'Link', 'https://', 'Optional. Where people can see or try it.')}

      <section className="ed-field">
        <span className="lab">Main picture</span>
        <PictureField picture={p.picture} photo={p.photo} folder="projects" ctx={ctx} onChange={(v) => update(v)} />
      </section>

      <section className="ed-field">
        <span className="lab">Write-up</span>
        <span className="ed-hint">Optional. The case study itself, shown on the project’s page. Use headings to split it into sections.</span>
        <div ref={writeUpHost} />
      </section>

      <section className="ed-field">
        <span className="lab">More images</span>
        <PhotoGrid
          photos={p.images}
          onChange={setImages}
          ctx={ctx}
          folder="projects"
          make={(photo) => ({ photo, caption: '' })}
          emptyText="Optional. Screenshots or photos, shown after the write-up."
        />
      </section>
    </div>
  );
}
