import React from "react";
import type { Transaction } from "../types";
import rawCategories from "../data/categories.json";
import incomeCategories from "../data/incomes.json";
import CategoryBadge from "./CategoryBadge";

type CategoryDict = Record<string, string[]>;
const CATS = rawCategories as CategoryDict;
const INCOME_LIST = incomeCategories as string[];

const PRIMARY_JSON_KEYS = ["Advertising", "Abonnement", "Recruiting", "Networking", "Event", "Local"] as const;

const money = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" });

type Row = { subcategory: string; total: number; count: number };
type Block = { jsonKey: string; title: string; rows: Row[]; total: number; toClassify: number };
type IncomeRow = { category: string; total: number; count: number };

function displayLabel(jsonKey: string): string {
  if (jsonKey === "Abonnement") return "Abonnements";
  return jsonKey;
}
function buildExpenseDisplayOrder(): { jsonKey: string; title: string }[] {
  const allKeys = Object.keys(CATS);
  const primary = (PRIMARY_JSON_KEYS as readonly string[])
    .filter(k => allKeys.includes(k))
    .map(k => ({ jsonKey: k, title: displayLabel(k) }));
  const rest = allKeys
    .filter(k => !(PRIMARY_JSON_KEYS as readonly string[]).includes(k))
    .sort((a, b) => displayLabel(a).localeCompare(displayLabel(b)))
    .map(k => ({ jsonKey: k, title: displayLabel(k) }));
  return [...primary, ...rest];
}

/** Dépenses (remboursements déduits) — gère les splits */
function computeExpenseBlocks(transactions: Transaction[]): Block[] {
  const order = buildExpenseDisplayOrder();

  const isExpense = (t: Transaction) => t.amount < 0;
  const refunds = transactions.filter(t => t.amount > 0 && t.isRefund && t.refundCategory);

  return order.map(({ jsonKey, title }) => {
    const declaredSubs = CATS[jsonKey] || [];
    const hasSubcats = declaredSubs.length > 0;

    const map = new Map<string, Row>();
    let toClassify = 0;

    for (const s of declaredSubs) map.set(s, { subcategory: s, total: 0, count: 0 });
    if (!hasSubcats && !map.has("Total")) map.set("Total", { subcategory: "Total", total: 0, count: 0 });

    for (const t of transactions) {
      if (!isExpense(t)) continue;

      if (t.splits && t.splits.length > 0) {
        for (const s of t.splits) {
          if (s.category !== jsonKey) continue;
          const key = hasSubcats ? (s.subcategory || "À catégoriser") : "Total";
          if (!map.has(key)) map.set(key, { subcategory: key, total: 0, count: 0 });
          const row = map.get(key)!;
          row.total += Math.abs(s.amount);
          row.count += 1;
          if (hasSubcats && !s.subcategory) toClassify += Math.abs(s.amount);
        }
        continue;
      }

      if (t.category !== jsonKey) continue;
      const sub = hasSubcats ? (t.subcategory || "") : "Total";
      const key = hasSubcats ? (sub || "À catégoriser") : "Total";
      if (!map.has(key)) map.set(key, { subcategory: key, total: 0, count: 0 });
      const row = map.get(key)!;
      row.total += Math.abs(t.amount);
      row.count += 1;
      if (hasSubcats && !sub) toClassify += Math.abs(t.amount);
    }

    for (const t of refunds) {
      if (t.refundCategory !== jsonKey) continue;
      const sub = hasSubcats ? (t.refundSubcategory || "À catégoriser") : "Total";
      if (!map.has(sub)) map.set(sub, { subcategory: sub, total: 0, count: 0 });
      const row = map.get(sub)!;
      row.total -= Math.abs(t.amount);
      row.count += 1;
    }

    const ordered: Row[] = [];
    if (hasSubcats) {
      for (const s of declaredSubs) { const r = map.get(s); if (r) ordered.push(r); }
      if (map.has("À catégoriser")) ordered.push(map.get("À catégoriser")!);
      const remaining = [...map.values()]
        .filter(r => !declaredSubs.includes(r.subcategory) && r.subcategory !== "À catégoriser")
        .sort((a, b) => a.subcategory.localeCompare(b.subcategory));
      ordered.push(...remaining);
    } else {
      const main = map.get("Total"); if (main) ordered.push(main);
      const others = [...map.values()].filter(r => r.subcategory !== "Total")
        .sort((a, b) => a.subcategory.localeCompare(b.subcategory));
      ordered.push(...others);
    }

    const total = ordered.reduce((s, r) => s + r.total, 0);
    return { jsonKey, title, rows: ordered, total, toClassify };
  });
}

/** Rentrées (hors remboursements) */
function computeIncomeRows(transactions: Transaction[]): IncomeRow[] {
  const incomes = transactions.filter(t => t.amount > 0 && !t.isRefund);
  const map = new Map<string, IncomeRow>();
  for (const c of INCOME_LIST) map.set(c, { category: c, total: 0, count: 0 });
  for (const t of incomes) {
    const cat = (t.category && INCOME_LIST.includes(t.category)) ? t.category : (t.category || "À catégoriser");
    if (!map.has(cat)) map.set(cat, { category: cat, total: 0, count: 0 });
    const row = map.get(cat)!;
    row.total += t.amount; row.count += 1;
  }
  const ordered: IncomeRow[] = [];
  for (const c of INCOME_LIST) ordered.push(map.get(c)!);
  if (map.has("À catégoriser")) ordered.push(map.get("À catégoriser")!);
  const remaining = [...map.values()]
    .filter(r => !INCOME_LIST.includes(r.category) && r.category !== "À catégoriser")
    .sort((a, b) => a.category.localeCompare(b.category));
  ordered.push(...remaining);
  return ordered;
}

export default function CategoryRecap({ transactions }: { transactions: Transaction[] }) {
  const expenseBlocks = React.useMemo(() => computeExpenseBlocks(transactions), [transactions]);
  const incomeRows = React.useMemo(() => computeIncomeRows(transactions), [transactions]);

  function exportExpensesCsv() {
    const rows: Array<Record<string, string | number>> = [];
    for (const b of expenseBlocks) {
      rows.push({ Catégorie: b.title, "Sous-catégorie": "", "Total (€)": Number(b.total.toFixed(2)), "Nb. lignes": "" });
      for (const r of b.rows) {
        rows.push({ Catégorie: "", "Sous-catégorie": r.subcategory, "Total (€)": Number(r.total.toFixed(2)), "Nb. lignes": r.count });
      }
      rows.push({ Catégorie: "", "Sous-catégorie": "—", "Total (€)": "", "Nb. lignes": "" });
    }
    const header = ["Catégorie", "Sous-catégorie", "Total (€)", "Nb. lignes"];
    const csv = [header.join(";"), ...rows.map(r => header.map(h => String(r[h] ?? "")).join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "recap_depenses.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function exportIncomesCsv() {
    const header = ["Catégorie", "Total (€)", "Nb. lignes"] as const;
    type HeaderKey = typeof header[number];
    const rows: Array<Record<HeaderKey, string | number>> = incomeRows.map(r => ({ Catégorie: r.category, "Total (€)": Number(r.total.toFixed(2)), "Nb. lignes": r.count }));
    const csv = [header.join(";"), ...rows.map(r => header.map(h => String(r[h] ?? "")).join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "recap_rentrees.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const totalIncomes = incomeRows.reduce((s, r) => s + r.total, 0);
  const totalExpenses = expenseBlocks.reduce((s, b) => s + b.total, 0);

  return (
    <div className="space-y-8">
      {/* Dépenses */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Récap dépenses (toutes catégories, remboursements déduits)</h3>
        <button onClick={exportExpensesCsv} className="btn-ghost">Export dépenses (CSV)</button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {expenseBlocks.map(b => (
          <div key={b.jsonKey} className="card overflow-hidden">
            <div className="px-4 py-3 bg-zinc-50 flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2">
                <CategoryBadge name={b.title} />
              </div>
              <div className="text-sm text-zinc-600">
                Total net : <span className="font-medium">{money.format(b.total)}</span>
                {b.toClassify > 0 && <span className="ml-3 text-amber-700">À catégoriser : {money.format(b.toClassify)}</span>}
              </div>
            </div>
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left p-3">Sous-catégorie</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-right p-3">Nb.</th>
                </tr>
              </thead>
              <tbody>
                {b.rows.map(r => (
                  <tr key={r.subcategory} className="border-t border-zinc-200">
                    <td className="p-3">
                      <span className="font-medium">{r.subcategory}</span>
                    </td>
                    <td className={`p-3 text-right tabular-nums ${r.total < 0 ? "text-emerald-700" : ""}`}>{money.format(r.total)}</td>
                    <td className="p-3 text-right tabular-nums">{r.count}</td>
                  </tr>
                ))}
                {b.rows.length === 0 && (
                  <tr><td className="p-3 text-zinc-600" colSpan={3}>Aucune dépense pour l’instant.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Rentrées */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Récap rentrées (hors remboursements) — Total : <span className="font-medium">{money.format(totalIncomes)}</span>
        </h3>
        <button onClick={exportIncomesCsv} className="btn-ghost">Export rentrées (CSV)</button>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="text-left p-3">Catégorie</th>
              <th className="text-right p-3">Total</th>
              <th className="text-right p-3">Nb.</th>
            </tr>
          </thead>
          <tbody>
            {incomeRows.map(r => (
              <tr key={r.category} className="border-t border-zinc-200">
                <td className="p-3"><CategoryBadge name={r.category} /></td>
                <td className="p-3 text-right tabular-nums">{money.format(r.total)}</td>
                <td className="p-3 text-right tabular-nums">{r.count}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-50 border-t border-zinc-200">
              <td className="p-3 font-semibold text-right">Total</td>
              <td className="p-3 text-right font-semibold">{money.format(totalIncomes)}</td>
              <td className="p-3 text-right font-semibold">
                {incomeRows.reduce((s, r) => s + r.count, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="text-sm text-zinc-600 text-right">
        Dépenses nettes (récap ci-dessus): <span className="font-medium">{money.format(totalExpenses)}</span> ·
        {" "}Rentrées (hors remboursements): <span className="font-medium">{money.format(totalIncomes)}</span> ·
        {" "}Net: <span className={`font-medium ${totalIncomes - totalExpenses >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
          {money.format(totalIncomes - totalExpenses)}
        </span>
      </div>
    </div>
  );
}
