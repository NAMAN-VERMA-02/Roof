import crypto from 'node:crypto';
import { createServer } from 'node:http';
import path from 'node:path';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
  });

function page(title, content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · Roof local inbox</title><style>body{margin:0;background:#f3f6fb;color:#142943;font:16px/1.55 system-ui,sans-serif}main{max-width:850px;margin:48px auto;padding:0 24px}a{color:#145a9e}header{margin-bottom:28px}h1{margin:.2em 0;font-size:2rem}p{color:#53657a}.card{background:white;border:1px solid #d8e2ed;border-radius:14px;padding:22px;margin:14px 0;box-shadow:0 5px 20px #1429430a}.meta{font-size:.86rem;color:#63748a}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}.empty{padding:48px;text-align:center}strong{display:block}</style></head><body><main><header><small>ROOF · LOCAL DEVELOPMENT</small><h1>${escapeHtml(title)}</h1><p>Messages here are captured on this computer. No email is sent to a real inbox.</p></header>${content}</main></body></html>`;
}

async function closeServer(server) {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

export async function startLocalMail({ directory, smtpPort = 1025, inboxPort = 8025 } = {}) {
  await mkdir(directory, { recursive: true });
  const smtp = new SMTPServer({
    authOptional: true,
    disabledCommands: ['AUTH', 'STARTTLS'],
    size: 1024 * 1024,
    onData(stream, session, callback) {
      simpleParser(stream)
        .then(async (message) => {
          const id = crypto.randomUUID();
          const record = {
            id,
            receivedAt: new Date().toISOString(),
            from: message.from?.text || session.envelope.mailFrom.address,
            to:
              message.to?.text ||
              session.envelope.rcptTo.map((recipient) => recipient.address).join(', '),
            subject: message.subject || '(no subject)',
            text: message.text || '(no plain text body)',
          };
          await writeFile(path.join(directory, `${id}.json`), JSON.stringify(record), {
            flag: 'wx',
          });
          console.log(`Local email captured for ${record.to}: ${record.subject}`);
          callback();
        })
        .catch(callback);
    },
  });
  await new Promise((resolve, reject) => {
    smtp.once('error', reject);
    smtp.listen(smtpPort, '127.0.0.1', () => {
      smtp.off('error', reject);
      resolve();
    });
  });

  const inbox = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      if (req.method !== 'GET') {
        res.writeHead(405).end('Method not allowed');
        return;
      }
      if (req.url === '/') {
        const files = (await readdir(directory)).filter((name) =>
          /^[\da-f-]{36}\.json$/.test(name),
        );
        const messages = await Promise.all(
          files.map(async (name) => JSON.parse(await readFile(path.join(directory, name), 'utf8'))),
        );
        messages.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
        const cards = messages.length
          ? messages
              .map(
                (message) =>
                  `<article class="card"><div class="meta">${escapeHtml(message.receivedAt)} · To ${escapeHtml(message.to)}</div><a href="/message/${message.id}"><strong>${escapeHtml(message.subject)}</strong></a><div class="meta">From ${escapeHtml(message.from)}</div></article>`,
              )
              .join('')
          : '<div class="card empty">No reminders delivered yet. Add a product with a matching reminder date to test delivery.</div>';
        res.end(page('Local inbox', cards));
        return;
      }
      const id = /^\/message\/([\da-f-]{36})$/.exec(req.url)?.[1];
      if (!id) {
        res.writeHead(404).end('Not found');
        return;
      }
      const message = JSON.parse(await readFile(path.join(directory, `${id}.json`), 'utf8'));
      res.end(
        page(
          message.subject,
          `<a href="/">← All messages</a><article class="card"><div class="meta">From ${escapeHtml(message.from)}<br>To ${escapeHtml(message.to)}<br>Received ${escapeHtml(message.receivedAt)}</div><pre>${escapeHtml(message.text)}</pre></article>`,
        ),
      );
    } catch (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Unable to read local inbox');
      if (error.code !== 'ENOENT') console.error('Local inbox error:', error);
    }
  });
  try {
    await new Promise((resolve, reject) => {
      inbox.once('error', reject);
      inbox.listen(inboxPort, '127.0.0.1', () => {
        inbox.off('error', reject);
        resolve();
      });
    });
  } catch (error) {
    await closeServer(smtp);
    throw error;
  }
  return {
    smtpPort: smtp.server.address().port,
    inboxUrl: `http://localhost:${inbox.address().port}`,
    async close() {
      await Promise.all([closeServer(inbox), closeServer(smtp)]);
    },
  };
}
