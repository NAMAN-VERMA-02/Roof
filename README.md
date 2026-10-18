# Roof

Roof is a full-stack warranty and receipt vault built for the college project requirements in this folder. Users can privately manage products and warranty dates, attach receipts, search their vault, save service contacts, and schedule email reminders.

## Stack

- React 19, React Router, Vite and plain JavaScript/CSS for the responsive frontend.
- Node.js, Express, Mongoose and MongoDB for the API and structured data.
- MongoDB GridFS for private PDF/JPEG/PNG receipts.
- A separate Node.js reminder worker and Nodemailer SMTP delivery.

## Run locally with saved data

Requirements: Node.js 22+ and npm. In `D:\PE`:

```powershell
npm install
npm run local
```

Open **http://localhost:5173** and create an account. This starts MongoDB locally and stores its files in `D:\PE\.local-mongo`, so products and receipts remain after restart. It uses a MongoDB binary downloaded by the development dependency; use a separately managed MongoDB for deployment. Without SMTP settings, reminder attempts are recorded as failed rather than silently marked sent.

For a disposable demo instead, run `npm run demo`. Its database is erased when the command stops.

## Hosted MongoDB or separately managed local MongoDB

1. Create `server/.env` from `server/.env.example`.
2. Set `MONGODB_URI` to your local MongoDB or MongoDB Atlas connection string. Use a database user with read/write access to Roof's database.
3. Set `APP_ORIGIN` to the exact browser origin. For Vite development this is `http://localhost:5173`.
4. For actual email delivery, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` using your mail provider's SMTP credentials. Do not commit this file.
5. Run:

```powershell
npm install
npm run dev
```

The frontend runs at **http://localhost:5173** and the API at **http://localhost:4000**. `npm run dev` starts the API, worker, and Vite together. If you run the processes separately, use `npm run dev -w server`, `npm run worker -w server`, and `npm run dev -w client`.

For deployment, run `npm run build`, set `NODE_ENV=production`, `APP_ORIGIN` to the HTTPS URL, and start the API (`npm run start`) plus the worker (`npm run worker -w server`) as separate processes. The API serves the built frontend from `client/dist`. Put it behind HTTPS, use a persistent MongoDB, and back up the database including GridFS files. `Secure` authentication cookies require HTTPS in production.

## What is implemented

| Area             | Behavior                                                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication   | Registration, sign-in/out, hashed passwords, seven-day opaque sessions stored in MongoDB, rate-limited auth endpoints, owner checks on every private route. |
| Products         | Create, list, search, filter, inspect, edit, delete; warranty dates calculated from calendar months or entered from manufacturer terms.                     |
| Receipts         | Optional upload, type/size validation, private GridFS storage, owner-checked preview/download, deletion.                                                    |
| Dashboard        | Product and receipt counts, coverage categories, upcoming expiries.                                                                                         |
| Reminders        | Per-user email settings, due jobs, atomic claiming, bounded retries, delivery history.                                                                      |
| Service contacts | Product-linked names, phone numbers, addresses, and HTTPS websites, with full create/view/edit/delete controls.                                             |

The calculated last covered day is the warranty start date plus the entered number of calendar months, minus one day. When a target month is shorter, the anniversary is clamped to that month's last day before subtracting one day. Users can enter the manufacturer-stated end date instead. A warranty stays active through its end date; it is “expiring soon” during its last 30 days. Missing end dates are “incomplete.”

## Tests and code layout

```powershell
npm test
npm run build
```

The API tests use a temporary MongoDB and cover account isolation, product CRUD, receipt retrieval, contacts, dashboard results, validation, and reminder-job processing. The client test checks the warranty preview calculation. A local SMTP server test verifies actual email transport; delivery to real inboxes needs your provider settings.

```text
client/src/       React pages, components, auth context, API helper, styles
server/src/       Express routes, MongoDB models, date rules, reminder worker
server/test/      API and date tests
client/test/      Client date-preview test
```

## Operational notes

- Only authenticated owners can access their records or stream receipts. GridFS is never public.
- Receipts are limited to 10 MB and checked by file signature for PDF, PNG, or JPEG.
- The worker uses a unique reminder key and an atomic claim to prevent ordinary duplicate scheduling. A crash after an SMTP server accepts a message but before MongoDB records success can still cause a retry; exactly-once external email delivery cannot be guaranteed by the app alone.
- `npm run local` keeps data between restarts in `.local-mongo`; `npm run demo` is temporary. A managed MongoDB URL is recommended for deployment.
- The supplied SRS and diagrams are reflected in the [architecture PDF](Warranty_Receipt_Vault_Architecture.pdf). OCR, shared family accounts, automatic claims, and push notifications are outside this release.
