import type { backendInterface, DashboardStats } from '../backend';
import { executeRepository, executeRepositoryResult } from './base/repositoryRunner';
import type { ApiResult } from '../utils/apiResult';

export class DashboardRepository {
  static async getDashboardStats(actor: backendInterface): Promise<DashboardStats> {
    return executeRepository('Dashboard', 'getDashboardStats', actor, () => actor.getDashboardStats());
  }

  static async getDashboardStatsResult(actor: backendInterface): Promise<ApiResult<DashboardStats>> {
    return executeRepositoryResult('Dashboard', 'getDashboardStats', actor, () => actor.getDashboardStats());
  }
}
