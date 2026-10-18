import { Router } from 'express';
import { Product, Receipt } from '../models.js';
import { asyncRoute } from '../lib/http.js';
import { statusFor, todayIn } from '../lib/dates.js';

const router = Router();
router.get(
  '/summary',
  asyncRoute(async (req, res) => {
    const [products, documentCount, receiptCount] = await Promise.all([
      Product.find({ userId: req.user._id }).select('name brand warrantyEndDate createdAt').lean(),
      Receipt.countDocuments({ userId: req.user._id }),
      Receipt.countDocuments({
        userId: req.user._id,
        $or: [{ category: 'receipt' }, { category: { $exists: false } }],
      }),
    ]);
    const today = todayIn(req.user.timeZone);
    const counts = {
      total: products.length,
      active: 0,
      expiring: 0,
      expired: 0,
      incomplete: 0,
      documents: documentCount,
      receipts: receiptCount,
    };
    for (const p of products) counts[statusFor(p, today)]++;
    const upcoming = products
      .filter((p) => p.warrantyEndDate && p.warrantyEndDate >= today)
      .sort((a, b) => a.warrantyEndDate.localeCompare(b.warrantyEndDate))
      .slice(0, 5)
      .map((p) => ({ ...p, id: String(p._id), status: statusFor(p, today) }));
    res.json({ counts, upcoming });
  }),
);
export default router;
