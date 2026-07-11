import { BOMEntryV2, UnitConfig } from '../types/inventoryUnits';
import { inferUnitTypeFromLegacy, createUnitConfig } from './unitConfig';

export function migrateBomEntries(entries: any[], rawMaterials: any[]): BOMEntryV2[] {
  if (!entries) return [];
  return entries.map(entry => {
    if (entry.schemaVersion === 2) {
      return entry as BOMEntryV2;
    }

    const rawMaterialId = entry.rawMaterialId || entry.materialId || '';
    const quantity = entry.quantity !== undefined ? Number(entry.quantity) : 0;
    
    const rawMaterial = rawMaterials.find(m => m.id === rawMaterialId);
    const legacyUnit = rawMaterial ? rawMaterial.unit : (entry.legacyUnit || 'pcs');
    
    let type = inferUnitTypeFromLegacy(legacyUnit);
    let symbol = legacyUnit || 'pcs';
    let label = legacyUnit || 'Piece';

    const normalized = legacyUnit.toLowerCase().trim();
    if (normalized === 'kg' || normalized === 'weight' || normalized === 'kilogram') {
      label = 'Kilogram';
      symbol = 'kg';
      type = 'weight';
    } else if (normalized === 'pcs' || normalized === 'piece' || normalized === 'pieces' || normalized === 'count') {
      label = 'Pieces';
      symbol = 'pcs';
      type = 'count';
    } else if (normalized === 'meters' || normalized === 'meter' || normalized === 'm' || normalized === 'length') {
      label = 'Meter';
      symbol = 'm';
      type = 'length';
    } else {
      type = 'other';
      label = legacyUnit;
      symbol = legacyUnit;
    }
    
    const unitConfig = createUnitConfig({
      label,
      type,
      symbol,
      conversionToBase: 1
    });

    return {
      id: entry.id || `${rawMaterialId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      rawMaterialId,
      rawMaterialName: rawMaterial ? rawMaterial.name : (entry.rawMaterialName || rawMaterialId),
      qtyPerUnit: quantity,
      unitConfig,
      legacyUnit,
      qtyPerUnitBase: quantity,
      quantity, // Kept for legacy compatibility
      schemaVersion: 2
    };
  });
}

export function runBOMMigration(): void {
  try {
    const currentVersion = localStorage.getItem('mock_inventory_schema_version');
    if (currentVersion === '2') {
      return; // Already migrated
    }

    const storedProducts = localStorage.getItem('mock_products');
    const storedRawMaterials = localStorage.getItem('mock_raw_materials');
    
    if (!storedProducts) {
      localStorage.setItem('mock_inventory_schema_version', '2');
      return;
    }

    const products = JSON.parse(storedProducts);
    const rawMaterials = storedRawMaterials ? JSON.parse(storedRawMaterials) : [];

    // Make backup first
    localStorage.setItem('mock_inventory_backup_pre_unit_v2', storedProducts);

    let migratedRows = 0;
    let scannedProducts = 0;

    const migratedProducts = products.map((prod: any) => {
      scannedProducts++;
      if (prod.bom && Array.isArray(prod.bom)) {
        const initialCount = prod.bom.length;
        prod.bom = migrateBomEntries(prod.bom, rawMaterials);
        migratedRows += prod.bom.length;
      }
      return prod;
    });

    localStorage.setItem('mock_products', JSON.stringify(migratedProducts));
    localStorage.setItem('mock_inventory_schema_version', '2');

    // Dev log
    console.log(
      `[BOMUnitMigration] scannedProducts=${scannedProducts}, migratedRows=${migratedRows}`
    );
  } catch (error) {
    console.error('BOM unit V2 migration failed, rolling back changes:', error);
    rollbackBOMMigration();
  }
}

export function rollbackBOMMigration(): void {
  const backup = localStorage.getItem('mock_inventory_backup_pre_unit_v2');
  if (backup) {
    localStorage.setItem('mock_products', backup);
  }
  localStorage.removeItem('mock_inventory_schema_version');
  console.log('[BOMUnitMigration] Rolled back schema migration to V1');
}
