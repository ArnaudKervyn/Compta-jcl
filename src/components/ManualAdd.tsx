import React from "react";
import type { Transaction } from "../types";
import incomeCategories from "../data/incomes.json";
import rawCategories from "../data/categories.json";

type Props = { onCreate: (tx: Transaction) => void };

type CatDict = Record<string, string[]>;
const CATS = rawCategories as CatDict;
const INCOMES = incomeCategories as string[];

const todayISO = () => new Date().toISOString().slice(0, 10);
const moneyRe = /^-?\d+([.,]\d{1,2})?$/;

export default function ManualAdd({ onCreate }: Props) {
  const [date, setDate] = React.useState(todayISO());
  const [desc, setDesc] = React.useState("");
  const [sign, setSign] = React.useState<"expense" | "income">("expense");
  const [amount, setAmount] = React.useState("");

  // Dépense
  const [cat, setCat] = React.useState("");
  const [sub, setSub] = React.useState("");

  // Rentrée (revenu) ou remboursement
  const [incomeCat, setIncomeCat] = React.useState("");
  const [isRefund, setIsRefund] = React.useState(false);
  const [refundCat, setRefundCat] = React.useState("");
  const [refundSub, setRefundSub] = React.useState("");

  const subs = cat ? (CATS[cat] || []) : [];
  const refundSubs = refundCat ? (CATS[refundCat] || []) : [];

  function parseAmount(a: string): number {
    return parseFloat(a.replace(/\./g, "").replace(",", "."));
  }

  function reset() {
    setDate(todayISO());
    setDesc("");
    setAmount("");
    setCat("");
    setSub("");
    setIncomeCat("");
    setIsRefund(false);
    setRefundCat("");
    setRefundSub("");
    setSign("expense");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!desc.trim()) return alert("Description requise");
    if (!moneyRe.test(amount)) return alert("Montant invalide");
    const val = Math.abs(parseAmount(amount));
    if (!(val > 0)) return alert("Montant doit être > 0");

    const base: Transaction = {
      id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date,
      description: desc.trim(),
      amount: sign === "expense" ? -val : val,
      raw: {},
    };

    if (sign === "expense") {
      if (!cat) return alert("Catégorie dépense requise");
      base.category = cat;
      if ((CATS[cat] || []).length > 0 && !sub) return alert("Sous-catégorie requise");
      if (sub) base.subcategory = sub;
    } else {
      if (isRefund) {
        if (!refundCat) return alert("Catégorie dépense remboursée requise");
        base.isRefund = true;
        base.refundCategory = refundCat;
        if ((CATS[refundCat] || []).length > 0 && !refundSub) return alert("Sous-catégorie remboursée requise");
        if (refundSub) base.refundSubcategory = refundSub;
      } else {
        if (!incomeCat) return alert("Catégorie de revenus requise");
        base.category = incomeCat;
      }
    }

    onCreate(base);
    reset();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="text-sm font-medium mb-1">Ajouter une transaction</div>

      <div className="grid md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs text-zinc-600">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
        </div>
        <div className="md:col-span-4">
          <label className="text-xs text-zinc-600">Description</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Note de frais, loyer, etc." className="input" />
        </div>

        <div>
          <label className="text-xs text-zinc-600">Type</label>
          <select value={sign} onChange={e => setSign(e.target.value as any)} className="select">
            <option value="expense">Dépense</option>
            <option value="income">Rentrée</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-zinc-600">Montant</label>
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="ex: 100,00" className="input" />
        </div>

        {sign === "expense" ? (
          <>
            <div>
              <label className="text-xs text-zinc-600">Catégorie dépense</label>
              <select value={cat} onChange={e => { setCat(e.target.value); setSub(""); }} className="select">
                <option value="">— Choisir —</option>
                {Object.keys(CATS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-zinc-600">Sous-catégorie</label>
              <select
                value={sub}
                disabled={!cat || (CATS[cat] || []).length === 0}
                onChange={e => setSub(e.target.value)}
                className="select"
              >
                <option value="">— Choisir —</option>
                {(CATS[cat] || []).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="md:col-span-2">
              <label className="text-xs text-zinc-600 flex items-center gap-2">
                <input type="checkbox" checked={isRefund} onChange={e => setIsRefund(e.target.checked)} />
                Remboursement ?
              </label>
            </div>

            {!isRefund ? (
              <div className="md:col-span-3">
                <label className="text-xs text-zinc-600">Catégorie de revenus</label>
                <select value={incomeCat} onChange={e => setIncomeCat(e.target.value)} className="select">
                  <option value="">— Choisir —</option>
                  {INCOMES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-zinc-600">Catégorie dépense remboursée</label>
                  <select value={refundCat} onChange={e => { setRefundCat(e.target.value); setRefundSub(""); }} className="select">
                    <option value="">— Choisir —</option>
                    {Object.keys(CATS).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-zinc-600">Sous-catégorie</label>
                  <select
                    value={refundSub}
                    disabled={!refundCat || (CATS[refundCat] || []).length === 0}
                    onChange={e => setRefundSub(e.target.value)}
                    className="select"
                  >
                    <option value="">— Choisir —</option>
                    {(CATS[refundCat] || []).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </>
            )}
          </>
        )}

        <div className="md:col-span-6">
          <button className="btn-primary">Ajouter</button>
        </div>
      </div>
    </form>
  );
}
