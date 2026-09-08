"use client";
import React, { useState } from "react";

export const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(" ");

// Small info button that toggles a popover with a formula/explanation.
export function Info({ label, children }: { label?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-accent hover:bg-accentSoft"
        aria-label="Xem công thức"
      >
        <Icon name="info" size={15} />
        {label && <span className="text-xs font-semibold">{label}</span>}
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <span className="absolute right-0 top-7 z-40 w-72 rounded-xl border border-border bg-bg p-3.5 text-left shadow-xl">
            <span className="block text-[13px] leading-relaxed text-ink [&_b]:text-accent">{children}</span>
          </span>
        </>
      )}
    </span>
  );
}

export function Bar({ value, tone = "accent" }: { value: number; tone?: "accent" | "success" }) {
  const c = tone === "success" ? "bg-success" : "bg-accent";
  return (
    <div className="h-2 flex-1 rounded-full bg-surface2 overflow-hidden">
      <div className={cx("h-full rounded-full", c)} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Ring({ pct, size = 92 }: { pct: number; size?: number }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF0F4" strokeWidth={7} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#4F46E5"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-head font-extrabold text-ink" style={{ fontSize: size * 0.24 }}>
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}

// Minimal inline icon set (no external dependency).
const P: Record<string, string> = {
  laptop: "M3 5h18v10H3z M2 19h20 M8 19l-1 2h10l-1-2",
  smartphone: "M7 2h10v20H7z M11 18h2",
  sparkles: "M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z",
  target: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0",
  wallet: "M3 6h16v12H3z M16 11h4v4h-4z",
  chart: "M4 20V10 M10 20V4 M16 20v-7 M4 20h16",
  trophy: "M7 4h10v4a5 5 0 0 1-10 0z M9 15h6 M12 15v4 M9 21h6 M7 5H4v2a3 3 0 0 0 3 3 M17 5h3v2a3 3 0 0 1-3 3",
  compare: "M4 6h6 M4 12h6 M4 18h6 M14 6h6 M14 12h6 M14 18h6",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  back: "M19 12H5 M11 6l-6 6 6 6",
  check: "M4 12l5 5L20 6",
  x: "M6 6l12 12 M18 6L6 18",
  info: "M12 8h.01 M11 12h1v5h1 M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0",
};
export function Icon({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {(P[name] || "").split(" M").map((seg, i) => (
        <path key={i} d={(i === 0 ? seg : "M" + seg)} />
      ))}
    </svg>
  );
}

export function Badge({ children, tone = "accent" }: { children: React.ReactNode; tone?: "accent" | "success" | "muted" }) {
  const m = {
    accent: "bg-accentSoft text-accent",
    success: "bg-successSoft text-[#0A7A47]",
    muted: "bg-surface text-muted",
  }[tone];
  return <span className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold", m)}>{children}</span>;
}
