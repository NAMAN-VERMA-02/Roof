import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDb } from './db.js';
import { createApp } from './app.js';
import { processDueJobs } from './worker.js';
import { config } from './config.js';

const dbPath = path.resolve(process.cwd(), '..', '.local-mongo');
await mkdir(dbPath, { recursive: true });
const mongod = await MongoMemoryServer.create({
  instance: { dbPath, storageEngine: 'wiredTiger' },
});
await connectDb(mongod.getUri());
const server = createApp().listen(config.port, () => {
  console.log(`Roof API ready at http://localhost:${config.port}`);
  console.log(`Persistent local MongoDB data: ${dbPath}`);
});
const interval = setInterval(() => processDueJobs().catch(console.error), config.workerIntervalMs);
processDueJobs().catch(console.error);

async function close() {
  clearInterval(interval);
  await new Promise((resolve) => server.close(resolve));
  await mongod.stop({ doCleanup: false, force: false });
  process.exit(0);
}
process.on('SIGINT', close);
process.on('SIGTERM', close);
