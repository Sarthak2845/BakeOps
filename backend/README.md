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

Generated PDFs are written to `backend/storage/invoices/` and served statically at `/files/invoices/<file>.pdf` (local disk — fine for dev; swap for object storage before deploying to a host with an ephemeral filesystem).

## Deferred (not in this milestone)

Analytics dashboard, notifications/reminders, AI features, n8n automation, and logo/file uploads to object storage — see PRD §5.5–5.7 and §7.
