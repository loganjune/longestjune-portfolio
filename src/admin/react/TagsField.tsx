// Tags for a story or album: chips you can remove, a box to type new ones (Enter or comma adds),
// and suggestions to tap. Tags become filter buttons on the site.
import { useState } from 'react';
import { Icon } from './Icon';

export const STORY_TAGS = ['Notes', 'Travel', 'Build', 'Design', 'Process', 'Life', 'Reading', 'Photography'];
export const ALBUM_TAGS = ['Travel', 'Photography', 'Life', 'Nature', 'City', 'Food', 'Architecture'];

type Props = { tags: string[]; onChange: (tags: string[]) => void; suggestions: string[]; hint?: string };

const tidy = (t: string) => t.trim().replace(/\s+/g, ' ').replace(/^./, (c) => c.toUpperCase()).slice(0, 30);

export default function TagsField({ tags, onChange, suggestions, hint }: Props) {
  const [text, setText] = useState('');
  const has = (t: string) => tags.some((x) => x.toLowerCase() === t.toLowerCase());
  const add = (raw: string) => {
    const t = tidy(raw);
    if (t && !has(t)) onChange([...tags, t]);
    setText('');
  };

  return (
    <div className="ed-field">
      <span className="lab">Tags</span>
      <div className="tags">
        {tags.map((t) => (
          <span className="tag-chip" key={t}>
            {t}
            <button type="button" aria-label={`Remove tag ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))}>
              <Icon name="close" size={14} />
            </button>
          </span>
        ))}
        <input
          className="tag-input"
          value={text}
          placeholder={tags.length ? 'Add another' : 'Add a tag'}
          aria-label="Add a tag"
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(',')) v.split(',').forEach((part, i, all) => (i < all.length - 1 ? add(part) : setText(part)));
            else setText(v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(text);
            } else if (e.key === 'Backspace' && !text && tags.length) onChange(tags.slice(0, -1));
          }}
          onBlur={() => text && add(text)}
        />
      </div>
      <div className="tag-suggest">
        {suggestions
          .filter((s) => !has(s))
          .map((s) => (
            <button type="button" key={s} onClick={() => add(s)}>
              + {s}
            </button>
          ))}
      </div>
      {hint && <span className="ed-hint">{hint}</span>}
    </div>
  );
}

/** The same field, keeping its own state: for screens that aren't React themselves (the story editor). */
export function TagsBox({ initial, onChange, suggestions, hint }: { initial: string[]; onChange: (tags: string[]) => void; suggestions: string[]; hint?: string }) {
  const [tags, setTags] = useState(initial);
  return (
    <TagsField
      tags={tags}
      suggestions={suggestions}
      hint={hint}
      onChange={(t) => {
        setTags(t);
        onChange(t);
      }}
    />
  );
}
