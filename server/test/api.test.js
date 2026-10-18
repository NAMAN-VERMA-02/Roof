import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import supertest from 'supertest';
import { SMTPServer } from 'smtp-server';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { connectDb } from '../src/db.js';
import { ReminderJob } from '../src/models.js';
import { processDueJobs } from '../src/worker.js';
import { config } from '../src/config.js';

let mongod;
let app;
before(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDb(mongod.getUri());
  app = createApp();
});
after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

const productInput = {
  name: 'Laptop Pro',
  brand: 'Northstar',
  model: '14',
  category: 'Electronics',
  serialNumber: '',
  purchaseDate: '2026-01-01',
  warrantyStartDate: '2026-01-01',
  warrantyMonths: 12,
  manualEndDate: '',
  terms: 'Parts and labour',
  notes: '',
};

test('full account, product, receipt, contact and reminder lifecycle is private', async () => {
  const alice = supertest.agent(app);
  const bob = supertest.agent(app);
  let response = await alice
    .post('/api/auth/register')
    .send({ name: 'Alice Owner', email: 'alice@example.com', password: 'strongpassword' });
  assert.equal(response.status, 201);
  response = await bob
    .post('/api/auth/register')
    .send({ name: 'Bob Other', email: 'bob@example.com', password: 'strongpassword' });
  assert.equal(response.status, 201);
  response = await alice.post('/api/products').send(productInput);
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const productId = response.body.product.id;
  assert.equal(response.body.product.warrantyEndDate, '2026-12-31');
  assert.equal((await bob.get(`/api/products/${productId}`)).status, 404);
  assert.equal((await bob.patch(`/api/products/${productId}`).send(productInput)).status, 404);
  assert.equal((await bob.delete(`/api/products/${productId}`)).status, 404);

  const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
  response = await alice
    .post(`/api/products/${productId}/receipts`)
    .attach('file', pdf, { filename: 'invoice.pdf', contentType: 'application/pdf' });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const receiptId = response.body.receipt.id;
  assert.equal((await alice.get(`/api/receipts/${receiptId}/file`)).status, 200);
  assert.equal((await bob.get(`/api/receipts/${receiptId}/file`)).status, 404);
  assert.equal((await bob.delete(`/api/receipts/${receiptId}`)).status, 404);

  response = await alice
    .post(`/api/products/${productId}/service-centers`)
    .send({
      name: 'Northstar Support',
      phone: '1234567890',
      address: 'Main Street',
      website: 'https://example.com',
    });
  assert.equal(response.status, 201);
  const contactId = response.body.contact.id;
  assert.equal((await bob.get(`/api/products/${productId}/service-centers`)).status, 404);
  assert.equal((await bob.delete(`/api/service-centers/${contactId}`)).status, 404);

  response = await alice.get('/api/dashboard/summary');
  assert.equal(response.body.counts.total, 1);
  assert.equal(response.body.counts.receipts, 1);
  response = await bob.get('/api/dashboard/summary');
  assert.equal(response.body.counts.total, 0);

  response = await alice
    .put('/api/reminder-preferences')
    .send({ enabled: true, offsetsDays: [30, 7, 1] });
  assert.equal(response.status, 200);
  assert.equal((await alice.get('/api/reminders/history')).status, 200);

  response = await alice
    .patch(`/api/products/${productId}`)
    .send({ ...productInput, manualEndDate: '2026-11-30' });
  assert.equal(response.status, 200);
  assert.equal(response.body.product.endDateSource, 'manual');
  assert.equal((await alice.get('/api/products?search=Laptop&status=all')).body.products.length, 1);

  assert.equal((await alice.delete(`/api/products/${productId}`)).status, 204);
  assert.equal((await alice.get(`/api/receipts/${receiptId}/file`)).status, 404);
  assert.equal((await alice.get(`/api/products/${productId}/service-centers`)).status, 404);
  assert.equal((await alice.get('/api/dashboard/summary')).body.counts.total, 0);
  assert.equal((await alice.post('/api/auth/logout')).status, 204);
  assert.equal((await alice.get('/api/products')).status, 401);
});

test('invalid inputs and upload types return clear errors', async () => {
  const agent = supertest.agent(app);
  await agent
    .post('/api/auth/register')
    .send({ name: 'Test User', email: 'test@example.com', password: 'strongpassword' });
  const bad = await agent
    .post('/api/products')
    .send({ ...productInput, purchaseDate: '2026-02-30' });
  assert.equal(bad.status, 400);
  const product = await agent.post('/api/products').send(productInput);
  const upload = await agent
    .post(`/api/products/${product.body.product.id}/receipts`)
    .attach('file', Buffer.from('not a receipt'), 'note.txt');
  assert.equal(upload.status, 400);
});

test('worker records one successful due email attempt', async () => {
  const agent = supertest.agent(app);
  await agent
    .post('/api/auth/register')
    .send({ name: 'Mail User', email: 'mail@example.com', password: 'strongpassword' });
  const futureEnd = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const product = await agent
    .post('/api/products')
    .send({ ...productInput, manualEndDate: futureEnd });
  const productId = product.body.product.id;
  const job = await ReminderJob.findOne({ productId });
  assert.ok(job);
  job.scheduledFor = new Date(Date.now() - 1000);
  await job.save();
  const deliveries = [];
  await processDueJobs(1, async (message) => {
    deliveries.push(message);
    return { messageId: 'test-1' };
  });
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].to, 'mail@example.com');
  assert.equal((await ReminderJob.findById(job.id)).status, 'sent');
  await processDueJobs(1, async (message) => {
    deliveries.push(message);
  });
  assert.equal(deliveries.length, 1);
});

test('configured SMTP transport delivers a due reminder to a local mail server', async () => {
  let message = '';
  const smtp = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS'],
    onData(stream, _session, done) {
      stream.on('data', (chunk) => {
        message += chunk.toString();
      });
      stream.on('end', () => done());
      stream.on('error', done);
    },
  });
  await new Promise((resolve) => smtp.listen(0, '127.0.0.1', resolve));
  config.smtp.host = '127.0.0.1';
  config.smtp.port = smtp.server.address().port;
  config.smtp.secure = false;
  config.smtp.user = '';
  config.smtp.pass = '';
  try {
    const agent = supertest.agent(app);
    await agent
      .post('/api/auth/register')
      .send({ name: 'SMTP User', email: 'smtp@example.com', password: 'strongpassword' });
    const futureEnd = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const product = await agent
      .post('/api/products')
      .send({ ...productInput, name: 'Camera', manualEndDate: futureEnd });
    const job = await ReminderJob.findOne({ productId: product.body.product.id });
    assert.ok(job);
    job.scheduledFor = new Date(Date.now() - 1000);
    await job.save();
    await processDueJobs(1);
    assert.match(message, /Camera/);
    assert.match(message, /smtp@example.com/);
    assert.equal((await ReminderJob.findById(job.id)).status, 'sent');
  } finally {
    await new Promise((resolve) => smtp.close(resolve));
  }
});
