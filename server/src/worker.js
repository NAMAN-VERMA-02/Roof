import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { connectDb } from './db.js';
import { config } from './config.js';
import { Product, ReminderJob, User } from './models.js';
import { getPreferences } from './lib/reminders.js';

const workerId = crypto.randomUUID();
let running = false;
let transporter;

function mailer() {
  if (!config.smtp.host)
    throw new Error('SMTP is not configured. Add SMTP_HOST and SMTP_FROM in server/.env.');
  if (!transporter)
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  return transporter;
}

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

export async function processDueJobs(
  limit = 25,
  deliver = (message) => mailer().sendMail(message),
) {
  const now = new Date();
  await ReminderJob.updateMany(
    { status: 'sending', lockedUntil: { $lt: now } },
    { $set: { status: 'retry', scheduledFor: now } },
  );
  for (let i = 0; i < limit; i++) {
    const job = await ReminderJob.findOneAndUpdate(
      {
        status: { $in: ['pending', 'retry'] },
        scheduledFor: { $lte: new Date() },
        attempts: { $lt: 3 },
      },
      { $set: { status: 'sending', lockedUntil: new Date(Date.now() + 5 * 60_000) } },
      { sort: { scheduledFor: 1 }, returnDocument: 'after' },
    );
    if (!job) break;
    try {
      const [user, product, preferences] = await Promise.all([
        User.findById(job.userId).lean(),
        Product.findById(job.productId).lean(),
        getPreferences(job.userId),
      ]);
      if (
        !user ||
        !product ||
        product.warrantyEndDate !== job.warrantyEndDate ||
        !preferences.enabled ||
        !preferences.offsetsDays.includes(job.offsetDays)
      ) {
        job.status = 'cancelled';
        job.lockedUntil = null;
        await job.save();
        continue;
      }
      const description =
        job.offsetDays === 0
          ? 'today'
          : `in ${job.offsetDays} day${job.offsetDays === 1 ? '' : 's'}`;
      await deliver({
        from: config.smtp.from,
        to: user.email,
        subject: `Roof reminder: ${product.name} warranty ends ${description}`,
        text: `Hi ${user.name},\n\nThe warranty for ${product.name} (${product.brand}) ends on ${product.warrantyEndDate}. Your warranty documents and proof of purchase are ready in Roof.\n\nThis reminder was requested in your Roof settings.`,
        html: `<p>Hi ${escapeHtml(user.name)},</p><p>The warranty for <strong>${escapeHtml(product.name)}</strong> (${escapeHtml(product.brand)}) ends on <strong>${product.warrantyEndDate}</strong>.</p><p>Your warranty documents and proof of purchase are ready in Roof.</p>`,
      });
      job.status = 'sent';
      job.sentAt = new Date();
      job.lastError = '';
      job.attempts += 1;
      job.lockedUntil = null;
      await job.save();
      console.log(`Sent reminder ${job.id} to ${user.email}`);
    } catch (error) {
      job.attempts += 1;
      job.lastError = String(error.message || error).slice(0, 500);
      job.status = job.attempts >= 3 ? 'failed' : 'retry';
      job.scheduledFor = new Date(Date.now() + 15 * 60_000 * job.attempts);
      job.lockedUntil = null;
      await job.save();
      console.error(`Reminder ${job.id} failed: ${job.lastError}`);
    }
  }
}

async function tick() {
  if (running) return;
  running = true;
  try {
    await processDueJobs();
  } catch (error) {
    console.error('Reminder worker error:', error);
  } finally {
    running = false;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await connectDb();
  console.log(`Roof reminder worker started (${workerId})`);
  await tick();
  setInterval(tick, config.workerIntervalMs);
}
