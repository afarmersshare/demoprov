"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Persona } from "@/components/farms/network-explorer";
import { PERSONA_COLOR } from "@/lib/palette";

const PERSONA_ENTRIES: Array<{ id: Persona; label: string }> = [
  { id: "policymaker", label: "Policymaker view" },
  { id: "afs", label: "A Farmer's Share view" },
  { id: "farmer", label: "Farmer view" },
  { id: "buyer", label: "Buyer view" },
  { id: "hub", label: "Hub / aggregator view" },
  { id: "nonprofit", label: "Nonprofit view" },
  { id: "funder", label: "Funder view" },
  { id: "explore", label: "Just exploring" },
];

const LABEL_BY_ID: Record<Persona, string> = PERSONA_ENTRIES.reduce(
  (acc, p) => ({ ...acc, [p.id]: p.label }),
  {} as Record<Persona, string>,
);

type Props = { persona: Persona; isAdmin?: boolean };

export function PersonaSwitcher({ persona, isAdmin = false }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const activeColor = PERSONA_COLOR[persona];
  const activeLabel = LABEL_BY_ID[persona];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-cream-shadow bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft hover:text-slate-blue hover:border-slate-blue transition-colors"
      >
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: activeColor }}
        />
        <span>{activeLabel}</span>
        <svg
          className={
            "w-2.5 h-2.5 transition-transform " +
            (open ? "rotate-180" : "")
          }
          viewBox="0 0 10 6"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-[10px] border border-cream-shadow bg-white shadow-md overflow-hidden z-30"
        >
          <div className="px-3.5 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-charcoal-soft/70">
            Switch lens
          </div>
          {PERSONA_ENTRIES.filter(
            (p) => p.id !== persona && (isAdmin || p.id !== "afs"),
          ).map((p) => (
            <Link
              key={p.id}
              href={`/?persona=${p.id}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft hover:text-slate-blue hover:bg-surface-subtle transition-colors"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: PERSONA_COLOR[p.id] }}
              />
              {p.label}
            </Link>
          ))}
          <div className="border-t border-cream-shadow">
            <Link
              href="/"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft hover:text-slate-blue hover:bg-surface-subtle transition-colors"
            >
              ← Back to landing
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
