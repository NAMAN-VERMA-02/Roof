import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDb } from './db.js';
import { createApp } from './app.js';
import { processDueJobs } from './worker.js';
import { config } from './config.js';

const mongod = await MongoMemoryServer.create();
await connectDb(mongod.getUri());
const server = createApp().listen(config.port, () => {
  console.log(`Roof demo API ready at http://localhost:${config.port}`);
  console.log('Demo MongoDB is temporary; all demo data is removed when this command stops.');
});
const interval = setInterval(() => processDueJobs().catch(console.error), config.workerIntervalMs);
processDueJobs().catch(console.error);

async function close() {
  clearInterval(interval);
  await new Promise((resolve) => server.close(resolve));
  await mongod.stop();
  process.exit(0);
}
process.on('SIGINT', close);
process.on('SIGTERM', close);
