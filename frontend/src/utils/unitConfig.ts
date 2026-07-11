import { UnitType, UnitConfig, BOMEntryV2 } from '../types/inventoryUnits';

export function inferUnitTypeFromLegacy(unit: string): UnitType {
  const normalized = (unit || '').toLowerCase().trim();
  if (normalized === 'kg' || normalized === 'gram' || normalized === 'g' || normalized === 'kilogram' || normalized === 'weight') {
    return 'weight';
  }
  if (normalized === 'm' || normalized === 'meter' || normalized === 'meters' || normalized === 'cm' || normalized === 'centimeter' || normalized === 'length') {
    return 'length';
  }
  if (normalized === 'pcs' || normalized === 'piece' || normalized === 'pieces' || normalized === 'count' || normalized === 'dozen' || normalized === 'bundle') {
    return 'count';
  }
  if (normalized === 'sqm' || normalized === 'sqft' || normalized === 'area') {
    return 'area';
  }
  if (normalized === 'l' || normalized === 'ml' || normalized === 'litre' || normalized === 'volume') {
    return 'volume';
  }
  if (normalized === 'hr' || normalized === 'min' || normalized === 'time') {
    return 'time';
  }
  return 'other';
}

export function createUnitConfig(input: any, fallback?: Partial<UnitConfig>): UnitConfig {
  const defaults: UnitConfig = {
    label: fallback?.label || "Piece",
    type: fallback?.type || "count",
    symbol: fallback?.symbol || "pcs",
    conversionToBase: fallback?.conversionToBase !== undefined ? fallback.conversionToBase : null
  };
  
  if (!input) return defaults;
  if (typeof input === 'string') {
    const inferredType = inferUnitTypeFromLegacy(input);
    return {
      label: input || defaults.label,
      type: inferredType,
      symbol: input || defaults.symbol,
      conversionToBase: null
    };
  }
  
  return {
    label: input.label || defaults.label,
    type: input.type || defaults.type,
    symbol: input.symbol || defaults.symbol,
    conversionToBase: input.conversionToBase !== undefined ? input.conversionToBase : defaults.conversionToBase
  };
}

export function getDefaultStep(type: UnitType): string {
  return type === 'count' ? '1' : 'any';
}

export function validateUnitConfig(
  unitConfig: UnitConfig,
  rawMaterialBaseType?: string,
  rawMaterialId?: string
): { allowed: boolean; error?: string } {
  const baseType = rawMaterialBaseType ? rawMaterialBaseType.toLowerCase().trim() : '';
  const attemptedType = unitConfig.type;
  
  const inferredBaseType = (baseType === 'weight' || baseType === 'length' || baseType === 'count' || baseType === 'area' || baseType === 'volume' || baseType === 'time' || baseType === 'other')
    ? baseType as UnitType
    : inferUnitTypeFromLegacy(baseType);

  let allowed = false;
  let error: string | undefined;

  if (!inferredBaseType || attemptedType === inferredBaseType) {
    allowed = true;
  } else if (unitConfig.conversionToBase !== undefined && unitConfig.conversionToBase !== null && !isNaN(unitConfig.conversionToBase) && unitConfig.conversionToBase > 0) {
    allowed = true;
  } else {
    allowed = false;
    error = `Incompatible unit type "${attemptedType}" for raw material of type "${inferredBaseType}" without a conversion factor.`;
  }

  // Development-only logs
  console.log(
    `[BOMUnitValidation] rawMaterialId=${rawMaterialId || 'unknown'}, baseType=${inferredBaseType}, attemptedType=${attemptedType}, allowed=${allowed}`
  );

  return { allowed, error };
}

export function applyUnitToBOM(
  entry: any,
  rawMaterial: any,
  unitConfig: UnitConfig,
  qtyPerUnit: number
): BOMEntryV2 {
  const conversion = unitConfig.conversionToBase !== undefined && unitConfig.conversionToBase !== null && !isNaN(unitConfig.conversionToBase) && unitConfig.conversionToBase > 0
    ? unitConfig.conversionToBase
    : 1;

  const qtyPerUnitBase = qtyPerUnit * conversion;

  return {
    ...entry,
    id: entry.id || `${rawMaterial.id}-${Date.now()}`,
    rawMaterialId: rawMaterial.id,
    rawMaterialName: rawMaterial.name,
    qtyPerUnit,
    unitConfig,
    legacyUnit: rawMaterial.unit,
    qtyPerUnitBase,
    quantity: qtyPerUnitBase, // Set legacy quantity field for backwards compatibility
    schemaVersion: 2
  };
}
