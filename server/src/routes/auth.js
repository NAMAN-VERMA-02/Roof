import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { User } from '../models.js';
import { asyncRoute, HttpError } from '../lib/http.js';
import { auth, replaceSession, removeSession } from '../lib/auth.js';
import { validTimeZone } from '../lib/dates.js';

const router = Router();
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please try again in 15 minutes.' },
});
const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8).max(128),
});

router.post(
  '/register',
  authLimit,
  asyncRoute(async (req, res) => {
    const data = credentials
      .extend({ name: z.string().trim().min(2).max(80), timeZone: z.string().optional() })
      .parse(req.body);
    if (data.timeZone && !validTimeZone(data.timeZone))
      throw new HttpError(400, 'Choose a valid time zone.');
    if (await User.exists({ email: data.email }))
      throw new HttpError(409, 'An account with this email already exists.');
    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12),
      timeZone: data.timeZone || 'Asia/Kolkata',
    });
    await replaceSession(req, res, user._id);
    res
      .status(201)
      .json({ user: { id: user.id, name: user.name, email: user.email, timeZone: user.timeZone } });
  }),
);

router.post(
  '/login',
  authLimit,
  asyncRoute(async (req, res) => {
    const data = credentials.parse(req.body);
    const user = await User.findOne({ email: data.email });
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash)))
      throw new HttpError(401, 'Incorrect email or password.');
    await replaceSession(req, res, user._id);
    res.json({
      user: { id: user.id, name: user.name, email: user.email, timeZone: user.timeZone },
    });
  }),
);

router.post(
  '/logout',
  asyncRoute(async (req, res) => {
    await removeSession(req, res);
    res.status(204).end();
  }),
);

router.get('/me', auth, (req, res) => {
  res.json({
    user: {
      id: String(req.user._id),
      name: req.user.name,
      email: req.user.email,
      timeZone: req.user.timeZone,
    },
  });
});

export default router;
