import type { backendInterface, MaterialConsumptionEntry, StockMovement, AuditLog } from '../backend';

export class InventoryRepository {
  static async getMaterialConsumptions(actor: backendInterface): Promise<MaterialConsumptionEntry[]> {
    return actor.getMaterialConsumptionHistory();
  }

  static async saveMaterialConsumption(
    actor: backendInterface,
    data: { materialId: string; materialName: string; quantityConsumed: number; finishedGoodId: string; finishedGoodName: string }
  ): Promise<any> {
    return (actor as any).saveMaterialConsumption ? (actor as any).saveMaterialConsumption(data.materialId, data.materialName, data.quantityConsumed, data.finishedGoodId, data.finishedGoodName) : Promise.resolve();
  }

  static async getConsumptionHistory(actor: backendInterface): Promise<MaterialConsumptionEntry[]> {
    return actor.getMaterialConsumptionHistory();
  }

  static async getMaterialConsumptionHistory(actor: backendInterface): Promise<MaterialConsumptionEntry[]> {
    return actor.getMaterialConsumptionHistory();
  }

  static async logMaterialConsumption(
    actor: backendInterface,
    data: { materialId: string; materialName: string; quantity: number; purpose: string; referenceNo: string; remarks: string }
  ): Promise<any> {
    return (actor as any).logMaterialConsumption ? (actor as any).logMaterialConsumption(data.materialId, data.materialName, data.quantity, data.purpose, data.referenceNo, data.remarks) : Promise.resolve();
  }

  static async saveConsumptionLog(
    actor: backendInterface,
    data: any
  ): Promise<any> {
    return (actor as any).saveConsumptionLog ? (actor as any).saveConsumptionLog(data) : Promise.resolve();
  }

  static async getConsumptionLogs(actor: backendInterface): Promise<any[]> {
    return (actor as any).getConsumptionLogs ? (actor as any).getConsumptionLogs() : Promise.resolve([]);
  }

  static async getFinishedGoodsLogs(actor: backendInterface): Promise<any[]> {
    return (actor as any).getFinishedGoodsLogs ? (actor as any).getFinishedGoodsLogs() : Promise.resolve([]);
  }

  static async saveFinishedGoodsLog(
    actor: backendInterface,
    data: any
  ): Promise<any> {
    return (actor as any).saveFinishedGoodsLog ? (actor as any).saveFinishedGoodsLog(data) : Promise.resolve();
  }

  static async logFinishedGoodStock(
    actor: backendInterface,
    data: { productId: string; productName: string; quantity: number; transactionType: string; referenceNo: string; remarks: string }
  ): Promise<any> {
    return (actor as any).logFinishedGoodStock ? (actor as any).logFinishedGoodStock(data.productId, data.productName, data.quantity, data.transactionType, data.referenceNo, data.remarks) : Promise.resolve();
  }

  static async getStockMovements(actor: backendInterface): Promise<StockMovement[]> {
    return actor.getStockMovementHistory();
  }

  static async getStockMovementHistory(actor: backendInterface): Promise<StockMovement[]> {
    return actor.getStockMovementHistory();
  }

  static async getAuditLogs(actor: backendInterface): Promise<AuditLog[]> {
    return actor.getSystemAuditLogs();
  }

  static async getSystemAuditLogs(actor: backendInterface): Promise<AuditLog[]> {
    return actor.getSystemAuditLogs();
  }

  static async checkStockReconciliation(actor: backendInterface): Promise<any> {
    return (actor as any).checkStockReconciliation ? (actor as any).checkStockReconciliation() : Promise.resolve();
  }
}
