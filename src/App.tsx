import React, { Suspense } from "react";
import ColumnMapper from "./components/ColumnMapper";
import TransactionsTable from "./components/TransactionsTable";
import ManualAdd from "./components/ManualAdd";
import QuickImport, { type QuickImportHandle } from "./components/QuickImport";
import ConfirmDialog from "./components/ConfirmDialog";
import PeriodFilter, { type Period } from "./components/PeriodFilter";
import CollapsibleCard from "./components/CollapsibleCard";
import Overview from "./components/Overview";
import { normalizeAll } from "./lib/ing";
import { db } from "./db";
import { dedupeInDB } from "./lib/dedupe";
import type { RawRow, MappedColumns, Transaction } from "./types";

const CategoryRecap = React.lazy(() => import("./components/CategoryRecap"));

type Step = "map" | "table";

export default function App() {
  const [step, setStep] = React.useState<Step>("table");
  const [view, setView] = React.useState<"table" | "recap" | "overview">("overview");
  const [loading, setLoading] = React.useState(true);

  // import & mapping
  const [rawRows, setRawRows] = React.useState<RawRow[]>([]);
  const [headers, setHeaders] = React.useState<string[]>([]);
  // mapping is ephemeral; no need to keep in state

  // data
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [period, setPeriod] = React.useState<Period>({ mode: "all" });

  // UI
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const pickerRef = React.useRef<QuickImportHandle>(null);

  const money = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" });

  // années pour filtre
  const availableYears = React.useMemo(() => {
    const s = new Set<string>();
    for (const t of transactions) s.add(t.date.slice(0, 4));
    return Array.from(s).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // transactions filtrées par période
  const filtered = React.useMemo(() => {
    switch (period.mode) {
      case "all":
        return transactions;
      case "year":
        return transactions.filter((t) => t.date.slice(0, 4) === period.y);
      case "month":
        return transactions.filter((t) => t.date.slice(0, 7) === period.ym);
      case "range": {
        const from = period.from || "0000-00-00";
        const to = period.to || "9999-12-31";
        return transactions.filter((t) => t.date >= from && t.date <= to);
      }
      default:
        return transactions;
    }
  }, [transactions, period]);

  // pastilles
  const totalIncomes = React.useMemo(
    () => filtered.reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0),
    [filtered]
  );
  const totalExpenses = React.useMemo(
    () => filtered.reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0),
    [filtered]
  );
  const net = React.useMemo(() => totalIncomes - totalExpenses, [totalIncomes, totalExpenses]);

  // chargement initial
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await db.transactions.orderBy("date").reverse().toArray();
        if (!cancelled) {
          setTransactions(rows);
          setStep("table");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function onParsed(rows: RawRow[], hdrs: string[]) {
    if (!rows.length) return;
    setRawRows(rows);
    setHeaders(hdrs);
    setStep("map");
    setView("table");
  }

  async function onMappingSubmit(m: MappedColumns) {
    const tx = normalizeAll(rawRows, m);

    // merge avec existant pour préserver catégories/remboursements/splits
    const ids = tx.map((t) => t.id);
    const existing = await db.transactions.bulkGet(ids);
    for (let i = 0; i < tx.length; i++) {
      const prev = existing[i];
      if (!prev) continue;
      if (prev.category && !tx[i].category) tx[i].category = prev.category;
      if (prev.subcategory && !tx[i].subcategory) tx[i].subcategory = prev.subcategory;
      if (prev.isRefund && !tx[i].isRefund) tx[i].isRefund = prev.isRefund;
      if (prev.refundCategory && !tx[i].refundCategory) tx[i].refundCategory = prev.refundCategory;
      if (prev.refundSubcategory && !tx[i].refundSubcategory) tx[i].refundSubcategory = prev.refundSubcategory;
      const hasNoSplits = !tx[i].splits || tx[i].splits!.length === 0;
      if (prev.splits && hasNoSplits) tx[i].splits = prev.splits;
    }

    await db.transactions.bulkPut(tx);
    await dedupeInDB();

    const rows = await db.transactions.orderBy("date").reverse().toArray();
    setTransactions(rows);
    setStep("table");
    setView("overview");
  }

  async function onUpdateRows(rows: Transaction[]) {
    await db.transactions.bulkPut(rows);
    const all = await db.transactions.orderBy("date").reverse().toArray();
    setTransactions(all);
  }

  async function hardReset() {
    await db.transactions.clear();
    setTransactions([]);
    setStep("table");
  }

  function openFilePicker() {
    pickerRef.current?.open();
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <QuickImport ref={pickerRef} onParsed={onParsed} />

      <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-10">
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight">BubbleFinance</h1>
          <p className="text-zinc-600">
            Importe un CSV ING → mappe les colonnes → ajoute en base → tri & dédoublonnage.
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-3">
            <button onClick={openFilePicker} className="btn-primary">Ajouter un relevé</button>
            <div className="inline-flex rounded-xl border border-zinc-300 overflow-hidden">
              <button
                onClick={() => setView("table")}
                className={`btn-ghost ${view === "table" ? "bg-zinc-100" : ""}`}
              >
                Catégorisation
              </button>
              <button
                onClick={() => setView("recap")}
                className={`btn-ghost ${view === "recap" ? "bg-zinc-100" : ""}`}
              >
                Récap
              </button>
              <button
                onClick={() => setView("overview")}
                className={`btn-ghost ${view === "overview" ? "bg-zinc-100" : ""}`}
              >
                Overview
              </button>
            </div>
          </div>

          {/* Filtre de période */}
          <div className="mt-4">
            <PeriodFilter period={period} onChange={setPeriod} availableYears={availableYears} />
          </div>

          {/* Pastilles */}
          <div className="mt-4 flex justify-center gap-4 flex-wrap">
            <span className="pill">Rentrées : <strong className="text-emerald-700">{money.format(totalIncomes)}</strong></span>
            <span className="pill">Dépenses : <strong className="text-rose-700">{money.format(totalExpenses)}</strong></span>
            <span className="pill">Net : <strong className={`${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{money.format(net)}</strong></span>
          </div>
        </header>

        {loading && <div className="card p-6 text-center">Chargement…</div>}

        {/* Étape mappage */}
        {!loading && step === "map" && (
          <section className="space-y-6">
            <h2 className="text-xl font-semibold">Mappage des colonnes</h2>
            <div className="card p-6">
              <ColumnMapper headers={headers} onSubmit={onMappingSubmit} />
              <p className="text-sm text-zinc-600 mt-2">
                Sélectionne au minimum <em>Date</em>, <em>Libellés</em> et <em>Montant</em>.
              </p>
            </div>
          </section>
        )}

        {/* Catégorisation */}
        {!loading && step === "table" && view === "table" && (
          <section className="space-y-6">
            <h2 className="text-xl font-semibold">Catégorisation</h2>

            <CollapsibleCard title="Ajouter une transaction" defaultOpen={false}>
              <ManualAdd
                onCreate={async (tx) => {
                  await db.transactions.put(tx);
                  const rows = await db.transactions.orderBy("date").reverse().toArray();
                  setTransactions(rows);
                }}
              />
            </CollapsibleCard>

            {filtered.length === 0 ? (
              <div className="card p-6 text-center text-zinc-600">
                Aucune transaction pour la période sélectionnée.
              </div>
            ) : (
              <div className="card p-4 md:p-5">
                <TransactionsTable transactions={filtered} onUpdate={onUpdateRows} />
              </div>
            )}
          </section>
        )}

        {/* Récap détaillé */}
        {!loading && step === "table" && view === "recap" && (
          <section className="space-y-6">
            <h2 className="text-xl font-semibold">Récap</h2>
            <Suspense fallback={<div className="card p-6 text-center">Chargement du récap…</div>}>
              <CategoryRecap transactions={filtered} />
            </Suspense>
          </section>
        )}

        {/* Overview style tableau budgétaire */}
        {!loading && step === "table" && view === "overview" && (
          <section className="space-y-6">
            <h2 className="text-xl font-semibold">Overview</h2>
            <Overview transactions={filtered} />
          </section>
        )}

        {/* Danger zone */}
        <section className="pt-4">
          <div className="card p-4 md:p-5 flex items-center justify-between">
            <div>
              <div className="font-semibold">Zone sensible</div>
              <div className="text-zinc-600 text-sm">Supprime toutes les transactions sauvegardées sur ce navigateur.</div>
            </div>
            <button className="btn-danger" onClick={() => setConfirmOpen(true)}>
              Réinitialiser toutes les données
            </button>
          </div>
        </section>
      </div>

      {/* Modale de confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        title="Réinitialiser les données ?"
        message="Cette action efface toutes les transactions locales (IndexedDB). Elle est irréversible."
        confirmLabel="Oui, tout effacer"
        cancelLabel="Annuler"
        onConfirm={hardReset}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
