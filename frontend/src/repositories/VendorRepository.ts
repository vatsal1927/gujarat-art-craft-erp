import { getVendorMasters, saveVendorMaster, deleteVendorMaster } from '../utils/masterData';

export class VendorRepository {
  static async getVendors(): Promise<any[]> {
    return getVendorMasters();
  }

  static async saveVendor(vendor: any): Promise<void> {
    saveVendorMaster(vendor);
  }

  static async deleteVendor(id: string): Promise<void> {
    deleteVendorMaster(id);
  }
}
