import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import nodemailer from 'nodemailer';
import { startLocalMail } from '../src/localMail.js';

test('local inbox captures reminder mail without a real provider', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'roof-mail-'));
  const localMail = await startLocalMail({ directory, smtpPort: 0, inboxPort: 0 });
  try {
    const sender = nodemailer.createTransport({
      host: '127.0.0.1',
      port: localMail.smtpPort,
      secure: false,
    });
    await sender.sendMail({
      from: 'Roof <reminders@roof.local>',
      to: 'owner@example.com',
      subject: 'Roof reminder: <camera>',
      text: 'Your warranty ends soon.',
    });
    const inbox = await (await fetch(localMail.inboxUrl)).text();
    assert.match(inbox, /Roof reminder: &lt;camera&gt;/);
    assert.doesNotMatch(inbox, /Roof reminder: <camera>/);
    const files = await readdir(directory);
    assert.equal(files.length, 1);
    const message = await (
      await fetch(`${localMail.inboxUrl}/message/${files[0].slice(0, -5)}`)
    ).text();
    assert.match(message, /Your warranty ends soon/);
  } finally {
    await localMail.close();
    await rm(directory, { recursive: true, force: true });
  }
});
