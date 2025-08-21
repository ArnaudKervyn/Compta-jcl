import type { MappedColumns, RawRow, Transaction } from "../types";

export function guessMapping(headers: string[]): MappedColumns {
  const find = (preds: RegExp[]) =>
    headers.find(h => preds.some(rx => rx.test(h.toLowerCase()))) || "";

  return {
    date:        find([/date comptable/, /date\b/, /booking/i]),
    description: find([/libell[ée]s?/, /communication/, /description/]),
    amount:      find([/montant/, /amount/]),
    currency:    find([/devise/, /currency/]),
    counterparty:find([/contrepartie/, /iban|compte/i]),
    movementId:  find([/num[ée]ro de mouvement/, /mouvement|id/i]),
  };
}

export function parseEuroAmount(input: string | number | null | undefined): number {
  if (input == null) return 0;
  const s = String(input)
    .replace(/\u00A0/g, " ") // NBSP
    .replace(/\s/g, "")      // espaces
    .replace(/\./g, "")      // points milliers
    .replace(/,/g, ".");     // virgule -> point
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function parseDateEU(input: string | null | undefined): string {
  if (!input) return "";
  const s = input.trim();
  // JJ/MM/AAAA
  const m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    let yyyy = m[3];
    if (yyyy.length === 2) yyyy = (parseInt(yyyy,10) + 2000).toString();
    return `${yyyy}-${mm}-${dd}`;
  }
  // ISO déjà ?
  const iso = s.match(/^\d{4}-\d{2}-\d{2}$/);
  if (iso) return s;
  // fallback: retourne tel quel (mieux que vide)
  return s;
}

function buildId(row: RawRow, mapping: MappedColumns, t: {date:string;amount:number;description:string}): string {
  const mv = mapping.movementId && row[mapping.movementId];
  if (mv && mv.trim()) return mv.trim();
  const key = `${t.date}|${t.amount}|${t.description}`.slice(0, 120);
  return key;
}

export function normalizeRow(row: RawRow, mapping: MappedColumns): Transaction {
  const date = parseDateEU(row[mapping.date]);
  const description = (row[mapping.description] ?? "").trim();
  const amount = parseEuroAmount(row[mapping.amount]);

  const currency = mapping.currency ? row[mapping.currency] : undefined;
  const counterparty = mapping.counterparty ? row[mapping.counterparty] : undefined;
  const movementId = mapping.movementId ? row[mapping.movementId] : undefined;

  const base = { date, amount, description };
  return {
    id: buildId(row, mapping, base),
    ...base,
    currency,
    counterparty,
    movementId,
    raw: row,
  };
}

export function normalizeAll(rows: RawRow[], mapping: MappedColumns): Transaction[] {
  return rows
    .map(r => normalizeRow(r, mapping))
    .filter(t => Math.abs(t.amount) > 0.000001); // ignore 0,00€
}
