export type Tone =
  | "indigo"
  | "sky"
  | "emerald"
  | "amber"
  | "violet"
  | "teal"
  | "rose"
  | "cyan"
  | "fuchsia"
  | "lime"
  | "slate";

const TONES: Tone[] = [
  "indigo",
  "sky",
  "emerald",
  "amber",
  "violet",
  "teal",
  "rose",
  "cyan",
  "fuchsia",
  "lime",
  "slate",
];

export function getCategoryTone(name: string): Tone {
  const s = (name || "").toLowerCase().trim();
  if (!s) return "slate";
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % TONES.length;
  return TONES[idx];
}

export const TONE_CLASSES: Record<
  Tone,
  { badge: string; text: string; subtleBg: string; border: string }
> = {
  indigo: {
    badge: "bg-indigo-50 text-indigo-800 border-indigo-200",
    text: "text-indigo-700",
    subtleBg: "bg-indigo-50/60",
    border: "border-indigo-200",
  },
  sky: {
    badge: "bg-sky-50 text-sky-800 border-sky-200",
    text: "text-sky-700",
    subtleBg: "bg-sky-50/60",
    border: "border-sky-200",
  },
  emerald: {
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    text: "text-emerald-700",
    subtleBg: "bg-emerald-50/60",
    border: "border-emerald-200",
  },
  amber: {
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    text: "text-amber-700",
    subtleBg: "bg-amber-50/60",
    border: "border-amber-200",
  },
  violet: {
    badge: "bg-violet-50 text-violet-800 border-violet-200",
    text: "text-violet-700",
    subtleBg: "bg-violet-50/60",
    border: "border-violet-200",
  },
  teal: {
    badge: "bg-teal-50 text-teal-800 border-teal-200",
    text: "text-teal-700",
    subtleBg: "bg-teal-50/60",
    border: "border-teal-200",
  },
  rose: {
    badge: "bg-rose-50 text-rose-800 border-rose-200",
    text: "text-rose-700",
    subtleBg: "bg-rose-50/60",
    border: "border-rose-200",
  },
  cyan: {
    badge: "bg-cyan-50 text-cyan-800 border-cyan-200",
    text: "text-cyan-700",
    subtleBg: "bg-cyan-50/60",
    border: "border-cyan-200",
  },
  fuchsia: {
    badge: "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200",
    text: "text-fuchsia-700",
    subtleBg: "bg-fuchsia-50/60",
    border: "border-fuchsia-200",
  },
  lime: {
    badge: "bg-lime-50 text-lime-800 border-lime-200",
    text: "text-lime-700",
    subtleBg: "bg-lime-50/60",
    border: "border-lime-200",
  },
  slate: {
    badge: "bg-slate-50 text-slate-800 border-slate-200",
    text: "text-slate-700",
    subtleBg: "bg-slate-50/60",
    border: "border-slate-200",
  },
};

