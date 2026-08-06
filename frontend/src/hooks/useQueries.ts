import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { MODULE_CACHE_CONFIG } from '../lib/queryClient';
import {
  InvoiceRepository,
  DashboardRepository,
  SettingsRepository,
  UserRepository,
  ProductRepository,
  CustomerRepository,
  RawMaterialRepository,
  PurchaseRepository,
  ExpenseRepository,
  InventoryRepository,
  ProductionRepository,
  VendorRepository,
} from '../repositories';
import { useActor } from './useActor';
import type { Invoice, DashboardStats, Settings, CustomerInfo, User, LinkedIdentity, IdentityProviderType, ActivityLog, ProductItem, CustomerItem, Payment, BOMRequirement, RawMaterial, PurchaseItem, Purchase, Expense, VendorPayment, MaterialConsumptionEntry, Employee, JobWork, EmployeePayment, EmployeeDashboardStats, CustomerOrderLink, KarigarCollection, StockMovement, AuditLog, EmployeeLedgerEntry, Permissions, SalesOrder, ProductionRequirement, PurchaseRequirement, MRPRecord, PurchaseOrder, GRN } from '../backend';

// Dashboard Stats
export function useDashboardStats(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboardStats(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return DashboardRepository.getDashboardStats(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
    staleTime: MODULE_CACHE_CONFIG.dashboard.staleTime,
    gcTime: MODULE_CACHE_CONFIG.dashboard.gcTime,
  });
}

// Get all invoices
export function useInvoices(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<Invoice[]>({
    queryKey: queryKeys.invoices(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return InvoiceRepository.getInvoices(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
    staleTime: MODULE_CACHE_CONFIG.invoices.staleTime,
    gcTime: MODULE_CACHE_CONFIG.invoices.gcTime,
  });
}

// Get invoice by ID
export function useInvoiceById(id: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<Invoice>({
    queryKey: queryKeys.invoice(id),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return InvoiceRepository.getInvoiceById(actor, id);
    },
    enabled: !!actor && !isFetching && id > BigInt(0),
  });
}

// Get next invoice number
export function useNextInvoiceNumber(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<string>({
    queryKey: queryKeys.nextInvoiceNumber(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return InvoiceRepository.getNextInvoiceNumber(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Save invoice
export function useSaveInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      businessInfo: string;
      customerInfo: CustomerInfo;
      products: [string, bigint, bigint][];
      totalAmount: number;
      paidAmount: number;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return InvoiceRepository.saveInvoice(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers() });
    },
  });
}

// Update invoice
export function useUpdateInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      businessInfo: string;
      customerInfo: CustomerInfo;
      products: [string, bigint, bigint][];
      totalAmount: number;
      paidAmount: number;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return InvoiceRepository.updateInvoice(actor, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers() });
    },
  });
}

// Delete invoice
export function useDeleteInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not initialized');
      return InvoiceRepository.deleteInvoice(actor, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers() });
    },
  });
}

// Get settings
export function useSettings(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<Settings>({
    queryKey: queryKeys.settings(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return SettingsRepository.getSettings(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Save settings
export function useSaveSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
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
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return SettingsRepository.saveSettings(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings() });
    },
  });
}

// Get self (User)
export function useUserSelf() {
  const { actor, isFetching } = useActor();

  return useQuery<User | null>({
    queryKey: queryKeys.userSelf(),
    queryFn: async () => {
      if (!actor) return null;
      return UserRepository.registerOrGetSelf(actor);
    },
    enabled: !!actor && !isFetching,
  });
}

// Get all users (Admin only)
export function useUsers(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<User[]>({
    queryKey: queryKeys.users(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return UserRepository.getUsers(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Link Identity to User (Admin only)
export function useLinkIdentity() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      targetPrincipalText: string;
      providerTypeVariant: IdentityProviderType;
      providerId: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return UserRepository.linkIdentityToUser(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.userSelf() });
    },
  });
}

// Unlink Identity from User (Admin only)
export function useUnlinkIdentity() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      targetPrincipalText: string;
      providerId: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return UserRepository.unlinkIdentityFromUser(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.userSelf() });
    },
  });
}

// Create new user (Admin only)
export function useCreateUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      principalText: string;
      name: string;
      username: string;
      roleText: string;
      email?: string;
      mobile?: string;
      address?: string;
      profilePhoto?: string;
      status?: string;
      passwordHash?: string;
      departmentText?: string;
      permissionsObj?: Permissions;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return UserRepository.createUser(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Edit user (Admin only)
export function useEditUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      principalText: string;
      name: string;
      username: string;
      email: string;
      mobile: string;
      roleText: string;
      status: string;
      departmentText?: string;
      permissionsObj?: Permissions;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return UserRepository.editUser(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.userSelf() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Delete user (Admin only)
export function useDeleteUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principalText: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return UserRepository.deleteUser(actor, principalText);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Update profile details
export function useUpdateProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      name: string;
      mobile: string;
      address: string;
      profilePhoto: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return UserRepository.updateProfile(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userSelf() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Change own password
export function useChangePassword() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      newPassword: string;
      newPrincipalId: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return UserRepository.changePassword(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userSelf() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Toggle user status (Active/Deactivated)
export function useToggleUserStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      principalText: string;
      status: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return UserRepository.toggleUserStatus(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Reset password for another user
export function useAdminResetPassword() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      principalText: string;
      newPrincipalId: string;
      newPasswordHash?: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return UserRepository.adminResetPassword(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}


// Get activity logs (Admin only)
export function useActivityLogs(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<ActivityLog[]>({
    queryKey: queryKeys.activityLogs(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return UserRepository.getActivityLogs(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Get all products
export function useProducts(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<ProductItem[]>({
    queryKey: queryKeys.products(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductRepository.getProducts(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Save product
export function useSaveProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      vigat: string;
      rate: number;
      hsnCode: string;
      stock: bigint;
      productionCost: number;
      bom: BOMRequirement[];
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductRepository.saveProduct(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
    },
  });
}

// Delete product
export function useDeleteProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductRepository.deleteProduct(actor, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Get all customers
export function useCustomers(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<CustomerItem[]>({
    queryKey: queryKeys.customers(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return CustomerRepository.getCustomers(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Save customer
export function useSaveCustomer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      businessAddress: string;
      phone: string;
      gstNo: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return CustomerRepository.saveCustomer(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Delete customer
export function useDeleteCustomer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return CustomerRepository.deleteCustomer(actor, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Collect Payment
export function useCollectPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      customerId: string;
      amount: number;
      notes: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return CustomerRepository.collectPayment(actor, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments(variables.customerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Log user action
export function useLogUserAction() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (data: { action: string; details: string }) => {
      if (!actor) return;
      return UserRepository.logUserAction(actor, data);
    }
  });
}

// Get all payments
export function usePayments(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<Payment[]>({
    queryKey: queryKeys.payments(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return CustomerRepository.getPayments(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Get payments by customer
export function usePaymentsByCustomer(customerId: string, options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<Payment[]>({
    queryKey: queryKeys.payments(customerId),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return CustomerRepository.getPaymentsByCustomer(actor, customerId);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching && !!customerId,
  });
}

// --- ERP Hooks ---

// Get all raw materials
export function useRawMaterials(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<RawMaterial[]>({
    queryKey: queryKeys.rawMaterials(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return RawMaterialRepository.getRawMaterials(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Save raw material
export function useSaveRawMaterial() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      category: string;
      openingStock: number;
      unitCost: number;
      unit: string;
      minStock: number;
      reorderLevel?: number;
      minimumStock?: number;
      preferredVendor?: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return RawMaterialRepository.saveRawMaterial(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rawMaterials() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Delete raw material
export function useDeleteRawMaterial() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return RawMaterialRepository.deleteRawMaterial(actor, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rawMaterials() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Get all purchases
export function usePurchases(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<Purchase[]>({
    queryKey: queryKeys.purchases(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return PurchaseRepository.getPurchases(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Save purchase
export function useSavePurchase() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      purchaseNumber: string;
      vendorName: string;
      vendorMobile: string;
      vendorGstNumber: string;
      vendorAddress: string;
      items: PurchaseItem[];
      totalAmount: number;
      paidAmount: number;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return PurchaseRepository.savePurchase(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rawMaterials() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Delete purchase
export function useDeletePurchase() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not initialized');
      return PurchaseRepository.deletePurchase(actor, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rawMaterials() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Get all purchase invoices
export function usePurchaseInvoices(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<any[]>({
    queryKey: queryKeys.purchaseInvoices(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return PurchaseRepository.getPurchaseInvoices(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Get purchase invoice by id
export function usePurchaseInvoiceById(id: string, options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<any>({
    queryKey: queryKeys.purchaseInvoice(id),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return PurchaseRepository.getPurchaseInvoiceById(actor, id);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching && !!id,
  });
}

// Record purchase payment
export function useRecordPurchasePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { invoiceId: string; paymentData: any }) => {
      if (!actor) throw new Error('Actor not initialized');
      return PurchaseRepository.recordPurchasePayment(actor, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseInvoices() });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases() });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseInvoice(variables.invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendorOutstanding() });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendorLedger() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.systemAuditLogs() });
    },
  });
}

// Cancel purchase invoice
export function useCancelPurchaseInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return PurchaseRepository.cancelPurchaseInvoice(actor, invoiceId);
    },
    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseInvoices() });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases() });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseInvoice(invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendorOutstanding() });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendorLedger() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.systemAuditLogs() });
    },
  });
}

// Log action for purchase invoice
export function useLogPurchaseInvoiceAction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { action: 'viewed' | 'printed' | 'pdf_downloaded'; invoiceNumber: string }) => {
      if (!actor) throw new Error('Actor not initialized');
      if (data.action === 'viewed') {
        return (actor as any).logPurchaseInvoiceViewed(data.invoiceNumber);
      } else if (data.action === 'printed') {
        return (actor as any).logPurchaseInvoicePrinted(data.invoiceNumber);
      } else {
        return (actor as any).logPurchaseInvoicePdfDownloaded(data.invoiceNumber);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.systemAuditLogs() });
    }
  });
}

// Get all purchase orders
export function usePurchaseOrders(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<PurchaseOrder[]>({
    queryKey: queryKeys.purchaseOrders(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return PurchaseRepository.getPurchaseOrders(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Save purchase order
export function useSavePurchaseOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (po: PurchaseOrder) => {
      if (!actor) throw new Error('Actor not initialized');
      return PurchaseRepository.savePurchaseOrder(actor, po);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseRequirements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Delete purchase order
export function useDeletePurchaseOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return PurchaseRepository.deletePurchaseOrder(actor, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseRequirements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Get all GRNs
export function useGRNs(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<GRN[]>({
    queryKey: queryKeys.grns(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return PurchaseRepository.getGRNs(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Save GRN
export function useSaveGRN() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (grn: GRN) => {
      if (!actor) throw new Error('Actor not initialized');
      return PurchaseRepository.saveGRN(actor, grn);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grns() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Receive PO item (creates GRN, updates PO, creates PI, updates stock, updates ledger)
export function useReceivePOItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { poId: string; qty: number; invoiceNo: string; expiryDate?: string; remarks?: string }) => {
      if (!actor) throw new Error('Actor not initialized');
      return PurchaseRepository.receivePOItem(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.grns() });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rawMaterials() });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseRequirements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.productionRequirements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Get all expenses
export function useExpenses(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<Expense[]>({
    queryKey: queryKeys.expenses(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return ExpenseRepository.getExpenses(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Save expense
export function useSaveExpense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      category: string;
      amount: number;
      description: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return ExpenseRepository.saveExpense(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Delete expense
export function useDeleteExpense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not initialized');
      return ExpenseRepository.deleteExpense(actor, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Collect Vendor Payment
export function useCollectVendorPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      vendorName: string;
      amount: number;
      notes: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return ExpenseRepository.collectVendorPayment(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendorPayments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Get vendor payments
export function useVendorPayments(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<VendorPayment[]>({
    queryKey: queryKeys.vendorPayments(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return ExpenseRepository.getVendorPayments(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Get material consumption history
export function useMaterialConsumptionHistory() {
  const { actor, isFetching } = useActor();

  return useQuery<MaterialConsumptionEntry[]>({
    queryKey: queryKeys.consumptionHistory(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return InventoryRepository.getMaterialConsumptionHistory(actor);
    },
    enabled: !!actor && !isFetching,
  });
}

// Get all employees
export function useEmployees(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<Employee[]>({
    queryKey: queryKeys.employees(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.getEmployees(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Save employee
export function useSaveEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      mobile: string;
      address: string;
      joiningDate: bigint;
      skillType: string;
      status: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.saveEmployee(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employeeDashboard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Delete employee
export function useDeleteEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.deleteEmployee(actor, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employeeDashboard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Get all job works
export function useJobWorks(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<JobWork[]>({
    queryKey: queryKeys.jobWorks(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.getJobWorks(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Save job work
export function useSaveJobWork() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      jobDate: bigint;
      employeeName: string;
      mobileNumber: string;
      productName: string;
      productCode: string;
      hsnCode: string;
      qtyGiven: number;
      ratePerPiece: number;
      expectedReturnDate: bigint;
      remarks: string;
      customerOrderLink: CustomerOrderLink | null;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.saveJobWork(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobWorks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employeeDashboard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Update job work progress
export function useUpdateJobProgress() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      jobId: bigint;
      completedQty: number;
      remarks: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.updateJobWorkProgress(actor, data.jobId, data.completedQty, data.remarks);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobWorks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employeeDashboard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Get employee payments
export function useEmployeePayments(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<EmployeePayment[]>({
    queryKey: queryKeys.employeePayments(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.getEmployeePayments(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Save employee payment
export function useSaveEmployeePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      employeeName: string;
      amountPaid: number;
      paymentMode: string;
      remarks: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.saveEmployeePayment(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employeePayments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employeeDashboard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.karigarLedger() });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs() });
    },
  });
}

// Edit employee payment
export function useEditEmployeePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      paymentId: bigint;
      amountPaid: number;
      paymentMode: string;
      remarks: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.editEmployeePayment(actor, data.paymentId, data.amountPaid, data.paymentMode, data.remarks);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employeePayments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employeeDashboard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.karigarLedger() });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs() });
    },
  });
}

// Delete employee payment
export function useDeleteEmployeePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: bigint) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.deleteEmployeePayment(actor, paymentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employeePayments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employeeDashboard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.karigarLedger() });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs() });
    },
  });
}

// Get employee dashboard stats
export function useEmployeeDashboard(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<EmployeeDashboardStats>({
    queryKey: queryKeys.employeeDashboard(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.getEmployeeDashboardStats(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Get all collections
export function useCollections(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<KarigarCollection[]>({
    queryKey: queryKeys.collections(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.getCollections(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Save collection entry
export function useSaveCollection() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      jobWorkNo: bigint;
      todayCollectedQty: number;
      rejectedQty: number;
      remarks: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.saveCollectionEntry(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections() });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobWorks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employeeDashboard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.karigarLedger() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stockReconciliation() });
    },
  });
}

// Edit collection entry
export function useEditCollection() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      collectionId: bigint;
      todayCollectedQty: number;
      rejectedQty: number;
      remarks: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.editCollectionEntry(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections() });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobWorks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employeeDashboard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.karigarLedger() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stockReconciliation() });
    },
  });
}

// Delete collection entry
export function useDeleteCollection() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collectionId: bigint) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.deleteCollectionEntry(actor, collectionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections() });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobWorks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employeeDashboard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.karigarLedger() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stockReconciliation() });
    },
  });
}

// Get stock movement history
export function useStockMovements() {
  const { actor, isFetching } = useActor();

  return useQuery<StockMovement[]>({
    queryKey: queryKeys.stockMovements(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return InventoryRepository.getStockMovementHistory(actor);
    },
    enabled: !!actor && !isFetching,
  });
}

// Get system audit logs
export function useAuditLogs() {
  const { actor, isFetching } = useActor();

  return useQuery<AuditLog[]>({
    queryKey: queryKeys.auditLogs(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return InventoryRepository.getSystemAuditLogs(actor);
    },
    enabled: !!actor && !isFetching,
  });
}

// Get employee ledger
export function useKarigarLedger(employeeName: string, options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<EmployeeLedgerEntry[]>({
    queryKey: queryKeys.karigarLedger(employeeName),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.getKarigarLedger(actor, employeeName);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching && !!employeeName,
  });
}

// Get raw material consumption logs
export function useConsumptionLogs(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<any[]>({
    queryKey: queryKeys.consumptionLogs(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return InventoryRepository.getConsumptionLogs(actor);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Save raw material consumption log
export function useSaveConsumptionLog() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      productName: string;
      batchNo: string;
      rawMaterialName: string;
      quantityUsed: number;
      unit: string;
      cost: number;
      employee: string;
      jobWorkNo: string;
      remarks: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return InventoryRepository.saveConsumptionLog(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consumptionLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rawMaterials() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Get finished goods logs
export function useFinishedGoodsLogs() {
  const { actor, isFetching } = useActor();

  return useQuery<any[]>({
    queryKey: queryKeys.finishedGoodsLogs(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return InventoryRepository.getFinishedGoodsLogs(actor);
    },
    enabled: !!actor && !isFetching,
  });
}

// Save finished goods log
export function useSaveFinishedGoodsLog() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      productName: string;
      quantity: number;
      logType: string;
      reason: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return InventoryRepository.saveFinishedGoodsLog(actor, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finishedGoodsLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stockReconciliation() });
    },
  });
}

// Get Stock Reconciliation check report
export function useStockReconciliation() {
  const { actor, isFetching } = useActor();

  return useQuery<any[]>({
    queryKey: queryKeys.stockReconciliation(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return InventoryRepository.checkStockReconciliation(actor);
    },
    enabled: !!actor && !isFetching,
  });
}

// Sales Orders Queries
export function useSalesOrders(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<SalesOrder[]>({
    queryKey: queryKeys.salesOrders(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      const res = await ProductionRepository.getSalesOrders(actor);
      return res || [];
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

export function useSaveSalesOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: SalesOrder) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.saveSalesOrder(actor, order);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salesOrders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.productionRequirements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseRequirements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

export function useDeleteSalesOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.deleteSalesOrder(actor, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salesOrders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Production Requirements Queries
export function useProductionRequirements(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<ProductionRequirement[]>({
    queryKey: queryKeys.productionRequirements(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      const res = await ProductionRepository.getProductionRequirements(actor);
      return res || [];
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

export function useSaveProductionRequirement() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (req: ProductionRequirement) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.saveProductionRequirement(actor, req);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.productionRequirements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Purchase Requirements Queries
export function usePurchaseRequirements(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<PurchaseRequirement[]>({
    queryKey: queryKeys.purchaseRequirements(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      const res = await ProductionRepository.getPurchaseRequirements(actor);
      return res || [];
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

export function useSavePurchaseRequirement() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (req: PurchaseRequirement) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.savePurchaseRequirement(actor, req);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseRequirements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

export function useMRPRecords(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<MRPRecord[]>({
    queryKey: queryKeys.mrpRecords(),
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      const res = await ProductionRepository.getMRPRecords(actor);
      return res || [];
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

export function useRunMRP() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requirementId: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.runMRP(actor, requirementId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mrpRecords() });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseRequirements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

export function useReserveStockForOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.reserveStockForOrder(actor, orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salesOrders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.productionRequirements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

export function useCompleteProductionPlan() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { requirementId: string; completedQty: number }) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.completeProductionPlan(actor, data.requirementId, data.completedQty);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.productionRequirements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.salesOrders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rawMaterials() });
      queryClient.invalidateQueries({ queryKey: queryKeys.finishedGoodsLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

export function useReceivePurchaseRequirement() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { requirementId: string; qty: number }) => {
      if (!actor) throw new Error('Actor not initialized');
      return ProductionRepository.receivePurchaseRequirement(actor, data.requirementId, data.qty);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseRequirements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rawMaterials() });
      queryClient.invalidateQueries({ queryKey: queryKeys.mrpRecords() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activityLogs() });
    },
  });
}

// Get all vendors (from localStorage)
export function useVendors() {
  return useQuery<any[]>({
    queryKey: queryKeys.vendors(),
    queryFn: async () => {
      return VendorRepository.getVendors();
    }
  });
}

// Save vendor (create/update)
export function useSaveVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vendor: any) => {
      return VendorRepository.saveVendor(vendor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors() });
    }
  });
}

// Delete vendor
export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return VendorRepository.deleteVendor(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors() });
    }
  });
}

