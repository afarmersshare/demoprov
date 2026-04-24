"use client";

// Placeholder component for the "← What does this mean?" literacy hook.
//
// Per Kelsey's 2026-04-23 decision (Deborah Stone: "what we count counts"),
// every impact card and other evaluative claim in the demo ships with a
// hook inviting the viewer to interrogate what the word/number actually
// means. The hook currently does nothing — it's a structural commitment.
// Kelsey + the advisory panel will author the literacy pages; when those
// exist, this component wires up to them via the `topic` key.

type Props = {
  topic: string;
  label?: string;
};

export function LiteracyHook({ topic, label = "What does this mean?" }: Props) {
  return (
    <button
      type="button"
      title={`Literacy page coming: ${topic}`}
      className="group mt-3 inline-flex items-center gap-1 text-[11px] text-charcoal-soft hover:text-slate-blue transition-colors cursor-help"
      onClick={(e) => {
        // Placeholder — no navigation yet. Kelsey's advisory panel will
        // define where this links. For now, we keep the hook visually
        // present so the demo audience sees the commitment to literacy.
        e.preventDefault();
      }}
    >
      <span
        aria-hidden="true"
        className="inline-block opacity-60 group-hover:opacity-100 transition-opacity"
      >
        ←
      </span>
      <span className="underline underline-offset-2 decoration-charcoal-soft/30 group-hover:decoration-slate-blue">
        {label}
      </span>
    </button>
  );
}
