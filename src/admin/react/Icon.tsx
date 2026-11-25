// The editor's outlined icons (from ui.ts), as a React element.
import { useEffect, useRef } from 'react';
import { icon } from '../ui';

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    ref.current?.replaceChildren(icon(name, size));
  }, [name, size]);
  return <span ref={ref} className="ed-ico" aria-hidden="true" style={{ display: 'inline-grid', width: size, height: size }} />;
}
