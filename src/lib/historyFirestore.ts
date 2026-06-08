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
  writeBatch,
  type Unsubscribe,
  type FirestoreError,
} from "firebase/firestore";

import { getFirebaseDb } from "./firebase";
import { snapshotsToUpload } from "./mergeSnapshots";
import type { DocumentSnapshot } from "@/types";

interface FirestoreSnapshot {
  fileName: string | null;
  savedAt: Timestamp;
  html: string;
  wordCount: number;
}

function snapshotsCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "snapshots");
}

function toFirestore(snapshot: DocumentSnapshot): FirestoreSnapshot {
  return {
    fileName: snapshot.fileName,
    savedAt: Timestamp.fromDate(new Date(snapshot.savedAt)),
    html: snapshot.html,
    wordCount: snapshot.wordCount,
  };
}

function fromFirestore(id: string, data: FirestoreSnapshot): DocumentSnapshot {
  return {
    id,
    fileName: data.fileName,
    savedAt: data.savedAt.toDate().toISOString(),
    html: data.html,
    wordCount: data.wordCount,
  };
}

export function subscribeSnapshots(
  uid: string,
  onNext: (snapshots: DocumentSnapshot[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const q = query(snapshotsCollection(uid), orderBy("savedAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        fromFirestore(d.id, d.data() as FirestoreSnapshot)
      );
      onNext(items);
    },
    (error) => {
      if (onError) onError(error);
      else console.error("Firestore snapshot subscription error:", error);
    }
  );
}

export async function saveSnapshotToCloud(
  uid: string,
  snapshot: DocumentSnapshot
): Promise<void> {
  const ref = doc(snapshotsCollection(uid), snapshot.id);
  await setDoc(ref, toFirestore(snapshot));
}

export async function deleteSnapshotFromCloud(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(snapshotsCollection(uid), id));
}

export async function renameSnapshotInCloud(
  uid: string,
  id: string,
  fileName: string | null
): Promise<void> {
  await setDoc(doc(snapshotsCollection(uid), id), { fileName }, { merge: true });
}

export async function clearSnapshotsInCloud(uid: string): Promise<void> {
  const snap = await getDocs(snapshotsCollection(uid));
  if (snap.empty) return;

  const batch = writeBatch(getFirebaseDb());
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function uploadLocalSnapshotsToCloud(
  uid: string,
  local: DocumentSnapshot[],
  remote: DocumentSnapshot[] = []
): Promise<void> {
  const toUpload = snapshotsToUpload(local, remote);
  if (toUpload.length === 0) return;
  await Promise.allSettled(toUpload.map((s) => saveSnapshotToCloud(uid, s)));
}
