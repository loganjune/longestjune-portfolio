// The Stories page: the newest story large at the top, the rest as cards, and a filter
// (All, then the tags in use: Notes, Travel, Build…).
import { useState } from 'react';
import { Picture } from './Picture';
import FilterBar, { rise, count } from './FilterBar';

type Story = { kind: 'Note' | 'Travel'; id: string; href: string; title: string; date: string; description: string; picture: string; location: string; tags: string[] };

export default function StoriesIndex({ stories, tags }: { stories: Story[]; tags: string[] }) {
  const [filter, setFilter] = useState('All');
  const shown = stories.filter((s) => filter === 'All' || s.tags.includes(filter));
  const [lead, ...rest] = shown;
  const meta = (s: Story) => [s.tags.join(', '), s.location, s.date].filter(Boolean).join(' · ');

  return (
    <>
      <FilterBar label={count(shown.length, 'story', 'stories')} live choices={['All', ...tags]} value={filter} onChange={setFilter} groupLabel="Show stories tagged" />

      {!lead ? (
        <p className="sample">Nothing here yet.</p>
      ) : (
        <div key={filter}>
          <a className="story-lead fill rise" href={lead.href}>
            <Picture picture={lead.picture} alt="" />
            <span className="story-lead-text">
              <span className="lab">{meta(lead)}</span>
              <span className="story-lead-title">{lead.title}</span>
              {lead.description && <span className="story-lead-desc">{lead.description}</span>}
              <span className="lab">Read →</span>
            </span>
          </a>
          {rest.length > 0 && (
            <div className="cards story-cards">
              {rest.map((s, i) => (
                <a className="card story-card rise" href={s.href} key={s.kind + s.id} style={rise(i)}>
                  <div className="ph fill">
                    <Picture picture={s.picture} alt="" />
                  </div>
                  <span className="lab soft">{meta(s)}</span>
                  <h3>{s.title}</h3>
                  {s.description && <p>{s.description}</p>}
                  <span className="lab">Read →</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
