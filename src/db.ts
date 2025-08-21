import Dexie from "dexie";
import type { Table } from "dexie";
import type { Transaction } from "./types";

export class JEDB extends Dexie {
  transactions!: Table<Transaction, string>;

  constructor() {
    super("je-finance-db");
    // v1 historique
    this.version(1).stores({ transactions: "id, date, category, subcategory" });
    // v2 (même stores, mais laisse place à des upgrades si besoin)
    this.version(2).stores({ transactions: "id, date, category, subcategory" });
  }
}
export const db = new JEDB();

