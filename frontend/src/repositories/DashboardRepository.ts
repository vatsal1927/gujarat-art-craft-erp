import type { backendInterface, DashboardStats } from '../backend';

export class DashboardRepository {
  static async getDashboardStats(actor: backendInterface): Promise<DashboardStats> {
    return actor.getDashboardStats();
  }
}
