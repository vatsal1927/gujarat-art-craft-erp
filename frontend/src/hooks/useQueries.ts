import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Invoice, DashboardStats, Settings, CustomerInfo, User, ActivityLog, ProductItem, CustomerItem, Payment, BOMRequirement, RawMaterial, PurchaseItem, Purchase, Expense, VendorPayment, MaterialConsumptionEntry, Employee, JobWork, EmployeePayment, EmployeeDashboardStats, CustomerOrderLink, KarigarCollection, StockMovement, AuditLog, EmployeeLedgerEntry, Permissions, SalesOrder, ProductionRequirement, PurchaseRequirement, MRPRecord, PurchaseOrder, GRN } from '../backend';
import { getOptionalBoolean } from '../utils/candidHelpers';
import { getVendorMasters, saveVendorMaster, deleteVendorMaster, getRawMaterialMasters } from '../utils/masterData';

export function enrichInvoiceWithSnapshot(inv: Invoice): Invoice {
  if (!inv) return inv;
  const taxIdParts = (inv.customerInfo?.taxId || '').split('|');
  const hasSnapshot = taxIdParts.length > 11 && taxIdParts[6] !== '' && !isNaN(Number(taxIdParts[6]));

  return {
    ...inv,
    previousBalanceAtCreation: hasSnapshot ? Number(taxIdParts[6]) : (inv.previousBalanceAtCreation !== undefined ? Number(inv.previousBalanceAtCreation) : undefined),
    advanceBalanceAtCreation: hasSnapshot ? Number(taxIdParts[7]) : (inv.advanceBalanceAtCreation !== undefined ? Number(inv.advanceBalanceAtCreation) : undefined),
    currentInvoiceTotalAtCreation: hasSnapshot ? Number(taxIdParts[8]) : (inv.currentInvoiceTotalAtCreation !== undefined ? Number(inv.currentInvoiceTotalAtCreation) : undefined),
    totalPayableAtCreation: hasSnapshot ? Number(taxIdParts[9]) : (inv.totalPayableAtCreation !== undefined ? Number(inv.totalPayableAtCreation) : undefined),
    paidAmountAtCreation: hasSnapshot ? Number(taxIdParts[10]) : (inv.paidAmountAtCreation !== undefined ? Number(inv.paidAmountAtCreation) : undefined),
    finalDueAtCreation: hasSnapshot ? Number(taxIdParts[11]) : (inv.finalDueAtCreation !== undefined ? Number(inv.finalDueAtCreation) : undefined),
  };
}


// Dashboard Stats
export function useDashboardStats(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getDashboardStats();
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Get all invoices
export function useInvoices(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      const res = await actor.getInvoices();
      return (res || []).map(enrichInvoiceWithSnapshot);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Get invoice by ID
export function useInvoiceById(id: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<Invoice>({
    queryKey: ['invoice', id.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      const res = await actor.getInvoiceById(id);
      return enrichInvoiceWithSnapshot(res);
    },
    enabled: !!actor && !isFetching && id > 0,
  });
}

// Get next invoice number
export function useNextInvoiceNumber(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<string>({
    queryKey: ['nextInvoiceNumber'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getNextInvoiceNumber();
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
      return actor.saveInvoice(
        data.businessInfo,
        data.customerInfo,
        data.products,
        data.totalAmount,
        data.paidAmount
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['nextInvoiceNumber'] });
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
      return actor.updateInvoice(
        data.id,
        data.businessInfo,
        data.customerInfo,
        data.products,
        data.totalAmount,
        data.paidAmount
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.id.toString()] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
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
      return actor.deleteInvoice(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['nextInvoiceNumber'] });
    },
  });
}

// Get settings
export function useSettings(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getSettings();
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
      return actor.saveSettings(
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
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

// Get self (User)
export function useUserSelf() {
  const { actor, isFetching } = useActor();

  return useQuery<User | null>({
    queryKey: ['userSelf'],
    queryFn: async () => {
      if (!actor) return null;
      const u = await actor.registerOrGetSelf();
      if (!u) return null;
      return {
        ...u,
        needsPasswordChange: getOptionalBoolean(u.needsPasswordChange, false, "needsPasswordChange")
      };
    },
    enabled: !!actor && !isFetching,
  });
}

// Get all users (Admin only)
export function useUsers(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      const users = await actor.getUsers();
      try {
        const cleanUsers = users.map(u => ({
          ...u,
          needsPasswordChange: getOptionalBoolean(u.needsPasswordChange, false, "needsPasswordChange")
        }));
        const serialized = cleanUsers.map(u => ({
          ...u,
          principalId: u.principalId.toString(),
          createdAt: u.createdAt.toString()
        }));
        localStorage.setItem('mock_users', JSON.stringify(serialized));
        return cleanUsers;
      } catch (err) {
        console.error('Failed to cache canister users in mock_users:', err);
      }
      return users.map(u => ({
        ...u,
        needsPasswordChange: getOptionalBoolean(u.needsPasswordChange, false, "needsPasswordChange")
      }));
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
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
      return actor.createUser(
        data.principalText,
        data.name,
        data.username,
        data.roleText,
        data.email,
        data.mobile,
        data.address,
        data.profilePhoto,
        data.status,
        data.passwordHash,
        data.departmentText,
        data.permissionsObj
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
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
      return actor.editUser(
        data.principalText,
        data.name,
        data.username,
        data.email,
        data.mobile,
        data.roleText,
        data.status,
        data.departmentText,
        data.permissionsObj
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userSelf'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
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
      return actor.deleteUser(principalText);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
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
      return actor.updateProfile(data.email, data.name, data.mobile, data.address, data.profilePhoto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSelf'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
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
      return actor.changePassword(data.newPassword, data.newPrincipalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSelf'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
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
      return actor.toggleUserStatus(data.principalText, data.status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
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
      return actor.adminResetPassword(data.principalText, data.newPrincipalId, data.newPasswordHash);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}


// Get activity logs (Admin only)
export function useActivityLogs(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<ActivityLog[]>({
    queryKey: ['activityLogs'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getActivityLogs();
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Get all products
export function useProducts(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<ProductItem[]>({
    queryKey: ['products'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getProducts();
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
      return actor.saveProduct(data.id, data.vigat, data.rate, data.hsnCode, data.stock, data.productionCost, data.bom);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
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
      return actor.deleteProduct(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

// Get all customers
export function useCustomers(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<CustomerItem[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getCustomers();
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
      return actor.saveCustomer(data.id, data.name, data.businessAddress, data.phone, data.gstNo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
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
      return actor.deleteCustomer(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
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
      return actor.collectPayment(data.customerId, data.amount, data.notes);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

// Log user action
export function useLogUserAction() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (data: { action: string; details: string }) => {
      if (!actor) return;
      return actor.logUserAction(data.action, data.details);
    }
  });
}

// Get all payments
export function usePayments(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<Payment[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getPayments();
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Get payments by customer
export function usePaymentsByCustomer(customerId: string, options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<Payment[]>({
    queryKey: ['payments', customerId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getPaymentsByCustomer(customerId);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching && !!customerId,
  });
}

// --- ERP Hooks ---

// Get all raw materials
export function useRawMaterials(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<RawMaterial[]>({
    queryKey: ['rawMaterials'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      const raw = await actor.getRawMaterials();
      return getRawMaterialMasters(raw);
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
      return actor.saveRawMaterial(
        data.id,
        data.name,
        data.category,
        data.openingStock,
        data.unitCost,
        data.unit,
        data.minStock,
        data.reorderLevel,
        data.minimumStock,
        data.preferredVendor
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
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
      return actor.deleteRawMaterial(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

// Get all purchases
export function usePurchases(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<Purchase[]>({
    queryKey: ['purchases'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getPurchases();
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
      return actor.savePurchase(
        data.purchaseNumber,
        data.vendorName,
        data.vendorMobile,
        data.vendorGstNumber,
        data.vendorAddress,
        data.items,
        data.totalAmount,
        data.paidAmount
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
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
      return actor.deletePurchase(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

// Get all purchase invoices
export function usePurchaseInvoices(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<any[]>({
    queryKey: ['purchaseInvoices'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getPurchaseInvoices();
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Get purchase invoice by id
export function usePurchaseInvoiceById(id: string, options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<any>({
    queryKey: ['purchaseInvoice', id],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getPurchaseInvoiceById(id);
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
      return actor.recordPurchasePayment(data.invoiceId, data.paymentData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoice', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['vendorOutstanding'] });
      queryClient.invalidateQueries({ queryKey: ['vendorLedger'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['systemAuditLogs'] });
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
      return actor.cancelPurchaseInvoice(invoiceId);
    },
    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['vendorOutstanding'] });
      queryClient.invalidateQueries({ queryKey: ['vendorLedger'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['systemAuditLogs'] });
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
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['systemAuditLogs'] });
    }
  });
}

// Get all purchase orders
export function usePurchaseOrders(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<PurchaseOrder[]>({
    queryKey: ['purchaseOrders'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getPurchaseOrders();
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
      return actor.savePurchaseOrder(po);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseRequirements'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
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
      return actor.deletePurchaseOrder(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseRequirements'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

// Get all GRNs
export function useGRNs(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<GRN[]>({
    queryKey: ['grns'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getGRNs();
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
      return actor.saveGRN(grn);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
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
      return actor.receivePOItem(data.poId, data.qty, data.invoiceNo, data.expiryDate, data.remarks);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseRequirements'] });
      queryClient.invalidateQueries({ queryKey: ['productionRequirements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

// Get all expenses
export function useExpenses(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getExpenses();
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
      return actor.saveExpense(data.category, data.amount, data.description);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
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
      return actor.deleteExpense(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
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
      return actor.collectVendorPayment(data.vendorName, data.amount, data.notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorPayments'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

// Get vendor payments
export function useVendorPayments(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<VendorPayment[]>({
    queryKey: ['vendorPayments'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getVendorPayments();
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Get material consumption history
export function useMaterialConsumptionHistory() {
  const { actor, isFetching } = useActor();

  return useQuery<MaterialConsumptionEntry[]>({
    queryKey: ['consumptionHistory'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getMaterialConsumptionHistory();
    },
    enabled: !!actor && !isFetching,
  });
}

// Get all employees
export function useEmployees(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getEmployees();
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
      return actor.saveEmployee(data.id, data.name, data.mobile, data.address, data.joiningDate, data.skillType, data.status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
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
      return actor.deleteEmployee(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

// Get all job works
export function useJobWorks(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<JobWork[]>({
    queryKey: ['jobWorks'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getJobWorks();
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
      return actor.saveJobWork(
        data.jobDate,
        data.employeeName,
        data.mobileNumber,
        data.productName,
        data.productCode,
        data.hsnCode,
        data.qtyGiven,
        data.ratePerPiece,
        data.expectedReturnDate,
        data.remarks,
        data.customerOrderLink
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobWorks'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
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
      return actor.updateJobWorkProgress(data.jobId, data.completedQty, data.remarks);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobWorks'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

// Get employee payments
export function useEmployeePayments(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<EmployeePayment[]>({
    queryKey: ['employeePayments'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getEmployeePayments();
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
      return actor.saveEmployeePayment(data.employeeName, data.amountPaid, data.paymentMode, data.remarks);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeePayments'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['karigarLedger'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
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
      return actor.editEmployeePayment(data.paymentId, data.amountPaid, data.paymentMode, data.remarks);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeePayments'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['karigarLedger'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
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
      return actor.deleteEmployeePayment(paymentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeePayments'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['karigarLedger'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

// Get employee dashboard stats
export function useEmployeeDashboard(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<EmployeeDashboardStats>({
    queryKey: ['employeeDashboard'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getEmployeeDashboardStats();
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching,
  });
}

// Get all collections
export function useCollections(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<KarigarCollection[]>({
    queryKey: ['collections'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getCollections();
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
      return actor.saveCollectionEntry(
        data.jobWorkNo,
        data.todayCollectedQty,
        data.rejectedQty,
        data.remarks
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['jobWorks'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      queryClient.invalidateQueries({ queryKey: ['karigarLedger'] });
      queryClient.invalidateQueries({ queryKey: ['stockReconciliation'] });
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
      return actor.editCollectionEntry(
        data.collectionId,
        data.todayCollectedQty,
        data.rejectedQty,
        data.remarks
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['jobWorks'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      queryClient.invalidateQueries({ queryKey: ['karigarLedger'] });
      queryClient.invalidateQueries({ queryKey: ['stockReconciliation'] });
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
      return actor.deleteCollectionEntry(collectionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['jobWorks'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      queryClient.invalidateQueries({ queryKey: ['karigarLedger'] });
      queryClient.invalidateQueries({ queryKey: ['stockReconciliation'] });
    },
  });
}

// Get stock movement history
export function useStockMovements() {
  const { actor, isFetching } = useActor();

  return useQuery<StockMovement[]>({
    queryKey: ['stockMovements'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getStockMovementHistory();
    },
    enabled: !!actor && !isFetching,
  });
}

// Get system audit logs
export function useAuditLogs() {
  const { actor, isFetching } = useActor();

  return useQuery<AuditLog[]>({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getSystemAuditLogs();
    },
    enabled: !!actor && !isFetching,
  });
}

// Get employee ledger
export function useKarigarLedger(employeeName: string, options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<EmployeeLedgerEntry[]>({
    queryKey: ['karigarLedger', employeeName],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getKarigarLedger(employeeName);
    },
    enabled: (options?.enabled !== false) && !!actor && !isFetching && !!employeeName,
  });
}

// Get raw material consumption logs
export function useConsumptionLogs(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<any[]>({
    queryKey: ['consumptionLogs'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getConsumptionLogs();
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
      return actor.saveConsumptionLog(
        data.productName,
        data.batchNo,
        data.rawMaterialName,
        data.quantityUsed,
        data.unit,
        data.cost,
        data.employee,
        data.jobWorkNo,
        data.remarks
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumptionLogs'] });
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

// Get finished goods logs
export function useFinishedGoodsLogs() {
  const { actor, isFetching } = useActor();

  return useQuery<any[]>({
    queryKey: ['finishedGoodsLogs'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getFinishedGoodsLogs();
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
      return actor.saveFinishedGoodsLog(
        data.productName,
        data.quantity,
        data.logType,
        data.reason
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishedGoodsLogs'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['stockReconciliation'] });
    },
  });
}

// Get Stock Reconciliation check report
export function useStockReconciliation() {
  const { actor, isFetching } = useActor();

  return useQuery<any[]>({
    queryKey: ['stockReconciliation'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.checkStockReconciliation();
    },
    enabled: !!actor && !isFetching,
  });
}

// Sales Orders Queries
export function useSalesOrders(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<SalesOrder[]>({
    queryKey: ['salesOrders'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      const res = await actor.getSalesOrders();
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
      return actor.saveSalesOrder(order);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productionRequirements'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseRequirements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

export function useDeleteSalesOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.deleteSalesOrder(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

// Production Requirements Queries
export function useProductionRequirements(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<ProductionRequirement[]>({
    queryKey: ['productionRequirements'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      const res = await actor.getProductionRequirements();
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
      return actor.saveProductionRequirement(req);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionRequirements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

// Purchase Requirements Queries
export function usePurchaseRequirements(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<PurchaseRequirement[]>({
    queryKey: ['purchaseRequirements'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      const res = await actor.getPurchaseRequirements();
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
      return actor.savePurchaseRequirement(req);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseRequirements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

export function useMRPRecords(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();

  return useQuery<MRPRecord[]>({
    queryKey: ['mrpRecords'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      const res = await actor.getMRPRecords();
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
      return actor.runMRP(requirementId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mrpRecords'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseRequirements'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

export function useReserveStockForOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.reserveStockForOrder(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productionRequirements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

export function useCompleteProductionPlan() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { requirementId: string; completedQty: number }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.completeProductionPlan(data.requirementId, data.completedQty);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionRequirements'] });
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      queryClient.invalidateQueries({ queryKey: ['finishedGoodsLogs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

export function useReceivePurchaseRequirement() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { requirementId: string; qty: number }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.receivePurchaseRequirement(data.requirementId, data.qty);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseRequirements'] });
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      queryClient.invalidateQueries({ queryKey: ['mrpRecords'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

// Get all vendors (from localStorage)
export function useVendors() {
  return useQuery<any[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      return getVendorMasters();
    }
  });
}

// Save vendor (create/update)
export function useSaveVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vendor: any) => {
      return saveVendorMaster(vendor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    }
  });
}

// Delete vendor
export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteVendorMaster(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    }
  });
}

