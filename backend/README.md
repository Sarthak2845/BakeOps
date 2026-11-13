# BakeOps Backend

REST API for the BakeOps MVP: business onboarding, customers, orders, and invoicing (PRD §5.1–5.4).

## Setup

1. Get a Postgres connection string (free tier works fine):
   - [Supabase](https://supabase.com) → Project Settings → Database → Connection string (URI)
   - [Neon](https://neon.tech) → Dashboard → Connection Details
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `JWT_SECRET`.
3. Install dependencies: `npm install`
4. Apply the schema: `npm run prisma:migrate` (this also runs `prisma generate`)
5. Start the dev server: `npm run dev` — listens on `http://localhost:4000` (or `PORT` from `.env`)

## Scripts

- `npm run dev` — run with hot reload
- `npm run build` / `npm start` — compile to `dist/` and run
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Jest + Supertest integration tests (run against the same `DATABASE_URL`; each test creates its own business and cleans it up afterward)
- `npm run prisma:migrate` — create/apply a migration
- `npm run prisma:generate` — regenerate the Prisma client after schema changes

## Logging & Debugging

Logs are structured JSON (one object per line, via [pino](https://getpino.io)) written to stdout. In local dev they are pretty-printed instead; set `LOG_PRETTY=false` to see raw JSON. Settings live in `.env` — see `.env.example` (`LOG_LEVEL`, `LOG_PRETTY`, `LOG_SLOW_QUERY_MS`).

**Every line carries** `time` (ISO 8601), `level`, `module` (`http`, `db`, `auth`, `orders`, `invoices`, `error`) and, while handling a request, `requestId` plus `businessId`/`userId` once the caller is authenticated.

**Tracing a request.** Each request gets a `requestId` — taken from an incoming `X-Request-Id` header if present, otherwise a generated UUID. It is returned in the `X-Request-Id` response header and in every error body (`error.requestId`). Given an id from a bug report:

```sh
grep "<requestId>" app.log            # full trace: request -> db ops -> events -> errors -> response
```

| What | Where to look |
|---|---|
| Request summary | `module=http` — method, path, status, `durationMs`, ip, user agent. 4xx → `warn`, 5xx → `error`, client disconnects → `aborted: true` |
| Rejected requests | `module=error` — `validation failed` lists failing fields (`issues[].path`) without the submitted values; `request rejected` gives the `ApiError` reason |
| Crashes (500) | `unhandled error` at `error` level with full stack (`err.stack`) and Prisma `prismaCode`/`prismaMeta` when relevant |
| DB | `db operation` (debug) / `slow db operation` (warn, over `LOG_SLOW_QUERY_MS`) / `db operation failed` (error) with `model`, `operation`, `durationMs`. Query arguments are never logged |
| Business events | `event` field, e.g. `grep "\"orderId\":\"<id>\""` shows an order’s full history |

**Business events:** `order.created`, `order.updated`, `order.status_changed` (`fromStatus`/`toStatus`), `order.status_change_rejected`, `order.update_blocked`, `order.deleted`, `order.delete_blocked`, `invoice.created`, `invoice.pdf_generated`, `invoice.pdf_failed`, `invoice.generate_rejected`, `invoice.payment_recorded`, `invoice.overpaid`, `receipt.viewed`, `receipt.not_found`, `auth.business_registered`, `auth.login_succeeded`, `auth.login_failed` (`reason`: `unknown_email`/`bad_password`), `auth.register_conflict`.

Passwords, tokens and the `Authorization` header are redacted; emails in auth events are masked (`j***@example.com`).

With [jq](https://jqlang.org): `npm run dev | jq -c "select(.level==\"error\")"` (with `LOG_PRETTY=false`), or `jq -c "select(.event==\"order.status_changed\")" app.log`.

## Auth

All endpoints except `POST /api/auth/*` and `GET /r/:slug/:invoiceNumber` require:

```
Authorization: Bearer <token>
```

The token is returned from register/login and encodes `userId`, `businessId`, and `role`. Every resource is scoped to the caller's `businessId` — there is no way to read or write another business's data through the API.

## Manual Testing

Import [`postman/BakeOps.postman_collection.json`](postman/BakeOps.postman_collection.json) into Postman. It's self-contained:
- `baseUrl` defaults to `http://localhost:4000`
- **Auth → Register business + owner** saves `token`/`businessId`/`businessSlug` into collection variables automatically (uses a random email each run via `{{$randomInt}}`)
- **Customers → Create customer**, **Orders → Create order**, and **Orders → Generate invoice** likewise save the ids/invoice number the later requests need
- Just run the folders top-to-bottom: Auth → Business → Customers → Orders → Invoices → Public Receipt

## API Reference

### Auth & Business (PRD 5.1)
| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | `{ businessName, category?, ownerName, email, password, phone? }` → creates business + owner, returns `{ token, business, user }` |
| POST | `/api/auth/login` | `{ email, password }` |
| GET | `/api/business/me` | Current business profile |
| PATCH | `/api/business/me` | Update profile fields (name, logoUrl, address, gstin, currency, timezone, ...) |

### Customers (PRD 5.2)
| Method | Path | Notes |
|---|---|---|
| POST | `/api/customers` | `{ name, phone, email?, address?, notes? }`. 409 if phone already used in this business |
| GET | `/api/customers?search=` | Search by name/phone |
| GET | `/api/customers/:id` | Includes order history, occasions, `lifetimeValue`, `orderCount` |
| PATCH | `/api/customers/:id` | Partial update |
| DELETE | `/api/customers/:id` | |
| POST | `/api/customers/:id/occasions` | `{ label, month, day }` — recurring yearly occasion |
| DELETE | `/api/customers/:id/occasions/:occasionId` | |

### Orders (PRD 5.3)
| Method | Path | Notes |
|---|---|---|
| POST | `/api/orders` | `{ customerId, orderDate?, deliveryDate?, occasionTag?, advancePaid?, notes?, items: [{ description, quantity, unitPrice }] }`. `totalAmount`/`balanceDue` are computed server-side |
| GET | `/api/orders?status=&customerId=&occasionTag=&from=&to=` | `from`/`to` filter on `deliveryDate` |
| GET | `/api/orders/:id` | |
| PATCH | `/api/orders/:id` | Edit items/notes/dates/advance while not yet Delivered/Cancelled — totals recompute |
| PATCH | `/api/orders/:id/status` | Pipeline: `INQUIRY → CONFIRMED → IN_PROGRESS → READY → DELIVERED`, one step forward at a time. `CANCELLED` allowed from any state except `DELIVERED` |
| DELETE | `/api/orders/:id` | Blocked once an invoice exists |

### Invoices (PRD 5.4)
| Method | Path | Notes |
|---|---|---|
| POST | `/api/orders/:id/invoice` | Generates a sequential, tenant-scoped invoice number (e.g. `MOM-2026-0042`) and a PDF. 409 if the order already has one |
| GET | `/api/invoices?paymentStatus=` | |
| GET | `/api/invoices/:id` | |
| POST | `/api/invoices/:id/payments` | `{ amount, method?, paidAt? }` — recomputes `paymentStatus` (UNPAID/PARTIAL/PAID) and the order's `balanceDue` |
| GET | `/r/:slug/:invoiceNumber` | **Public, no auth** — shareable HTML receipt page, with a link to the PDF |
| GET | `/r/:slug/:invoiceNumber/pdf` | **Public, no auth** — the invoice PDF (this is the invoice's `pdfUrl`) |

PDFs are rendered on each request, not stored, so they work on hosts with a temporary disk (like Render) and always show the current payment status.

## Products

| Method | Path | Notes |
|---|---|---|
| POST | `/api/products` | `{ name, unitPrice, unit? }`. 409 if the shop already has this name (case-insensitive) |
| POST | `/api/products/bulk` | `{ products: [{ name, unitPrice, unit? }] }`, up to 500. Names already saved are skipped. Returns `{ created, skipped }` |
| GET | `/api/products?search=` | Sorted by name; `search` matches part of the name, case-insensitive |
| GET | `/api/products/:id` | |
| PATCH | `/api/products/:id` | Any of the create fields; `unit: null` clears the unit |
| DELETE | `/api/products/:id` | Past orders are unaffected: order items keep their own copy of the name and price |

## Deploying

Two environments on Render, described in `render.yaml` at the repo root:

| Branch | Render service | How it deploys |
|---|---|---|
| `main` | `bakeops-api-dev` (dev) | Render deploys it automatically once `Backend CI` passes on `main` |
| `prod` | `bakeops-api` (production) | Only through the **Deploy to production** GitHub workflow |

**Release flow**
1. Feature branch → PR into `main` → merge. Dev updates by itself.
2. When dev looks good → PR from `main` into `prod` → merge. The **Deploy to production** workflow (`.github/workflows/deploy-prod.yml`) then:
   1. runs the backend tests, typecheck and build (`Backend CI`);
   2. triggers the production deploy through Render's **Deploy Hook**;
   3. waits until Render reports the deploy as `live` (fails if the build or start fails);
   4. checks `PRODUCTION_URL/health`.

   If the tests fail, production is not touched. You can re-run it by hand from Actions → Deploy to production → Run workflow.

**One-time setup**
1. **Two databases (Neon):** in your Neon project, use the `main` branch for production and create a `dev` branch for dev (Branches → New branch). Each branch has its own data and its own connection string. For each one: **Dashboard → Connect** → pick the branch, database `neondb`, role → turn **Connection pooling off** → copy the URL (`postgresql://…@ep-….neon.tech/neondb?sslmode=require`). The direct (non-pooled) URL is the safe choice because `prisma migrate deploy` runs with it during the build.
2. **Create the services:** Render dashboard → **New → Blueprint** → pick this repo. It creates both services from `render.yaml`. Fill in `DATABASE_URL` (each its own database) and optionally `CLOUDINARY_CLOUD_NAME`. `JWT_SECRET` is generated separately for each.
3. **Connect the production pipeline** — GitHub repo → Settings → Secrets and variables → Actions:
   - Secret `RENDER_DEPLOY_HOOK_URL`: Render → `bakeops-api` → Settings → **Deploy Hook** (a secret URL — anyone with it can trigger a deploy).
   - Secret `RENDER_API_KEY`: Render → Account settings → **API Keys**. Lets the workflow wait for the real deploy result; without it, it just waits 5 minutes and checks `/health`.
   - Variable `PRODUCTION_URL`: e.g. `https://bakeops-api.onrender.com`.
4. **First deploys:** check `https://<service>.onrender.com/health` returns `{"status":"ok"}` on both.
5. **Point the app at an environment:** set `EXPO_PUBLIC_API_URL` in `frontend/.env` to the dev or production URL and restart Expo.

On the free plan each service sleeps after 15 minutes without traffic; the first request after that takes about a minute.

## Deferred (not in this milestone)

Analytics dashboard, notifications/reminders, AI features and n8n automation — see PRD §5.5–5.7 and §7.
