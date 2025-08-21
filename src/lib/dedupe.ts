import { db } from "../db";
import type { Transaction } from "../types";

/** Normalise un texte pour l'empreinte (pas d'accents, espaces simples, minuscule) */
function normalizeText(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Empreinte: date|montant(2 décimales)|description_normalisée  */
function fingerprint(t: Transaction): string {
  const amount = (Math.round(t.amount * 100) / 100).toFixed(2);
  return `${t.date}|${amount}|${normalizeText(t.description)}`;
}

/** Score pour choisir le "survivor" d'un groupe de doublons */
function score(t: Transaction): number {
  return (
    (t.category ? 4 : 0) +
    (t.subcategory ? 1 : 0) +
    (t.isRefund ? 0.75 : 0) +
    (t.refundCategory ? 0.5 : 0) +
    (t.refundSubcategory ? 0.25 : 0) +
    (t.splits && t.splits.length ? 0.6 : 0) +
    (t.movementId ? 0.1 : 0)
  );
}

/** Dédoublonnage avec fusion des infos (catégories, remboursement, splits).
 *  - Choisit un "survivor" avec le meilleur score.
 *  - Copie les infos manquantes depuis les doublons vers le survivor.
 *  - Supprime les doublons.
 */
export async function dedupeInDB(): Promise<{ deletedCount: number; updatedCount: number }> {
  const rows = await db.transactions.toArray();

  // Regroupe par empreinte (même opération)
  const groups = new Map<string, Transaction[]>();
  for (const t of rows) {
    const fp = fingerprint(t);
    const arr = groups.get(fp);
    if (arr) arr.push(t);
    else groups.set(fp, [t]);
  }

  const toDelete: string[] = [];
  const toUpdate: Transaction[] = [];

  for (const arr of groups.values()) {
    if (arr.length < 2) continue;

    // Choix du "survivor"
    const survivor = arr.reduce((best, cur) => {
      const sb = score(best);
      const sc = score(cur);
      if (sc > sb) return cur;
      if (sc < sb) return best;
      // Égalité → plus petit id pour la stabilité
      return cur.id < best.id ? cur : best;
    });

    let changed = false;

    for (const t of arr) {
      if (t.id === survivor.id) continue;

      // Fusion champs "catégorisation dépense"
      if (!survivor.category && t.category) { survivor.category = t.category; changed = true; }
      if (!survivor.subcategory && t.subcategory) { survivor.subcategory = t.subcategory; changed = true; }

      // Fusion champs "remboursement"
      if (!survivor.isRefund && t.isRefund) { survivor.isRefund = true; changed = true; }
      if (!survivor.refundCategory && t.refundCategory) { survivor.refundCategory = t.refundCategory; changed = true; }
      if (!survivor.refundSubcategory && t.refundSubcategory) { survivor.refundSubcategory = t.refundSubcategory; changed = true; }

      // Fusion des splits (si le survivor n'en a pas)
      if ((!survivor.splits || survivor.splits.length === 0) && t.splits && t.splits.length) {
        survivor.splits = t.splits;
        // Quand on garde des splits, on efface cat/sub de la mère pour éviter le double comptage
        if (survivor.category || survivor.subcategory) {
          survivor.category = undefined;
          survivor.subcategory = undefined;
        }
        changed = true;
      }

      toDelete.push(t.id);
    }

    if (changed) toUpdate.push(survivor);
  }

  if (toUpdate.length) await db.transactions.bulkPut(toUpdate);
  if (toDelete.length) await db.transactions.bulkDelete(toDelete);

  return { deletedCount: toDelete.length, updatedCount: toUpdate.length };
}
