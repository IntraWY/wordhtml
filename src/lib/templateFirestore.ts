import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  type Unsubscribe,
  type FirestoreError,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import type { DocumentTemplate } from "@/store/templateStore";
import type { PageSetup } from "@/types";

const LEGACY_COLLECTION = "templates";

interface FirestoreTemplate {
  name: string;
  html: string;
  pageSetup: PageSetup;
  createdAt: Timestamp;
}

function toFirestore(template: DocumentTemplate): FirestoreTemplate {
  return {
    name: template.name,
    html: template.html,
    pageSetup: template.pageSetup,
    createdAt: Timestamp.fromDate(new Date(template.createdAt)),
  };
}

function fromFirestore(id: string, data: FirestoreTemplate): DocumentTemplate {
  return {
    id,
    name: data.name,
    html: data.html,
    pageSetup: data.pageSetup,
    createdAt: data.createdAt.toDate().toISOString(),
  };
}

function userTemplatesCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "templates");
}

function legacyTemplatesCollection() {
  return collection(getFirebaseDb(), LEGACY_COLLECTION);
}

function resolveTemplatesCollection(uid: string | null) {
  return uid ? userTemplatesCollection(uid) : legacyTemplatesCollection();
}

export async function loadTemplates(uid: string | null): Promise<DocumentTemplate[]> {
  const col = uid ? userTemplatesCollection(uid) : legacyTemplatesCollection();
  const q = query(col, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => fromFirestore(d.id, d.data() as FirestoreTemplate));
}

export function subscribeTemplates(
  uid: string | null,
  onNext: (templates: DocumentTemplate[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const col = resolveTemplatesCollection(uid);
  const q = query(col, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const templates = snapshot.docs.map((d) =>
        fromFirestore(d.id, d.data() as FirestoreTemplate)
      );
      onNext(templates);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.error("Firestore template subscription error:", error);
      }
    }
  );
}

export async function saveTemplate(
  template: DocumentTemplate,
  uid: string | null
): Promise<void> {
  const col = resolveTemplatesCollection(uid);
  const ref = doc(col, template.id);
  await setDoc(ref, toFirestore(template));
}

export async function updateTemplateName(
  id: string,
  name: string,
  uid: string | null
): Promise<void> {
  const ref = doc(resolveTemplatesCollection(uid), id);
  await setDoc(ref, { name }, { merge: true });
}

export async function deleteTemplate(id: string, uid: string | null): Promise<void> {
  await deleteDoc(doc(resolveTemplatesCollection(uid), id));
}

const MIGRATION_KEY_PREFIX = "wordhtml-templates-migrated-";

export function hasMigratedLegacyTemplates(uid: string): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(`${MIGRATION_KEY_PREFIX}${uid}`) === "1";
}

export function markLegacyTemplatesMigrated(uid: string): void {
  try {
    localStorage.setItem(`${MIGRATION_KEY_PREFIX}${uid}`, "1");
  } catch {
    /* ignore */
  }
}

/** Copy global templates into users/{uid}/templates (first sign-in). */
export async function migrateLegacyTemplatesToUser(uid: string): Promise<number> {
  const legacySnap = await getDocs(
    query(legacyTemplatesCollection(), orderBy("createdAt", "desc"))
  );
  if (legacySnap.empty) {
    markLegacyTemplatesMigrated(uid);
    return 0;
  }

  let copied = 0;
  for (const legacyDoc of legacySnap.docs) {
    const userRef = doc(userTemplatesCollection(uid), legacyDoc.id);
    const existing = await getDoc(userRef);
    if (existing.exists()) continue;

    const data = legacyDoc.data() as FirestoreTemplate;
    await setDoc(userRef, data);
    copied += 1;
  }
  markLegacyTemplatesMigrated(uid);
  return copied;
}
