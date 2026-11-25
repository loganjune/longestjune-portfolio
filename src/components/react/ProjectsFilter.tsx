// The Projects page: status filter (All / Building / Shipped / Idea) and a row per project,
// like a case-study index: title and link, role and tools, description, picture.
import { useState } from 'react';
import { Picture } from './Picture';
import FilterBar, { rise, count } from './FilterBar';

type Project = { id: string; href: string; title: string; status: string; year: string; role: string; tools: string; description: string; picture: string };

const STATUSES = ['All', 'Building', 'Shipped', 'Idea'];

export default function ProjectsFilter({ projects }: { projects: Project[] }) {
  const [status, setStatus] = useState('All');
  const shown = status === 'All' ? projects : projects.filter((p) => p.status === status);

  return (
    <>
      <FilterBar label={count(shown.length, 'project')} live choices={STATUSES} value={status} onChange={setStatus} groupLabel="Filter by status" />
      {/* A new key on each filter change restarts the fade-in. */}
      <ol className="case-rows" key={status}>
        {shown.map((p, i) => (
          <li className="case-row rise" key={p.id} style={rise(i)}>
            <div className="case-title">
              <h3>
                <a href={p.href}>{p.title}</a>
              </h3>
              <a className="pill" href={p.href} tabIndex={-1} aria-hidden="true">
                View project
              </a>
            </div>
            <div className="case-meta lab soft">
              <span>
                {p.status} · {p.year}
              </span>
              {p.role && <span>{p.role}</span>}
              {p.tools && <span>{p.tools}</span>}
            </div>
            <p className="case-desc">{p.description}</p>
            <a className="case-pic fill" href={p.href} tabIndex={-1} aria-hidden="true">
              <Picture picture={p.picture} alt="" />
            </a>
          </li>
        ))}
      </ol>
      {shown.length === 0 && <p className="sample">Nothing here yet.</p>}
    </>
  );
}
