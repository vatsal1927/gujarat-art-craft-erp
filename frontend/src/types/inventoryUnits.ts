export type UnitType = "weight" | "length" | "count" | "area" | "volume" | "time" | "other";

export interface UnitConfig {
  label: string;
  type: UnitType;
  symbol: string;
  conversionToBase?: number | null;
}

export interface BOMEntryV2 {
  id: string;
  rawMaterialId: string;
  rawMaterialName?: string;
  qtyPerUnit: number;
  unitConfig: UnitConfig;
  legacyUnit?: string;
  qtyPerUnitBase?: number;
  schemaVersion: 2;
}
