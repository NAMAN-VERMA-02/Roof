# Roof

**Your warranties and product documents, together under one roof.**

Roof is a full-stack warranty and document vault. It gives each user a private place to track products, see when coverage ends, and keep receipts, invoices, warranty cards, manuals, and service records ready when they are needed. A dashboard highlights upcoming expiries, while configurable email reminders help users act before coverage runs out.

Built as a college project with **React, Node.js, Express, and MongoDB**.

## Features

| Area | What Roof does |
| --- | --- |
| Accounts | Register, sign in, and sign out. Each user's products, documents, contacts, and reminders are isolated from other accounts. |
| Products | Add, search, filter, edit, and delete products with purchase details, warranty terms, and notes. |
| Warranty tracking | Calculate an end date from a start date and duration, or enter the manufacturer's stated end date. Show active, expiring, expired, and incomplete coverage. |
| Document vault | Upload and privately preview or download PDF, PNG, and JPEG proof. Search across products and filter by document type. |
| Dashboard | See product and document totals, coverage status, and upcoming warranty expiries. |
| Reminders | Choose email reminder offsets, inspect delivery history, and let a background worker send due messages. |
| Service contacts | Save a product's service center name, phone number, address, and website. |

### Typical workflow

1. Create an account and add a product with its purchase and warranty details.
2. Upload its receipt, invoice, warranty card, or other useful documents.
3. Find the product or its files later through search and the document vault.
4. Check coverage on the dashboard and receive email reminders before expiry when SMTP is configured.
5. Open the saved proof and service contact when a repair or warranty claim is needed.

## Technology and architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Web app | React 19, React Router, Vite, JavaScript, CSS | Responsive interface, forms, dashboard, and document previews |
| API | Node.js, Express 5, Zod | Authentication, validation, owner checks, and application endpoints |
| Database | MongoDB, Mongoose | Users, sessions, products, document metadata, contacts, and reminder jobs |
| File storage | MongoDB GridFS | Private PDF and image content |
| Email worker | Node.js, Nodemailer | Scheduled reminder processing and SMTP delivery |

```text
Browser (React)
    │  /api requests and session cookie
    ▼
Express API ───────────────► MongoDB collections
    └── document uploads ───────► MongoDB GridFS

Reminder worker ───────────► MongoDB reminder jobs
    └── due email ──────────────► SMTP server
```

The Vite development server proxies `/api` to Express. In production, Express can serve the built React app and API from the same origin.

## Quick start

**Requirements:** Node.js 22.12 or newer, npm, and an internet connection for the first local MongoDB binary download.

From the repository root:

```bash
npm install
npm run local
```

Open **[http://localhost:5173](http://localhost:5173)**, then register an account. The API is at `http://localhost:4000`; `GET /api/health` returns its health status.

`npm run local` starts the frontend, API, reminder processor, a local MongoDB instance, and a local email inbox at **[http://localhost:8025](http://localhost:8025)**. Database data is stored in the ignored `.local-mongo/` directory; captured emails are in `.local-mail/`. Both survive restarts. Reminder emails appear in the local inbox without requiring an external SMTP account; they are not delivered to real email addresses. Stop the processes with `Ctrl+C`.

For a temporary database that is removed when the process stops, run `npm run demo` instead.

### Use your own MongoDB

Create `server/.env` from the checked-in template and set `MONGODB_URI`:

```powershell
Copy-Item server/.env.example server/.env
```

Then run:

```bash
npm run dev
```

`npm run dev` starts the Express API, a separate reminder worker, and Vite. It expects MongoDB to be available at the configured URI. Use a local MongoDB server or MongoDB Atlas with read/write access to the Roof database. The `.env` file is ignored by Git.

## Configuration

All server settings belong in `server/.env`. See [`server/.env.example`](server/.env.example) for the complete template.

| Variable | Purpose | Development default |
| --- | --- | --- |
| `NODE_ENV` | Set to `production` for deployment | `development` |
| `PORT` | Express port | `4000` |
| `MONGODB_URI` | MongoDB connection string for `npm run dev` and production | `mongodb://127.0.0.1:27017/roof` |
| `APP_ORIGIN` | Exact allowed browser origin | `http://localhost:5173` |
| `SMTP_HOST` | SMTP server; required for real email delivery | Unset |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | `true` for implicit TLS, otherwise `false` | `false` |
| `SMTP_USER`, `SMTP_PASS` | SMTP authentication when your provider requires it | Unset |
| `SMTP_FROM` | Sender address shown on reminder emails | `Roof <no-reply@example.com>` |
| `WORKER_INTERVAL_MS` | Time between reminder checks | `60000` |

The local and demo commands provide their own MongoDB instances; they still read other settings from `server/.env`. `npm run local` automatically captures reminder emails at `http://localhost:8025` when `SMTP_HOST` is unset. If `SMTP_HOST` is set, it sends using that provider instead. **Real inbox delivery requires working SMTP credentials.** With `npm run dev` or `npm run demo`, leaving `SMTP_HOST` unset causes due attempts to be retried or marked failed rather than sent.

## Project commands

| Command | Purpose |
| --- | --- |
| `npm run local` | Start the full app with persistent local MongoDB data and a local email inbox |
| `npm run demo` | Start the full app with disposable MongoDB data |
| `npm run dev` | Start the API, worker, and frontend using `MONGODB_URI` |
| `npm test` | Run server and client tests |
| `npm run build` | Build the React app into `client/dist/` |
| `npm run start` | Start the API with an existing MongoDB connection |
| `npm run worker -w server` | Start the reminder worker separately |

## API overview

All routes below are under `/api`. Private routes require a valid session cookie; requests are scoped to the signed-in user.

| Area | Routes |
| --- | --- |
| Authentication | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Products | `GET/POST /products`, `GET/PATCH/DELETE /products/:id` |
| Documents | `GET /documents`, `GET/POST /products/:productId/documents`, `PATCH/DELETE /documents/:id`, `GET /documents/:id/file` |
| Dashboard | `GET /dashboard/summary` |
| Reminders | `GET/PUT /reminder-preferences`, `GET /reminders/history` |
| Service contacts | `GET/POST /products/:productId/service-centers`, `PATCH/DELETE /service-centers/:id` |

The older receipt-specific routes remain available for receipt records.

## Data rules and privacy

- Passwords are hashed. Sessions use random tokens stored as hashes in MongoDB and sent in `HttpOnly`, `SameSite=Strict` cookies. Sign-in endpoints are rate limited.
- Every private route checks the account owner. Document files are streamed through authenticated endpoints; GridFS is not publicly exposed.
- Uploads are limited to **10 MB per file** and accepted only when their file signatures match PDF, PNG, or JPEG.
- A calculated warranty ends on the day before the start date's anniversary after the entered number of calendar months. A supplied manufacturer end date takes precedence. Coverage stays active through its end date; the final 30 days appear as **expiring**.
- Reminder times use the user's time zone. The worker tracks pending, sent, retried, failed, and cancelled jobs. SMTP acceptance followed by a worker crash can still result in a retry, so external email delivery is not guaranteed to be exactly once.

## Testing

```bash
npm test
npm run build
```

The server tests cover date rules, account isolation, product and document operations, contacts, dashboard results, validation, and reminder processing. The client test covers warranty date preview. Tests use temporary MongoDB and a local SMTP server; they do not require real inbox credentials.

## Repository layout

```text
client/                 React application, styles, and client tests
server/src/routes/      Express API routes
server/src/lib/         Authentication, dates, and reminder logic
server/src/models.js    Mongoose schemas
server/src/worker.js    Email reminder worker
server/test/            API and date tests
server/.env.example     Server configuration template
Warranty_Receipt_Vault_Architecture.pdf   Initial architecture document
```

## Deployment notes

Build the frontend with `npm run build`, configure a persistent MongoDB, and run the API (`npm run start`) and worker (`npm run worker -w server`) as separate processes. Set `NODE_ENV=production` and `APP_ORIGIN` to the site's exact HTTPS origin. Serve the app behind HTTPS so production session cookies work, and back up both MongoDB collections and GridFS files. Follow the [backup and recovery guide](docs/OPERATIONS.md). Keep `server/.env`, `.local-mongo/`, and `node_modules/` out of Git.

The [architecture PDF](Warranty_Receipt_Vault_Architecture.pdf) documents the initial requirements and design. The searchable document vault is an extension of that initial scope.
