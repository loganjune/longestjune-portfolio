// The Gallery page's albums: cover cards with the album's name over the cover (it fades on hover),
// a tag filter when albums have tags, and a chevron on the label to fold the section away. The featured album is shown
// separately at the top of the page.
import { useState } from 'react';
import { Picture } from './Picture';
import FilterBar, { rise, count } from './FilterBar';

type Album = { id: string; href: string; title: string; location: string; date: string; description: string; cover: string; count: number; tags: string[] };

export default function AlbumsIndex({ albums, tags }: { albums: Album[]; tags: string[] }) {
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState(true); // open each time the page loads
  const shown = albums.filter((a) => filter === 'All' || a.tags.includes(filter));

  return (
    <>
      <FilterBar label="Albums" choices={['All', ...tags]} value={filter} onChange={setFilter} groupLabel="Show albums tagged" open={open} onToggle={() => setOpen((o) => !o)} controls="sec-albums" />
      <div key={filter} id="sec-albums" hidden={!open}>
        {shown.length > 0 && (
          <div className="cards">
            {shown.map((a, i) => (
              <a className="card album rise" href={a.href} key={a.id} style={rise(i)}>
                <div className="ph fill">
                  <Picture picture={a.cover} alt="" />
                  <span className="album-name disp" aria-hidden="true">
                    {a.title}
                  </span>
                </div>
                <div className="cap">
                  <div>
                    <h3 className="album-title">{a.title}</h3>
                    {(a.location || a.tags.length > 0) && <p>{[a.location, a.tags.join(', ')].filter(Boolean).join(' · ')}</p>}
                  </div>
                  <span className="lab soft">{count(a.count, 'photo')} →</span>
                </div>
              </a>
            ))}
          </div>
        )}
        {shown.length === 0 && <p className="sample">No albums with this tag yet.</p>}
      </div>
    </>
  );
}
