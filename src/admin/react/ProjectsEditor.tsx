// The editor's Projects screen: drag to set the order (the first three are featured on the homepage).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Thumb } from './PhotoGrid';
import { Icon } from './Icon';
import { sortable, moveItem } from '../sortable';
import type { Project } from '../projects';

type Props = { projects: Project[]; order: string[]; onChange: (order: string[]) => void };

export default function ProjectsEditor({ projects, order: initial, onChange }: Props) {
  const [order, setOrder] = useState(initial);
  const latest = useRef(order);
  latest.current = order;
  const byId = new Map(projects.map((p) => [p.id, p]));

  const update = useCallback(
    (next: string[]) => {
      setOrder(next);
      onChange(next);
    },
    [onChange],
  );

  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (!list.current) return;
    return sortable({ container: list.current, items: '.ed-item', handle: '.ed-grip', onMove: (from, to) => update(moveItem([...latest.current], from, to)) });
  }, [update]);

  return (
    <div className="ed-field">
      <div className="ed-list-head">
        <span className="lab">Projects</span>
        <a href="#/projects/new" className="ed-btn solid">
          <Icon name="plus" size={16} /> New project
        </a>
      </div>
      <ol className="ed-items" ref={list}>
        {order.map((id, i) => {
          const p = byId.get(id);
          if (!p) return null;
          return (
            <li className="ed-item" key={id}>
              <div className="ed-item-head">
                <button type="button" className="ed-icon ed-grip" aria-label={`${p.title}. Drag, or use the arrow keys, to reorder.`} title="Drag to reorder">
                  <Icon name="grip" />
                </button>
                <a className="ed-item-toggle" href={`#/projects/${encodeURIComponent(id)}`}>
                  <span className="ed-thumb">
                    <Thumb photo={p.photo || undefined} picture={p.picture} />
                  </span>
                  <span className="ed-item-title">
                    {p.title || id}
                    <span className="soft">
                      {' '}
                      · {p.status} · {p.year}
                      {i < 3 ? ' · Featured' : ''}
                      {p.draft ? ' · Draft' : ''}
                    </span>
                  </span>
                  <span className="ed-chev">
                    <Icon name="chevron" size={16} />
                  </span>
                </a>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
