// RFC 5545: local appointment time references the included Eastern time definition.
export function createAppointmentCalendar(item, now = new Date()) {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM) ET$/.exec(item.time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !match)
    throw new Error('Invalid appointment date or time');
  const hour = (Number(match[1]) % 12) + (match[3] === 'PM' ? 12 : 0),
    minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error('Invalid appointment time');
  const day = item.date.replaceAll('-', '');
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  const time = (total) =>
    `${String(Math.floor(total / 60)).padStart(2, '0')}${String(total % 60).padStart(2, '0')}00`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Amparo//Demo//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE',
    'TZID:America/New_York',
    'BEGIN:DAYLIGHT',
    'DTSTART:20070311T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'TZNAME:EDT',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'DTSTART:20071104T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'TZNAME:EST',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:amparo-${day}-${item.locationId}@example.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=America/New_York:${day}T${time(hour * 60 + minute)}`,
    `DTEND;TZID=America/New_York:${day}T${time(hour * 60 + minute + 30)}`,
    'SUMMARY:DEMO - Amparo consultation',
    'DESCRIPTION:Sample only. No provider booking.',
    'STATUS:TENTATIVE',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
