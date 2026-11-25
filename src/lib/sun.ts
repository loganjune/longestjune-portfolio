// Sunrise and sunset for a place and day, using the standard "sunrise equation"
// (accurate to about a minute, which is plenty for a website).

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const J1970 = 2440587.5;
const J2000 = 2451545;

const toJulian = (d: Date) => d.valueOf() / DAY_MS + J1970;
const fromJulian = (j: number) => new Date((j - J1970) * DAY_MS);

export type SunDay = { sunrise: Date; sunset: Date; daylightMinutes: number };

/** `date` picks the day; `lat`/`lon` in degrees (west is negative). */
export function sunDay(date: Date, lat: number, lon: number): SunDay {
  // Days since 1 Jan 2000, counted to local solar noon.
  const n = Math.round(toJulian(date) - J2000 - 0.0009 + lon / 360);
  const jStar = n + 0.0009 - lon / 360;
  const M = (357.5291 + 0.98560028 * jStar) % 360;
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const transit = J2000 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);
  const sinDec = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  // -0.833° allows for the sun's size and the air bending its light at the horizon.
  const cosH = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sinDec) / (Math.cos(lat * RAD) * cosDec);
  const H = Math.acos(Math.max(-1, Math.min(1, cosH))) / RAD;
  const sunrise = fromJulian(transit - H / 360);
  const sunset = fromJulian(transit + H / 360);
  return { sunrise, sunset, daylightMinutes: Math.round((sunset.valueOf() - sunrise.valueOf()) / 60_000) };
}

/** "10 h 24 m" */
export function hoursMinutes(minutes: number): string {
  const m = Math.abs(minutes);
  return `${Math.floor(m / 60)} h ${m % 60} m`;
}
