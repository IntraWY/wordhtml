import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
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

const COLLECTION_NAME = "templates";

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

export async function loadTemplates(): Promise<DocumentTemplate[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => fromFirestore(doc.id, doc.data() as FirestoreTemplate));
}

export function subscribeTemplates(
  onNext: (templates: DocumentTemplate[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const db = getFirebaseDb();
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const templates = snapshot.docs.map((doc) =>
        fromFirestore(doc.id, doc.data() as FirestoreTemplate)
      );
      onNext(templates);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        // eslint-disable-next-line no-console
        console.error("Firestore template subscription error:", error);
      }
    }
  );
}

export async function saveTemplate(template: DocumentTemplate): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(collection(db, COLLECTION_NAME), template.id);
  await setDoc(ref, toFirestore(template));
}

export async function updateTemplateName(id: string, name: string): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, COLLECTION_NAME, id);
  await setDoc(ref, { name }, { merge: true });
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}
