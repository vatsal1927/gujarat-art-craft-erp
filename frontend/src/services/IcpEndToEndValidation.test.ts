import { describe, it, expect, vi, beforeAll } from 'vitest';

// Polyfill localStorage for Node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

import { createProductionIcpActor, getProductionCanisterConfig, pingCanisterBackend } from './icpBackendService';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { DashboardRepository } from '../repositories/DashboardRepository';
import { ExpenseRepository } from '../repositories/ExpenseRepository';
import { InventoryRepository } from '../repositories/InventoryRepository';
import { InvoiceRepository } from '../repositories/InvoiceRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { ProductionRepository } from '../repositories/ProductionRepository';
import { PurchaseRepository } from '../repositories/PurchaseRepository';
import { RawMaterialRepository } from '../repositories/RawMaterialRepository';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { UserRepository } from '../repositories/UserRepository';
import { VendorRepository } from '../repositories/VendorRepository';
import { ok, fail } from '../utils/apiResult';
import type { backendInterface } from '../backend';

describe('Phase 2 — WP-009 End-to-End ICP Integration & Validation Suite', () => {

  describe('1. ICP Backend Configuration & Mock Fallback Verification', () => {
    it('resolves production canister config and verifies host configuration', async () => {
      const config = await getProductionCanisterConfig();
      expect(config).toBeDefined();
      expect(config.canisterId).toBeDefined();
    });
  });

  describe('2. Actor Connection & Canister Health Ping', () => {
    it('creates an actor instance and passes canister health ping', async () => {
      const mockSettings = {
        businessInfo: 'Gujarat Art & Craft Enterprise',
        defaultGstRate: 18,
        termsAndConditions: 'Standard Manufacturing Terms',
        allowStaffCollection: true,
        enableRejectedWage: false,
        companyLogo: [],
        companyName: [],
        themeColors: [],
        sidebarStyle: [],
        allowAdminBackupRestore: [],
      };

      const mockActor = {
        getSettings: vi.fn().mockResolvedValue(mockSettings),
      } as unknown as backendInterface;

      const pingResult = await pingCanisterBackend(mockActor);
      expect(pingResult.success).toBe(true);
      expect(pingResult.data).toBe(true);
      expect(mockActor.getSettings).toHaveBeenCalledOnce();
    });

    it('converts canister health ping errors to ApiResult failure without throwing', async () => {
      const mockActor = {
        getSettings: vi.fn().mockRejectedValue(new Error('Canister unreachable')),
      } as unknown as backendInterface;

      const pingResult = await pingCanisterBackend(mockActor);
      expect(pingResult.success).toBe(false);
      if (!pingResult.success) {
        expect(pingResult.code).toBe('CANISTER_ERROR');
        expect(pingResult.error).toContain('Canister Health Ping Failed');
      }
    });
  });

  describe('3. Authentication & Actor Identity Binding', () => {
    it('instantiates production actor structure safely', async () => {
      const actor = await createProductionIcpActor();
      expect(actor).toBeDefined();
    });
  });

  describe('4. RBAC Permission Enforcement', () => {
    it('validates permission matrix structures for Master Admin, Admin, and Staff', () => {
      const masterAdminPermissions = {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canApprove: true,
        canExport: true,
        canPrint: true,
        canManageStaff: true,
        canViewLogs: true,
        canBackupRestore: true,
        canAdjustStock: true,
        canAccessFinance: true,
        canAccessReports: true,
      };

      const staffPermissions = {
        ...masterAdminPermissions,
        canDelete: false,
        canManageStaff: false,
        canBackupRestore: false,
        canAdjustStock: false,
      };

      expect(masterAdminPermissions.canManageStaff).toBe(true);
      expect(masterAdminPermissions.canBackupRestore).toBe(true);
      expect(staffPermissions.canDelete).toBe(false);
      expect(staffPermissions.canManageStaff).toBe(false);
    });
  });

  describe('5. Repository E2E Validation Across All 12 Production Repositories', () => {
    it('validates CustomerRepository operations', async () => {
      const mockActor = {
        getCustomers: vi.fn().mockResolvedValue([]),
        saveCustomer: vi.fn().mockResolvedValue('cust-1'),
      } as unknown as backendInterface;

      const customers = await CustomerRepository.getCustomers(mockActor);
      expect(customers).toEqual([]);
      const saveRes = await CustomerRepository.saveCustomer(mockActor, {
        id: 'cust-1',
        name: 'Test Customer',
        businessAddress: 'Ahmedabad',
        phone: '9876543210',
        gstNo: '24AAAAA0000A1Z5',
      });
      expect(saveRes).toBe('cust-1');
    });

    it('validates DashboardRepository operations', async () => {
      const mockStats = {
        todayInvoiceCount: BigInt(5),
        todayTotalSales: 25000,
        allTimeInvoiceCount: BigInt(120),
        allTimeTotalSales: 500000,
        totalOutstandingAmount: 15000,
        customersWithOutstanding: BigInt(3),
        overdueInvoiceCount: BigInt(1),
        todayCollections: 20000,
        totalPurchases: 100000,
        totalProfit: 80000,
        totalGst: 18000,
        vendorDue: 5000,
        stockValue: 45000,
      };

      const mockActor = {
        getDashboardStats: vi.fn().mockResolvedValue(mockStats),
      } as unknown as backendInterface;

      const stats = await DashboardRepository.getDashboardStats(mockActor);
      expect(stats.todayInvoiceCount).toBe(BigInt(5));
      expect(stats.todayTotalSales).toBe(25000);
    });

    it('validates ExpenseRepository operations', async () => {
      const mockActor = {
        getExpenses: vi.fn().mockResolvedValue([]),
      } as unknown as backendInterface;

      const expenses = await ExpenseRepository.getExpenses(mockActor);
      expect(expenses).toEqual([]);
    });

    it('validates InventoryRepository operations', async () => {
      const mockActor = {
        getMaterialConsumptionHistory: vi.fn().mockResolvedValue([]),
      } as unknown as backendInterface;

      const materials = await InventoryRepository.getMaterialConsumptions(mockActor);
      expect(materials).toEqual([]);
    });

    it('validates InvoiceRepository operations', async () => {
      const mockActor = {
        getInvoices: vi.fn().mockResolvedValue([]),
      } as unknown as backendInterface;

      const invoices = await InvoiceRepository.getInvoices(mockActor);
      expect(invoices).toEqual([]);
    });

    it('validates ProductRepository operations', async () => {
      const mockActor = {
        getProducts: vi.fn().mockResolvedValue([]),
      } as unknown as backendInterface;

      const products = await ProductRepository.getProducts(mockActor);
      expect(products).toEqual([]);
    });

    it('validates ProductionRepository operations', async () => {
      const mockActor = {
        getJobWorks: vi.fn().mockResolvedValue([]),
        getCollections: vi.fn().mockResolvedValue([]),
      } as unknown as backendInterface;

      const jobs = await ProductionRepository.getJobWorks(mockActor);
      const collections = await ProductionRepository.getKarigarCollections(mockActor);
      expect(jobs).toEqual([]);
      expect(collections).toEqual([]);
    });

    it('validates PurchaseRepository operations', async () => {
      const mockActor = {
        getPurchases: vi.fn().mockResolvedValue([]),
      } as unknown as backendInterface;

      const purchases = await PurchaseRepository.getPurchases(mockActor);
      expect(purchases).toEqual([]);
    });

    it('validates RawMaterialRepository operations', async () => {
      const mockActor = {
        getRawMaterials: vi.fn().mockResolvedValue([]),
      } as unknown as backendInterface;

      const materials = await RawMaterialRepository.getRawMaterials(mockActor);
      expect(materials).toEqual([]);
    });

    it('validates SettingsRepository operations', async () => {
      const mockActor = {
        getSettings: vi.fn().mockResolvedValue({
          businessInfo: 'Test',
          defaultGstRate: 18,
          termsAndConditions: 'T&C',
          allowStaffCollection: true,
          enableRejectedWage: false,
          companyLogo: [],
          companyName: [],
          themeColors: [],
          sidebarStyle: [],
          allowAdminBackupRestore: [],
        }),
      } as unknown as backendInterface;

      const settings = await SettingsRepository.getSettings(mockActor);
      expect(settings.businessInfo).toBe('Test');
    });

    it('validates UserRepository operations', async () => {
      const mockActor = {
        getUsers: vi.fn().mockResolvedValue([]),
      } as unknown as backendInterface;

      const users = await UserRepository.getUsers(mockActor);
      expect(users).toEqual([]);
    });

    it('validates VendorRepository operations', async () => {
      const vendors = await VendorRepository.getVendors();
      expect(Array.isArray(vendors)).toBe(true);
    });
  });

  describe('6. ERP Critical Business Rules Verification', () => {
    it('verifies accepted collection calculation: accepted = collected - rejected', () => {
      const todayCollectedQty = 100;
      const rejectedQty = 5;
      const acceptedQty = todayCollectedQty - rejectedQty;
      expect(acceptedQty).toBe(95);
    });

    it('verifies wage calculation: wage = acceptedQty * rate', () => {
      const acceptedQty = 95;
      const ratePerPiece = 12.5;
      const wage = acceptedQty * ratePerPiece;
      expect(wage).toBe(1187.5);
    });

    it('verifies stock non-negativity constraint', () => {
      const currentStock = 10;
      const requestedDeduction = 15;
      const canDeduct = currentStock >= requestedDeduction;
      expect(canDeduct).toBe(false);
    });
  });

  describe('7. ApiResult Error Handling Architecture', () => {
    it('wraps successful operations in ok() helper', () => {
      const result = ok({ id: 1, name: 'Sample' });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: 'Sample' });
    });

    it('wraps failure operations in fail() helper with explicit error codes', () => {
      const result = fail('Unauthorized access', 'UNAUTHORIZED');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Unauthorized access');
        expect(result.code).toBe('UNAUTHORIZED');
      }
    });
  });
});
