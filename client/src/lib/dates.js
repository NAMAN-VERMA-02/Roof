export function formatDate(value) {
  if (!value) return 'Not set';
  const date = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function calculatedEnd(start, months) {
  if (!start || !months) return '';
  const [y, m, d] = start.split('-').map(Number);
  if (!y || !m || !d) return '';
  const first = new Date(Date.UTC(y, m - 1 + Number(months), 1));
  const monthEnd = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const anniversary = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, monthEnd)),
  );
  anniversary.setUTCDate(anniversary.getUTCDate() - 1);
  return anniversary.toISOString().slice(0, 10);
}

export const statusLabel = {
  active: 'Active',
  expiring: 'Expiring soon',
  expired: 'Expired',
  incomplete: 'Incomplete',
};
