"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "wordhtml-onboarding";

interface OnboardingState {
  hasSeenTour: boolean;
}

function readState(): OnboardingState {
  if (typeof window === "undefined") return { hasSeenTour: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { hasSeenTour: false };
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "hasSeenTour" in parsed &&
      typeof (parsed as Record<string, unknown>).hasSeenTour === "boolean"
    ) {
      return { hasSeenTour: (parsed as OnboardingState).hasSeenTour };
    }
  } catch {
    // ignore corrupt storage
  }
  return { hasSeenTour: false };
}

function writeState(state: OnboardingState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function useOnboarding() {
  const [hasSeenTour, setHasSeenTour] = useState<boolean>(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setHasSeenTour(readState().hasSeenTour);
    setIsReady(true);
  }, []);

  const startTour = useCallback(() => {
    setHasSeenTour(false);
  }, []);

  const skipTour = useCallback(() => {
    setHasSeenTour(true);
    writeState({ hasSeenTour: true });
  }, []);

  const resetTour = useCallback(() => {
    setHasSeenTour(false);
    writeState({ hasSeenTour: false });
  }, []);

  return {
    hasSeenTour,
    isReady,
    startTour,
    skipTour,
    resetTour,
  };
}
