import React from "react";
import type { Split, Transaction } from "../types";
import rawCategories from "../data/categories.json";

type Props = {
  tx: Transaction;                 // dépense (amount < 0)
  onSave: (splits: Split[]) => void;
  onCancel: () => void;
};

type CatDict = Record<string, string[]>;
const CATS = rawCategories as CatDict;

function parseAmount(a: string): number {
  return parseFloat(a.replace(/\./g, "").replace(",", "."));
}
const rndId = () => `s_${Math.random().toString(36).slice(2, 8)}`;

export default function SplitEditor({ tx, onSave, onCancel }: Props) {
  const total = Math.abs(tx.amount);
  const [rows, setRows] = React.useState<Array<{ id: string; amount: string; category: string; subcategory: string }>>(
    tx.splits?.map(s => ({ id: s.id, amount: String(s.amount), category: s.category, subcategory: s.subcategory || "" })) ||
    [{ id: rndId(), amount: "", category: "", subcategory: "" }]
  );

  const sum = rows.reduce((s, r) => s + (r.amount ? Math.abs(parseAmount(r.amount)) : 0), 0);
  const valid = Math.abs(sum - total) < 0.005 && rows.every(r => r.category && /^[0-9.,]+$/.test(r.amount));

  function setRow(i: number, patch: Partial<{ amount: string; category: string; subcategory: string }>) {
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch, ...(patch.category ? { subcategory: "" } : {}) } : r)));
  }
  function addRow() { setRows(rs => [...rs, { id: rndId(), amount: "", category: "", subcategory: "" }]); }
  function removeRow(i: number) { setRows(rs => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs)); }

  function save() {
    if (!valid) return alert("La somme des splits doit égaler le montant de la dépense et chaque ligne doit avoir une catégorie.");
    const out: Split[] = rows.map(r => ({
      id: r.id,
      amount: Math.abs(parseAmount(r.amount)),
      category: r.category,
      subcategory: r.subcategory || undefined,
    }));
    onSave(out);
  }

  return (
    <div className="card p-4">
      <div className="text-sm font-medium mb-2">Éclater la dépense de {total.toFixed(2)} €</div>
      <div className="space-y-2">
        {rows.map((r, i) => {
          const subs = r.category ? (CATS[r.category] || []) : [];
          return (
            <div key={r.id} className="grid md:grid-cols-6 gap-2 items-end">
              <div className="md:col-span-2">
                <label className="text-xs text-zinc-600">Montant</label>
                <input value={r.amount} onChange={e => setRow(i, { amount: e.target.value })} placeholder="ex: 50,00" className="input" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-zinc-600">Catégorie</label>
                <select value={r.category} onChange={e => setRow(i, { category: e.target.value })} className="select">
                  <option value="">— Choisir —</option>
                  {Object.keys(CATS).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-zinc-600">Sous-catégorie</label>
                <select
                  value={r.subcategory}
                  onChange={e => setRow(i, { subcategory: e.target.value })}
                  disabled={!r.category || (CATS[r.category] || []).length === 0}
                  className="select"
                >
                  <option value="">— Choisir —</option>
                  {(subs).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => removeRow(i)} className="btn-ghost">Suppr</button>
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-between text-sm text-zinc-600">
          <button type="button" onClick={addRow} className="btn-ghost">+ Ajouter une ligne</button>
          <div>
            Somme des splits : <span className={`${Math.abs(sum - total) < 0.005 ? "text-emerald-700" : "text-rose-700"} font-semibold`}>{sum.toFixed(2)} €</span> / {total.toFixed(2)} €
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="btn-ghost">Annuler</button>
          <button type="button" onClick={save} className="btn-primary" disabled={!valid}>Enregistrer l’éclatement</button>
        </div>
      </div>
    </div>
  );
}
