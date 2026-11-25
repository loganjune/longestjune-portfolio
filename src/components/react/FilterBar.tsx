// The bar above a filtered list (Stories, Projects, Albums): a label on the left, then a row of
// toggle buttons ("All" plus the choices). Shared so the three pages behave alike.
// With `open`/`onToggle`, the label becomes a button with a chevron that folds the section away.
import type { ReactNode } from 'react';

type Props = {
  label: ReactNode;
  live?: boolean;
  choices: string[];
  value: string;
  onChange: (v: string) => void;
  groupLabel: string;
  open?: boolean;
  onToggle?: () => void;
  controls?: string;
};

/** The small chevron used by every collapsible section (turns to point right when folded). */
export const Chevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export default function FilterBar({ label, live, choices, value, onChange, groupLabel, open = true, onToggle, controls }: Props) {
  return (
    <div className="split proj-bar">
      {onToggle ? (
        <button type="button" className="lab sec-toggle" aria-expanded={open} aria-controls={controls} onClick={onToggle}>
          {label}
          <Chevron />
        </button>
      ) : (
        <span className={live ? 'lab soft' : 'lab'} aria-live={live ? 'polite' : undefined}>
          {label}
        </span>
      )}
      {open && choices.length > 1 && (
        <div className="filters lab" role="group" aria-label={groupLabel}>
          {choices.map((c) => (
            <button key={c} type="button" aria-pressed={c === value} onClick={() => onChange(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Staggers the fade-in of list items (the first nine; the rest come in together). */
export const rise = (i: number) => ({ animationDelay: `${Math.min(i, 8) * 60}ms` });

export const count = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
