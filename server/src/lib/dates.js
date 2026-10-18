import { DateTime } from 'luxon';
import { HttpError } from './http.js';

export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = DateTime.fromISO(value, { zone: 'utc' });
  return date.isValid && date.toISODate() === value;
}

export function validTimeZone(zone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export function calculateEndDate(startDate, months) {
  if (!validDate(startDate) || !Number.isInteger(months) || months < 1 || months > 120) {
    throw new HttpError(
      400,
      'Enter a valid warranty start date and a duration from 1 to 120 months.',
    );
  }
  return DateTime.fromISO(startDate, { zone: 'utc' })
    .plus({ months })
    .minus({ days: 1 })
    .toISODate();
}

export function todayIn(zone = 'Asia/Kolkata') {
  return DateTime.now().setZone(zone).toISODate();
}

export function statusFor(product, today) {
  if (!product.warrantyEndDate) return 'incomplete';
  if (product.warrantyEndDate < today) return 'expired';
  const remaining = DateTime.fromISO(product.warrantyEndDate, { zone: 'utc' }).diff(
    DateTime.fromISO(today, { zone: 'utc' }),
    'days',
  ).days;
  return remaining <= 30 ? 'expiring' : 'active';
}

export function scheduleFor(endDate, offsetDays, zone) {
  return DateTime.fromISO(endDate, { zone })
    .minus({ days: offsetDays })
    .set({ hour: 9, minute: 0, second: 0, millisecond: 0 })
    .toJSDate();
}
