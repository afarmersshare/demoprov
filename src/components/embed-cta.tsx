"use client";

import { ArrowRight } from "lucide-react";

export function EmbedCta() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-cream-shadow bg-cream/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-end">
        <a
          href="/?ref=afs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-slate-blue text-cream px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] hover:bg-slate-blue-light transition-colors"
        >
          Explore the full demo
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
