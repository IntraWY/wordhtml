"use client";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from "firebase/auth";

import { getFirebaseApp, isFirebaseConfigured } from "./firebase";

const googleProvider = new GoogleAuthProvider();

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(getFirebaseAuth(), googleProvider);
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}

export function subscribeAuthState(
  onUser: (user: User | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    onUser(null);
    return () => {};
  }
  return onAuthStateChanged(
    getFirebaseAuth(),
    onUser,
    (error) => onError?.(error)
  );
}
