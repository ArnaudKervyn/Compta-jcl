import React from "react";
import type { Transaction } from "../types";
import incomeCategories from "../data/incomes.json";

const INCOME_LIST = incomeCategories as string[]; // ["MBU","SBU","EBU","QBU","BSBG(+)","Formations","Partenariats"]
const money = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" });
const toHTVA = (tvac: number) => tvac / 1.21;

const OPERATING_INCOME = ["MBU", "SBU", "EBU", "QBU"];
const NON_OPERATING_INCOME = ["BSBG(+)", "Formations", "Partenariats"];

const CATEGORY_COLORS: Record<string, string> = {
  MBU: "text-indigo-700",
  SBU: "text-sky-700",
  EBU: "text-emerald-700",
  QBU: "text-amber-700",
  "BSBG(+)": "text-purple-700",
  Formations: "text-fuchsia-700",
  Partenariats: "text-cyan-700",
};

function expLabel(key: string): string {
  switch (key) {
    case "Abonnement": return "Abonnements";
    case "Networking": return "Networking + JEE";
    case "Local": return "Achats local";
    case "Entreprenariat / Innovation": return "Entreprenariat/Innovation";
    default: return key;
  }
}

const OPERATING_EXPENSES = [
  "Advertising",
  "Recruiting",
  "Amende",
  "Networking",
  "BSBG(-)",
  "Abonnement",
  "Event",
  "Achats projets (cdv, rdv clients, etc)",
  "Entreprenariat / Innovation",
  "Local",
  "Marge sécuritaire",
];

const EXTRA_COSTS = ["Assurances", "Banque", "Moniteur Belge"];

type Props = { transactions: Transaction[] };

export default function Overview({ transactions }: Props) {
  // INCOME (hors remboursements)
  const incomeTvac = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const c of INCOME_LIST) map.set(c, 0);
    let autres = 0;

    for (const t of transactions) {
      if (t.amount <= 0 || t.isRefund) continue;
      const cat = t.category && INCOME_LIST.includes(t.category) ? t.category : null;
      if (cat) map.set(cat, (map.get(cat) || 0) + t.amount);
      else autres += t.amount;
    }
    return { map, autres };
  }, [transactions]);

  const incomeOperatingTVAC = OPERATING_INCOME.reduce((s, c) => s + (incomeTvac.map.get(c) || 0), 0);
  const incomeNonOperatingTVAC = NON_OPERATING_INCOME.reduce((s, c) => s + (incomeTvac.map.get(c) || 0), 0);
  const incomeTotalTVAC = incomeOperatingTVAC + incomeNonOperatingTVAC + incomeTvac.autres;

  const incomeOperatingHTVA = toHTVA(incomeOperatingTVAC);
  const incomeNonOperatingHTVA = toHTVA(incomeNonOperatingTVAC);
  const incomeTotalHTVA = toHTVA(incomeTotalTVAC);

  // EXPENSES TVAC (splits + remboursements déduits)
  const expenseTVACByCat = React.useMemo(() => {
    const map = new Map<string, number>();
    const add = (cat: string | undefined, amt: number) => {
      if (!cat) return;
      map.set(cat, (map.get(cat) || 0) + amt);
    };
    for (const t of transactions) {
      if (t.amount < 0) {
        const base = Math.abs(t.amount);
        if (t.splits && t.splits.length > 0) {
          for (const s of t.splits) add(s.category, Math.abs(s.amount));
        } else {
          add(t.category, base);
        }
      }
    }
    for (const t of transactions) {
      if (t.amount > 0 && t.isRefund && t.refundCategory) {
        add(t.refundCategory, -Math.abs(t.amount));
      }
    }
    return map;
  }, [transactions]);

  const sumCats = (cats: string[]) => cats.reduce((s, c) => s + (expenseTVACByCat.get(c) || 0), 0);
  const opExpTVAC = sumCats(OPERATING_EXPENSES);
  const extraTVAC = sumCats(EXTRA_COSTS);
  const totalExpTVAC = opExpTVAC + extraTVAC;

  const profitTVAC = incomeTotalTVAC - totalExpTVAC;
  const profitHTVAminusTVAC = incomeTotalHTVA - totalExpTVAC;

  // UI helpers
  const Row = ({
    label, left, right, strong,
    zebraIndex,
  }: { label: React.ReactNode; left?: string; right?: string; strong?: boolean; zebraIndex?: number }) => (
    <div className={`grid grid-cols-3 items-center px-4 py-4 ${zebraIndex! % 2 === 0 ? "bg-white" : "bg-zinc-50/60"} border-t border-zinc-200`}>
      <div className={strong ? "font-semibold" : "font-medium"}>{label}</div>
      <div className="text-right tabular-nums">{left || ""}</div>
      <div className="text-right tabular-nums">{right || ""}</div>
    </div>
  );

  const SectionTitle = ({ color, children }: { color: "indigo" | "sky" | "emerald"; children: React.ReactNode }) => {
    const map: any = {
      indigo: "bg-indigo-600 text-white",
      sky: "bg-sky-600 text-white",
      emerald: "bg-emerald-600 text-white",
    };
    return <div className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide ${map[color]}`}>{children}</div>;
  };

  const SubTitle = ({ color, children }: { color: "indigo" | "sky"; children: React.ReactNode }) => {
    const map: any = {
      indigo: "bg-indigo-50 text-indigo-700",
      sky: "bg-sky-50 text-sky-700",
    };
    return <div className={`px-4 py-2 text-sm font-semibold ${map[color]} border-t border-zinc-200`}>{children}</div>;
  };

  // Cartes de stats
  const Stat = ({ title, value, tone }: { title: string; value: string; tone: "emerald" | "sky" | "indigo" }) => {
    const map: any = {
      emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
      sky: "border-sky-200 bg-sky-50 text-sky-900",
      indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
    };
    return (
      <div className={`rounded-xl border p-4 ${map[tone]}`}>
        <div className="text-sm font-semibold opacity-80">{title}</div>
        <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Stats en tête */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat title="Income HTVA" value={money.format(incomeTotalHTVA)} tone="indigo" />
        <Stat title="Income TVAC" value={money.format(incomeTotalTVAC)} tone="indigo" />
        <Stat title="Expenses TVAC" value={money.format(totalExpTVAC)} tone="sky" />
        <Stat title="Profit TVAC" value={money.format(profitTVAC)} tone="emerald" />
      </div>

      {/* INCOME */}
      <div className="card overflow-hidden">
        <SectionTitle color="indigo">Income</SectionTitle>

        <SubTitle color="indigo">Operating income</SubTitle>
        <div>
          <div className="grid grid-cols-3 text-xs text-zinc-600 px-4 pt-3 pb-2">
            <div>Catégorie</div><div className="text-right">Réel HTVA</div><div className="text-right">Réel TVAC</div>
          </div>
          {OPERATING_INCOME.map((c, i) => {
            const tvac = incomeTvac.map.get(c) || 0;
            const htva = toHTVA(tvac);
            return (
              <Row
                key={c}
                zebraIndex={i}
                label={<span className={`font-semibold ${CATEGORY_COLORS[c] || "text-zinc-800"}`}>{c}</span>}
                left={money.format(htva)}
                right={money.format(tvac)}
              />
            );
          })}
          <div className="grid grid-cols-3 items-center px-4 py-3 bg-indigo-50/60 border-t border-indigo-200 font-semibold">
            <div>Total operating income</div>
            <div className="text-right tabular-nums">{money.format(incomeOperatingHTVA)}</div>
            <div className="text-right tabular-nums">{money.format(incomeOperatingTVAC)}</div>
          </div>
        </div>

        <SubTitle color="indigo">Non-operating income</SubTitle>
        <div>
          {NON_OPERATING_INCOME.map((c, i) => {
            const tvac = incomeTvac.map.get(c) || 0;
            const htva = toHTVA(tvac);
            return (
              <Row
                key={c}
                zebraIndex={i}
                label={<span className={`font-semibold ${CATEGORY_COLORS[c] || "text-zinc-800"}`}>{c}</span>}
                left={money.format(htva)}
                right={money.format(tvac)}
              />
            );
          })}
          {incomeTvac.autres > 0 && (
            <Row zebraIndex={999} label="Autres" left={money.format(toHTVA(incomeTvac.autres))} right={money.format(incomeTvac.autres)} />
          )}
          <div className="grid grid-cols-3 items-center px-4 py-3 bg-indigo-50/60 border-t border-indigo-200 font-semibold">
            <div>Total non-operating income</div>
            <div className="text-right tabular-nums">
              {money.format(incomeNonOperatingHTVA + toHTVA(incomeTvac.autres))}
            </div>
            <div className="text-right tabular-nums">
              {money.format(incomeNonOperatingTVAC + incomeTvac.autres)}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-indigo-600/10 text-indigo-900 border-t border-indigo-200 font-semibold grid grid-cols-3">
          <div>TOTAL INCOME</div>
          <div className="text-right tabular-nums">{money.format(incomeTotalHTVA)}</div>
          <div className="text-right tabular-nums">{money.format(incomeTotalTVAC)}</div>
        </div>
      </div>

      {/* EXPENSES */}
      <div className="card overflow-hidden">
        <SectionTitle color="sky">Expenses</SectionTitle>

        <SubTitle color="sky">Operating expenses (TVAC)</SubTitle>
        <div>
          <div className="grid grid-cols-3 text-xs text-zinc-600 px-4 pt-3 pb-2">
            <div>Catégorie</div><div></div><div className="text-right">Réel TVAC</div>
          </div>
          {OPERATING_EXPENSES.map((k, i) => (
            <Row key={k} zebraIndex={i} label={<span className="font-semibold">{expLabel(k)}</span>} right={money.format(expenseTVACByCat.get(k) || 0)} />
          ))}
          <div className="grid grid-cols-3 items-center px-4 py-3 bg-sky-50/60 border-t border-sky-200 font-semibold">
            <div>Total operating expenses</div><div></div>
            <div className="text-right tabular-nums">{money.format(opExpTVAC)}</div>
          </div>
        </div>

        <SubTitle color="sky">Coûts supplémentaires (TVAC)</SubTitle>
        <div>
          {EXTRA_COSTS.map((k, i) => (
            <Row key={k} zebraIndex={i} label={<span className="font-semibold">{expLabel(k)}</span>} right={money.format(expenseTVACByCat.get(k) || 0)} />
          ))}
          <div className="grid grid-cols-3 items-center px-4 py-3 bg-sky-50/60 border-t border-sky-200 font-semibold">
            <div>Total coûts supplémentaires</div><div></div>
            <div className="text-right tabular-nums">{money.format(extraTVAC)}</div>
          </div>
        </div>

        <div className="px-4 py-3 bg-sky-600/10 text-sky-900 border-t border-sky-200 font-semibold grid grid-cols-3">
          <div>TOTAL EXPENSES</div><div></div>
          <div className="text-right tabular-nums">{money.format(totalExpTVAC)}</div>
        </div>
      </div>

      {/* PROFIT */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="text-sm font-semibold text-emerald-800">Profit TVAC</div>
          <div className="mt-1 text-3xl font-bold text-emerald-900 tabular-nums">{money.format(profitTVAC)}</div>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="text-sm font-semibold text-indigo-800">Incomes HTVA – Expenses TVAC</div>
          <div className="mt-1 text-3xl font-bold text-indigo-900 tabular-nums">{money.format(profitHTVAminusTVAC)}</div>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Les dépenses restent en TVAC. Les rentrées sont ventilées en HTVA/TVAC (taux 21%). Les remboursements déduisent les dépenses correspondantes.
      </p>
    </div>
  );
}
