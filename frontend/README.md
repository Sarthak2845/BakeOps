# BakeOps app

The Android app for bakers: orders, customers, products, invoices and payments. Built with [Expo](https://expo.dev) (SDK 57) and expo-router; it also runs in a browser for quick development.

For the whole project (API, website, architecture, environments) see the [root README](../README.md). For building APKs and shipping updates, see [RELEASING.md](RELEASING.md).

## Screens

| Route | Screen |
|---|---|
| `(auth)/onboarding` | First-launch tour: five animated slides and a theme picker. Shown once per device |
| `(auth)/welcome`, `login`, `register` | Sign in, or create a shop (logo optional) |
| `(app)/setup` | Shop details after registering (address, phone, GST) |
| `(tabs)/index` | **Today**: deliveries, 7-day strip, prep list, late orders, upcoming occasions |
| `(tabs)/orders` | Orders list with filters; `new` creates an order; `[id]` shows status, the tracking link (WhatsApp or copy) and the invoice |
| `(tabs)/money` | Dues, overdue and received; *Mark paid* |
| `(tabs)/profile` | Account, products, appearance (light, dark or system), shop details, log out |
| `products/`, `products/import` | Product catalog; bulk import from pasted text or past orders |
| `receipt/[id]` | Invoice and receipt, with PDF download |
| `insights` | Monthly revenue, top items, repeat customers |

Signed-out, signed-in, setup and onboarding states are separated with `Stack.Protected` guards in the layouts. There's no redirect logic inside screens.

## Run it

```bash
cp .env.example .env
npm install
npx expo start
```
Then scan the QR code with **Expo Go** (SDK 57) on Android, press `a` for an emulator, or press `w` for the web.

**Testing on a real phone:** the phone must reach your computer's API, so `localhost` won't work. Put your computer's LAN IP in `.env` (e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.23:4000`), keep the phone on the same Wi-Fi, and restart `npx expo start` after changing `.env`. Android emulators use `http://10.0.2.2:4000`.

## Settings

Read at build time from `.env` locally. For APK builds and over-the-air updates they come from **EAS environment variables** instead (see [RELEASING.md](RELEASING.md)).

| Variable | What |
|---|---|
| `EXPO_PUBLIC_API_URL` | BakeOps API address |
| `EXPO_PUBLIC_SITE_URL` | Public website; customer tracking links are `<site>/track/<shop>/<order>` |
| `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary account for shop logos |
| `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | An **unsigned** upload preset, limited to images in one folder |

None of these are secrets: `EXPO_PUBLIC_*` values are bundled into the app.

## Project structure

```
src/
├── app/                 screens (expo-router file-based routes)
│   ├── _layout.tsx        fonts, React Query, theme, toasts, auth; splash until ready
│   ├── (auth)/            onboarding, welcome, login, register
│   └── (app)/             signed-in area: setup, tabs, products, receipt, insights
├── components/          screen-level pieces (pickers, forms) and ui/ (Button, Card, Pill, TextField, Toast, …)
├── constants/theme.ts   colours (light and dark), spacing, radii, fonts; themedStyles()
└── lib/
    ├── api.ts             typed API client; ApiError carries status and field errors
    ├── queries.ts         React Query hooks; mutations invalidate the lists they change
    ├── auth-context.tsx   session (stored on the device), login, register, logout
    ├── business-logic.ts  dashboard maths: deliveries, prep list, dues, occasions, insights
    ├── theme-context.tsx  light, dark or system preference
    └── …                  formatting, validators, errors, links (WhatsApp), CSV export, onboarding
```

### Conventions
- **Styling:** `themedStyles(() => ({ … }))` reads the current theme's `Colors`. Screens call `useTheme()` so they re-render when the theme changes. The React Compiler is turned off (`app.json`) because it cached colours across theme switches.
- **Errors:** every screen shows API failures. Forms map server validation errors onto fields (`getFieldErrors`), and everything else shows a toast or an inline `FormError`. `Alert.alert` is avoided because it does nothing on the web.
- **Money:** amounts arrive from the API as strings (`"950.00"`). Convert with `toNumber` and display with `formatMoney`.
- **Dates:** a delivery at midnight means "any time"; otherwise the hour is the delivery time (`hasDeliveryTime`).

## Checks

```bash
npx tsc --noEmit
npx expo lint
```

## Releasing

APK builds (`preview` → dev API, `production` → prod API), over-the-air updates, and when a new APK is needed: see [RELEASING.md](RELEASING.md).
