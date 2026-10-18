import { Router } from 'express';
import multer from 'multer';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Product, Receipt } from '../models.js';
import { deleteReceiptFile, receiptBucket, receiptFileExists } from '../db.js';
import { asyncRoute, HttpError, objectId } from '../lib/http.js';

const router = Router();
const categories = new Set([
  'receipt',
  'invoice',
  'warranty_card',
  'manual',
  'service_record',
  'other',
]);
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

function metadata(body = {}, legacyReceipt = false) {
  const category = legacyReceipt ? 'receipt' : body.category || 'receipt';
  if (!categories.has(category)) throw new HttpError(400, 'Choose a valid document type.');
  const note = body.note || '';
  if (typeof note !== 'string' || note.length > 300)
    throw new HttpError(400, 'Document note must be 300 characters or fewer.');
  return { category, note: note.trim() };
}

function serialize(document, productName) {
  const result = {
    ...document,
    id: String(document._id),
    category: document.category || 'receipt',
    note: document.note || '',
  };
  if (productName !== undefined) result.productName = productName;
  return result;
}

async function ownedProduct(req, id) {
  const product = await Product.findOne({ _id: objectId(id), userId: req.user._id }).lean();
  if (!product) throw new HttpError(404, 'Product not found.');
  return product;
}

async function ownedDocument(req, id) {
  const document = await Receipt.findOne({ _id: objectId(id), userId: req.user._id });
  if (!document) throw new HttpError(404, 'Document not found.');
  await ownedProduct(req, document.productId);
  return document;
}

router.get(
  '/documents',
  asyncRoute(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category : 'all';
    if (search.length > 100) throw new HttpError(400, 'Search must be 100 characters or fewer.');
    if (category !== 'all' && !categories.has(category))
      throw new HttpError(400, 'Choose a valid document type.');

    const [documents, products] = await Promise.all([
      Receipt.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
      Product.find({ userId: req.user._id }).select('name brand').lean(),
    ]);
    const names = new Map(products.map((product) => [String(product._id), product]));
    const needle = search.toLocaleLowerCase();
    const results = documents
      .filter((document) => names.has(String(document.productId)))
      .map((document) => {
        const product = names.get(String(document.productId));
        return serialize(document, product.name);
      })
      .filter(
        (document) =>
          (category === 'all' || document.category === category) &&
          (!needle ||
            `${document.originalName} ${document.note} ${document.productName}`
              .toLocaleLowerCase()
              .includes(needle)),
      );
    res.json({ documents: results });
  }),
);

router.get(
  ['/products/:productId/receipts', '/products/:productId/documents'],
  asyncRoute(async (req, res) => {
    await ownedProduct(req, req.params.productId);
    const legacyReceipt = req.path.endsWith('/receipts');
    const documents = await Receipt.find({ productId: req.params.productId, userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    const results = documents
      .map((document) => serialize(document))
      .filter((document) => !legacyReceipt || document.category === 'receipt');
    res.json(legacyReceipt ? { receipts: results } : { documents: results });
  }),
);

router.post(
  ['/products/:productId/receipts', '/products/:productId/documents'],
  upload.single('file'),
  asyncRoute(async (req, res) => {
    await ownedProduct(req, req.params.productId);
    if (!req.file) throw new HttpError(400, 'Choose a document file.');
    const { category, note } = metadata(req.body, req.path.endsWith('/receipts'));
    const mimeType = fileType(req.file.buffer);
    if (!mimeType) throw new HttpError(400, 'Upload a PDF, PNG or JPEG document.');
    const name = req.file.originalname.replace(/[\r\n\\/]/g, '_').slice(0, 180) || 'document';
    const bucket = receiptBucket();
    const stream = bucket.openUploadStream(name, { metadata: { mimeType } });
    await pipeline(Readable.from(req.file.buffer), stream);
    try {
      const document = await Receipt.create({
        userId: req.user._id,
        productId: req.params.productId,
        gridFsFileId: stream.id,
        originalName: name,
        mimeType,
        size: req.file.size,
        category,
        note,
      });
      const result = serialize(document.toObject());
      res
        .status(201)
        .json(req.path.endsWith('/receipts') ? { receipt: result } : { document: result });
    } catch (error) {
      await bucket.delete(stream.id).catch(() => {});
      throw error;
    }
  }),
);

router.patch(
  '/documents/:id',
  asyncRoute(async (req, res) => {
    const document = await ownedDocument(req, req.params.id);
    const { category, note } = metadata(req.body);
    document.category = category;
    document.note = note;
    await document.save();
    res.json({ document: serialize(document.toObject()) });
  }),
);

router.get(
  ['/receipts/:id/file', '/documents/:id/file'],
  asyncRoute(async (req, res) => {
    const document = await ownedDocument(req, req.params.id);
    if (!(await receiptFileExists(document.gridFsFileId)))
      throw new HttpError(404, 'Document file is unavailable.');
    const safeName = document.originalName.replace(/[\r\n"\\]/g, '_');
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Length', document.size);
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    const stream = receiptBucket().openDownloadStream(document.gridFsFileId);
    stream.on('error', (error) => {
      if (!res.headersSent) res.status(404).json({ error: 'Document file is unavailable.' });
      else res.destroy(error);
    });
    stream.pipe(res);
  }),
);

router.delete(
  ['/receipts/:id', '/documents/:id'],
  asyncRoute(async (req, res) => {
    const document = await ownedDocument(req, req.params.id);
    await deleteReceiptFile(document.gridFsFileId);
    await document.deleteOne();
    res.status(204).end();
  }),
);

export default router;
