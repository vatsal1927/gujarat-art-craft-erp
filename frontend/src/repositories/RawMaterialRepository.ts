import type { backendInterface, RawMaterial } from '../backend';
import { getRawMaterialMasters } from '../utils/masterData';
import { executeRepository, executeRepositoryResult } from './base/repositoryRunner';
import type { ApiResult } from '../utils/apiResult';

export class RawMaterialRepository {
  static async getRawMaterials(actor: backendInterface): Promise<RawMaterial[]> {
    return executeRepository('RawMaterial', 'getRawMaterials', actor, async () => {
      const raw = await actor.getRawMaterials();
      return getRawMaterialMasters(raw);
    }, { fallbackValue: [] });
  }

  static async getRawMaterialsResult(actor: backendInterface): Promise<ApiResult<RawMaterial[]>> {
    return executeRepositoryResult('RawMaterial', 'getRawMaterials', actor, async () => {
      const raw = await actor.getRawMaterials();
      return getRawMaterialMasters(raw);
    }, { fallbackValue: [] });
  }

  static async saveRawMaterial(
    actor: backendInterface,
    data: any
  ): Promise<void> {
    return executeRepository('RawMaterial', 'saveRawMaterial', actor, () =>
      actor.saveRawMaterial(
        data.id,
        data.name,
        data.category,
        data.openingStock,
        data.unitCost,
        data.unitOfMeasure || data.unit || 'pcs',
        data.reorderPoint || data.minStock || 0
      )
    );
  }

  static async deleteRawMaterial(actor: backendInterface, id: string): Promise<void> {
    return executeRepository('RawMaterial', 'deleteRawMaterial', actor, () => actor.deleteRawMaterial(id));
  }
}
