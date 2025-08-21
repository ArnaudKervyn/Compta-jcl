import React from "react";
import Papa from "papaparse";
import type { Transaction, Split } from "../types";
import rawCategories from "../data/categories.json";
import incomeCategories from "../data/incomes.json";
import SplitEditor from "./SplitEditor";
import CategoryBadge from "./CategoryBadge";

type CategoryDict = Record<string, string[]>;
const categories = rawCategories as CategoryDict;
const incomes = incomeCategories as string[];

type Props = {
  transactions: Transaction[];        // (déjà filtrées par période côté App)
  onUpdate: (rows: Transaction[]) => void;
};

export default function TransactionsTable({ transactions, onUpdate }: Props) {
  const [filter, setFilter] = React.useState("");
  const [editingSplitId, setEditingSplitId] = React.useState<string | null>(null);

  function patch(id: string, up: Partial<Transaction>) {
    onUpdate(transactions.map(t => (t.id === id ? { ...t, ...up } : t)));
  }

  // Dépense
  function setExpenseCat(id: string, category: string) { patch(id, { category, subcategory: "" }); }
  function setExpenseSub(id: string, subcategory: string) { patch(id, { subcategory }); }

  // Rentrée
  function setIncomeCat(id: string, category: string) { patch(id, { category }); }

  // Remboursement
  function toggleRefund(id: string, isRefund: boolean) {
    patch(id, {
      isRefund,
      ...(isRefund
        ? { category: "", refundCategory: "", refundSubcategory: "" }
        : { refundCategory: "", refundSubcategory: "" })
    });
  }
  function setRefundCat(id: string, refundCategory: string) { patch(id, { refundCategory, refundSubcategory: "" }); }
  function setRefundSub(id: string, refundSubcategory: string) { patch(id, { refundSubcategory }); }

  // Split
  function openSplit(tx: Transaction) { setEditingSplitId(tx.id); }
  function saveSplit(id: string, splits: Split[]) {
    patch(id, { splits, category: "", subcategory: "" });
    setEditingSplitId(null);
  }

  // Export CSV (affiche les splits en lignes individuelles)
  function exportCsv() {
    const rows: any[] = [];
    for (const t of transactions) {
      const isIncome = t.amount > 0;
      if (!isIncome && t.splits && t.splits.length > 0) {
        for (const s of t.splits) {
          rows.push({
            Type: "Dépense (split)",
            Date: t.date,
            Description: `${t.description} (split)`,
            Montant: -Math.abs(s.amount),
            Devise: t.currency || "",
            Contrepartie: t.counterparty || "",
            Mouvement: t.movementId || "",
            Catégorie: s.category || "",
            "Sous-catégorie": s.subcategory || "",
            "Remboursement Catégorie": "",
            "Remboursement Sous-catégorie": "",
          });
        }
      } else {
        rows.push({
          Type: isIncome ? (t.isRefund ? "Remboursement" : "Rentrée") : "Dépense",
          Date: t.date,
          Description: t.description,
          Montant: t.amount,
          Devise: t.currency || "",
          Contrepartie: t.counterparty || "",
          Mouvement: t.movementId || "",
          Catégorie: !isIncome ? (t.category || "") : (!t.isRefund ? (t.category || "") : ""),
          "Sous-catégorie": !isIncome ? (t.subcategory || "") : "",
          "Remboursement Catégorie": t.isRefund ? (t.refundCategory || "") : "",
          "Remboursement Sous-catégorie": t.isRefund ? (t.refundSubcategory || "") : "",
        });
      }
    }
    const csv = Papa.unparse(rows, { delimiter: ";" });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "transactions_categorisees.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  // Filtre texte local
  const filtered = transactions.filter(t => {
    if (!filter.trim()) return true;
    const s = filter.toLowerCase();
    return (
      t.description.toLowerCase().includes(s) ||
      t.counterparty?.toLowerCase().includes(s) ||
      t.category?.toLowerCase().includes(s) ||
      t.subcategory?.toLowerCase().includes(s) ||
      t.refundCategory?.toLowerCase().includes(s) ||
      t.refundSubcategory?.toLowerCase().includes(s)
    );
  });

  // Compteur "catégorisées"
  const categorizedCount = transactions.filter(t =>
    t.category || t.isRefund || (t.splits && t.splits.length > 0)
  ).length;

  return (
    <div className="space-y-4">
      {/* Barre d’actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filtrer… (texte, catégorie, sous-catégorie)"
          className="input w-full md:w-[420px]"
        />
        <div className="text-sm text-zinc-600">{categorizedCount} / {transactions.length} catégorisées</div>
        <button onClick={exportCsv} className="btn-ghost">Exporter CSV</button>
      </div>

      {/* Table scrollable, plus d’air + lignes séparatrices + zébrage */}
      <div className="overflow-auto max-h-[70vh] rounded-xl border border-zinc-200 shadow-sm bg-white">
        <table className="min-w-full text-[15px] leading-relaxed">
          <thead className="sticky top-0 bg-white/95 backdrop-blur z-10 shadow-sm">
            <tr className="text-zinc-700">
              <th className="text-left p-5">Date</th>
              <th className="text-left p-5">Description</th>
              <th className="text-right p-5">Montant</th>
              <th className="text-left p-5">Catégorie</th>
              <th className="text-left p-5">Sous-catégorie</th>
              <th className="text-left p-5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, idx) => {
              const isIncome = t.amount > 0.000001;
              const expenseSubs = t.category ? (categories[t.category] || []) : [];
              const refundSubs = t.refundCategory ? (categories[t.refundCategory] || []) : [];
              const hasSplits = !!t.splits && t.splits.length > 0;

              return (
                <React.Fragment key={t.id}>
                  <tr className={`align-top border-t border-zinc-200 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-zinc-50/60"} hover:bg-zinc-100/60`}>
                    <td className="p-5 whitespace-nowrap">{t.date}</td>
                    <td className="p-5">
                      <div className="font-medium">{t.description}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {t.counterparty || ""} {t.movementId ? `· ${t.movementId}` : ""}
                      </div>
                    </td>
                    <td className={`p-5 text-right tabular-nums font-semibold ${isIncome ? "text-emerald-700" : "text-rose-700"}`}>
                      {t.amount.toFixed(2)}
                    </td>

                    {/* Catégorie */}
                    <td className="p-5">
                      {!isIncome ? (
                        hasSplits ? (
                          <div className="text-xs text-zinc-600">Opération éclatée ({t.splits!.length} lignes)</div>
                        ) : (
                          <select
                            className="select"
                            value={t.category || ""}
                            onChange={e => setExpenseCat(t.id, e.target.value)}
                          >
                            <option value="">— Choisir —</option>
                            {Object.keys(categories).map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        )
                      ) : (
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-xs text-zinc-600">
                            <input
                              type="checkbox"
                              checked={!!t.isRefund}
                              onChange={e => toggleRefund(t.id, e.target.checked)}
                            />
                            Remboursement ?
                          </label>
                          {t.isRefund ? (
                            <>
                              <select
                                className="select"
                                value={t.refundCategory || ""}
                                onChange={e => setRefundCat(t.id, e.target.value)}
                              >
                                <option value="">— Catégorie dépense —</option>
                                {Object.keys(categories).map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                              <select
                                className="select"
                                value={t.refundSubcategory || ""}
                                onChange={e => setRefundSub(t.id, e.target.value)}
                                disabled={!t.refundCategory}
                              >
                                <option value="">— Sous-catégorie —</option>
                                {refundSubs.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                              </select>
                            </>
                          ) : (
                            <select
                              className="select"
                              value={t.category || ""}
                              onChange={e => setIncomeCat(t.id, e.target.value)}
                            >
                              <option value="">— Catégorie de revenus —</option>
                              {incomes.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Sous-catégorie */}
                    <td className="p-5">
                      {!isIncome ? (
                        hasSplits ? (
                          <div className="text-xs text-zinc-600">—</div>
                        ) : (
                          <select
                            className="select"
                            value={t.subcategory || ""}
                            onChange={e => setExpenseSub(t.id, e.target.value)}
                            disabled={!t.category || expenseSubs.length === 0}
                          >
                            <option value="">— Choisir —</option>
                            {expenseSubs.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                          </select>
                        )
                      ) : (
                        <input className="input opacity-40" readOnly placeholder="—" />
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-5">
                      {!isIncome && (
                        <button className="btn-ghost" onClick={() => openSplit(t)}>Éclater</button>
                      )}
                      {hasSplits && !isIncome && (
                        <div className="mt-3 text-xs text-zinc-600 space-y-1">
                          {t.splits!.map(s => (
                            <div key={s.id} className="flex items-center gap-2">
                              <CategoryBadge name={s.category} />
                              <span className="text-zinc-500">{s.subcategory ? ` / ${s.subcategory}` : ""}</span>
                              <span className="tabular-nums">— {s.amount.toFixed(2)} €</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Ligne d'édition des splits */}
                  {editingSplitId === t.id && (
                    <tr className="border-t border-zinc-200">
                      <td colSpan={6} className="p-5 bg-zinc-50">
                        <SplitEditor
                          tx={t}
                          onCancel={() => setEditingSplitId(null)}
                          onSave={(splits) => saveSplit(t.id, splits)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {filtered.length === 0 && (
              <tr className="border-t border-zinc-200">
                <td className="p-5 text-center text-zinc-600" colSpan={6}>
                  Aucune transaction ne correspond au filtre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
