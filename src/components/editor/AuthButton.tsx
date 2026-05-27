"use client";

import { useState } from "react";
import { LogIn, LogOut, Loader2, Cloud } from "lucide-react";

import { isFirebaseConfigured } from "@/lib/firebaseConfig";
import { signInWithGoogle, signOut } from "@/lib/firebaseAuth";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { cn } from "@/lib/utils";

export function AuthButton() {
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const authLoading = useAuthStore((s) => s.authLoading);
  const cloudSyncStatus = useAuthStore((s) => s.cloudSyncStatus);
  const setAuthLoading = useAuthStore((s) => s.setAuthLoading);
  const [busy, setBusy] = useState(false);

  if (!isFirebaseConfigured()) return null;

  const handleSignIn = async () => {
    setBusy(true);
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      useToastStore.getState().show("เข้าสู่ระบบแล้ว — ประวัติจะซิงก์ข้ามเครื่อง");
    } catch (err) {
      const message = err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ";
      useToastStore.getState().show(message, "warning");
    } finally {
      setBusy(false);
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
      useToastStore.getState().show("ออกจากระบบแล้ว — ประวัติเก็บในเครื่องนี้เท่านั้น");
    } catch (err) {
      const message = err instanceof Error ? err.message : "ออกจากระบบไม่สำเร็จ";
      useToastStore.getState().show(message, "warning");
    } finally {
      setBusy(false);
    }
  };

  if (!authReady) {
    return (
      <span className="inline-flex h-8 items-center gap-1.5 px-2 text-xs text-[color:var(--color-muted-foreground)]">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        <span className="sr-only">กำลังโหลดการยืนยันตัวตน</span>
      </span>
    );
  }

  if (user) {
    const label = user.displayName ?? user.email ?? "บัญชี";
    return (
      <div className="flex items-center gap-1">
        {cloudSyncStatus === "syncing" && (
          <span
            className="inline-flex h-8 items-center gap-1 px-1.5 text-[10px] text-[color:var(--color-muted-foreground)]"
            title="กำลังซิงก์ประวัติ"
          >
            <Loader2 className="size-3 animate-spin" aria-hidden />
            <Cloud className="size-3 hidden sm:block" aria-hidden />
          </span>
        )}
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={busy}
          title={`ออกจากระบบ (${label})`}
          aria-label={`ออกจากระบบ (${label})`}
          className={cn(
            "inline-flex h-8 max-w-[140px] items-center gap-1.5 rounded-md px-2 text-xs text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)] disabled:opacity-40"
          )}
        >
          {busy ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin" />
          ) : (
            <LogOut className="size-3.5 shrink-0" />
          )}
          <span className="truncate hidden sm:inline">{label}</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignIn()}
      disabled={busy || authLoading}
      title="เข้าสู่ระบบเพื่อซิงก์ประวัติและ Template ข้ามเครื่อง"
      aria-label="เข้าสู่ระบบด้วย Google"
      className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)] disabled:opacity-40"
    >
      {busy || authLoading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <LogIn className="size-3.5" />
      )}
      <span className="hidden md:inline">เข้าสู่ระบบ</span>
    </button>
  );
}
