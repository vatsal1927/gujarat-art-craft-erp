import type { backendInterface, MaterialConsumptionEntry, StockMovement, AuditLog } from '../backend';
import { executeRepository, executeRepositoryResult } from './base/repositoryRunner';
import type { ApiResult } from '../utils/apiResult';

export class InventoryRepository {
  static async getMaterialConsumptions(actor: backendInterface): Promise<MaterialConsumptionEntry[]> {
    return executeRepository('Inventory', 'getMaterialConsumptions', actor, () => actor.getMaterialConsumptionHistory(), { fallbackValue: [] });
  }

  static async getMaterialConsumptionsResult(actor: backendInterface): Promise<ApiResult<MaterialConsumptionEntry[]>> {
    return executeRepositoryResult('Inventory', 'getMaterialConsumptions', actor, () => actor.getMaterialConsumptionHistory(), { fallbackValue: [] });
  }

  static async saveMaterialConsumption(
    actor: backendInterface,
    data: { materialId: string; materialName: string; quantityConsumed: number; finishedGoodId: string; finishedGoodName: string }
  ): Promise<any> {
    return executeRepository('Inventory', 'saveMaterialConsumption', actor, async () => {
      if ((actor as any).saveMaterialConsumption) {
        return (actor as any).saveMaterialConsumption(data.materialId, data.materialName, data.quantityConsumed, data.finishedGoodId, data.finishedGoodName);
      }
      return null;
    });
  }

  static async getConsumptionHistory(actor: backendInterface): Promise<MaterialConsumptionEntry[]> {
    return executeRepository('Inventory', 'getConsumptionHistory', actor, () => actor.getMaterialConsumptionHistory(), { fallbackValue: [] });
  }

  static async getMaterialConsumptionHistory(actor: backendInterface): Promise<MaterialConsumptionEntry[]> {
    return executeRepository('Inventory', 'getMaterialConsumptionHistory', actor, () => actor.getMaterialConsumptionHistory(), { fallbackValue: [] });
  }

  static async logMaterialConsumption(
    actor: backendInterface,
    data: { materialId: string; materialName: string; quantity: number; purpose: string; referenceNo: string; remarks: string }
  ): Promise<any> {
    return executeRepository('Inventory', 'logMaterialConsumption', actor, async () => {
      if ((actor as any).logMaterialConsumption) {
        return (actor as any).logMaterialConsumption(data.materialId, data.materialName, data.quantity, data.purpose, data.referenceNo, data.remarks);
      }
      return null;
    });
  }

  static async saveConsumptionLog(actor: backendInterface, data: any): Promise<any> {
    return executeRepository('Inventory', 'saveConsumptionLog', actor, async () => {
      if ((actor as any).saveConsumptionLog) {
        return (actor as any).saveConsumptionLog(data);
      }
      return null;
    });
  }

  static async getConsumptionLogs(actor: backendInterface): Promise<any[]> {
    return executeRepository('Inventory', 'getConsumptionLogs', actor, async () => {
      if ((actor as any).getConsumptionLogs) {
        return (actor as any).getConsumptionLogs();
      }
      return [];
    }, { fallbackValue: [] });
  }

  static async getFinishedGoodsLogs(actor: backendInterface): Promise<any[]> {
    return executeRepository('Inventory', 'getFinishedGoodsLogs', actor, async () => {
      if ((actor as any).getFinishedGoodsLogs) {
        return (actor as any).getFinishedGoodsLogs();
      }
      return [];
    }, { fallbackValue: [] });
  }

  static async saveFinishedGoodsLog(actor: backendInterface, data: any): Promise<any> {
    return executeRepository('Inventory', 'saveFinishedGoodsLog', actor, async () => {
      if ((actor as any).saveFinishedGoodsLog) {
        return (actor as any).saveFinishedGoodsLog(data);
      }
      return null;
    });
  }

  static async logFinishedGoodStock(
    actor: backendInterface,
    data: { productId: string; productName: string; quantity: number; transactionType: string; referenceNo: string; remarks: string }
  ): Promise<any> {
    return executeRepository('Inventory', 'logFinishedGoodStock', actor, async () => {
      if ((actor as any).logFinishedGoodStock) {
        return (actor as any).logFinishedGoodStock(data.productId, data.productName, data.quantity, data.transactionType, data.referenceNo, data.remarks);
      }
      return null;
    });
  }

  static async getStockMovements(actor: backendInterface): Promise<StockMovement[]> {
    return executeRepository('Inventory', 'getStockMovements', actor, () => actor.getStockMovementHistory(), { fallbackValue: [] });
  }

  static async getStockMovementHistory(actor: backendInterface): Promise<StockMovement[]> {
    return executeRepository('Inventory', 'getStockMovementHistory', actor, () => actor.getStockMovementHistory(), { fallbackValue: [] });
  }

  static async getAuditLogs(actor: backendInterface): Promise<AuditLog[]> {
    return executeRepository('Inventory', 'getAuditLogs', actor, () => actor.getSystemAuditLogs(), { fallbackValue: [] });
  }

  static async getSystemAuditLogs(actor: backendInterface): Promise<AuditLog[]> {
    return executeRepository('Inventory', 'getSystemAuditLogs', actor, () => actor.getSystemAuditLogs(), { fallbackValue: [] });
  }

  static async checkStockReconciliation(actor: backendInterface): Promise<any> {
    return executeRepository('Inventory', 'checkStockReconciliation', actor, async () => {
      if ((actor as any).checkStockReconciliation) {
        return (actor as any).checkStockReconciliation();
      }
      return null;
    });
  }
}
