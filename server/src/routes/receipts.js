import { Router } from 'express';
import multer from 'multer';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Product, Receipt } from '../models.js';
import { deleteReceiptFile, receiptBucket, receiptFileExists } from '../db.js';
import { asyncRoute, HttpError, objectId } from '../lib/http.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

function fileType(buffer) {
  if (buffer.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return 'image/png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  return null;
}

async function ownedProduct(req, id) {
  const product = await Product.findOne({ _id: objectId(id), userId: req.user._id }).lean();
  if (!product) throw new HttpError(404, 'Product not found.');
  return product;
}

router.get(
  '/products/:productId/receipts',
  asyncRoute(async (req, res) => {
    await ownedProduct(req, req.params.productId);
    const receipts = await Receipt.find({ productId: req.params.productId, userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ receipts: receipts.map((r) => ({ ...r, id: String(r._id) })) });
  }),
);

router.post(
  '/products/:productId/receipts',
  upload.single('file'),
  asyncRoute(async (req, res) => {
    await ownedProduct(req, req.params.productId);
    if (!req.file) throw new HttpError(400, 'Choose a receipt file.');
    const mimeType = fileType(req.file.buffer);
    if (!mimeType) throw new HttpError(400, 'Upload a PDF, PNG or JPEG receipt.');
    const name = req.file.originalname.replace(/[\r\n\\/]/g, '_').slice(0, 180) || 'receipt';
    const bucket = receiptBucket();
    const stream = bucket.openUploadStream(name, { metadata: { mimeType } });
    await pipeline(Readable.from(req.file.buffer), stream);
    try {
      const receipt = await Receipt.create({
        userId: req.user._id,
        productId: req.params.productId,
        gridFsFileId: stream.id,
        originalName: name,
        mimeType,
        size: req.file.size,
      });
      res.status(201).json({ receipt: { ...receipt.toObject(), id: receipt.id } });
    } catch (error) {
      await bucket.delete(stream.id).catch(() => {});
      throw error;
    }
  }),
);

router.get(
  '/receipts/:id/file',
  asyncRoute(async (req, res) => {
    const receipt = await Receipt.findOne({
      _id: objectId(req.params.id),
      userId: req.user._id,
    }).lean();
    if (!receipt) throw new HttpError(404, 'Receipt not found.');
    await ownedProduct(req, receipt.productId);
    if (!(await receiptFileExists(receipt.gridFsFileId)))
      throw new HttpError(404, 'Receipt file is unavailable.');
    const safeName = receipt.originalName.replace(/[\r\n"\\]/g, '_');
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', receipt.mimeType);
    res.setHeader('Content-Length', receipt.size);
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    const stream = receiptBucket().openDownloadStream(receipt.gridFsFileId);
    stream.on('error', (error) => {
      if (!res.headersSent) res.status(404).json({ error: 'Receipt file is unavailable.' });
      else res.destroy(error);
    });
    stream.pipe(res);
  }),
);

router.delete(
  '/receipts/:id',
  asyncRoute(async (req, res) => {
    const receipt = await Receipt.findOne({ _id: objectId(req.params.id), userId: req.user._id });
    if (!receipt) throw new HttpError(404, 'Receipt not found.');
    await ownedProduct(req, receipt.productId);
    await deleteReceiptFile(receipt.gridFsFileId);
    await receipt.deleteOne();
    res.status(204).end();
  }),
);

export default router;
