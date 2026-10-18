import { createApp } from './app.js';
import { connectDb } from './db.js';
import { config } from './config.js';

await connectDb();
createApp().listen(config.port, () =>
  console.log(`Roof API listening on http://localhost:${config.port}`),
);
