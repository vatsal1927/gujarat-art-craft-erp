import { getVendorMasters, saveVendorMaster, deleteVendorMaster } from '../utils/masterData';
import { executeRepository, executeRepositoryResult } from './base/repositoryRunner';
import type { ApiResult } from '../utils/apiResult';

export class VendorRepository {
  static async getVendors(): Promise<any[]> {
    return executeRepository('Vendor', 'getVendors', null, async () => getVendorMasters(), { requiresActor: false, fallbackValue: [] });
  }

  static async getVendorsResult(): Promise<ApiResult<any[]>> {
    return executeRepositoryResult('Vendor', 'getVendors', null, async () => getVendorMasters(), { requiresActor: false, fallbackValue: [] });
  }

  static async saveVendor(vendor: any): Promise<void> {
    return executeRepository('Vendor', 'saveVendor', null, async () => {
      saveVendorMaster(vendor);
    }, { requiresActor: false });
  }

  static async deleteVendor(id: string): Promise<void> {
    return executeRepository('Vendor', 'deleteVendor', null, async () => {
      deleteVendorMaster(id);
    }, { requiresActor: false });
  }
}
