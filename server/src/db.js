import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { config } from './config.js';

export async function connectDb(uri = config.mongoUri) {
  mongoose.set('bufferCommands', false);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
  return mongoose.connection;
}

export function receiptBucket() {
  if (!mongoose.connection.db) throw new Error('MongoDB is not connected');
  return new GridFSBucket(mongoose.connection.db, { bucketName: 'receipts' });
}

export async function deleteReceiptFile(fileId) {
  const bucket = receiptBucket();
  if (await bucket.find({ _id: fileId }).hasNext()) await bucket.delete(fileId);
}

export async function receiptFileExists(fileId) {
  return receiptBucket().find({ _id: fileId }).hasNext();
}
