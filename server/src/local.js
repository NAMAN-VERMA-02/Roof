import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDb } from './db.js';
import { createApp } from './app.js';
import { processDueJobs } from './worker.js';
import { config } from './config.js';
import { startLocalMail } from './localMail.js';

const dbPath = path.resolve(process.cwd(), '..', '.local-mongo');
await mkdir(dbPath, { recursive: true });
const mongod = await MongoMemoryServer.create({
  instance: { dbPath, storageEngine: 'wiredTiger' },
});
await connectDb(mongod.getUri());
const localMail = !config.smtp.host
  ? await startLocalMail({ directory: path.resolve(process.cwd(), '..', '.local-mail') })
  : null;
if (localMail) {
  config.smtp.host = '127.0.0.1';
  config.smtp.port = localMail.smtpPort;
  config.smtp.secure = false;
  config.smtp.from = 'Roof <reminders@roof.local>';
  config.smtp.previewUrl = localMail.inboxUrl;
  console.log(`Roof local email inbox: ${localMail.inboxUrl}`);
}
const server = createApp().listen(config.port, () => {
  console.log(`Roof API ready at http://localhost:${config.port}`);
  console.log(`Persistent local MongoDB data: ${dbPath}`);
});
const interval = setInterval(() => processDueJobs().catch(console.error), config.workerIntervalMs);
processDueJobs().catch(console.error);

async function close() {
  clearInterval(interval);
  await new Promise((resolve) => server.close(resolve));
  if (localMail) await localMail.close();
  await mongod.stop({ doCleanup: false, force: false });
  process.exit(0);
}
process.on('SIGINT', close);
process.on('SIGTERM', close);
