import React from "react";
import type { MappedColumns } from "../types";
import { guessMapping } from "../lib/ing";

type Props = {
  headers: string[];
  onSubmit: (mapping: MappedColumns) => void;
};

const labelCls = "block text-sm mb-1";
const selectCls = "w-full rounded-xl border px-3 py-2 bg-white/5";

export default function ColumnMapper({ headers, onSubmit }: Props) {
  const initial = guessMapping(headers);
  const [map, setMap] = React.useState<MappedColumns>(initial);

  function update<K extends keyof MappedColumns>(k: K, v: string) {
    setMap(m => ({ ...m, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!map.date || !map.description || !map.amount) {
      alert("Sélectionne au minimum Date, Libellés et Montant.");
      return;
    }
    onSubmit(map);
  }

  const renderSelect = (value: string, onChange: (v:string)=>void) => (
    <select value={value} onChange={e=>onChange(e.target.value)} className={selectCls}>
      <option value="">— Choisir —</option>
      {headers.map(h => <option key={h} value={h}>{h}</option>)}
    </select>
  );

  return (
    <form onSubmit={submit} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div><label className={labelCls}>Date</label>{renderSelect(map.date, v=>update("date", v))}</div>
      <div><label className={labelCls}>Libellés / Description</label>{renderSelect(map.description, v=>update("description", v))}</div>
      <div><label className={labelCls}>Montant</label>{renderSelect(map.amount, v=>update("amount", v))}</div>
      <div><label className={labelCls}>Devise (optionnel)</label>{renderSelect(map.currency || "", v=>update("currency", v))}</div>
      <div><label className={labelCls}>Compte contrepartie (optionnel)</label>{renderSelect(map.counterparty || "", v=>update("counterparty", v))}</div>
      <div><label className={labelCls}>Numéro de mouvement (optionnel)</label>{renderSelect(map.movementId || "", v=>update("movementId", v))}</div>

      <div className="sm:col-span-2 lg:col-span-3">
        <button className="mt-2 px-4 py-2 rounded-xl border hover:shadow">Valider le mappage</button>
      </div>
    </form>
  );
}

