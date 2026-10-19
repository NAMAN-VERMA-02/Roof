# Roof operations guide

Roof stores account and product data in MongoDB collections and document contents in MongoDB GridFS. A useful backup must include **both**. The reminder worker and API use the same database.

## Local development data

`npm run local` keeps data in the repository's ignored `.local-mongo/` directory.

### Back up

1. Stop `npm run local` with `Ctrl+C` and wait for it to exit. Do not copy the database while it is running.
2. Copy the entire `.local-mongo/` directory to a dated backup location outside the repository.
3. Keep the backup private: it contains account information and uploaded proof of purchase.

### Restore

1. Stop Roof completely.
2. Rename the current `.local-mongo/` directory to a temporary safety copy.
3. Copy the complete backed-up directory into the repository as `.local-mongo/`.
4. Run `npm run local`, sign in, and check that a known product and its document preview are present.
5. Remove the temporary safety copy only after the restored data has been verified.

The temporary `npm run demo` database is intentionally deleted on shutdown and is not a backup target.

## Managed or separately hosted MongoDB

Use MongoDB Database Tools compatible with your server. Run backups from a trusted machine with network access to the database. Store the archive in encrypted storage with restricted access; do not put it in Git.

Before running these commands, set the `MONGODB_URI` environment variable in the current PowerShell session to the same URI used by Roof. A value written only in `server/.env` is not automatically available to `mongodump` or `mongorestore`. Avoid saving credentials in command history or the repository.

Example PowerShell backup:

```powershell
$roofBackup = "roof-$(Get-Date -Format yyyyMMdd-HHmmss).archive.gz"
mongodump --uri $env:MONGODB_URI --archive=$roofBackup --gzip
```

`mongodump` includes Roof's collections and the GridFS `receipts.files` and `receipts.chunks` collections. Keep multiple dated backups and periodically restore one in a separate test environment to verify that it is usable.

To restore the production database, first stop the API and reminder worker and make a fresh safety backup. Verify the target URI and archive path before running the following command: `--drop` replaces collections present in the archive.

```powershell
mongorestore --uri $env:MONGODB_URI --archive="path\to\roof-backup.archive.gz" --gzip --drop
```

Restart the API and worker. Verify `GET /api/health`, sign in, open a known product, preview a saved document, and inspect reminder history. Check the worker logs for delivery errors. Use a provider-managed snapshot/restore process instead when that is your deployment's supported recovery method.

## Email delivery

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in the ignored `server/.env` file using an account from your email provider. The provider must permit SMTP sending from `SMTP_FROM`. Restart the API and worker after changing these settings. A real inbox test with a product whose reminder is due is required before relying on email delivery; the automated test uses a local SMTP server only.

For local development, `npm run local` starts a loopback-only SMTP receiver and an inbox at `http://localhost:8025` when `SMTP_HOST` is unset. Captured messages are saved in ignored `.local-mail/`; this verifies the scheduling and delivery pipeline without sending email over the internet. Set `SMTP_HOST` to switch the local command to an external provider. Do not expose the local inbox outside your computer.

For a small college demonstration with real email, a personal Gmail account can use an app password if Google makes that option available for the account. Enable 2-Step Verification and create an app password in your own Google Account. Put the following values in the ignored `server/.env`; replace the address and password yourself, and never commit or share the password:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-address@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=Roof <your-address@gmail.com>
```

Restart Roof after saving the file. `npm run local` will then use Gmail instead of the local inbox. Google may withhold app passwords on some managed or specially protected accounts; in that case use an SMTP provider your account permits. A real inbox test is still needed after the provider accepts the credentials.

## Production checks

- Put the API behind HTTPS and set `NODE_ENV=production` and `APP_ORIGIN` to the exact public HTTPS origin.
- Run the API and reminder worker as supervised processes that restart after failure. Use a persistent MongoDB deployment and enable regular backups.
- Monitor the API health endpoint, process logs, disk usage, MongoDB availability, and reminder failures.
- The SRS targets 99.5% monthly availability and a two-second p95 for dashboard/search under an agreed workload. Those targets require deployment monitoring and a defined load test; local functional tests alone cannot establish them.
