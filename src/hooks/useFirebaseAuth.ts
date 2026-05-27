"use client";

import { useEffect } from "react";

import { isFirebaseConfigured } from "@/lib/firebaseConfig";
import { subscribeAuthState } from "@/lib/firebaseAuth";
import {
  hasMigratedLegacyTemplates,
  migrateLegacyTemplatesToUser,
} from "@/lib/templateFirestore";
import { useAuthStore } from "@/store/authStore";
import { restartTemplateSubscription } from "@/store/templateStore";

/** Initializes Firebase Auth listener and runs one-time legacy template migration. */
export function useFirebaseAuth(): void {
  const setUser = useAuthStore((s) => s.setUser);
  const setAuthReady = useAuthStore((s) => s.setAuthReady);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setAuthReady(true);
      return;
    }

    return subscribeAuthState(
      async (user) => {
        setUser(user);
        setAuthReady(true);

        if (user && !hasMigratedLegacyTemplates(user.uid)) {
          try {
            await migrateLegacyTemplatesToUser(user.uid);
          } catch (err) {
            if (process.env.NODE_ENV !== "production") {
              console.warn("Legacy template migration failed:", err);
            }
          }
        }

        restartTemplateSubscription();
      },
      (error) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("Firebase auth error:", error);
        }
        setAuthReady(true);
      }
    );
  }, [setUser, setAuthReady]);
}
