import type { backendInterface, ProductItem } from '../backend';

export class ProductRepository {
  static async getProducts(actor: backendInterface): Promise<ProductItem[]> {
    return actor.getProducts();
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
    return actor.saveProduct(
      data.id,
      data.vigat,
      data.rate,
      data.hsnCode,
      data.stock,
      data.productionCost,
      data.bom
    );
  }

  static async deleteProduct(actor: backendInterface, id: string): Promise<void> {
    return actor.deleteProduct(id);
  }
}
