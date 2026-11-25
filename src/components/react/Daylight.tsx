// Today's sunrise, sunset and daylight for a place, compared with the longest day (June 21).
// Worked out in the visitor's browser, so it's always today's numbers.
import { useEffect, useState } from 'react';
import { sunDay, hoursMinutes } from '../../lib/sun';

type Props = { lat: number; lon: number; timeZone: string };

export default function Daylight({ lat, lon, timeZone }: Props) {
  const [now, setNow] = useState(() => new Date());

  // Refresh after midnight if the page is left open.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10 * 60_000);
    return () => clearInterval(t);
  }, []);

  const today = sunDay(now, lat, lon);
  const solstice = sunDay(new Date(Date.UTC(now.getUTCFullYear(), 5, 21, 20)), lat, lon);
  const less = solstice.daylightMinutes - today.daylightMinutes;
  const time = (d: Date) => d.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).toLowerCase();
  const up = now > today.sunrise && now < today.sunset;

  return (
    <p className="daylight">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
      </svg>
      <span>
        Sunrise {time(today.sunrise)} · Sunset {time(today.sunset)} · {hoursMinutes(today.daylightMinutes)} of daylight today
        {less > 1 ? `, ${hoursMinutes(less)} less than on the longest day.` : ': the longest day of the year.'}
        {up ? '' : ' The sun is down here right now.'}
      </span>
    </p>
  );
}
