import { Router } from 'express';
import { z } from 'zod';
import { Product, ServiceCenter } from '../models.js';
import { asyncRoute, HttpError, objectId } from '../lib/http.js';

const router = Router();
const input = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).default(''),
  address: z.string().trim().max(400).default(''),
  website: z.union([z.literal(''), z.url().startsWith('https://')]).default(''),
});

async function ownedProduct(req) {
  const product = await Product.findOne({
    _id: objectId(req.params.productId),
    userId: req.user._id,
  }).lean();
  if (!product) throw new HttpError(404, 'Product not found.');
}

router.get(
  '/products/:productId/service-centers',
  asyncRoute(async (req, res) => {
    await ownedProduct(req);
    const contacts = await ServiceCenter.find({
      productId: req.params.productId,
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ contacts: contacts.map((c) => ({ ...c, id: String(c._id) })) });
  }),
);

router.post(
  '/products/:productId/service-centers',
  asyncRoute(async (req, res) => {
    await ownedProduct(req);
    const contact = await ServiceCenter.create({
      ...input.parse(req.body),
      productId: req.params.productId,
      userId: req.user._id,
    });
    res.status(201).json({ contact: { ...contact.toObject(), id: contact.id } });
  }),
);

router.patch(
  '/service-centers/:id',
  asyncRoute(async (req, res) => {
    const contact = await ServiceCenter.findOne({
      _id: objectId(req.params.id),
      userId: req.user._id,
    });
    if (!contact) throw new HttpError(404, 'Contact not found.');
    Object.assign(contact, input.parse(req.body));
    await contact.save();
    res.json({ contact: { ...contact.toObject(), id: contact.id } });
  }),
);

router.delete(
  '/service-centers/:id',
  asyncRoute(async (req, res) => {
    const result = await ServiceCenter.deleteOne({
      _id: objectId(req.params.id),
      userId: req.user._id,
    });
    if (!result.deletedCount) throw new HttpError(404, 'Contact not found.');
    res.status(204).end();
  }),
);

export default router;
