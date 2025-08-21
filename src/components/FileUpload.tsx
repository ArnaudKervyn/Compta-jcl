import React, { useRef } from "react";
import Papa from "papaparse";
import type { RawRow } from "../types";

type Props = {
  onParsed: (rows: RawRow[], headers: string[]) => void;
};

export default function FileUpload({ onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      // Laisse Papa détecter le séparateur ; fonctionne pour ING
      complete: (res) => {
        const rows = (res.data || []).filter(Boolean);
        const headers = (res.meta.fields || []).map(String);
        onParsed(rows, headers);
      },
      error: (err) => {
        alert("Erreur de lecture CSV: " + err.message);
      },
    });
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFile}
        className="block w-full text-sm file:mr-4 file:rounded-xl file:border file:px-4 file:py-2 file:bg-white/5 file:hover:bg-white/10 file:border-white/10 file:cursor-pointer"
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="px-3 py-2 rounded-xl border hover:shadow"
      >
        Importer CSV ING
      </button>
    </div>
  );
}
