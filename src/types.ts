export type RawRow = Record<string, string>;

export type MappedColumns = {
  date: string;
  description: string;
  amount: string;
  currency?: string;
  counterparty?: string;
  movementId?: string;
};

export interface Split {
  id: string;              // unique pour la ligne de split
  amount: number;          // montant POSITIF (part de la dépense)
  category: string;        // catégorie dépense
  subcategory?: string;    // sous-catégorie dépense
}

export interface Transaction {
  id: string;
  date: string;              // "YYYY-MM-DD"
  description: string;
  amount: number;            // >0 rentrée, <0 dépense
  currency?: string;
  counterparty?: string;
  movementId?: string;
  category?: string;         // pour dépense non éclatée OU catégorie de revenus
  subcategory?: string;      // pour dépense non éclatée
  // Remboursement (rentrée qui déduira une dépense)
  isRefund?: boolean;
  refundCategory?: string;
  refundSubcategory?: string;

  // --- NEW: éclatement de dépense ---
  splits?: Split[];          // si présent et non vide, on ignore category/subcategory de la dépense mère
  // ----------------------------------
  raw: RawRow;
}
