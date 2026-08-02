import type { backendInterface, RawMaterial } from '../backend';
import { getRawMaterialMasters } from '../utils/masterData';

export class RawMaterialRepository {
  static async getRawMaterials(actor: backendInterface): Promise<RawMaterial[]> {
    const raw = await actor.getRawMaterials();
    return getRawMaterialMasters(raw);
  }

  static async saveRawMaterial(
    actor: backendInterface,
    data: any
  ): Promise<void> {
    return actor.saveRawMaterial(
      data.id,
      data.name,
      data.category,
      data.openingStock,
      data.unitCost,
      data.unitOfMeasure || data.unit || 'pcs',
      data.reorderPoint || data.minStock || 0
    );
  }

  static async deleteRawMaterial(actor: backendInterface, id: string): Promise<void> {
    return actor.deleteRawMaterial(id);
  }
}
