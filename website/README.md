# BakeOps website (bakeops.sarthak-rana.me)

Brand site and the public customer order-tracking page (issue #29, #4). Next.js with static export: every page is plain HTML in `out/`, hosted free as a Render static site (`bakeops-site` in `render.yaml`).

## Pages
| Path | What |
|---|---|
| `/` | Landing: hero, features, live tracking demo, how it works, FAQ |
| `/download/` | Android APK link and install steps |
| `/track/<shop>/<order>` | Customer tracking page; polls the API every 15 s |
| `/track/` | How tracking links work; `/track/?demo=1` is a live demo |
| `/contact/`, `/privacy/`, `/terms/` | Contact, privacy policy (needed for the Play Store), terms |

## Run locally
```
cp .env.example .env.local   # point NEXT_PUBLIC_API_URL at your local backend if you like
npm install
npm run dev                  # http://localhost:3000
```
In dev there's no `/track/*` rewrite, so open a real order as `/track/?shop=<slug>&order=<orderId>`, or run the built site with the rewrite:
```
npm run build && npm run preview   # http://localhost:3000, /track/<shop>/<order> links work
```

## Settings
Baked in at build time (set them on Render → `bakeops-site` → Environment). None are secrets.

| Variable | What |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public address of the site (default `https://bakeops.sarthak-rana.me`) |
| `NEXT_PUBLIC_API_URL` | Production API; the tracking page reads `GET /api/track/:slug/:orderId` |
| `NEXT_PUBLIC_APK_URL` | Latest Android APK. Empty → the Download page says "coming soon" |
| `NEXT_PUBLIC_WHATSAPP` | WhatsApp number, international format without `+` (e.g. `919822041556`) |
| `NEXT_PUBLIC_EMAIL` | Contact email |

## Hosting and domain
1. Render dashboard → **Blueprint** → **Sync** (or New → Static Site from `render.yaml`). It builds `website/` from the `prod` branch.
2. Render → `bakeops-site` → **Settings → Custom Domains** → add `bakeops.sarthak-rana.me`.
3. Namecheap (DNS for `sarthak-rana.me`) → **Domain List → Manage → Advanced DNS → Add new record**:
   - Type **CNAME Record**, Host **`bakeops`**, Value: the service's Render address (e.g. `bakeops-site-xxxx.onrender.com`), TTL Automatic.
4. Back on Render, click **Verify**. Render issues the HTTPS certificate automatically, usually within an hour.
5. The app's tracking links use `EXPO_PUBLIC_SITE_URL` (default the same address), so nothing else needs changing.

## Images
- `public/screens/*.png`: app screenshots (390×844 @2x) with sample data, light and dark.
- `public/og.png`, `public/og-track.png`: 1200×630 link previews for WhatsApp/social.
- `public/icon.png`, `public/favicon.png`: copied from `frontend/assets/images`.
