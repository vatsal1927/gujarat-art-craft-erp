import { QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from '../hooks/queryKeys';
import { logger } from './logger';
import type { backendInterface } from '../backend';
import { InvoiceRepository, CustomerRepository, ProductRepository, RawMaterialRepository, SettingsRepository, DashboardRepository } from '../repositories';

export type ModuleCategory =
  | 'dashboard'
  | 'invoices'
  | 'customers'
  | 'products'
  | 'inventory'
  | 'production'
  | 'purchases'
  | 'finance'
  | 'settings'
  | 'users';

/**
 * Prefetches an entity query into the QueryClient cache.
 */
export async function prefetchEntityQuery<T>(
  qc: QueryClient,
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  staleTime = 1000 * 60 * 5
): Promise<void> {
  try {
    await qc.prefetchQuery({
      queryKey,
      queryFn,
      staleTime,
    });
    logger.debug('Repository', `Prefetched query [${JSON.stringify(queryKey)}]`);
  } catch (err) {
    logger.warn('Repository', `Failed to prefetch query [${JSON.stringify(queryKey)}]`, err);
  }
}

/**
 * Invalidates a specific query key in cache.
 */
export async function invalidateEntity(qc: QueryClient, queryKey: QueryKey): Promise<void> {
  await qc.invalidateQueries({ queryKey });
  logger.info('Repository', `Invalidated entity cache [${JSON.stringify(queryKey)}]`);
}

/**
 * Invalidates all queries associated with a specific ERP module.
 */
export async function invalidateModule(qc: QueryClient, moduleName: ModuleCategory): Promise<void> {
  const moduleKeysMap: Record<ModuleCategory, QueryKey[]> = {
    dashboard: [queryKeys.dashboardStats()],
    invoices: [queryKeys.invoices(), queryKeys.nextInvoiceNumber()],
    customers: [queryKeys.customers(), queryKeys.payments()],
    products: [queryKeys.products()],
    inventory: [queryKeys.rawMaterials(), queryKeys.stockMovements(), queryKeys.materialConsumptions()],
    production: [queryKeys.jobWorks(), queryKeys.employees(), queryKeys.productionRequirements()],
    purchases: [queryKeys.purchases(), queryKeys.purchaseOrders(), queryKeys.purchaseInvoices()],
    finance: [queryKeys.expenses(), queryKeys.vendorPayments(), queryKeys.vendorOutstanding(), queryKeys.vendorLedger()],
    settings: [queryKeys.settings()],
    users: [queryKeys.users(), queryKeys.userSelf(), queryKeys.activityLogs()],
  };

  const keys = moduleKeysMap[moduleName] || [];
  await Promise.all(keys.map(key => qc.invalidateQueries({ queryKey: key })));
  logger.info('Repository', `Invalidated module cache [${moduleName}]`);
}

/**
 * Invalidates all queries in the QueryClient.
 */
export async function invalidateEverything(qc: QueryClient): Promise<void> {
  await qc.invalidateQueries();
  logger.info('Repository', 'Invalidated all queries in QueryClient');
}

/**
 * Removes a query key completely from cache.
 */
export function removeEntity(qc: QueryClient, queryKey: QueryKey): void {
  qc.removeQueries({ queryKey });
  logger.info('Repository', `Removed query key [${JSON.stringify(queryKey)}] from cache`);
}

/**
 * Cancels active pending queries for a target query key.
 */
export async function cancelEntityQueries(qc: QueryClient, queryKey: QueryKey): Promise<void> {
  await qc.cancelQueries({ queryKey });
  logger.debug('Repository', `Cancelled queries for [${JSON.stringify(queryKey)}]`);
}

/**
 * Intelligent Cache Warming: Prefetches high-frequency queries in parallel.
 */
export async function warmCache(qc: QueryClient, actor: backendInterface): Promise<void> {
  if (!actor) return;
  logger.info('Repository', 'Warming enterprise QueryClient cache...');
  
  await Promise.allSettled([
    prefetchEntityQuery(qc, queryKeys.dashboardStats(), () => DashboardRepository.getDashboardStats(actor)),
    prefetchEntityQuery(qc, queryKeys.settings(), () => SettingsRepository.getSettings(actor)),
    prefetchEntityQuery(qc, queryKeys.products(), () => ProductRepository.getProducts(actor)),
    prefetchEntityQuery(qc, queryKeys.customers(), () => CustomerRepository.getCustomers(actor)),
    prefetchEntityQuery(qc, queryKeys.rawMaterials(), () => RawMaterialRepository.getRawMaterials(actor)),
    prefetchEntityQuery(qc, queryKeys.invoices(), () => InvoiceRepository.getInvoices(actor)),
  ]);
}
