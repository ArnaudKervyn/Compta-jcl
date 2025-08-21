import React, { Suspense } from "react";
import ColumnMapper from "./components/ColumnMapper";
import TransactionsTable from "./components/TransactionsTable";
import ManualAdd from "./components/ManualAdd";
import QuickImport, { type QuickImportHandle } from "./components/QuickImport";
import ConfirmDialog from "./components/ConfirmDialog";
import { guessMapping, normalizeAll } from "./lib/ing";
import { db } from "./db";
import { dedupeInDB } from "./lib/dedupe";
import type { RawRow, MappedColumns, Transaction } from "./types";

const CategoryRecap = React.lazy(() => import("./components/CategoryRecap"));

type Step = "map" | "table";

export default function App() {
  const [step, setStep] = React.useState<Step>("table");
  const [view, setView] = React.useState<"table" | "recap">("table");
  const [loading, setLoading] = React.useState(true);

  const [rawRows, setRawRows] = React.useState<RawRow[]>([]);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [mapping, setMapping] = React.useState<MappedColumns | null>(null);

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const pickerRef = React.useRef<QuickImportHandle>(null);

  const money = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" });

  const totalIncomes = React.useMemo(
    () => transactions.reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0),
    [transactions]
  );
  const totalExpenses = React.useMemo(
    () => transactions.reduce((s, t) => s + (t.amount < 0 ? Math.abs(t.amount) : 0), 0),
    [transactions]
  );
  const net = totalIncomes - totalExpenses;

  // Confirmation reset
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await db.transactions.orderBy("date").reverse().toArray();
        if (!cancelled) { setTransactions(rows); setStep("table"); }
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
    setMapping(guessMapping(hdrs));
    setStep("map");
    setView("table");
  }

  async function onMappingSubmit(m: MappedColumns) {
    setMapping(m);
    const tx = normalizeAll(rawRows, m);

    // Merge avec l'existant (catégories, remboursements, splits)
    const ids = tx.map(t => t.id);
    const existing = await db.transactions.bulkGet(ids);
    for (let i = 0; i < tx.length; i++) {
      const prev = existing[i]; if (!prev) continue;
      if (prev.category && !tx[i].category) tx[i].category = prev.category;
      if (prev.subcategory && !tx[i].subcategory) tx[i].subcategory = prev.subcategory;
      if (prev.isRefund && !tx[i].isRefund) tx[i].isRefund = prev.isRefund;
      if (prev.refundCategory && !tx[i].refundCategory) tx[i].refundCategory = prev.refundCategory;
      if (prev.refundSubcategory && !tx[i].refundSubcategory) tx[i].refundSubcategory = prev.refundSubcategory;
      if (prev.splits && (!tx[i].splits || tx[i].splits.length === 0)) tx[i].splits = prev.splits;
    }

    await db.transactions.bulkPut(tx);
    await dedupeInDB();

    const rows = await db.transactions.orderBy("date").reverse().toArray();
    setTransactions(rows);
    setStep("table");
  }

  async function onUpdateRows(rows: Transaction[]) {
    setTransactions(rows);
    await db.transactions.bulkPut(rows);
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

      <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-6">
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-5xl font-extrabold tracking-tight">BubbleFinance</h1>
          <p className="subtle">
            Importe un CSV ING → mappe les colonnes → ajoute en base → tri & dédoublonnage.
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
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
            </div>
          </div>

          {/* Pastilles */}
          <div className="mt-3 flex justify-center gap-3 flex-wrap">
            <span className="pill">Rentrées : <strong className="text-emerald-700">{money.format(totalIncomes)}</strong></span>
            <span className="pill">Dépenses : <strong className="text-rose-700">{money.format(totalExpenses)}</strong></span>
            <span className="pill">Net : <strong className={`${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{money.format(net)}</strong></span>
          </div>
        </header>

        {loading && (
          <div className="card p-6 text-center">Chargement…</div>
        )}

        {/* Mappage */}
        {!loading && step === "map" && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Mappage des colonnes</h2>
            <div className="card p-4">
              <ColumnMapper headers={headers} onSubmit={onMappingSubmit} />
              <p className="subtle mt-2">
                Sélectionne au minimum <em>Date</em>, <em>Libellés</em> et <em>Montant</em>.
              </p>
            </div>
          </section>
        )}

        {/* Catégorisation */}
        {!loading && step === "table" && view === "table" && (
          <section className="space-y-6">
            <h2 className="text-xl font-semibold">Catégorisation</h2>

            <div className="card p-4">
              <ManualAdd
                onCreate={async (tx) => {
                  await db.transactions.put(tx);
                  const rows = await db.transactions.orderBy("date").reverse().toArray();
                  setTransactions(rows);
                }}
              />
            </div>

            {transactions.length === 0 ? (
              <div className="card p-6 text-center subtle">
                Aucune transaction pour l’instant. <br />
                Clique <button onClick={openFilePicker} className="underline">Ajouter un relevé</button> pour importer un CSV.
              </div>
            ) : (
              <div className="card p-3">
                <TransactionsTable transactions={transactions} onUpdate={onUpdateRows} />
              </div>
            )}
          </section>
        )}

        {/* Récap */}
        {!loading && step === "table" && view === "recap" && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Récap</h2>
            <div className="space-y-4">
              <Suspense fallback={<div className="card p-6 text-center">Chargement du récap…</div>}>
                <CategoryRecap transactions={transactions} />
              </Suspense>
            </div>
          </section>
        )}

        {/* Danger zone */}
        <section className="pt-6">
          <div className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">Zone sensible</div>
              <div className="subtle">Supprime toutes les transactions sauvegardées sur ce navigateur.</div>
            </div>
            <button
              className="btn-danger"
              onClick={() => setConfirmOpen(true)}
            >
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
