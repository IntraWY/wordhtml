import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function requireEnv(key) {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}

async function main() {
  loadEnv();

  const app = initializeApp({
    apiKey: requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: requireEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: requireEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: requireEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: requireEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: requireEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  });

  const db = getFirestore(app);
  const testId = `smoke-${Date.now()}`;
  const ref = doc(collection(db, "templates"), testId);

  console.log("1/4 write template...");
  await setDoc(ref, {
    name: "Firebase smoke test",
    html: "<p>smoke</p>",
    pageSetup: {
      size: "A4",
      orientation: "portrait",
      marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
    },
    createdAt: Timestamp.now(),
  });

  console.log("2/4 read template...");
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Template write succeeded but read failed");

  console.log("3/4 list templates...");
  const list = await getDocs(query(collection(db, "templates"), orderBy("createdAt", "desc")));
  if (list.empty) throw new Error("Template list is empty after write");

  console.log("4/4 delete template...");
  await deleteDoc(ref);
  const afterDelete = await getDoc(ref);
  if (afterDelete.exists()) throw new Error("Template delete failed");

  console.log("PASS: Firebase Firestore CRUD OK");
}

main().catch((err) => {
  console.error("FAIL:", err.message || err);
  process.exit(1);
});
