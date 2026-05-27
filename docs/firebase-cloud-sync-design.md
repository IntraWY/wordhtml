# Firebase storage: History vs Templates & planned cloud sync

## Current behavior (v0.1.x)

| Feature | UI | Storage | Cross-device |
|---------|-----|---------|--------------|
| Document history (snapshots) | Top bar → **ประวัติ** | `localStorage` key `wordhtml-editor` → `history[]` | **No** |
| In-progress document | Editor | Memory only | **No** |
| Named templates | File → **Template** | Firestore `templates/{id}` | **Yes** (if Firebase env at build + rules allow) |
| Cleaner prefs, page setup | Settings / persist | Same `wordhtml-editor` partial state | **No** |

### Why history disappears on another PC

History is **not** written to Firebase. Each browser has its own `localStorage`. Using the same URL on notebook and PC does not merge history.

### Self-check (DevTools)

1. On the machine **with** history: Application → Local Storage → your origin → `wordhtml-editor` → JSON should contain `"history":[{...}]`.
2. On the PC: same key is often missing or `"history":[]` — expected.
3. For templates: open Template panel; list comes from Firestore `templates` collection (not from `wordhtml-editor`).

Smoke test (requires `.env.local`):

```bash
node scripts/firebase-smoke.mjs
```

---

## Code map

| Module | Role |
|--------|------|
| [`src/store/editorStore.ts`](../src/store/editorStore.ts) | `saveSnapshot`, `history[]`, Zustand persist |
| [`src/lib/storage.ts`](../src/lib/storage.ts) | `editorStorage` → localStorage |
| [`src/lib/templateFirestore.ts`](../src/lib/templateFirestore.ts) | Firestore CRUD + `subscribeTemplates` |
| [`src/lib/firebase.ts`](../src/lib/firebase.ts) | App + Firestore init (no Auth yet) |
| [`src/components/editor/HistoryPanel.tsx`](../src/components/editor/HistoryPanel.tsx) | History UI |
| [`src/components/editor/TemplatePanel.tsx`](../src/components/editor/TemplatePanel.tsx) | Template UI |

There is **no** `historyFirestore.ts` today.

---

## Risk: global `templates` collection

`templateFirestore.ts` uses a top-level collection:

```text
templates/{templateId}
```

There is no `userId` field and no Firebase Authentication in the app. Who can read/write depends entirely on [Firestore security rules](../firestore.rules). Treat production rules as mandatory before wide deployment.

---

## Planned architecture (Phase: cloud sync + Auth)

### Goals

1. Per-user templates and optional per-user history sync when signed in.
2. Anonymous users keep today’s behavior: local history only, no cloud history.
3. Stay static-export / client-only (no Next.js API routes).

### Auth

- Add `firebase/auth` with Google Sign-In (and optionally email link).
- `src/lib/firebaseAuth.ts` — `signInWithGoogle`, `signOut`, `onAuthStateChanged`.
- UI: account chip in [`TopBar.tsx`](../src/components/editor/TopBar.tsx) or File menu.

### Firestore layout (target)

```text
users/{uid}/templates/{templateId}     # migrate from global templates/
users/{uid}/snapshots/{snapshotId}   # new — mirrors DocumentSnapshot
```

**Document fields (snapshot):**

```ts
{
  fileName: string | null;
  savedAt: Timestamp;
  html: string;           // consider size cap; large docs → Cloud Storage + htmlUrl
  wordCount: number;
  createdAt: Timestamp;  // server or client
}
```

**Indexes:** `users/{uid}/snapshots` ordered by `savedAt` desc (composite if filtering).

### `historyFirestore.ts` (to implement)

```ts
// Planned API surface
subscribeSnapshots(uid: string, onNext: (snapshots: DocumentSnapshot[]) => void): Unsubscribe;
saveSnapshotToCloud(uid: string, snapshot: DocumentSnapshot): Promise<void>;
deleteSnapshotFromCloud(uid: string, id: string): Promise<void>;
renameSnapshotInCloud(uid: string, id: string, fileName: string | null): Promise<void>;
```

### `editorStore` integration

1. On `saveSnapshot`: always update local state + persist; if `uid` present, `setDoc` to `users/{uid}/snapshots/{id}` (debounced or fire-and-forget with toast on failure).
2. On auth login: `subscribeSnapshots` → merge into `history` (remote wins by `savedAt` or union by `id`).
3. On auth logout: stop subscription; keep local history only.
4. Cap: keep MAX_HISTORY = 20 and SNAPSHOT_SIZE_LIMIT = 4MB per user (client-side trim before write).

### Template migration

1. One-time script or in-app “migrate my templates” when user first signs in:
   - Read legacy `templates/*` where `ownerId == uid` OR prompt admin migration.
2. New writes only to `users/{uid}/templates/{id}`.
3. Deprecate global `templates` after migration window.

### Security rules

See [`firestore.rules`](../firestore.rules) in repo for recommended rules:

- `users/{userId}/**` — read/write only if `request.auth.uid == userId`.
- Deny legacy `templates/{id}` for clients once migration completes (or restrict to admin SDK).

### Privacy copy

- History cloud sync is **opt-in via sign-in** and must be explained in History panel and FAQ.
- Default remains local-only for unsigned users.

### Testing

- Unit: mock Firestore in `historyFirestore.test.ts`.
- Manual: two browsers, same Google account, save snapshot on A, see on B after login.
- Keep `scripts/firebase-smoke.mjs` for template path; add smoke for `users/{testUid}/snapshots`.

---

## Workarounds (no code)

| Need | Action |
|------|--------|
| Open work on another PC | Export HTML/ZIP or save as **Template** on notebook, load on PC |
| Backup history | Not built-in; export snapshots manually or use Template |
| Same machine, two tabs | `storage` event in EditorShell rehydrates `wordhtml-editor` |

---

## Implementation order (suggested)

1. Firebase Auth + UI + rules for `users/{uid}/templates`.
2. Migrate template paths; retire global collection.
3. `historyFirestore.ts` + store hooks + History panel “signed in — syncing” state.
4. Optional: compress large HTML or offload to Storage.
