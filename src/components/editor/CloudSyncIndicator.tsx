"use client";

import { Cloud, CloudOff, Loader2, AlertCircle, HardDrive } from "lucide-react";

import { isFirebaseConfigured } from "@/lib/firebaseConfig";
import { useAuthStore, type CloudSyncStatus } from "@/store/authStore";
import { cn } from "@/lib/utils";

interface CloudSyncIndicatorProps {
  /** Compact mode for TopBar; full labels in StatusBar. */
  compact?: boolean;
  className?: string;
}

interface StatusPresentation {
  icon: typeof Cloud;
  label: string;
  title: string;
  tone: "muted" | "success" | "warning" | "danger" | "accent";
  spin?: boolean;
}

function getPresentation(
  firebaseEnabled: boolean,
  signedIn: boolean,
  status: CloudSyncStatus,
  compact: boolean
): StatusPresentation | null {
  if (!firebaseEnabled) {
    return {
      icon: HardDrive,
      label: compact ? "Local" : "เครื่องนี้เท่านั้น (Local only)",
      title:
        "Firebase ไม่ได้ตั้งค่า — ประวัติและเอกสารเก็บในเบราว์เซอร์เครื่องนี้ (Firebase not configured)",
      tone: "muted",
    };
  }

  if (!signedIn) {
    return {
      icon: HardDrive,
      label: compact ? "Local" : "ยังไม่ซิงก์ (Not signed in)",
      title:
        "ยังไม่ได้เข้าสู่ระบบ — ประวัติเก็บใน localStorage เครื่องนี้ (Sign in to sync history)",
      tone: "muted",
    };
  }

  switch (status) {
    case "syncing":
      return {
        icon: Cloud,
        label: compact ? "…" : "กำลังซิงก์ (Syncing)",
        title: "กำลังซิงก์ประวัติกับ users/{uid}/snapshots",
        tone: "accent",
        spin: true,
      };
    case "offline":
      return {
        icon: CloudOff,
        label: compact ? "Offline" : "ออฟไลน์ (Offline)",
        title: "ไม่มีอินเทอร์เน็ต — จะซิงก์เมื่อกลับมาออนไลน์",
        tone: "warning",
      };
    case "error":
      return {
        icon: AlertCircle,
        label: compact ? "Error" : "ซิงก์ผิดพลาด (Sync error)",
        title: "ซิงก์คลาวด์ไม่สำเร็จ — ดูรายละเอียดในแผงประวัติ",
        tone: "danger",
      };
    case "synced":
      return {
        icon: Cloud,
        label: compact ? "Synced" : "ซิงก์แล้ว (Synced)",
        title: "ประวัติซิงก์กับ users/{uid}/snapshots แล้ว",
        tone: "success",
      };
    default:
      return null;
  }
}

const toneClasses: Record<StatusPresentation["tone"], string> = {
  muted: "text-[color:var(--color-muted-foreground)]",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-red-600",
  accent: "text-[color:var(--color-accent)]",
};

export function CloudSyncIndicator({ compact = false, className }: CloudSyncIndicatorProps) {
  const authReady = useAuthStore((s) => s.authReady);
  const user = useAuthStore((s) => s.user);
  const cloudSyncStatus = useAuthStore((s) => s.cloudSyncStatus);

  if (!authReady) return null;

  const firebaseEnabled = isFirebaseConfigured();
  const presentation = getPresentation(
    firebaseEnabled,
    Boolean(user),
    cloudSyncStatus,
    compact
  );

  if (!presentation) return null;

  const Icon = presentation.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        toneClasses[presentation.tone],
        className
      )}
      title={presentation.title}
      aria-label={presentation.label}
    >
      <Icon
        className={cn("size-3 shrink-0", presentation.spin && "animate-spin")}
        aria-hidden
      />
      {!compact && (
        <span className="hidden sm:inline text-[11px]">{presentation.label}</span>
      )}
      {compact && presentation.spin && (
        <Loader2 className="size-3 animate-spin sm:hidden" aria-hidden />
      )}
    </span>
  );
}
