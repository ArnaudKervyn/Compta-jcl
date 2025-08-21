import React from "react";
import Papa from "papaparse";
import type { RawRow } from "../types";

export type QuickImportHandle = { open: () => void };

type Props = {
  onParsed: (rows: RawRow[], headers: string[]) => void;
};

const QuickImport = React.forwardRef<QuickImportHandle, Props>(({ onParsed }, ref) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useImperativeHandle(ref, () => ({
    open: () => inputRef.current?.click(),
  }));

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data || []).filter(Boolean);
        const headers = (res.meta.fields || []).map(String);
        onParsed(rows, headers);
        // reset pour pouvoir ré-importer le même fichier si besoin
        if (inputRef.current) inputRef.current.value = "";
      },
      error: (err) => alert("Erreur de lecture CSV: " + err.message),
    });
  }

  return (
    <input
      ref={inputRef}
      type="file"
      accept=".csv,text/csv"
      onChange={handleFile}
      className="hidden"
    />
  );
});

export default QuickImport;
