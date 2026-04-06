"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface AppInstallActionsProps {
  installLabel: string;
  shareLabel: string;
  installedLabel: string;
  helperText: string;
}

export function AppInstallActions({
  installLabel,
  shareLabel,
  installedLabel,
  helperText,
}: AppInstallActionsProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches
    );
  });
  const [shareState, setShareState] = useState<"idle" | "shared" | "copied">(
    "idle",
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const currentUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "https://saree-pro.vercel.app";
    }

    return window.location.origin;
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) {
      window.open(currentUrl, "_blank", "noopener,noreferrer");
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  }

  async function handleShare() {
    const payload = {
      title: "Saree Pro",
      text: helperText,
      url: currentUrl,
    };

    if (navigator.share) {
      await navigator.share(payload);
      setShareState("shared");
      return;
    }

    await navigator.clipboard.writeText(currentUrl);
    setShareState("copied");
  }

  return (
    <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[var(--color-border)] bg-white/75 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--color-ink)]">
          {isInstalled ? installedLabel : installLabel}
        </p>
        <p className="text-sm leading-6 text-[var(--color-muted)]">
          {shareState === "idle"
            ? helperText
            : shareState === "shared"
              ? "Link shared successfully."
              : "Link copied. You can paste it anywhere."}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          variant={isInstalled ? "secondary" : "primary"}
          onClick={handleInstall}
        >
          {isInstalled ? installedLabel : installLabel}
        </Button>
        <Button variant="ghost" onClick={handleShare}>
          {shareLabel}
        </Button>
      </div>
    </div>
  );
}
