import React from "react";
import type { Transaction } from "../types";
import incomeCategories from "../data/incomes.json";

const INCOME_LIST = incomeCategories as string[]; // ["MBU","SBU","EBU","QBU","BSBG(+)","Formations","Partenariats"]
const money = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" });
const toHTVA = (tvac: number) => tvac / 1.21;

const OPERATING_INCOME = ["MBU", "SBU", "EBU", "QBU"];
const NON_OPERATING_INCOME = ["BSBG(+)", "Formations", "Partenariats"];

// Category colors for visual distinction
const CATEGORY_COLORS = {
  "MBU": "text-blue-600",
  "SBU": "text-indigo-600", 
  "EBU": "text-purple-600",
  "QBU": "text-pink-600",
  "BSBG(+)": "text-green-600",
  "Formations": "text-teal-600",
  "Partenariats": "text-cyan-600",
  "Advertising": "text-orange-600",
  "Recruiting": "text-red-600",
  "Networking": "text-yellow-600",
  "Abonnement": "text-lime-600",
  "Event": "text-emerald-600",
  "Local": "text-slate-600",
  "Assurances": "text-gray-600",
  "Banque": "text-stone-600",
} as const;

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

  // Enhanced UI Components
  const Row = ({
    label, left, right, strong,
    zebraIndex, categoryColor,
  }: { label: string; left?: string; right?: string; strong?: boolean; zebraIndex?: number; categoryColor?: string }) => (
    <div className={`grid grid-cols-3 items-center px-6 py-4 ${zebraIndex! % 2 === 0 ? "bg-white" : "bg-slate-50/40"} border-t border-slate-200/60 hover:bg-slate-50/80 transition-colors duration-200`}>
      <div className={`${strong ? "font-bold" : "font-semibold"} ${categoryColor || "text-slate-700"} flex items-center gap-3`}>
        {categoryColor && <div className={`w-3 h-3 rounded-full ${categoryColor.replace('text-', 'bg-')}/20 border-2 ${categoryColor.replace('text-', 'border-')}`}></div>}
        {label}
      </div>
      <div className="text-right tabular-nums text-slate-600 font-medium">{left || ""}</div>
      <div className="text-right tabular-nums text-slate-800 font-semibold">{right || ""}</div>
    </div>
  );

  const SectionTitle = ({ color, children, icon }: { color: "indigo" | "sky" | "emerald"; children: React.ReactNode; icon?: string }) => {
    const colorMap: any = {
      indigo: "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-indigo-200",
      sky: "bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-sky-200",
      emerald: "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-emerald-200",
    };
    return (
      <div className={`px-6 py-4 text-sm font-bold uppercase tracking-wide ${colorMap[color]} shadow-lg flex items-center gap-2`}>
        {icon && <span className="text-lg">{icon}</span>}
        {children}
      </div>
    );
  };

  const SubTitle = ({ color, children }: { color: "indigo" | "sky"; children: React.ReactNode }) => {
    const colorMap: any = {
      indigo: "bg-indigo-50 text-indigo-800 border-indigo-200",
      sky: "bg-sky-50 text-sky-800 border-sky-200",
    };
    return (
      <div className={`px-6 py-3 text-sm font-bold ${colorMap[color]} border-t-2`}>
        {children}
      </div>
    );
  };

  // Enhanced stat cards
  const Stat = ({ title, value, tone, icon }: { title: string; value: string; tone: "emerald" | "sky" | "indigo"; icon?: string }) => {
    const colorMap: any = {
      emerald: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-900 shadow-emerald-100",
      sky: "border-sky-200 bg-gradient-to-br from-sky-50 to-sky-100 text-sky-900 shadow-sky-100",
      indigo: "border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-900 shadow-indigo-100",
    };
    return (
      <div className={`rounded-xl border-2 p-6 ${colorMap[tone]} shadow-lg hover:shadow-xl transition-shadow duration-300`}>
        <div className="flex items-center gap-2 text-sm font-bold opacity-90 mb-2">
          {icon && <span className="text-lg">{icon}</span>}
          {title}
        </div>
        <div className="text-3xl font-bold tabular-nums">{value}</div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Enhanced stats header */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Stat title="Income HTVA" value={money.format(incomeTotalHTVA)} tone="indigo" icon="💰" />
        <Stat title="Income TVAC" value={money.format(incomeTotalTVAC)} tone="indigo" icon="📈" />
        <Stat title="Expenses TVAC" value={money.format(totalExpTVAC)} tone="sky" icon="💸" />
        <Stat title="Profit TVAC" value={money.format(profitTVAC)} tone="emerald" icon="🎯" />
      </div>

      {/* Enhanced INCOME section */}
      <div className="card overflow-hidden shadow-xl border-2 border-slate-200">
        <SectionTitle color="indigo" icon="📊">Income</SectionTitle>

        <SubTitle color="indigo">Operating income</SubTitle>
        <div className="bg-white">
          <div className="grid grid-cols-3 text-xs font-bold text-slate-600 px-6 pt-4 pb-3 bg-slate-50/50 border-b border-slate-200">
            <div>Catégorie</div>
            <div className="text-right">Réel HTVA</div>
            <div className="text-right">Réel TVAC</div>
          </div>
          {OPERATING_INCOME.map((c, i) => {
            const tvac = incomeTvac.map.get(c) || 0;
            const htva = toHTVA(tvac);
            const categoryColor = CATEGORY_COLORS[c as keyof typeof CATEGORY_COLORS];
            return (
              <Row 
                key={c} 
                zebraIndex={i} 
                label={c} 
                left={money.format(htva)} 
                right={money.format(tvac)}
                categoryColor={categoryColor}
              />
            );
          })}
          <div className="grid grid-cols-3 items-center px-6 py-4 bg-gradient-to-r from-indigo-100 to-indigo-50 border-t-2 border-indigo-200 font-bold text-indigo-900">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
              Total operating income
            </div>
            <div className="text-right tabular-nums">{money.format(incomeOperatingHTVA)}</div>
            <div className="text-right tabular-nums">{money.format(incomeOperatingTVAC)}</div>
          </div>
        </div>

        <SubTitle color="indigo">Non-operating income</SubTitle>
        <div className="bg-white">
          {NON_OPERATING_INCOME.map((c, i) => {
            const tvac = incomeTvac.map.get(c) || 0;
            const htva = toHTVA(tvac);
            const categoryColor = CATEGORY_COLORS[c as keyof typeof CATEGORY_COLORS];
            return (
              <Row 
                key={c} 
                zebraIndex={i} 
                label={c} 
                left={money.format(htva)} 
                right={money.format(tvac)}
                categoryColor={categoryColor}
              />
            );
          })}
          {incomeTvac.autres > 0 && (
            <Row 
              zebraIndex={999} 
              label="Autres" 
              left={money.format(toHTVA(incomeTvac.autres))} 
              right={money.format(incomeTvac.autres)}
              categoryColor="text-gray-600"
            />
          )}
          <div className="grid grid-cols-3 items-center px-6 py-4 bg-gradient-to-r from-indigo-100 to-indigo-50 border-t-2 border-indigo-200 font-bold text-indigo-900">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
              Total non-operating income
            </div>
            <div className="text-right tabular-nums">
              {money.format(incomeNonOperatingHTVA + toHTVA(incomeTvac.autres))}
            </div>
            <div className="text-right tabular-nums">
              {money.format(incomeNonOperatingTVAC + incomeTvac.autres)}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-t-2 border-indigo-500 font-bold grid grid-cols-3 shadow-inner">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-white/30"></div>
            TOTAL INCOME
          </div>
          <div className="text-right tabular-nums">{money.format(incomeTotalHTVA)}</div>
          <div className="text-right tabular-nums">{money.format(incomeTotalTVAC)}</div>
        </div>
      </div>

      {/* Enhanced EXPENSES section */}
      <div className="card overflow-hidden shadow-xl border-2 border-slate-200">
        <SectionTitle color="sky" icon="💳">Expenses</SectionTitle>

        <SubTitle color="sky">Operating expenses (TVAC)</SubTitle>
        <div className="bg-white">
          <div className="grid grid-cols-3 text-xs font-bold text-slate-600 px-6 pt-4 pb-3 bg-slate-50/50 border-b border-slate-200">
            <div>Catégorie</div>
            <div></div>
            <div className="text-right">Réel TVAC</div>
          </div>
          {OPERATING_EXPENSES.map((k, i) => {
            const categoryColor = CATEGORY_COLORS[k as keyof typeof CATEGORY_COLORS];
            return (
              <Row 
                key={k} 
                zebraIndex={i} 
                label={expLabel(k)} 
                right={money.format(expenseTVACByCat.get(k) || 0)}
                categoryColor={categoryColor}
              />
            );
          })}
          <div className="grid grid-cols-3 items-center px-6 py-4 bg-gradient-to-r from-sky-100 to-sky-50 border-t-2 border-sky-200 font-bold text-sky-900">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-sky-600"></div>
              Total operating expenses
            </div>
            <div></div>
            <div className="text-right tabular-nums">{money.format(opExpTVAC)}</div>
          </div>
        </div>

        <SubTitle color="sky">Coûts supplémentaires (TVAC)</SubTitle>
        <div className="bg-white">
          {EXTRA_COSTS.map((k, i) => {
            const categoryColor = CATEGORY_COLORS[k as keyof typeof CATEGORY_COLORS];
            return (
              <Row 
                key={k} 
                zebraIndex={i} 
                label={expLabel(k)} 
                right={money.format(expenseTVACByCat.get(k) || 0)}
                categoryColor={categoryColor}
              />
            );
          })}
          <div className="grid grid-cols-3 items-center px-6 py-4 bg-gradient-to-r from-sky-100 to-sky-50 border-t-2 border-sky-200 font-bold text-sky-900">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-sky-600"></div>
              Total coûts supplémentaires
            </div>
            <div></div>
            <div className="text-right tabular-nums">{money.format(extraTVAC)}</div>
          </div>
        </div>

        <div className="px-6 py-5 bg-gradient-to-r from-sky-600 to-sky-700 text-white border-t-2 border-sky-500 font-bold grid grid-cols-3 shadow-inner">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-white/30"></div>
            TOTAL EXPENSES
          </div>
          <div></div>
          <div className="text-right tabular-nums">{money.format(totalExpTVAC)}</div>
        </div>
      </div>

      {/* Enhanced PROFIT section */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 mb-3">
            <span className="text-2xl">🎯</span>
            Profit TVAC
          </div>
          <div className="text-4xl font-bold text-emerald-900 tabular-nums">{money.format(profitTVAC)}</div>
          <div className="mt-2 text-sm text-emerald-700">Revenus moins dépenses (TVAC)</div>
        </div>
        <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <div className="flex items-center gap-2 text-sm font-bold text-indigo-800 mb-3">
            <span className="text-2xl">📈</span>
            Incomes HTVA – Expenses TVAC
          </div>
          <div className="text-4xl font-bold text-indigo-900 tabular-nums">{money.format(profitHTVAminusTVAC)}</div>
          <div className="mt-2 text-sm text-indigo-700">Calcul fiscal optimisé</div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <p className="text-sm text-slate-600 leading-relaxed">
          <span className="font-semibold">Note:</span> Les dépenses restent en TVAC. Les rentrées sont ventilées en HTVA/TVAC (taux 21%). 
          Les remboursements déduisent les dépenses correspondantes. Cette vue offre un aperçu professionnel de vos finances 
          avec une hiérarchie visuelle claire et des couleurs distinctives pour chaque catégorie.
        </p>
      </div>
    </div>
  );
}