const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const diff = Date.now() - date.getTime();

  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return `${m} ${m === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diff < WEEK) {
    const d = Math.floor(diff / DAY);
    return `${d} ${d === 1 ? 'day' : 'days'} ago`;
  }

  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}
