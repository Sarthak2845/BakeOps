# BakeOps — Multi-Tenant Business Platform for Home Bakers & Small Sellers
### Product Requirements Document (PRD) & Technical Plan v1.0

---

## 1. Executive Summary

**Problem Statement:** Home-based businesses (starting with cake baking, generalizable to any small seller) lack affordable tools to (a) issue professional receipts/invoices to customers, and (b) track orders, repeat-customer patterns, and sales performance. Today this is done on paper notebooks or WhatsApp chats — error-prone, unsearchable, and impossible to analyze.

**Proposed Solution:** A multi-tenant SaaS web application ("BakeOps") where any small business owner registers their business (name, logo, address, GST/tax info if applicable), then manages customers, orders, and auto-generated receipts/invoices through a clean dashboard — with built-in analytics, customer repeat-purchase intelligence, and optional AI + automation (n8n) layers.

**Target Users:** Home bakers, tiffin services, tailors, home-based cosmetics sellers, small caterers — any single-location, owner-operated business that takes custom orders.

---

## 2. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Replace notebook tracking | 100% of orders entered digitally |
| Professional receipts | Receipt generated in <30 sec, downloadable as PDF/shareable link |
| Customer repeat insight | System flags "due for repeat order" customers automatically |
| Business visibility | Owner can answer "how's my business doing this month" in one screen |
| Adoption beyond Mom | At least 3 other small business categories onboarded post-MVP |

---

## 3. User Personas

1. **Owner/Admin (your Mom)** — runs the business, takes orders over phone/WhatsApp, needs receipts and a clear view of sales.
2. **Staff/Helper** (future) — may take orders but shouldn't see financials.
3. **Customer** — receives a receipt link/PDF; optionally has a lightweight portal to view past orders.
4. **Platform Super-Admin (you)** — manages tenants (businesses), billing, platform health.

---

## 4. System Architecture Overview

**Pattern:** Multi-tenant SaaS, single codebase, data isolated by `business_id` (row-level multi-tenancy — simplest and cheapest to start; can move to schema-per-tenant later if you scale to thousands of businesses).

```
┌─────────────────────┐
│   Frontend (Web)     │  React/Next.js — Owner Dashboard + Public Receipt View
└─────────┬────────────┘
          │ REST/GraphQL (HTTPS)
┌─────────▼────────────┐
│   Backend API         │  Node.js (NestJS/Express) or Django/FastAPI
│  - Auth & Tenants     │
│  - Orders & Customers  │
│  - Invoicing Engine    │
│  - Analytics Engine    │
│  - AI Service Layer    │
└─────────┬────────────┘
          │
┌─────────▼────────────┐      ┌──────────────────┐
│  PostgreSQL (primary)│◄────►│  n8n (automation) │
└──────────────────────┘      └──────────────────┘
          │
┌─────────▼────────────┐
│  Object Storage (S3/  │  Logos, generated PDF receipts
│  Cloudinary/Supabase) │
└──────────────────────┘
```

---

## 5. Core Modules & Detailed Functional Requirements

### 5.1 Module: Business Onboarding (Tenant Registration)
- Sign up with email/phone + OTP or password.
- Business profile setup wizard:
  - Business name, category (Bakery, Tailoring, etc. — kept generic via a `category` field)
  - Logo upload
  - Address, phone, email, optional GSTIN/tax ID
  - Currency, timezone
  - Receipt template choice (see 5.3)
- Each business gets a unique subdomain or slug for customer-facing receipt pages: `bakeops.app/r/mom-cakes`
- Plan/tier selection (Free/Paid — for your own future monetization)

**Data isolation:** every table keyed by `business_id`, enforced at the API layer (and via Postgres Row-Level Security if you want defense-in-depth).

### 5.2 Module: Customer Management (CRM-lite)
- Add customer manually or auto-create from new order (name, phone, email optional, address, notes).
- Customer profile page shows:
  - Full order history
  - Total lifetime value (₹ spent)
  - Tags: e.g. "Birthday: 14 March", "Anniversary: 2 June" — captured once, reused every year
  - Auto-flag: **"Likely repeat occasion in next 30 days"** based on past order dates + tagged occasions
- Deduplication: match by phone number primarily.

### 5.3 Module: Order Management
- Create Order form:
  - Customer (search existing or add new)
  - Items: cake flavor, weight/size, custom message, quantity, unit price (or generic line-items for any product so it's not cake-specific)
  - Order date, delivery date/time
  - Occasion tag (Birthday/Anniversary/Festival/Custom) — this powers the repeat-customer intelligence
  - Advance paid / balance due
  - Status pipeline: `Inquiry → Confirmed → In Progress → Ready → Delivered → Cancelled`
- Order list view: filter by status, date range, customer, occasion.
- Calendar view: see all deliveries for the week/month (critical for a baker planning kitchen time).

### 5.4 Module: Receipt / Invoice Generator
- Auto-generate on order confirmation or on demand.
- Template includes: business logo, name, address, invoice #, date, customer details, itemized list, subtotal, discount, tax (optional, toggleable for businesses without GST), total, advance paid, balance due, payment status, footer note (e.g. "Thank you for ordering!").
- Output formats:
  - PDF (downloadable)
  - Shareable web link (so Mom can just send a WhatsApp link instead of a file)
  - Auto-send via WhatsApp/Email/SMS (via automation layer, see Section 7)
- Sequential, tenant-scoped invoice numbering (e.g. `MOM-2026-0042`) for proper record-keeping.
- Payment status tracking: Unpaid / Partially Paid / Paid, with simple payment log.

### 5.5 Module: Analytics Dashboard
- **Sales overview:** revenue by day/week/month/year, order count, average order value.
- **Top customers** by lifetime value / order frequency.
- **Top products/flavors** (or top SKUs generically).
- **Occasion-based forecasting:** "X customers had a birthday order around this time last year — reach out now."
- **Outstanding dues** widget: total balance pending across customers.
- **Repeat-rate metric:** % of customers who've ordered more than once.
- Export to Excel/CSV (use your xlsx skill conceptually when building exports).

### 5.6 Module: Notifications & Reminders
- Upcoming delivery reminders (today/tomorrow) for the owner.
- "Customer X's daughter's birthday is in 5 days, they ordered last year" — proactive nudge.
- Payment due reminders.

### 5.7 Module: AI Features (genuinely useful, not gimmicky)
1. **Smart repeat-customer prediction** — beyond simple date matching, use a lightweight model/LLM call that looks at order history + occasion tags and ranks customers most likely to order in the next N days, with a reason ("ordered for Diwali both last 2 years").
2. **Natural-language order entry** — owner types/speaks "2kg chocolate cake for Sharma ji, his son's birthday, deliver Saturday" → AI parses this into a structured order draft for confirmation. Huge UX win for a non-technical user like your Mom — voice-to-order is probably your single best AI feature.
3. **AI-drafted customer messages** — auto-draft a friendly WhatsApp message for receipts, reminders, or birthday wishes ("Hi Mrs Sharma, hope you're doing well! It's almost time for...").
4. **Receipt/description auto-fill** — given a short note, AI expands it into a clean itemized line (e.g. "1kg choc truffle, eggless" → properly formatted line item).
5. **Sales insight summaries** — weekly auto-generated plain-English summary: "This month you made ₹38,400 from 22 orders, up 12% from last month. Chocolate cakes were your best seller."
6. **Demand forecasting** (later stage) — predict busy periods (festivals, wedding season) so the owner can plan inventory/time.

> Implementation note: these can all be built using the Anthropic API (Claude) directly from your backend — structured-output JSON for parsing orders, plain text generation for summaries/messages.

### 5.8 Module: Settings & Team
- Manage business profile, logo, receipt template, tax settings.
- Add staff users with restricted permissions (later phase).
- Manage subscription/plan (if you ever monetize this for other businesses).

---

## 6. Suggested Additional Features (Beyond What You Listed)

- **Inventory/ingredient tracking** (optional, advanced): track raw material usage per recipe to estimate cost & profit margin per cake.
- **Expense tracking**: simple expense log (ingredients, packaging, delivery) so net-profit (not just revenue) analytics is possible.
- **Customer-facing order status page**: customer can check "Is my cake ready?" via the shareable link.
- **Multi-channel order capture**: a simple public "Order Form" link the business can share on Instagram/WhatsApp status, which feeds directly into the Orders module as an "Inquiry."
- **Review/feedback collection**: auto-send a feedback link after delivery.
- **Referral tracking**: tag "referred by" on customers — useful word-of-mouth businesses like this thrive on it.
- **Loyalty/discount rules**: e.g. auto 10% off after 5th order.

--

**Recommended workflows:**

| Trigger (from your app via webhook) | n8n Workflow | Outcome |
|---|---|---|
| Order confirmed | Generate receipt link → send via WhatsApp (WhatsApp Business API / Twilio) | Customer instantly gets receipt |
| Order status → "Ready" | Send WhatsApp/SMS "Your order is ready for pickup/delivery" | Reduces manual follow-up |
| Daily cron, 8 AM | Query upcoming occasions in next 7 days → send owner a digest | Proactive sales reminder |
| Payment marked "Paid" | Send thank-you message + feedback link | Better customer experience |
| New order via public order-form | Push notification/WhatsApp to owner: "New inquiry from..." | Fast response time |
| Weekly cron | Pull sales data from API → generate AI summary → email/WhatsApp to owner | Automated reporting |
| Invoice overdue (balance due X days) | Reminder message to customer | Improves collections |

This keeps your core app simple and lets you add/change integrations (WhatsApp, Email, SMS, Google Sheets backup, etc.) visually in n8n without redeploying code.

---

## 8. Data Model (Core Entities)

```
Business
 ├─ id, name, category, logo_url, address, phone, email, gstin, currency, timezone, plan

User (Owner/Staff)
 ├─ id, business_id, name, email, role (owner/staff), password_hash

Customer
 ├─ id, business_id, name, phone, email, address, notes
 
CustomerOccasion
 ├─ id, customer_id, label (Birthday/Anniversary/Custom), date (recurring yearly)

Order
 ├─ id, business_id, customer_id, order_date, delivery_date, status,
 │  occasion_tag, advance_paid, total_amount, balance_due, notes

OrderItem
 ├─ id, order_id, description, quantity, unit_price, line_total

Invoice
 ├─ id, business_id, order_id, invoice_number, issued_date,
 │  pdf_url, payment_status

Payment
 ├─ id, invoice_id, amount, method, paid_at

Expense (optional module)
 ├─ id, business_id, category, amount, date, note
```

