# Deploy Firebase (Auth + Firestore rules)

Cloud history (`users/{uid}/snapshots`) and per-user templates **require Firestore security rules** to be deployed. Without rules, save/delete shows `permission-denied` and toast *"ไม่สามารถลบประวัติบนคลาวด์ได้"*.

## 1. Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/) → project **webhtml-d6832**.
2. **Authentication** → Sign-in method → enable **Google**.
3. **Authentication** → **Settings** tab → **Authorized domains** → add:
   - `localhost` (dev)
   - `wordhtml.vercel.app` (production)
4. **Firestore** → create database (if missing) in production mode.

## 2. Local env

Copy `.env.example` to `.env.local` and fill all `NEXT_PUBLIC_FIREBASE_*` values from Project settings → Your apps → Web app.

## 3. Deploy Firestore rules (required for cloud delete/sync)

Project id is pinned in [`.firebaserc`](../.firebaserc) as `webhtml-d6832`.

### Option A — CLI (recommended)

```bash
npm install -g firebase-tools   # once
firebase login                  # once — opens browser
cd wordhtml
firebase use webhtml-d6832
npm run firebase:deploy-rules
```

### Option B — Firebase Console (no CLI)

1. Open [Firestore Rules](https://console.firebase.google.com/project/webhtml-d6832/firestore/rules)
2. Replace editor contents with the full contents of [`firestore.rules`](../firestore.rules) in this repo
3. Click **Publish**

Rules must include `users/{userId}/snapshots/{snapshotId}` with `request.auth.uid == userId`.

## 4. Vercel

Project → Settings → Environment Variables — add all `NEXT_PUBLIC_FIREBASE_*` for **Production**. **Redeploy** after changing env vars (Next.js inlines them at build time).

## 5. Verify

```bash
# With .env.local present:
node scripts/firebase-smoke.mjs
```

In the app (signed in):

1. Save snapshot (Ctrl+S)
2. Delete one item from **ประวัติ** — should succeed without toast error
3. Open on second device with same Google account — deleted item should not reappear

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Toast *ไม่สามารถลบประวัติบนคลาวด์ได้* + `permission-denied` | Deploy rules (section 3) |
| Item deleted then reappears | Update app to latest (merge pause on delete); redeploy |
| `unauthenticated` on delete | Sign in again (Top bar → เข้าสู่ระบบ) |
| Sign-in popup blocked | Allow popups; check authorized domains |
| History empty after sign-in | Save a new snapshot |
| Templates missing after sign-in | First login migrates legacy `templates/` → `users/{uid}/templates` |
