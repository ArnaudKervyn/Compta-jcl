import React from "react";

export type Period =
  | { mode: "all" }
  | { mode: "month"; ym: string }     // ex: "2025-08"
  | { mode: "year"; y: string }       // ex: "2025"
  | { mode: "range"; from: string; to: string };

type Props = {
  period: Period;
  onChange: (p: Period) => void;
  availableYears: string[]; // ex: ["2024","2025"]
};

export default function PeriodFilter({ period, onChange, availableYears }: Props) {
  const today = new Date();
  const curYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const curY = String(today.getFullYear());

  const setMode = (m: Period["mode"]) => {
    if (m === "all") onChange({ mode: "all" });
    if (m === "month") onChange({ mode: "month", ym: curYM });
    if (m === "year") onChange({ mode: "year", y: availableYears[0] || curY });
    if (m === "range") onChange({ mode: "range", from: `${curY}-01-01`, to: `${curY}-12-31` });
  };

  return (
    <div className="card p-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className={`btn-ghost ${period.mode === "all" ? "bg-zinc-100" : ""}`} onClick={() => setMode("all")}>Tout</button>
        <button className={`btn-ghost ${period.mode === "month" ? "bg-zinc-100" : ""}`} onClick={() => setMode("month")}>Mois</button>
        <button className={`btn-ghost ${period.mode === "year" ? "bg-zinc-100" : ""}`} onClick={() => setMode("year")}>Année</button>
        <button className={`btn-ghost ${period.mode === "range" ? "bg-zinc-100" : ""}`} onClick={() => setMode("range")}>Plage</button>
        <div className="ml-auto text-sm text-zinc-600">
          {period.mode !== "all" && (
            <button className="underline" onClick={() => onChange({ mode: "all" })}>
              Réinitialiser le filtre
            </button>
          )}
        </div>
      </div>

      {/* Contrôles selon mode */}
      {period.mode === "month" && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-600">Mois</label>
            <input
              type="month"
              value={period.ym}
              onChange={(e) => onChange({ mode: "month", ym: e.target.value })}
              className="input"
            />
          </div>
        </div>
      )}

      {period.mode === "year" && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-600">Année</label>
            <select
              className="select"
              value={period.y}
              onChange={(e) => onChange({ mode: "year", y: e.target.value })}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {period.mode === "range" && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-600">Du</label>
            <input
              type="date"
              value={period.from}
              max={period.to}
              onChange={(e) => onChange({ mode: "range", from: e.target.value, to: period.to })}
              className="input"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-600">Au</label>
            <input
              type="date"
              value={period.to}
              min={period.from}
              onChange={(e) => onChange({ mode: "range", from: period.from, to: e.target.value })}
              className="input"
            />
          </div>
        </div>
      )}
    </div>
  );
}
