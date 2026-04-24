"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const DISMISS_KEY = "provender.entryBanner.dismissed";

export function EntryBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // sessionStorage may be blocked; fall through and show anyway.
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full bg-cream-deep border-b border-cream-shadow">
      <div className="mx-auto max-w-7xl flex items-start gap-4 px-6 sm:px-10 py-3">
        <p className="flex-1 text-[13px] leading-snug text-moss">
          You&rsquo;re exploring the Louisville&ndash;Kentuckiana region dataset
          &mdash; a live Provender demo. This is real infrastructure, not a
          mockup.{" "}
          <a
            href="mailto:hello@afarmersshare.com"
            className="underline underline-offset-2 font-semibold hover:text-moss-light"
          >
            Contact us to discuss your region.
          </a>
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="shrink-0 w-6 h-6 rounded-full text-moss/70 hover:text-moss hover:bg-cream-shadow flex items-center justify-center transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
