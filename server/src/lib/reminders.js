import { DateTime } from 'luxon';
import { Product, ReminderJob, ReminderPreference, User } from '../models.js';
import { scheduleFor, todayIn } from './dates.js';

export const DEFAULT_PREFERENCES = { enabled: true, offsetsDays: [30, 7, 1] };

export async function getPreferences(userId) {
  return (
    (await ReminderPreference.findOne({ userId }).lean()) || { userId, ...DEFAULT_PREFERENCES }
  );
}

export async function syncJobsForProduct(product, user, preferences = null) {
  await ReminderJob.updateMany(
    { productId: product._id, status: { $in: ['pending', 'retry'] } },
    { $set: { status: 'cancelled' } },
  );
  const settings = preferences || (await getPreferences(user._id));
  if (!settings.enabled || !product.warrantyEndDate) return;
  const today = todayIn(user.timeZone);
  if (product.warrantyEndDate < today) return;
  for (const offsetDays of settings.offsetsDays) {
    const targetDay = DateTime.fromISO(product.warrantyEndDate, { zone: user.timeZone })
      .minus({ days: offsetDays })
      .toISODate();
    if (targetDay < today) continue;
    const filter = { productId: product._id, warrantyEndDate: product.warrantyEndDate, offsetDays };
    const existing = await ReminderJob.findOne(filter);
    if (existing?.status === 'sent' || existing?.status === 'sending') continue;
    if (existing) {
      existing.status = 'pending';
      existing.scheduledFor = scheduleFor(product.warrantyEndDate, offsetDays, user.timeZone);
      existing.lastError = '';
      await existing.save();
    } else {
      await ReminderJob.create({
        ...filter,
        userId: user._id,
        scheduledFor: scheduleFor(product.warrantyEndDate, offsetDays, user.timeZone),
      });
    }
  }
}

export async function syncJobsForUser(user, preferences) {
  const products = await Product.find({ userId: user._id });
  for (const product of products) await syncJobsForProduct(product, user, preferences);
}

export async function cancelJobsForProduct(productId) {
  await ReminderJob.updateMany(
    { productId, status: { $in: ['pending', 'retry'] } },
    { $set: { status: 'cancelled' } },
  );
}
