// Reads and writes the header block at the top of notes and albums:
// ---
// title: "Morning swim"
// date: 2026-11-12
// photos: [
//   {"photo": "/images/albums/a.webp", "caption": "Lane four"}
// ]
// ---
// Values are written as JSON (strings in double quotes, lists in [ ]). JSON is valid YAML,
// so the site reads these files exactly as before, and quotes, colons and accents are safe.

type Data = Record<string, unknown>;

export function parseFrontmatter(src: string): { data: Data; body: string } {
  const m = src.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: src };
  const data: Data = {};
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    let raw = kv[2].trim();
    // A list or object may continue over several lines: gather lines until it parses.
    if (/^[[{]/.test(raw)) {
      let parsed: unknown;
      for (let j = i; j < lines.length; j++) {
        if (j > i) raw += '\n' + lines[j];
        try {
          parsed = JSON.parse(raw);
          i = j;
          break;
        } catch {
          /* keep gathering */
        }
      }
      data[kv[1]] = parsed;
    } else {
      data[kv[1]] = scalar(raw);
    }
  }
  return { data, body: m[2].replace(/^\s*\n/, '') };
}

function scalar(v: string): unknown {
  if (v === 'true' || v === 'false') return v === 'true';
  if (v.startsWith('"') && v.endsWith('"')) {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1);
    }
  }
  if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  return v;
}

/**
 * Writes a header block plus body. Empty strings, empty lists and `false` are left out.
 * `date` is written without quotes so the site reads it as a date.
 */
export function serializeFrontmatter(data: Data, body: string): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    if (Array.isArray(value)) {
      if (!value.length) continue;
      lines.push(`${key}: [`, value.map((v) => `  ${JSON.stringify(v)}`).join(',\n'), ']');
    } else if (key === 'date' || typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${JSON.stringify(String(value).replace(/[\r\n]+/g, ' ').trim())}`);
    }
  }
  lines.push('---', '');
  return `${lines.join('\n')}\n${body.trim()}\n`;
}

/** "Morning swim, again!" -> "morning-swim-again" */
export function slugify(title: string): string {
  return (
    title
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'untitled'
  );
}

/** A file name that isn't taken yet: "lisbon", then "lisbon-2", … */
export function uniqueId(title: string, taken: Set<string>): string {
  const base = slugify(title);
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}
