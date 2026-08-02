import type { backendInterface, Settings } from '../backend';
import { executeRepository, executeRepositoryResult } from './base/repositoryRunner';
import type { ApiResult } from '../utils/apiResult';

export class SettingsRepository {
  static async getSettings(actor: backendInterface): Promise<Settings> {
    return executeRepository('Settings', 'getSettings', actor, () => actor.getSettings());
  }

  static async getSettingsResult(actor: backendInterface): Promise<ApiResult<Settings>> {
    return executeRepositoryResult('Settings', 'getSettings', actor, () => actor.getSettings());
  }

  static async saveSettings(
    actor: backendInterface,
    data: {
      businessInfo: string;
      defaultGstRate: number;
      termsAndConditions: string;
      allowStaffCollection: boolean;
      enableRejectedWage: boolean;
      companyLogo?: string;
      companyName?: string;
      themeColors?: string;
      sidebarStyle?: string;
      allowAdminBackupRestore?: boolean;
      enableAutoStockAlerts?: boolean;
      alertFrequency?: string;
      lowStockAlertThreshold?: number;
    }
  ): Promise<void> {
    return executeRepository('Settings', 'saveSettings', actor, () =>
      actor.saveSettings(
        data.businessInfo,
        data.defaultGstRate,
        data.termsAndConditions,
        data.allowStaffCollection,
        data.enableRejectedWage,
        data.companyLogo,
        data.companyName,
        data.themeColors,
        data.sidebarStyle,
        data.allowAdminBackupRestore,
        data.enableAutoStockAlerts,
        data.alertFrequency,
        data.lowStockAlertThreshold
      )
    );
  }
}
