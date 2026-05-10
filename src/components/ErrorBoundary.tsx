"use client";

import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch() {
    // Errors are shown in the UI; no console logging in production
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-background)] p-6">
          <div className="w-full max-w-md rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-red-50">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold">เกิดข้อผิดพลาด (Error)</h2>
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  โปรแกรมแก้ไขพบปัญหาที่ไม่คาดคิด
                </p>
              </div>
            </div>
            {this.state.error && (
              <div className="mt-4 rounded-md bg-[color:var(--color-muted)] p-3">
                <p className="break-all font-mono text-xs text-[color:var(--color-muted-foreground)]">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[color:var(--color-foreground)] px-4 py-2 text-sm font-medium text-[color:var(--color-background)] transition-colors hover:opacity-90"
              >
                ลองอีกครั้ง (Try Again)
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-4 py-2 text-sm font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
              >
                <RotateCcw className="size-3.5" />
                โหลดใหม่ (Reload)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
