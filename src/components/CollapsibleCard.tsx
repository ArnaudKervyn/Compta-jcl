import React from "react";

type Props = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  right?: React.ReactNode; // élément optionnel à droite du titre
};

export default function CollapsibleCard({
  title,
  children,
  defaultOpen = true,
  right,
}: Props) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="card">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 p-4 md:p-5"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-semibold">{title}</span>
        <div className="flex items-center gap-3">
          {right}
          {/* Icône + qui pivote à 45° pour devenir un X */}
          <svg
            className={`h-5 w-5 transition-transform ${
              open ? "rotate-45 text-zinc-500" : "text-zinc-700"
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
      </button>

      {open && <div className="border-t border-zinc-200 p-4 md:p-5">{children}</div>}
    </div>
  );
}
