# Releasing the Android app

BakeOps ships as an **APK** (no Play Store). Expo's build service (EAS) makes the
APK, and **EAS Update** pushes new versions of the app's screens and logic to
installed phones without a reinstall.

| Profile | Backend | Update channel | Who |
|---|---|---|---|
| `preview` | dev API | `preview` | You and testers |
| `production` | prod API | `production` | Shops |

App settings (`EXPO_PUBLIC_*`) live in **EAS environment variables** (`preview` and
`production`), not in `.env` or `eas.json`, because `eas update` only reads those.
Local `.env` is for running on your own computer.

## One-time setup
```
npm install -g eas-cli
eas login
cd frontend
eas init                 # links the project to your Expo account (adds extra.eas.projectId)
eas update:configure     # adds the updates URL to app.json
```
Then add the settings for each environment (repeat with `--environment preview`
and the **dev** API address):
```
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_API_URL  --value https://bakeops-api-njig.onrender.com
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_SITE_URL --value https://bakeops.sarthak-rana.me
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME    --value <cloud name>
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET --value <upload preset>
```
For automatic updates on release: expo.dev → Account settings → **Access tokens** →
create one → GitHub → Settings → Environments → `production` → secret **`EXPO_TOKEN`**.

## Make an APK
```
eas build -p android --profile preview      # test build, dev backend
eas build -p android --profile production   # real build, prod backend
```
EAS prints an install link and QR code. Put the production APK's link in the
website's `NEXT_PUBLIC_APK_URL` (Render → `bakeops-site`) so the Download page
offers it. Build files on Expo's servers may expire depending on your plan, so for
a link that lasts, attach the APK to a GitHub Release and link that instead.

A new APK is only needed when **native** code changes: a new native library, an
Expo SDK upgrade, or native settings in `app.json` (package name, permissions, icon).

## Ship an update (no reinstall)
- **Automatic:** merge `main` → `prod`. The **Deploy to production** workflow
  deploys the backend if it changed, then publishes an update to the `production`
  channel if the app changed. Phones download it in the background and switch to
  it the next time the app is opened.
- **By hand:** `eas update --channel production --environment production --platform android --message "…"`
- **Testers:** `eas update --channel preview --environment preview --platform android --message "…"`
- **Undo a bad update:** `eas update:rollback`

The workflow refuses to publish if no production APK matches the current native
code ("Native change detected"): build and share a new APK first.
