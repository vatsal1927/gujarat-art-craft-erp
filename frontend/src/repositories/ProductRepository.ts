import type { backendInterface, ProductItem } from '../backend';
import { executeRepository, executeRepositoryResult } from './base/repositoryRunner';
import type { ApiResult } from '../utils/apiResult';

export class ProductRepository {
  static async getProducts(actor: backendInterface): Promise<ProductItem[]> {
    return executeRepository('Product', 'getProducts', actor, () => actor.getProducts(), { fallbackValue: [] });
  }

  static async getProductsResult(actor: backendInterface): Promise<ApiResult<ProductItem[]>> {
    return executeRepositoryResult('Product', 'getProducts', actor, () => actor.getProducts(), { fallbackValue: [] });
  }

  static async saveProduct(
    actor: backendInterface,
    data: {
      id: string;
      vigat: string;
      rate: number;
      hsnCode: string;
      stock: bigint;
      productionCost: number;
      bom: any[];
    }
  ): Promise<void> {
    return executeRepository('Product', 'saveProduct', actor, () =>
      actor.saveProduct(
        data.id,
        data.vigat,
        data.rate,
        data.hsnCode,
        data.stock,
        data.productionCost,
        data.bom
      )
    );
  }

  static async saveProductResult(
    actor: backendInterface,
    data: {
      id: string;
      vigat: string;
      rate: number;
      hsnCode: string;
      stock: bigint;
      productionCost: number;
      bom: any[];
    }
  ): Promise<ApiResult<void>> {
    return executeRepositoryResult('Product', 'saveProduct', actor, () =>
      actor.saveProduct(
        data.id,
        data.vigat,
        data.rate,
        data.hsnCode,
        data.stock,
        data.productionCost,
        data.bom
      )
    );
  }

  static async deleteProduct(actor: backendInterface, id: string): Promise<void> {
    return executeRepository('Product', 'deleteProduct', actor, () => actor.deleteProduct(id));
  }

  static async deleteProductResult(actor: backendInterface, id: string): Promise<ApiResult<void>> {
    return executeRepositoryResult('Product', 'deleteProduct', actor, () => actor.deleteProduct(id));
  }
}
