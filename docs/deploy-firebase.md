# Deploy Firebase (Auth + Firestore rules)

## 1. Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/) → your project.
2. **Authentication** → Sign-in method → enable **Google**.
3. **Authentication** → Settings → Authorized domains → add:
   - `localhost` (dev)
   - `wordhtml.vercel.app` (production)
4. **Firestore** → Create database (if not exists) in production mode, then deploy rules below.

## 2. Local env

Copy `.env.example` to `.env.local` and fill all `NEXT_PUBLIC_FIREBASE_*` values from Project settings → Your apps → Web app.

## 3. Deploy Firestore rules

```bash
npm install -g firebase-tools   # once
firebase login                  # once
firebase use <your-project-id>
npm run firebase:deploy-rules
```

## 4. Vercel

Project → Settings → Environment Variables — add the same `NEXT_PUBLIC_FIREBASE_*` for **Production** (and Preview if needed). Redeploy after changing env vars.

## 5. Verify

```bash
# With .env.local present:
node scripts/firebase-smoke.mjs
```

In the app:

1. Open production URL on two devices.
2. **เข้าสู่ระบบ** with the same Google account.
3. Save snapshot (Ctrl+S) on device A.
4. Open **ประวัติ** on device B — items should appear within a few seconds.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `permission-denied` on templates/history | Deploy `firestore.rules`; ensure user is signed in |
| Sign-in popup blocked | Allow popups; use same authorized domain |
| History empty after sign-in | Save a new snapshot; check Network tab for Firestore writes |
| Templates missing after sign-in | First login migrates legacy `templates/` → `users/{uid}/templates` |
