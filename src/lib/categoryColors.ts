// Category color mapping utilities for consistent, professional accents

export type Accent =
  | "slate"
  | "indigo"
  | "sky"
  | "emerald"
  | "amber"
  | "violet"
  | "teal"
  | "rose"
  | "cyan";

// Map well-known categories to accents. Defaults to slate.
export function categoryAccent(category: string): Accent {
  const key = (category || "").toLowerCase();
  // Income buckets
  if (["mbu", "sbu", "ebu", "qbu"].includes(key)) return "indigo";
  if (["bsbg(+)", "formations", "partenariats"].includes(key)) return "violet";

  // Expense buckets (examples; keep tasteful variety)
  if (key.includes("advertising")) return "amber";
  if (key.includes("recruit")) return "teal";
  if (key.includes("network")) return "sky";
  if (key.includes("event")) return "violet";
  if (key.includes("local")) return "emerald";
  if (key.includes("abonnement")) return "indigo";
  if (key.includes("assurance")) return "cyan";
  if (key.includes("banque")) return "rose";

  return "slate";
}

// Badge classes for each accent (explicit strings so Tailwind can pick them up)
export function badgeClasses(accent: Accent): string {
  const map: Record<Accent, string> = {
    slate: "bg-slate-50 text-slate-800 ring-1 ring-inset ring-slate-200",
    indigo: "bg-indigo-50 text-indigo-800 ring-1 ring-inset ring-indigo-200",
    sky: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200",
    emerald: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200",
    amber: "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200",
    violet: "bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-200",
    teal: "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200",
    rose: "bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200",
    cyan: "bg-cyan-50 text-cyan-800 ring-1 ring-inset ring-cyan-200",
  };
  return map[accent];
}

export function textAccentClasses(accent: Accent): string {
  const map: Record<Accent, string> = {
    slate: "text-slate-700",
    indigo: "text-indigo-700",
    sky: "text-sky-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    violet: "text-violet-700",
    teal: "text-teal-700",
    rose: "text-rose-700",
    cyan: "text-cyan-700",
  };
  return map[accent];
}

