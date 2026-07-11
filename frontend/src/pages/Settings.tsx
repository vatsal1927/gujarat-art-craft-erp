import { useState, useEffect } from 'react';
import { 
  useSettings, useSaveSettings, useUsers, useCreateUser, useEditUser, useDeleteUser, 
  useActivityLogs, useProducts, useSaveProduct, useDeleteProduct, 
  useCustomers, useSaveCustomer, useDeleteCustomer, useToggleUserStatus, 
  useAdminResetPassword, useEmployees
} from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import RawMaterialsInventory from '../components/settings/RawMaterialsInventory';
import VendorAccounts from '../components/settings/VendorAccounts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, UserPlus, Trash2, ShieldAlert, FileSpreadsheet, Users, History, Search, Key, Sparkles, Edit, Building2, Palette, Upload, UserX, Database, Download } from 'lucide-react';
import { formatCurrency } from '../utils/currencyFormat';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { parseBusinessInfo } from '../utils/businessInfoParser';
import { useAuth } from '../components/AuthGuard';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { deriveIdentity } from '../utils/credentialDerivation';
import { formatERPDate, formatERPDateTime } from '../utils/calculations';
import { hasDeptAccess } from '../utils/auth';
import { exportToCSV, parseCSV, normalizeProductMaster, normalizeCustomerMaster } from '../utils/masterData';

const isStrongPassword = (password: string): { isValid: boolean; message: string } => {
    if (password.length < 8) {
        return { isValid: false, message: "Password must be at least 8 characters long." };
    }
    if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: "Password must contain at least one uppercase letter." };
    }
    if (!/[a-z]/.test(password)) {
        return { isValid: false, message: "Password must contain at least one lowercase letter." };
    }
    if (!/[0-9]/.test(password)) {
        return { isValid: false, message: "Password must contain at least one number." };
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        return { isValid: false, message: "Password must contain at least one special character." };
    }
    return { isValid: true, message: "" };
};

const Settings = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as any;
  const { user: currentUser } = useAuth();
  const isAdmin = !!(currentUser?.role && 'Admin' in currentUser.role);
  const isManager = !!(currentUser?.role && 'Manager' in currentUser.role);
  const { actor } = useActor();

  const canManageStaff = isAdmin || !!(currentUser && hasDeptAccess(currentUser, ['AdminSettings'], 'canManageStaff'));
  const canViewLogs = isAdmin || !!(currentUser && hasDeptAccess(currentUser, ['AdminSettings'], 'canViewLogs'));

  // Tab 1: Settings hooks
  const { data: settings, isLoading: isLoadingSettings } = useSettings();
  const { mutate: saveSettings, isPending: isSavingSettings } = useSaveSettings();

  const [businessName, setBusinessName] = useState('Gujarat Art & Crafts');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessGst, setBusinessGst] = useState('');
  const [defaultGstRate, setDefaultGstRate] = useState(0);
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [allowStaffCollection, setAllowStaffCollection] = useState(true);
  const [enableRejectedWage, setEnableRejectedWage] = useState(false);
  const [allowAdminBackupRestore, setAllowAdminBackupRestore] = useState(false);
  const [enableAutoStockAlerts, setEnableAutoStockAlerts] = useState(true);
  const [alertFrequency, setAlertFrequency] = useState('Once per day');
  const [lowStockAlertThreshold, setLowStockAlertThreshold] = useState(10);
  const [costingMethod, setCostingMethod] = useState('WeightedAverage');
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState('Net 30');
  
  // Theme & Branding states
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyNameState, setCompanyNameState] = useState('');
  const [themeColors, setThemeColors] = useState('maroon-saffron');
  const [sidebarStyle, setSidebarStyle] = useState('Minimalist');

  let defaultTab = 'raw-materials';
  if (isAdmin) {
    defaultTab = 'general';
  } else if (canManageStaff) {
    defaultTab = 'users';
  }
  const [activeTab, setActiveTab] = useState(search.tab || defaultTab);

  useEffect(() => {
    if (search.tab) {
      setActiveTab(search.tab);
    } else {
      setActiveTab(defaultTab);
    }
  }, [search.tab, defaultTab]);

  // Tab 2: User management hooks
  const { data: usersList, isLoading: isLoadingUsers } = useUsers({ enabled: canManageStaff });
  const masterAdminExists = !!usersList?.some((u: any) => u.role && 'Admin' in u.role);
  const { mutate: createUser, isPending: isCreatingUser } = useCreateUser();
  const { mutate: deleteUser } = useDeleteUser();
  const { mutate: toggleUserStatus } = useToggleUserStatus();
  const { mutate: adminResetPassword } = useAdminResetPassword();
  const { mutate: editUser, isPending: isEditingUser } = useEditUser();

  // User editing states
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editRole, setEditRole] = useState<'Admin' | 'Manager' | 'Staff'>('Staff');
  const [editStatus, setEditStatus] = useState('Active');

  // Mode select for new user registration
  const [authMethod, setAuthMethod] = useState<'password' | 'ii'>('password');
  const [newPrincipal, setNewPrincipal] = useState('');
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'Manager' | 'Staff'>('Staff');
  const [newEmail, setNewEmail] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newProfilePhoto, setNewProfilePhoto] = useState('');
  const [linkedEmployeeId, setLinkedEmployeeId] = useState('');
  const [editLinkedEmployeeId, setEditLinkedEmployeeId] = useState('');

  const { data: employeesList = [] } = useEmployees();
  const [derivedPrincipalText, setDerivedPrincipalText] = useState('');

  // Tab 3: Activity logs hooks
  const { data: logs, isLoading: isLoadingLogs } = useActivityLogs({ enabled: canViewLogs });
  const [logFilter, setLogFilter] = useState('');
  const [logCategoryFilter, setLogCategoryFilter] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUsername, setFilterUsername] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Tab 4: Product Inventory hooks & state
  const { data: products, isLoading: isLoadingProducts } = useProducts();
  const { mutate: saveProduct, isPending: isSavingProduct } = useSaveProduct();
  const { mutate: deleteProduct } = useDeleteProduct();

  const [prodId, setProdId] = useState('');
  const [prodVigat, setProdVigat] = useState('');
  const [prodRate, setProdRate] = useState(0);
  const [prodHsn, setProdHsn] = useState('5609');
  const [prodStock, setProdStock] = useState(0);
  const [editingProd, setEditingProd] = useState<string | null>(null);

  // Tab 4: Customer Registry hooks & state
  const { data: customers, isLoading: isLoadingCustomers } = useCustomers();
  const { mutate: saveCustomer, isPending: isSavingCustomer } = useSaveCustomer();
  const { mutate: deleteCustomer } = useDeleteCustomer();

  const [custId, setCustId] = useState('');
  const [custName, setCustName] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custGst, setCustGst] = useState('');
  const [editingCust, setEditingCust] = useState<string | null>(null);

  const [selectedProdIds, setSelectedProdIds] = useState<string[]>([]);
  const [selectedCustIds, setSelectedCustIds] = useState<string[]>([]);

  if (!currentUser) return null;

  const handleBulkDeleteProducts = () => {
    if (!selectedProdIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedProdIds.length} selected products?`)) return;
    let completed = 0;
    selectedProdIds.forEach((id) => {
      deleteProduct(id, {
        onSuccess: () => {
          completed++;
          if (completed === selectedProdIds.length) {
            toast.success('Selected products deleted successfully.');
            setSelectedProdIds([]);
          }
        }
      });
    });
  };

  const handleBulkDeleteCustomers = () => {
    if (!selectedCustIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedCustIds.length} selected customers?`)) return;
    let completed = 0;
    selectedCustIds.forEach((id) => {
      deleteCustomer(id, {
        onSuccess: () => {
          completed++;
          if (completed === selectedCustIds.length) {
            toast.success('Selected customers deleted successfully.');
            setSelectedCustIds([]);
          }
        }
      });
    });
  };

  const handleExportProducts = () => {
    const data = (products || []).map(p => ({
      id: p.id,
      vigat: p.vigat,
      rate: p.rate,
      hsnCode: p.hsnCode,
      stock: p.stock.toString(),
      productionCost: p.productionCost
    }));
    exportToCSV(data, ['id', 'vigat', 'rate', 'hsnCode', 'stock', 'productionCost'], 'products_master');
  };

  const handleExportCustomers = () => {
    const data = (customers || []).map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      gstNo: c.gstNo,
      businessAddress: c.businessAddress
    }));
    exportToCSV(data, ['id', 'name', 'phone', 'gstNo', 'businessAddress'], 'customers_master');
  };

  const handleImportProducts = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let imported: any[] = [];
        if (file.name.endsWith('.json')) {
          imported = JSON.parse(text);
        } else {
          imported = parseCSV(text);
        }
        
        let count = 0;
        let skipCount = 0;
        imported.forEach((item: any) => {
          const norm = normalizeProductMaster(item);
          if (!norm.vigat) {
            skipCount++;
            return;
          }
          const dup = (products || []).some(
            p => p.id === norm.id || p.vigat.trim().toLowerCase() === norm.vigat.trim().toLowerCase()
          );
          if (dup) {
            skipCount++;
            return;
          }
          saveProduct(norm);
          count++;
        });
        toast.success(`Imported ${count} products successfully. Skipped ${skipCount} duplicates/invalid records.`);
      } catch (err) {
        toast.error("Failed to parse import file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportCustomers = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let imported: any[] = [];
        if (file.name.endsWith('.json')) {
          imported = JSON.parse(text);
        } else {
          imported = parseCSV(text);
        }
        
        let count = 0;
        let skipCount = 0;
        imported.forEach((item: any) => {
          const norm = normalizeCustomerMaster(item);
          if (!norm.name) {
            skipCount++;
            return;
          }
          const dup = (customers || []).some(
            c => c.id === norm.id || c.name.trim().toLowerCase() === norm.name.trim().toLowerCase() || (c.phone && c.phone === norm.phone)
          );
          if (dup) {
            skipCount++;
            return;
          }
          saveCustomer(norm);
          count++;
        });
        toast.success(`Imported ${count} customers successfully. Skipped ${skipCount} duplicates/invalid records.`);
      } catch (err) {
        toast.error("Failed to parse import file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodVigat.trim()) {
      toast.error('Product Description is required');
      return;
    }
    if (prodRate <= 0) {
      toast.error('Product Rate must be greater than 0');
      return;
    }
    const duplicateVigat = (products || []).some(
      p => p.id !== prodId && p.vigat.trim().toLowerCase() === prodVigat.trim().toLowerCase()
    );
    if (duplicateVigat) {
      toast.error(`Product name "${prodVigat}" is already registered.`);
      return;
    }
    const targetId = prodId || Math.random().toString(36).substring(2, 9);
    const existing = (products || []).find(p => p.id === targetId);
    const productionCost = existing ? existing.productionCost : 0;
    const bom = existing ? existing.bom : [];

    saveProduct({
      id: targetId,
      vigat: prodVigat.trim(),
      rate: prodRate,
      hsnCode: prodHsn.trim() || '5609',
      stock: BigInt(prodStock),
      productionCost,
      bom
    }, {
      onSuccess: () => {
        toast.success(editingProd ? 'Product updated successfully' : 'Product added successfully');
        setProdId('');
        setProdVigat('');
        setProdRate(0);
        setProdHsn('5609');
        setProdStock(0);
        setEditingProd(null);
      },
      onError: (err) => {
        toast.error('Failed to save product: ' + err.message);
      }
    });
  };

  const handleSaveCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) {
      toast.error('Customer Name is required');
      return;
    }
    if (!custAddress.trim()) {
      toast.error('Customer Address is required');
      return;
    }
    const phoneRegex = /^[0-9\s,+-]{10,25}$/;
    if (!phoneRegex.test(custPhone.trim())) {
      toast.error('Please enter a valid Phone Number');
      return;
    }
    if (custGst.trim()) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
      if (!gstRegex.test(custGst.trim())) {
        toast.error('Please enter a valid 15-character GSTIN');
        return;
      }
    }
    const duplicateName = (customers || []).some(
      c => c.id !== custId && c.name.trim().toLowerCase() === custName.trim().toLowerCase()
    );
    if (duplicateName) {
      toast.error(`Customer name "${custName}" is already registered.`);
      return;
    }
    if (custPhone.trim()) {
      const duplicatePhone = (customers || []).some(
        c => c.id !== custId && c.phone && c.phone.trim() === custPhone.trim()
      );
      if (duplicatePhone) {
        toast.error(`Phone number "${custPhone}" is already registered.`);
        return;
      }
    }
    const targetId = custId || custName.trim();
    saveCustomer({
      id: targetId,
      name: custName.trim(),
      businessAddress: custAddress.trim(),
      phone: custPhone.trim(),
      gstNo: custGst.trim()
    }, {
      onSuccess: () => {
        toast.success(editingCust ? 'Customer updated successfully' : 'Customer added successfully');
        setCustId('');
        setCustName('');
        setCustAddress('');
        setCustPhone('');
        setCustGst('');
        setEditingCust(null);
      },
      onError: (err) => {
        toast.error('Failed to save customer: ' + err.message);
      }
    });
  };

  const handleEditProduct = (prod: any) => {
    setProdId(prod.id);
    setProdVigat(prod.vigat);
    setProdRate(prod.rate);
    setProdHsn(prod.hsnCode);
    setProdStock(Number(prod.stock));
    setEditingProd(prod.id);
  };

  const handleEditCustomer = (cust: any) => {
    setCustId(cust.id);
    setCustName(cust.name);
    setCustAddress(cust.businessAddress);
    setCustPhone(cust.phone);
    setCustGst(cust.gstNo);
    setEditingCust(cust.id);
  };

  const isMasterAdmin = isAdmin;
  const canAccessSettings = isAdmin || isManager;

  // Redirection guard for non-admins
  useEffect(() => {
    if (!canAccessSettings) {
      toast.error('Unauthorized access. Redirected to safe zone.');
      navigate({ to: '/unauthorized', replace: true });
    }
  }, [canAccessSettings, navigate]);

  // Handle settings data loaded from backend
  useEffect(() => {
    if (settings) {
      if (settings.businessInfo) {
        const { name, address, phone, gst } = parseBusinessInfo(settings.businessInfo);
        setBusinessName(name);
        setBusinessAddress(address);
        setBusinessPhone(phone);
        setBusinessGst(gst);
      }
      setDefaultGstRate(settings.defaultGstRate || 0);
      setTermsAndConditions(settings.termsAndConditions || '');
      setAllowStaffCollection(settings.allowStaffCollection !== undefined ? settings.allowStaffCollection : true);
      setEnableRejectedWage(settings.enableRejectedWage !== undefined ? settings.enableRejectedWage : false);
      setAllowAdminBackupRestore(settings.allowAdminBackupRestore !== undefined ? settings.allowAdminBackupRestore : false);
      setEnableAutoStockAlerts(settings.enableAutoStockAlerts !== undefined ? settings.enableAutoStockAlerts : true);
      setAlertFrequency(settings.alertFrequency || 'Once per day');
      setLowStockAlertThreshold(settings.lowStockAlertThreshold !== undefined ? settings.lowStockAlertThreshold : 10);
      setCostingMethod((settings as any).costingMethod || 'WeightedAverage');
      setDefaultPaymentTerms((settings as any).defaultPaymentTerms || 'Net 30');
      setCompanyLogo(settings.companyLogo || '');
      setCompanyNameState(settings.companyName || '');
      setThemeColors(settings.themeColors || 'maroon-saffron');
      setSidebarStyle(settings.sidebarStyle || 'Minimalist');
    }
  }, [settings]);

  // Live cryptographic principal derivation helper
  useEffect(() => {
    if (authMethod === 'password' && newUsername.trim() && newPassword) {
      const delayDebounce = setTimeout(() => {
        deriveIdentity(newUsername.trim(), newPassword)
          .then((ident) => {
            setDerivedPrincipalText(ident.getPrincipal().toString());
          })
          .catch((err) => {
            console.error('Error deriving principal:', err);
            setDerivedPrincipalText('');
          });
      }, 300);
      return () => clearTimeout(delayDebounce);
    } else {
      setDerivedPrincipalText('');
    }
  }, [authMethod, newUsername, newPassword]);

  if (!canAccessSettings) {
    return null; // Let the useEffect redirect
  }

  // Unified save settings action
  const performSave = (
    successMessage = 'Settings updated successfully!',
    customAllowStaff = allowStaffCollection,
    customEnableWage = enableRejectedWage,
    customLogo = companyLogo,
    customCompName = companyNameState,
    customTheme = themeColors,
    customSidebar = sidebarStyle,
    customAllowBackup = allowAdminBackupRestore,
    customEnableAutoAlerts = enableAutoStockAlerts,
    customAlertFreq = alertFrequency,
    customThreshold = lowStockAlertThreshold,
    customCosting = costingMethod,
    customPaymentTerms = defaultPaymentTerms
  ) => {
    const businessInfo = `${businessName.trim()}|${businessAddress.trim()}|${businessPhone.trim()}|${businessGst.trim()}`;
    
    saveSettings(
      {
        businessInfo,
        defaultGstRate,
        termsAndConditions,
        allowStaffCollection: customAllowStaff,
        enableRejectedWage: customEnableWage,
        companyLogo: customLogo,
        companyName: customCompName,
        themeColors: customTheme,
        sidebarStyle: customSidebar,
        allowAdminBackupRestore: customAllowBackup,
        enableAutoStockAlerts: customEnableAutoAlerts,
        alertFrequency: customAlertFreq,
        lowStockAlertThreshold: customThreshold,
        costingMethod: customCosting,
        defaultPaymentTerms: customPaymentTerms,
      } as any,
      {
        onSuccess: () => {
          toast.success(successMessage);
          localStorage.setItem('businessAddress', businessAddress.trim());
          localStorage.setItem('businessPhone', businessPhone.trim());
          localStorage.setItem('businessGst', businessGst.trim());
        },
        onError: (error) => {
          toast.error('Failed to save settings: ' + error.message);
        },
      }
    );
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      toast.error('Logo file size must be less than 1.5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setCompanyLogo(base64String);
      toast.success('Logo uploaded and preview generated!');
    };
    reader.onerror = () => {
      toast.error('Failed to read logo file');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = () => {
    performSave('Branding and Theme settings saved successfully!');
  };

  // Section 1: Business Profile Save & Validation
  const handleSaveBusinessProfile = () => {
    if (!businessName.trim()) {
      toast.error('Business Name is required');
      return;
    }
    if (!businessAddress.trim()) {
      toast.error('Business Address is required');
      return;
    }
    // Indian Phone format validation: 10 to 12 digits, spaces/dashes/comma separated
    const phoneRegex = /^[0-9\s,+-]{10,25}$/;
    if (!phoneRegex.test(businessPhone.trim())) {
      toast.error('Please enter a valid Phone Number (minimum 10 digits)');
      return;
    }
    // GST number validation (15 character standard alpha-numeric format)
    if (businessGst.trim()) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
      if (!gstRegex.test(businessGst.trim())) {
        toast.error('Please enter a valid 15-character GSTIN format (e.g. 24APYPP8111N1Z4)');
        return;
      }
    }
    performSave('Business Profile updated successfully!');
  };

  // Section 2: Calculation Settings Save & Validation
  const handleSaveCalculations = () => {
    if (defaultGstRate < 0 || defaultGstRate > 100) {
      toast.error('Default GST rate must be between 0% and 100%');
      return;
    }
    performSave('Invoice calculation parameters updated!');
  };

  // Section 3: Terms Statement Save
  const handleSaveTerms = () => {
    performSave('Terms & Conditions updated!');
  };

  const handleNewUserPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error('Photo must be less than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewProfilePhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // User Creation Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Please enter user Display Name');
      return;
    }

    // Validate email
    if (!newEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error('Please enter a valid Email Address');
      return;
    }

    // Validate mobile
    if (!newMobile.trim()) {
      toast.error('Mobile Number is required');
      return;
    }
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(newMobile.trim())) {
      toast.error('Mobile Number must be exactly 10 digits');
      return;
    }

    let targetPrincipalText = '';
    let targetUsernameText = '';
    let passwordHashHex = '';

    if (authMethod === 'password') {
      const trimmedUser = newUsername.trim();
      if (!trimmedUser) {
        toast.error('Please enter a Username');
        return;
      }
      if (!newPassword) {
        toast.error('Please enter a Password');
        return;
      }
      const strength = isStrongPassword(newPassword);
      if (!strength.isValid) {
        toast.error(strength.message);
        return;
      }
      const confirmPass = window.prompt("Confirm the password for the new user:");
      if (newPassword !== confirmPass) {
        toast.error("Password confirmation does not match.");
        return;
      }
      if (!derivedPrincipalText) {
        toast.error('Please wait for cryptographic principal derivation to complete');
        return;
      }
      targetPrincipalText = derivedPrincipalText;
      targetUsernameText = trimmedUser.toLowerCase();

      // Compute seed bytes & hex for storing
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest(
        'SHA-256', 
        encoder.encode(`${targetUsernameText.toLowerCase()}:${newPassword}`)
      );
      const seedBytes = new Uint8Array(hashBuffer);
      passwordHashHex = Array.from(seedBytes).map(x => ('00' + x.toString(16)).slice(-2)).join('');
    } else {
      // Internet Identity flow
      if (!newPrincipal.trim()) {
        toast.error('Please enter the user\'s Internet Identity Principal ID');
        return;
      }
      targetPrincipalText = newPrincipal.trim();
      // Derive a dummy/placeholder username from their principal
      targetUsernameText = newUsername.trim() || `ii_${targetPrincipalText.substring(0, 5)}`;
    }
    if (newRole === 'Admin') {
      const existingMasterAdmin = usersList?.find((u: any) => u.role && 'Admin' in u.role);
      if (existingMasterAdmin) {
        toast.error('Security Policy Violation: Only one Master Admin is allowed.');
        return;
      }
    }

    createUser(
      {
        principalText: targetPrincipalText,
        name: newName.trim(),
        username: targetUsernameText,
        roleText: newRole,
        email: newEmail.trim(),
        mobile: newMobile.trim(),
        address: newAddress.trim(),
        profilePhoto: newProfilePhoto,
        status: 'Active',
        passwordHash: passwordHashHex
      },
      {
        onSuccess: () => {
          if (newRole === 'Staff' && linkedEmployeeId) {
            localStorage.setItem(`staff_employee_link_${targetUsernameText.toLowerCase()}`, linkedEmployeeId);
            const selectedEmp = employeesList.find((e: any) => e.id === linkedEmployeeId);
            if (selectedEmp) {
              localStorage.setItem(`staff_employee_name_${targetUsernameText.toLowerCase()}`, selectedEmp.name);
            }
          }
          toast.success('User created successfully');
          // Reset form
          setNewName('');
          setNewUsername('');
          setNewPassword('');
          setNewEmail('');
          setNewMobile('');
          setNewAddress('');
          setNewProfilePhoto('');
          setNewPrincipal('');
          setLinkedEmployeeId('');
        },
        onError: (error) => {
          toast.error('Failed to register user: ' + error.message);
        },
      }
    );
  };

  const handleToggleStatus = (principalText: string, currentStatus: string) => {
    const targetUser = usersList?.find((u: any) => u.principalId.toString() === principalText);
    if (targetUser && targetUser.role && 'Admin' in targetUser.role) {
      toast.error('Security Policy Violation: Master Admin cannot be modified.');
      return;
    }
    const nextStatus = currentStatus === 'Deactivated' ? 'Active' : 'Deactivated';
    toggleUserStatus({ principalText, status: nextStatus }, {
      onSuccess: () => {
        toast.success(`User status updated to ${nextStatus}`);
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to update user status');
      }
    });
  };

  const handleExportBackup = async () => {
    if (!actor) return;
    try {
      const backup = await actor.exportDatabase();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `erp_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Database backup exported successfully!");
    } catch (e: any) {
      toast.error("Failed to export backup: " + e.message);
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!actor) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm("Are you sure you want to restore the database? This will overwrite all current system data!");
    if (!confirmRestore) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        await actor.importDatabase(json);
        toast.success("Database restored successfully!");
        window.location.reload();
      } catch (err: any) {
        toast.error("Failed to restore database: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleResetPassword = async (principalText: string, username: string) => {
    const newPass = window.prompt(`Enter new password for @${username}:`);
    if (!newPass) return;
    const strength = isStrongPassword(newPass);
    if (!strength.isValid) {
      toast.error(strength.message);
      return;
    }
    const confirmPass = window.prompt(`Confirm new password for @${username}:`);
    if (newPass !== confirmPass) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const derived = await deriveIdentity(username, newPass);
      const newPrincipal = derived.getPrincipal().toString();
      
      // Compute seed bytes & hex for storing
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest(
        'SHA-256', 
        encoder.encode(`${username.toLowerCase()}:${newPass}`)
      );
      const seedBytes = new Uint8Array(hashBuffer);
      const hashHex = Array.from(seedBytes).map(x => ('00' + x.toString(16)).slice(-2)).join('');

      adminResetPassword({ principalText, newPrincipalId: newPrincipal, newPasswordHash: hashHex }, {
        onSuccess: () => {
          toast.success(`Password reset successfully for @${username}`);
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to reset password');
        }
      });
    } catch (e) {
      toast.error('Cryptographic derivation failed');
    }
  };

  const handleDeleteUser = (principalText: string) => {
    const targetUser = usersList?.find((u: any) => u.principalId.toString() === principalText);
    if (targetUser && targetUser.role && 'Admin' in targetUser.role) {
      toast.error('Security Policy Violation: Master Admin cannot be modified.');
      return;
    }
    deleteUser(principalText, {
      onSuccess: () => {
        toast.success('User deleted successfully');
      },
      onError: (error) => {
        toast.error('Failed to delete user: ' + error.message);
      },
    });
  };

  const handleStartEditUser = (usr: any) => {
    const roleVal = usr?.role ? ('Admin' in usr.role ? 'Admin' : ('Manager' in usr.role ? 'Manager' : 'Staff')) : 'Staff';
    setEditingUser(usr);
    setEditName(usr.name);
    setEditUsername(usr.username || '');
    setEditEmail(usr.email || '');
    setEditMobile(usr.mobile || '');
    setEditRole(roleVal);
    setEditStatus(usr.status || 'Active');
    const linked = localStorage.getItem(`staff_employee_link_${(usr.username || '').toLowerCase()}`) || '';
    setEditLinkedEmployeeId(linked);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!editUsername.trim()) {
      toast.error('Username is required');
      return;
    }

    // Validate email
    if (!editEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail.trim())) {
      toast.error('Please enter a valid Email Address');
      return;
    }

    // Validate mobile
    if (!editMobile.trim()) {
      toast.error('Mobile Number is required');
      return;
    }
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(editMobile.trim())) {
      toast.error('Mobile Number must be exactly 10 digits');
      return;
    }

    const isEditingMasterAdmin = !!(editingUser?.role && 'Admin' in editingUser.role);
    if (isEditingMasterAdmin) {
      if (editRole !== 'Admin' || editStatus !== 'Active' || editName.trim() !== 'Vatsal Dholariya' || editUsername.trim().toLowerCase() !== 'admin') {
        toast.error('Security Policy Violation: Master Admin cannot be modified.');
        return;
      }
    } else {
      if (editRole === 'Admin') {
        const existingMasterAdmin = usersList?.find((u: any) => u.role && 'Admin' in u.role);
        if (existingMasterAdmin) {
          toast.error('Security Policy Violation: Only one Master Admin is allowed.');
          return;
        }
      }
    }

    editUser({
      principalText: editingUser.principalId.toString(),
      name: editName.trim(),
      username: editUsername.trim().toLowerCase(),
      email: editEmail.trim(),
      mobile: editMobile.trim(),
      roleText: editRole,
      status: editStatus
    }, {
      onSuccess: () => {
        if (editRole === 'Staff') {
          localStorage.setItem(`staff_employee_link_${editUsername.trim().toLowerCase()}`, editLinkedEmployeeId);
          const selectedEmp = employeesList.find((e: any) => e.id === editLinkedEmployeeId);
          if (selectedEmp) {
            localStorage.setItem(`staff_employee_name_${editUsername.trim().toLowerCase()}`, selectedEmp.name);
          }
        } else {
          localStorage.removeItem(`staff_employee_link_${editUsername.trim().toLowerCase()}`);
          localStorage.removeItem(`staff_employee_name_${editUsername.trim().toLowerCase()}`);
        }
        toast.success('User updated successfully');
        setEditingUser(null);
      },
      onError: (err) => {
        toast.error('Failed to update user: ' + err.message);
      }
    });
  };

  // Filter audit logs by text & category
  const filteredLogs = logs?.filter(log => {
    const filterLower = logFilter.toLowerCase();
    const matchesSearch = (
      log.action.toLowerCase().includes(filterLower) ||
      (log.userName || '').toLowerCase().includes(filterLower) ||
      (log.details || '').toLowerCase().includes(filterLower) ||
      (log.userPrincipal || '').toLowerCase().includes(filterLower)
    );

    if (!matchesSearch) return false;

    // Filter by action category
    if (logCategoryFilter === 'sessions') {
      if (!(log.action === 'User login' || log.action === 'User logout' || log.action === 'Login' || log.action === 'Logout')) return false;
    }
    if (logCategoryFilter === 'invoices') {
      if (!log.action.includes('Invoice')) return false;
    }
    if (logCategoryFilter === 'settings') {
      if (!(log.action.includes('Settings') || log.action === 'User updated')) return false;
    }
    if (logCategoryFilter === 'users') {
      if (!(log.action.includes('User') || log.action === 'Role changed' || log.action === 'Password changed' || log.action === 'System Bootstrap')) return false;
    }
    if (logCategoryFilter === 'stock') {
      const act = log.action.toLowerCase();
      const det = (log.details || '').toLowerCase();
      if (!(act.includes('stock') || act.includes('reconciliation') || act.includes('inventory') || act.includes('bom') || act.includes('adjust') || det.includes('stock') || det.includes('bom') || det.includes('adjust'))) return false;
    }
    if (logCategoryFilter === 'purchases') {
      const act = log.action.toLowerCase();
      const det = (log.details || '').toLowerCase();
      if (!(act.includes('purchase') || act.includes('vendor') || act.includes('po') || det.includes('purchase') || det.includes('vendor') || det.includes('po'))) return false;
    }
    if (logCategoryFilter === 'production') {
      const act = log.action.toLowerCase();
      const det = (log.details || '').toLowerCase();
      if (!(act.includes('production') || act.includes('job') || act.includes('collection') || act.includes('qc') || act.includes('grade') || det.includes('production') || det.includes('job') || det.includes('collection') || det.includes('qc'))) return false;
    }
    if (logCategoryFilter === 'finance') {
      const act = log.action.toLowerCase();
      const det = (log.details || '').toLowerCase();
      if (!(act.includes('ledger') || act.includes('payment') || act.includes('expense') || act.includes('outstanding') || det.includes('ledger') || det.includes('payment') || det.includes('expense') || det.includes('outstanding'))) return false;
    }
    if (logCategoryFilter === 'master_data') {
      const act = log.action.toLowerCase();
      const det = (log.details || '').toLowerCase();
      if (!(act.includes('customer') || act.includes('product') || act.includes('vendor') || act.includes('raw material') || det.includes('customer') || det.includes('product') || det.includes('vendor') || det.includes('raw material') || act.includes('mdm') || det.includes('mdm'))) return false;
    }

    // Module Filter
    if (filterModule !== 'all') {
      const logModule = log.module || 'ERP';
      if (logModule !== filterModule) return false;
    }

    // Action Filter
    if (filterAction !== 'all') {
      if (log.action !== filterAction) return false;
    }

    // Username Filter
    if (filterUsername.trim() !== '') {
      const logUsername = (log.operator || log.userName || '').toLowerCase();
      if (!logUsername.includes(filterUsername.toLowerCase())) return false;
    }

    // Date Filter
    if (filterDate !== '') {
      const ms = Number(log.timestamp / 1000000n);
      const logDateObj = new Date(ms);
      const logDateString = logDateObj.toISOString().split('T')[0];
      if (logDateString !== filterDate) return false;
    }

    return true;
  }) || [];

  const showLoadingSkeleton = isLoadingSettings || isLoadingUsers || isLoadingLogs || isLoadingProducts || isLoadingCustomers;

  if (showLoadingSkeleton) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 px-4 py-6">
        <h1 className="text-3xl font-extrabold text-maroon dark:text-saffron">Settings & Administration</h1>
        <Card className="border-2 border-gold shadow-md">
          <CardContent className="pt-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-maroon dark:text-saffron tracking-tight">Settings & Administration</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Configure business defaults, audit registry logs, and manage user roles.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        navigate({ search: { tab: value } as any });
      }} className="w-full">
        {/* Equal width premium tabs triggers, responsive layout */}
        <TabsList className="flex flex-col sm:flex-row w-full bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 gap-1.5 sm:gap-2 mb-8 h-auto">
          {(isAdmin || (isManager && settings?.allowAdminBackupRestore)) && (
            <TabsTrigger 
              value="general" 
              className="w-full sm:flex-1 py-3 px-4 font-bold rounded-lg text-slate-600 dark:text-slate-400 data-[state=active]:bg-maroon data-[state=active]:text-white data-[state=active]:shadow transition-all text-sm flex items-center justify-center gap-2 border border-transparent data-[state=active]:border-gold/30"
            >
              <FileSpreadsheet className="h-4 w-4" />
              General Settings
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger 
              value="branding" 
              className="w-full sm:flex-1 py-3 px-4 font-bold rounded-lg text-slate-600 dark:text-slate-400 data-[state=active]:bg-maroon data-[state=active]:text-white data-[state=active]:shadow transition-all text-sm flex items-center justify-center gap-2 border border-transparent data-[state=active]:border-gold/30"
            >
              <Palette className="h-4 w-4" />
              Theme & Branding
            </TabsTrigger>
          )}
          {canManageStaff && (
            <TabsTrigger 
              value="users" 
              className="w-full sm:flex-1 py-3 px-4 font-bold rounded-lg text-slate-600 dark:text-slate-400 data-[state=active]:bg-maroon data-[state=active]:text-white data-[state=active]:shadow transition-all text-sm flex items-center justify-center gap-2 border border-transparent data-[state=active]:border-gold/30"
            >
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger 
              value="logs" 
              className="w-full sm:flex-1 py-3 px-4 font-bold rounded-lg text-slate-600 dark:text-slate-400 data-[state=active]:bg-maroon data-[state=active]:text-white data-[state=active]:shadow transition-all text-sm flex items-center justify-center gap-2 border border-transparent data-[state=active]:border-gold/30"
            >
              <History className="h-4 w-4" />
              Activity Logs
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger 
              value="products" 
              className="w-full sm:flex-1 py-3 px-4 font-bold rounded-lg text-slate-600 dark:text-slate-400 data-[state=active]:bg-maroon data-[state=active]:text-white data-[state=active]:shadow transition-all text-sm flex items-center justify-center gap-2 border border-transparent data-[state=active]:border-gold/30"
            >
              <Database className="h-4 w-4" />
              Product Inventory
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger 
              value="customers" 
              className="w-full sm:flex-1 py-3 px-4 font-bold rounded-lg text-slate-600 dark:text-slate-400 data-[state=active]:bg-maroon data-[state=active]:text-white data-[state=active]:shadow transition-all text-sm flex items-center justify-center gap-2 border border-transparent data-[state=active]:border-gold/30"
            >
              <Users className="h-4 w-4" />
              Customer Accounts
            </TabsTrigger>
          )}
          <TabsTrigger 
            value="raw-materials" 
            className="w-full sm:flex-1 py-3 px-4 font-bold rounded-lg text-slate-600 dark:text-slate-400 data-[state=active]:bg-maroon data-[state=active]:text-white data-[state=active]:shadow transition-all text-sm flex items-center justify-center gap-2 border border-transparent data-[state=active]:border-gold/30"
          >
            <Sparkles className="h-4 w-4" />
            Raw Materials
          </TabsTrigger>
          {(isAdmin || isManager) && (
            <TabsTrigger 
              value="vendors" 
              className="w-full sm:flex-1 py-3 px-4 font-bold rounded-lg text-slate-600 dark:text-slate-400 data-[state=active]:bg-maroon data-[state=active]:text-white data-[state=active]:shadow transition-all text-sm flex items-center justify-center gap-2 border border-transparent data-[state=active]:border-gold/30"
            >
              <Building2 className="h-4 w-4" />
              Vendor Accounts
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: General Settings */}
        {(isAdmin || (isManager && settings?.allowAdminBackupRestore)) && (
          <TabsContent value="general" className="space-y-8 mt-4 outline-none">
            {isAdmin && (
              <>
          {/* Card 1.1: Business Info */}
          <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
            <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
              <CardTitle className="text-maroon dark:text-saffron flex items-center gap-2">
                <span>Business Profile Information</span>
              </CardTitle>
              <CardDescription>Configure credentials printed on customer invoice headers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. GUJARAT ART & CRAFTS"
                  className="border-gold focus:ring-saffron"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessAddress" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Business Address</Label>
                <Input
                  id="businessAddress"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="e.g. A/26-27, Shreeram Park, Ahmedabad-382350."
                  className="border-gold focus:ring-saffron"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="businessPhone" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Phone Number</Label>
                  <Input
                    id="businessPhone"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    placeholder="e.g. 9824434096, 9824092261"
                    className="border-gold focus:ring-saffron"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessGst" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">GSTIN Number</Label>
                  <Input
                    id="businessGst"
                    value={businessGst}
                    onChange={(e) => setBusinessGst(e.target.value)}
                    placeholder="e.g. 24APYPP8111N1Z4"
                    className="border-gold focus:ring-saffron"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t border-gold/10">
                <Button
                  onClick={handleSaveBusinessProfile}
                  disabled={isSavingSettings}
                  className="bg-maroon hover:bg-maroon/90 text-white font-semibold border border-gold/30 shadow-sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Business Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 1.2: Default Tax Calculations */}
          <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
            <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
              <CardTitle className="text-maroon dark:text-saffron">Invoice Default Calculations</CardTitle>
              <CardDescription>Default tax percentages automatically loaded into newly drafted invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-2 max-w-sm">
                <Label htmlFor="defaultGstRate" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Default GST Rate (%)</Label>
                <div className="relative rounded-md shadow-sm">
                  <Input
                    id="defaultGstRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={defaultGstRate || ''}
                    onChange={(e) => setDefaultGstRate(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 5"
                    className="border-gold focus:ring-saffron pr-12"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t border-gold/10">
                <Button
                  onClick={handleSaveCalculations}
                  disabled={isSavingSettings}
                  className="bg-maroon hover:bg-maroon/90 text-white font-semibold border border-gold/30 shadow-sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save GST Default
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 1.3: Terms and Conditions Statement */}
          <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
            <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
              <CardTitle className="text-maroon dark:text-saffron">Terms & Conditions Statement</CardTitle>
              <CardDescription>Legal disclosures printed at the footer of invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-2">
                <Label htmlFor="termsAndConditions" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Terms & Conditions</Label>
                <Textarea
                  id="termsAndConditions"
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="List conditions..."
                  rows={6}
                  className="border-gold focus:ring-saffron font-sans"
                />
              </div>
              <div className="flex justify-end pt-2 border-t border-gold/10">
                <Button
                  onClick={handleSaveTerms}
                  disabled={isSavingSettings}
                  className="bg-maroon hover:bg-maroon/90 text-white font-semibold border border-gold/30 shadow-sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Terms & Conditions
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 1.4: Production & Karigar Settings */}
          <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
            <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
              <CardTitle className="text-maroon dark:text-saffron">Production & Karigar Settings</CardTitle>
              <CardDescription>Configure wages and authorization rules for artisan production collection.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center space-x-3">
                <input
                  id="allowStaffCollection"
                  type="checkbox"
                  checked={allowStaffCollection}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setAllowStaffCollection(val);
                    performSave('Staff collection permission updated!', val, enableRejectedWage);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon accent-maroon cursor-pointer"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="allowStaffCollection"
                    className="text-sm font-semibold text-gray-950 dark:text-gray-50 cursor-pointer"
                  >
                    Allow Staff Collection Entry
                  </label>
                  <p className="text-xs text-gray-500">
                    If checked, staff users can log returned artisan production batches. If unchecked, only admins/managers can log collections.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  id="enableRejectedWage"
                  type="checkbox"
                  checked={enableRejectedWage}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setEnableRejectedWage(val);
                    performSave('Rejected quantity wage settings updated!', allowStaffCollection, val, companyLogo, companyNameState, themeColors, sidebarStyle, allowAdminBackupRestore);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon accent-maroon cursor-pointer"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="enableRejectedWage"
                    className="text-sm font-semibold text-gray-950 dark:text-gray-50 cursor-pointer"
                  >
                    Enable Wages for Rejected Quantities
                  </label>
                  <p className="text-xs text-gray-500">
                    If checked, piece-rate wages calculation will include rejected pieces. By default, wages are paid only for accepted pieces.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  id="allowAdminBackupRestore"
                  type="checkbox"
                  checked={allowAdminBackupRestore}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setAllowAdminBackupRestore(val);
                    performSave('Admin Backup & Restore permission updated!', allowStaffCollection, enableRejectedWage, companyLogo, companyNameState, themeColors, sidebarStyle, val);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon accent-maroon cursor-pointer"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="allowAdminBackupRestore"
                    className="text-sm font-semibold text-gray-950 dark:text-gray-50 cursor-pointer"
                  >
                    Allow Admin (Manager) Backup & Restore
                  </label>
                  <p className="text-xs text-gray-500">
                    If checked, Admin (Manager) users are allowed to export and import backups of the ERP database. If unchecked, only Master Admin can perform backup/restore.
                  </p>
                </div>
              </div>
             </CardContent>
          </Card>

          {/* Card 1.5: WhatsApp & Low Stock Alerts */}
          <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95 mt-5">
            <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
              <CardTitle className="text-maroon dark:text-saffron">WhatsApp & Low Stock Alerts</CardTitle>
              <CardDescription>Configure stock shortage rules, check frequency, and WhatsApp target alert settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center space-x-3">
                <input
                  id="enableAutoStockAlerts"
                  type="checkbox"
                  checked={enableAutoStockAlerts}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setEnableAutoStockAlerts(val);
                    performSave('Auto stock alerts settings updated!', allowStaffCollection, enableRejectedWage, companyLogo, companyNameState, themeColors, sidebarStyle, allowAdminBackupRestore, val);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon accent-maroon cursor-pointer"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="enableAutoStockAlerts"
                    className="text-sm font-semibold text-gray-950 dark:text-gray-50 cursor-pointer"
                  >
                    Enable Automatic WhatsApp Stock Alerts
                  </label>
                  <p className="text-xs text-gray-500">
                    If checked, the ERP automatically checks stock levels and logs a stock alert notification when items fall below thresholds.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="alertFrequency" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Alert Frequency</Label>
                  <Select
                    value={alertFrequency}
                    onValueChange={(val) => {
                      setAlertFrequency(val);
                      performSave('Alert frequency settings updated!', allowStaffCollection, enableRejectedWage, companyLogo, companyNameState, themeColors, sidebarStyle, allowAdminBackupRestore, enableAutoStockAlerts, val);
                    }}
                  >
                    <SelectTrigger className="border-gold focus:ring-saffron bg-white dark:bg-gray-800">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gold">
                      <SelectItem value="Once per day">Once per day (Deduplicated)</SelectItem>
                      <SelectItem value="Every time">Every time (No deduplication)</SelectItem>
                      <SelectItem value="Manual only">Manual only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lowStockAlertThreshold" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Low Stock Threshold</Label>
                  <Input
                    id="lowStockAlertThreshold"
                    type="number"
                    min="1"
                    value={lowStockAlertThreshold}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setLowStockAlertThreshold(val);
                      performSave('Low stock threshold updated!', allowStaffCollection, enableRejectedWage, companyLogo, companyNameState, themeColors, sidebarStyle, allowAdminBackupRestore, enableAutoStockAlerts, alertFrequency, val);
                    }}
                    className="border-gold focus:ring-saffron"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 1.6: Raw Material Costing & Payment Terms */}
          <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95 mt-5">
            <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
              <CardTitle className="text-maroon dark:text-saffron">Inventory Costing & Payment Terms</CardTitle>
              <CardDescription>Configure raw material costing methods and default billing payment terms.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="costingMethod" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Raw Material Costing Valuation</Label>
                  <Select
                    value={costingMethod}
                    onValueChange={(val) => {
                      setCostingMethod(val);
                      performSave('Costing method updated!', allowStaffCollection, enableRejectedWage, companyLogo, companyNameState, themeColors, sidebarStyle, allowAdminBackupRestore, enableAutoStockAlerts, alertFrequency, lowStockAlertThreshold, val, defaultPaymentTerms);
                    }}
                  >
                    <SelectTrigger className="border-gold focus:ring-saffron bg-white dark:bg-gray-800">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gold">
                      <SelectItem value="WeightedAverage">Weighted Average (Default)</SelectItem>
                      <SelectItem value="Standard">Standard Costing</SelectItem>
                      <SelectItem value="FIFO">FIFO (First-In, First-Out)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultPaymentTerms" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Default Billing Payment Terms</Label>
                  <Select
                    value={defaultPaymentTerms}
                    onValueChange={(val) => {
                      setDefaultPaymentTerms(val);
                      performSave('Default payment terms updated!', allowStaffCollection, enableRejectedWage, companyLogo, companyNameState, themeColors, sidebarStyle, allowAdminBackupRestore, enableAutoStockAlerts, alertFrequency, lowStockAlertThreshold, costingMethod, val);
                    }}
                  >
                    <SelectTrigger className="border-gold focus:ring-saffron bg-white dark:bg-gray-800">
                      <SelectValue placeholder="Select terms" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gold">
                      <SelectItem value="Cash">Cash / Due on Receipt</SelectItem>
                      <SelectItem value="Net 15">Net 15 Days</SelectItem>
                      <SelectItem value="Net 30">Net 30 Days (Default)</SelectItem>
                      <SelectItem value="Net 60">Net 60 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          </>
        )}

        {/* Database Backup & Restore Card */}
        <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95 mt-8">
          <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
            <CardTitle className="text-maroon dark:text-saffron flex items-center gap-2">
              <Database className="h-5 w-5 text-saffron" /> Database Backup & Restore
            </CardTitle>
            <CardDescription>Export the entire ERP database to a JSON file, or restore the database from a previously saved backup file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export section */}
              <div className="p-4 border border-gold/20 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">Export Database Backup</h3>
                <p className="text-xs text-slate-500">Download a complete serialized snapshot of the ERP's data, including users, stock, transactions, and settings.</p>
                <Button onClick={handleExportBackup} className="bg-maroon hover:bg-maroon/90 text-white font-semibold w-full mt-2 border border-gold/20">
                  <Download className="h-4 w-4 mr-2" /> Export JSON Backup
                </Button>
              </div>

              {/* Import section */}
              <div className="p-4 border border-gold/20 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Restore Database Backup</h3>
                <p className="text-xs text-slate-500">Restore the ERP database from a valid JSON backup file. WARNING: This will overwrite all current system data.</p>
                <div className="flex items-center gap-3 mt-2">
                  <Input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="cursor-pointer border-gold focus:ring-saffron text-xs bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </TabsContent>
        )}

        {/* Tab: Theme & Branding */}
        {isAdmin && (
          <TabsContent value="branding" className="space-y-8 mt-4 outline-none">
          <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
            <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
              <CardTitle className="text-maroon dark:text-saffron flex items-center gap-2">
                <Palette className="h-5 w-5" />
                <span>Theme & Branding Customization</span>
              </CardTitle>
              <CardDescription>Upload custom logos, select your ERP visual styles, and update company settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Company name */}
              <div className="space-y-2">
                <Label htmlFor="companyNameInput" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Company Name (Branding)</Label>
                <Input
                  id="companyNameInput"
                  value={companyNameState}
                  onChange={(e) => setCompanyNameState(e.target.value)}
                  placeholder="e.g. Gujarat Art & Crafts"
                  className="border-gold focus:ring-saffron"
                />
              </div>

              {/* Logo upload */}
              <div className="space-y-2">
                <Label className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Company Logo</Label>
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 border border-gold/20 rounded-xl bg-slate-50 dark:bg-gray-900/50">
                  <div className="w-24 h-24 border border-gold/30 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 overflow-hidden relative">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Preview" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                  <div className="space-y-3 flex-1 w-full">
                    <div className="flex items-center justify-start gap-2">
                      <Label
                        htmlFor="logoFile"
                        className="bg-maroon hover:bg-maroon/90 text-white font-bold px-4 py-2 rounded-lg cursor-pointer text-sm shadow-sm transition-all border border-gold/20 flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Image
                      </Label>
                      <input
                        id="logoFile"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      {companyLogo && (
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => setCompanyLogo('')}
                          className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-950/30 dark:hover:bg-red-950/20 font-semibold"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Supports PNG, JPEG, GIF up to 1.5MB. Resized automatically for header integration.</p>
                  </div>
                </div>
              </div>

              {/* Theme selection */}
              <div className="space-y-3">
                <Label className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider block">Visual Color Theme</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { id: 'maroon-saffron', name: 'Gujarat Royal (Maroon & Saffron)', primary: '#800000', secondary: '#FF9933' },
                    { id: 'blue-gold', name: 'ERP Blue & Gold', primary: '#1e3a8a', secondary: '#d97706' },
                    { id: 'emerald-mint', name: 'Craft Emerald & Mint', primary: '#064e3b', secondary: '#34d399' },
                    { id: 'charcoal-rose', name: 'Modern Charcoal & Rose', primary: '#1f2937', secondary: '#f43f5e' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setThemeColors(theme.id)}
                      className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                        themeColors === theme.id
                          ? 'border-gold bg-amber-50/10 dark:bg-amber-950/10 ring-2 ring-saffron'
                          : 'border-slate-200 dark:border-slate-800 hover:border-gold/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <span className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: theme.primary }} />
                        <span className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: theme.secondary }} />
                      </div>
                      <span className="text-xs font-bold leading-tight">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar Style */}
              <div className="space-y-2">
                <Label htmlFor="sidebarStyleSelect" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Sidebar Layout Style</Label>
                <Select value={sidebarStyle} onValueChange={setSidebarStyle}>
                  <SelectTrigger id="sidebarStyleSelect" className="border-gold bg-white dark:bg-gray-800 max-w-sm">
                    <SelectValue placeholder="Select Sidebar Style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Minimalist">Minimalist (Clean White / Light Border)</SelectItem>
                    <SelectItem value="Dark Sidebar">Professional Dark (Deep Slate / Saffron Accent)</SelectItem>
                    <SelectItem value="Accent Accent">Traditional Theme Gradient (Maroon & Saffron)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-4 border-t border-gold/10">
                <Button
                  onClick={handleSaveBranding}
                  disabled={isSavingSettings}
                  className="bg-maroon hover:bg-maroon/90 text-white font-semibold border border-gold/30 shadow-sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Branding Settings
                </Button>
              </div>
             </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Tab 2: User Management */}
        <TabsContent value="users" className="space-y-8 mt-4 outline-none">
          {/* Card 2.1: Register User */}
          <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
            <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
              <CardTitle className="text-maroon dark:text-saffron">Register New Account</CardTitle>
              <CardDescription>Grant login authorization and define user access privileges.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Method select */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl pb-2">
                <Button 
                  type="button" 
                  variant={authMethod === 'password' ? 'default' : 'outline'}
                  onClick={() => setAuthMethod('password')}
                  className={authMethod === 'password' ? 'bg-maroon text-white font-bold' : 'border-gold/30'}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Password User (Derived Principal)
                </Button>
                <Button 
                  type="button" 
                  variant={authMethod === 'ii' ? 'default' : 'outline'}
                  onClick={() => setAuthMethod('ii')}
                  className={authMethod === 'ii' ? 'bg-maroon text-white font-bold' : 'border-gold/30'}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Internet Identity (II) Principal
                </Button>
              </div>

               <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="newName" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Full Name</Label>
                    <Input
                      id="newName"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Ramesh Patel"
                      className="border-gold focus:ring-saffron"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newRole" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Access Role</Label>
                    {isMasterAdmin ? (
                      <div>
                        <Select value={newRole} onValueChange={(val: any) => setNewRole(val)}>
                          <SelectTrigger id="newRole" className="border-gold bg-white dark:bg-gray-800">
                            <SelectValue placeholder="Select Role" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                            <SelectItem value="Admin" disabled={masterAdminExists}>Master Admin</SelectItem>
                            <SelectItem value="Manager">Admin</SelectItem>
                            <SelectItem value="Staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                        {masterAdminExists && (
                          <p className="text-[11px] text-amber-600 font-bold mt-1">
                            Only one Master Admin is allowed.
                          </p>
                        )}
                      </div>
                    ) : (
                      <Input
                        value="Staff"
                        disabled
                        className="bg-slate-50 dark:bg-gray-900 border-slate-200 font-bold"
                      />
                    )}
                  </div>
                </div>

                {newRole === 'Staff' && (
                  <div className="space-y-2">
                    <Label htmlFor="linkedEmployee" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Link to Artisan/Employee</Label>
                    <Select value={linkedEmployeeId} onValueChange={(val: string) => {
                      setLinkedEmployeeId(val);
                      setNewAddress(val);
                    }}>
                      <SelectTrigger id="linkedEmployee" className="border-gold bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Select Employee" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                        {employeesList.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.id})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="newEmail" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Email Address</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. ramesh@gujaratart.com"
                      className="border-gold focus:ring-saffron"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newMobile" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Mobile Number</Label>
                    <Input
                      id="newMobile"
                      value={newMobile}
                      onChange={(e) => setNewMobile(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="border-gold focus:ring-saffron"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="newAddress" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Residential Address</Label>
                    <Input
                      id="newAddress"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder="e.g. 21, Madhavpura Market, Ahmedabad"
                      className="border-gold focus:ring-saffron"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider block">Profile Photo</Label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center bg-slate-50 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                        {newProfilePhoto ? (
                          <img src={newProfilePhoto} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="w-4 h-4 text-slate-350" />
                        )}
                      </div>
                      <div className="flex-grow">
                        <Label
                          htmlFor="newPhotoFile"
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-3 py-1.5 rounded text-xs cursor-pointer border border-gold/20 inline-block"
                        >
                          Choose Photo
                        </Label>
                        <input
                          id="newPhotoFile"
                          type="file"
                          accept="image/*"
                          onChange={handleNewUserPhotoUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {authMethod === 'password' ? (
                  /* Password fields with Dynamic Derivation Preview */
                  <div className="space-y-4 border-l-2 border-maroon/20 pl-4 py-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="newUsername" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Username</Label>
                        <Input
                          id="newUsername"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="e.g. john_doe"
                          className="border-gold focus:ring-saffron"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Login Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="border-gold focus:ring-saffron"
                          required
                        />
                      </div>
                    </div>

                    {/* Live Cryptographic Preview Banner */}
                    {derivedPrincipalText && (
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-900 border border-gold/30 rounded-xl p-3 flex items-start space-x-3">
                        <Sparkles className="h-5 w-5 text-saffron mt-0.5 animate-pulse flex-shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-maroon dark:text-saffron tracking-wider">Cryptographic Identity Preview</p>
                          <p className="text-xs font-mono break-all text-gray-700 dark:text-gray-300 font-semibold mt-1">
                            {derivedPrincipalText}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1">
                            A secure, deterministic public Principal ID derived locally using Web Crypto API. Password will NOT be sent raw to the canister.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* II Principal Field */
                  <div className="space-y-4 border-l-2 border-saffron/20 pl-4 py-1">
                    <div className="space-y-2">
                      <Label htmlFor="newPrincipal" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Principal ID</Label>
                      <Input
                        id="newPrincipal"
                        value={newPrincipal}
                        onChange={(e) => setNewPrincipal(e.target.value)}
                        placeholder="e.g. 5xwtz-aaaaa-..."
                        className="border-gold focus:ring-saffron font-mono text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newUsernameII" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Username Alias (Optional)</Label>
                      <Input
                        id="newUsernameII"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="e.g. john_ii"
                        className="border-gold focus:ring-saffron"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-3">
                  <Button 
                    type="submit" 
                    disabled={isCreatingUser} 
                    className="bg-maroon hover:bg-maroon/90 text-white font-bold border border-gold/30 shadow-sm"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {isCreatingUser ? 'Registering...' : 'Register User'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Card 2.2: Registry List */}
          <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
            <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
              <CardTitle className="text-maroon dark:text-saffron">Authorized Registry Users</CardTitle>
              <CardDescription>View, inspect, or delete active billing software accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-50">
                      <TableHead className="font-bold text-maroon dark:text-saffron">Name & Username</TableHead>
                      <TableHead className="font-bold text-maroon dark:text-saffron">Principal ID</TableHead>
                      <TableHead className="font-bold text-maroon dark:text-saffron">Role</TableHead>
                      <TableHead className="font-bold text-maroon dark:text-saffron">Contact Details</TableHead>
                      <TableHead className="font-bold text-maroon dark:text-saffron">Status</TableHead>
                      <TableHead className="font-bold text-maroon dark:text-saffron">Created Date</TableHead>
                      <TableHead className="font-bold text-maroon dark:text-saffron text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersList && usersList.length > 0 ? (
                      usersList.map((usr) => {
                        const principalStr = usr.principalId.toString();
                        const formattedRegDate = formatERPDate(usr.createdAt);
                        const isSelf = principalStr === currentUser.principalId.toString();
                        
                        const isRowMasterAdmin = !!(usr.role && 'Admin' in usr.role);
                        const isRowAdmin = !!(usr.role && 'Manager' in usr.role);
                        const isRowStaff = !!(usr.role && 'Staff' in usr.role);
                        
                        const canManage = isMasterAdmin ? !isSelf : (isManager && isRowStaff);

                        const roleLabel = isRowMasterAdmin 
                          ? 'Master Admin' 
                          : isRowAdmin 
                            ? 'Admin' 
                            : 'Staff';

                        const isDeactivated = usr.status === 'Deactivated';

                        return (
                          <TableRow key={principalStr} className="hover:bg-amber-50/20 dark:hover:bg-gray-800/20">
                            <TableCell className="font-semibold text-gray-800 dark:text-white py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-900 border border-gold/20 overflow-hidden flex items-center justify-center flex-shrink-0">
                                  {usr.profilePhoto ? (
                                    <img src={usr.profilePhoto} alt={usr.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-maroon dark:text-saffron font-bold text-xs">
                                      {usr.name.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-sm leading-tight text-slate-800 dark:text-slate-100">{usr.name}</p>
                                  <p className="text-xs text-slate-500 font-semibold leading-normal">@{usr.username || 'user'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs select-all text-gray-600 dark:text-gray-400 py-4 max-w-[150px] truncate" title={principalStr}>
                              {principalStr}
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="space-y-1">
                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                                  isRowMasterAdmin 
                                    ? 'bg-red-100 text-red-800 dark:bg-red-955/40 dark:text-red-200 border border-red-200/30' 
                                    : isRowAdmin
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-955/40 dark:text-amber-200 border border-amber-200/30'
                                      : 'bg-green-100 text-green-800 dark:bg-green-955/40 dark:text-green-200 border border-green-200/30'
                                }`}>
                                  {roleLabel}
                                </span>
                                {isRowStaff && (() => {
                                  const linkedEmpId = localStorage.getItem(`staff_employee_link_${(usr.username || '').toLowerCase()}`);
                                  const linkedEmp = employeesList.find((e: any) => e.id === linkedEmpId);
                                  return linkedEmp ? (
                                    <p className="text-[10px] font-bold text-[#7B0F1A] dark:text-saffron leading-tight">
                                      Linked: {linkedEmp.name}
                                    </p>
                                  ) : null;
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300 py-4">
                              <p className="font-semibold">{usr.email || '—'}</p>
                              <p className="text-slate-505 dark:text-slate-400 font-semibold">{usr.mobile || '—'}</p>
                            </TableCell>
                            <TableCell className="py-4">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                                isDeactivated 
                                  ? 'bg-rose-100 text-rose-805 dark:bg-rose-955/40 dark:text-rose-200 border border-rose-200/30'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-955/40 dark:text-emerald-200 border border-emerald-200/30'
                              }`}>
                                {usr.status || 'Active'}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-gray-500 py-4">{formattedRegDate}</TableCell>
                            <TableCell className="text-center py-4">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleStartEditUser(usr)}
                                  disabled={!canManage}
                                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 h-7 w-7 disabled:opacity-30"
                                  title="Edit User"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleStatus(principalStr, usr.status || 'Active')}
                                  disabled={!canManage || isRowMasterAdmin}
                                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 h-7 w-7 disabled:opacity-30"
                                  title={isDeactivated ? "Activate Account" : "Deactivate Account"}
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleResetPassword(principalStr, usr.username)}
                                  disabled={!canManage}
                                  className="text-blue-600 hover:bg-blue-955/30 h-7 w-7 disabled:opacity-30"
                                  title="Reset Password"
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(principalStr)}
                                  disabled={!canManage || isRowMasterAdmin}
                                  className="text-red-600 hover:bg-red-955/30 h-7 w-7 disabled:opacity-30"
                                  title="Delete Account"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">No authorized registry users found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
            <DialogContent className="max-w-md border-2 border-gold bg-white dark:bg-slate-900" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle className="text-maroon font-bold text-xl">Edit User Details</DialogTitle>
                <DialogDescription>
                  Modify the display name, contact information, role, or status of the user.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveEditUser} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="editName" className="text-slate-500 font-semibold text-xs">Full Name *</Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter full name"
                    className="border-gold/30 focus-visible:ring-maroon"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editUsername" className="text-slate-500 font-semibold text-xs">Username *</Label>
                  <Input
                    id="editUsername"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="Enter username"
                    className="border-gold/30 focus-visible:ring-maroon"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editEmail" className="text-slate-500 font-semibold text-xs">Email Address *</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="border-gold/30 focus-visible:ring-maroon"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editMobile" className="text-slate-500 font-semibold text-xs">Mobile Number *</Label>
                  <Input
                    id="editMobile"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    className="border-gold/30 focus-visible:ring-maroon"
                    required
                  />
                </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="editRole" className="text-slate-500 font-semibold text-xs">Access Role</Label>
                    {isMasterAdmin && !(editingUser && editingUser.role && 'Admin' in editingUser.role) ? (
                      <Select value={editRole} onValueChange={(val: any) => setEditRole(val)}>
                        <SelectTrigger id="editRole" className="border-gold/30 focus:ring-maroon">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                          <SelectItem value="Admin" disabled={masterAdminExists && !(editingUser?.role && 'Admin' in editingUser.role)}>Master Admin</SelectItem>
                          <SelectItem value="Manager">Admin</SelectItem>
                          <SelectItem value="Staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={editRole === 'Admin' ? 'Master Admin' : (editRole === 'Manager' ? 'Admin' : 'Staff')}
                        disabled
                        className="bg-slate-50 dark:bg-gray-950 border-slate-205"
                      />
                    )}
                  </div>

                {editRole === 'Staff' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="editLinkedEmployee" className="text-slate-500 font-semibold text-xs">Link to Artisan/Employee</Label>
                    <Select value={editLinkedEmployeeId} onValueChange={setEditLinkedEmployeeId}>
                      <SelectTrigger id="editLinkedEmployee" className="border-gold/30 focus:ring-maroon bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Select Employee" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                        {employeesList.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.id})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                  <div className="space-y-1.5">
                    <Label htmlFor="editStatus" className="text-slate-500 font-semibold text-xs">Status</Label>
                    {isMasterAdmin && !(editingUser && editingUser.role && 'Admin' in editingUser.role) ? (
                      <Select value={editStatus} onValueChange={setEditStatus}>
                        <SelectTrigger id="editStatus" className="border-gold/30 focus:ring-maroon">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Disabled">Disabled</SelectItem>
                          <SelectItem value="Deactivated">Deactivated</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={editStatus}
                        disabled
                        className="bg-slate-50 dark:bg-gray-950 border-slate-205"
                      />
                    )}
                  </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setEditingUser(null)} className="border-gold/30">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isEditingUser} className="bg-maroon hover:bg-maroon/90 text-white font-semibold">
                    {isEditingUser ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Tab 3: Activity Logs */}
        {isAdmin && (
          <TabsContent value="logs" className="space-y-6 mt-4 outline-none">
          <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
            <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 flex flex-col gap-4 py-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
                <div>
                  <CardTitle className="text-maroon dark:text-saffron">System Audit Trail</CardTitle>
                  <CardDescription>Live audit registry of security authentications and invoice modifications.</CardDescription>
                </div>
                
                {/* Responsive search & action filters */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:max-w-xl">
                  <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gold" />
                    <Input
                      placeholder="Search logs by keyword..."
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                      className="pl-9 h-10 text-xs border-gold bg-white dark:bg-gray-900"
                    />
                  </div>
                  <Select value={logCategoryFilter} onValueChange={(val) => setLogCategoryFilter(val)}>
                    <SelectTrigger className="border-gold w-full sm:w-48 h-10 text-xs bg-white dark:bg-gray-900">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="all">All Logs</SelectItem>
                      <SelectItem value="sessions">Sessions (Login/Logout)</SelectItem>
                      <SelectItem value="invoices">Invoices (Create/Edit/Delete)</SelectItem>
                      <SelectItem value="settings">Settings (Profile Updates)</SelectItem>
                      <SelectItem value="users">Users (Add/Remove Staff)</SelectItem>
                      <SelectItem value="stock">Stock / Inventory Audit</SelectItem>
                      <SelectItem value="purchases">Purchase / Vendor Audit</SelectItem>
                      <SelectItem value="production">Production / Quality Audit</SelectItem>
                      <SelectItem value="finance">Finance / Ledger Audit</SelectItem>
                      <SelectItem value="master_data">Master Data Audit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advanced unified filters */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full border-t border-gold/10 pt-3">
                {/* Module Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-gray-500">Module</label>
                  <Select value={filterModule} onValueChange={(val) => setFilterModule(val)}>
                    <SelectTrigger className="border-gold h-9 text-xs bg-white dark:bg-gray-900 w-full">
                      <SelectValue placeholder="All Modules" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="all">All Modules</SelectItem>
                      <SelectItem value="AUTH">AUTH</SelectItem>
                      <SelectItem value="USERS">USERS</SelectItem>
                      <SelectItem value="ERP">ERP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-gray-500">Action</label>
                  <Select value={filterAction} onValueChange={(val) => setFilterAction(val)}>
                    <SelectTrigger className="border-gold h-9 text-xs bg-white dark:bg-gray-900 w-full">
                      <SelectValue placeholder="All Actions" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="Login">Login</SelectItem>
                      <SelectItem value="Logout">Logout</SelectItem>
                      <SelectItem value="Password Changed">Password Changed</SelectItem>
                      <SelectItem value="User Created">User Created</SelectItem>
                      <SelectItem value="User Status Changed">User Status Changed</SelectItem>
                      <SelectItem value="User Role Changed">User Role Changed</SelectItem>
                      <SelectItem value="User Password Reset">User Password Reset</SelectItem>
                      <SelectItem value="Create Job Work">Create Job Work</SelectItem>
                      <SelectItem value="Collect Job">Collect Job</SelectItem>
                      <SelectItem value="Delete Collection">Delete Collection</SelectItem>
                      <SelectItem value="Edit Collection">Edit Collection</SelectItem>
                      <SelectItem value="Create Invoice">Create Invoice</SelectItem>
                      <SelectItem value="Delete Invoice">Delete Invoice</SelectItem>
                      <SelectItem value="Payment Recorded">Payment Recorded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Username Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-gray-500">Username</label>
                  <Input
                    placeholder="Username..."
                    value={filterUsername}
                    onChange={(e) => setFilterUsername(e.target.value)}
                    className="border-gold h-9 text-xs bg-white dark:bg-gray-900 w-full"
                  />
                </div>

                {/* Date Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-gray-500">Date</label>
                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="border-gold h-9 text-xs bg-white dark:bg-gray-900 w-full"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800 max-h-[550px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-50 sticky top-0 z-10">
                      <TableHead className="font-bold text-maroon dark:text-saffron w-40">Timestamp</TableHead>
                      <TableHead className="font-bold text-maroon dark:text-saffron w-48">Operator</TableHead>
                      <TableHead className="font-bold text-maroon dark:text-saffron w-32">Action</TableHead>
                      <TableHead className="font-bold text-maroon dark:text-saffron">Audit Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => {
                        const formattedLogTime = formatERPDateTime(log.timestamp);

                        return (
                          <TableRow key={log.id.toString()} className="hover:bg-amber-50/10 dark:hover:bg-gray-800/10 text-xs">
                            <TableCell className="whitespace-nowrap font-mono text-gray-500 py-3.5">{formattedLogTime}</TableCell>
                            <TableCell className="font-medium text-slate-800 dark:text-slate-200 py-3.5" title={log.userPrincipal}>
                              <p className="font-bold leading-tight">{log.userName}</p>
                              <p className="text-[10px] text-gray-400 font-mono select-all truncate max-w-[160px]">{log.userPrincipal}</p>
                            </TableCell>
                            <TableCell className="py-3.5">
                              <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wide inline-block ${
                                log.action.includes('Delete') ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 border border-red-200/30' :
                                log.action.includes('Create') ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200 border border-green-200/30' :
                                log.action.includes('Update') || log.action.includes('Save') ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border border-blue-200/30' :
                                'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-200/30'
                              }`}>
                                {log.action}
                              </span>
                            </TableCell>
                            <TableCell className="text-slate-700 dark:text-slate-300 font-medium py-3.5">{log.details}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">No matching audit logs found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Tab 5: Product Inventory */}
        {isAdmin && (
          <TabsContent value="products" className="space-y-8 mt-4 outline-none">
            {/* Card 4.1: Product Inventory */}
            <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
              <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
                <CardTitle className="text-maroon dark:text-saffron flex items-center gap-2">
                  <span>Product Catalog Inventory</span>
                </CardTitle>
                <CardDescription>Manage your product catalog, pricing, and stock levels.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <form onSubmit={handleSaveProductSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prodVigat" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Product Description</Label>
                      <Input
                        id="prodVigat"
                        value={prodVigat}
                        onChange={(e) => setProdVigat(e.target.value)}
                        placeholder="e.g. Beaded Toran"
                        className="border-gold focus:ring-saffron"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prodHsn" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">HSN Code</Label>
                      <Input
                        id="prodHsn"
                        value={prodHsn}
                        onChange={(e) => setProdHsn(e.target.value)}
                        placeholder="e.g. 5609"
                        className="border-gold focus:ring-saffron"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prodRate" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Rate (₹)</Label>
                      <Input
                        id="prodRate"
                        type="number"
                        min="0"
                        step="0.01"
                        value={prodRate || ''}
                        onChange={(e) => setProdRate(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="border-gold focus:ring-saffron"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prodStock" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Stock Count</Label>
                      <Input
                        id="prodStock"
                        type="number"
                        min="0"
                        value={prodStock || ''}
                        onChange={(e) => setProdStock(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="border-gold focus:ring-saffron"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-gold/10">
                    {editingProd && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setProdId('');
                          setProdVigat('');
                          setProdRate(0);
                          setProdHsn('5609');
                          setProdStock(0);
                          setEditingProd(null);
                        }}
                        className="border-gold text-maroon hover:bg-gold/10"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={isSavingProduct}
                      className="bg-maroon hover:bg-maroon/90 text-white font-semibold border border-gold/30 shadow-sm"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {editingProd ? 'Update Product' : 'Add Product'}
                    </Button>
                  </div>
                </form>

                <div className="flex flex-wrap gap-2 items-center justify-between pb-3 border-b border-gold/10">
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleExportProducts}
                      className="border-gold text-maroon hover:bg-gold/10 h-8 text-xs font-semibold"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
                    </Button>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept=".csv,.json" 
                        onChange={handleImportProducts} 
                        className="hidden" 
                        id="import-products-file" 
                      />
                      <Label 
                        htmlFor="import-products-file"
                        className="inline-flex items-center justify-center h-8 rounded-md px-3 text-xs font-semibold border border-gold text-maroon hover:bg-gold/10 cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5 mr-1" /> Import CSV/JSON
                      </Label>
                    </div>
                  </div>
                  {isMasterAdmin && selectedProdIds.length > 0 && (
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleBulkDeleteProducts}
                      className="h-8 text-xs font-semibold"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Bulk Delete ({selectedProdIds.length})
                    </Button>
                  )}
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800 max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                        <TableHead className="w-12 text-center">
                          <input 
                            type="checkbox" 
                            className="h-3.5 w-3.5 rounded border-gold accent-maroon"
                            checked={selectedProdIds.length > 0 && selectedProdIds.length === (products || []).length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProdIds((products || []).map(p => p.id));
                              } else {
                                setSelectedProdIds([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead className="font-bold text-maroon">Vigat</TableHead>
                        <TableHead className="font-bold text-maroon text-center">Rate</TableHead>
                        <TableHead className="font-bold text-maroon text-center">Stock</TableHead>
                        <TableHead className="font-bold text-maroon text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products && products.length > 0 ? (
                        products.map((p) => (
                          <TableRow key={p.id} className="hover:bg-amber-50/20 text-xs">
                            <TableCell className="text-center">
                              <input 
                                type="checkbox" 
                                className="h-3.5 w-3.5 rounded border-gold accent-maroon"
                                checked={selectedProdIds.includes(p.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedProdIds(prev => [...prev, p.id]);
                                  } else {
                                    setSelectedProdIds(prev => prev.filter(id => id !== p.id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-semibold text-slate-800 dark:text-slate-100">
                              <p className="font-bold">{p.vigat}</p>
                              <p className="text-[10px] text-slate-500 font-mono">HSN: {p.hsnCode}</p>
                            </TableCell>
                            <TableCell className="text-center font-bold text-maroon">{formatCurrency(p.rate)}</TableCell>
                            <TableCell className="text-center">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                Number(p.stock) <= 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {p.stock.toString()}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditProduct(p)}
                                  className="text-saffron hover:bg-saffron/10 h-7 w-7"
                                >
                                  <Edit className="h-3.5 w-3.5 text-saffron" />
                                </Button>
                                {isMasterAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteProduct(p.id)}
                                    className="text-red-600 hover:bg-red-50 h-7 w-7"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-gray-500">No products in registry.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab 6: Customer Accounts */}
        {isAdmin && (
          <TabsContent value="customers" className="space-y-8 mt-4 outline-none">
            {/* Card 4.2: Customer Directory */}
            <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
              <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
                <CardTitle className="text-maroon dark:text-saffron flex items-center gap-2">
                  <span>Customer Accounts</span>
                </CardTitle>
                <CardDescription>View and manage client profiles and contact directories.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <form onSubmit={handleSaveCustomerSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="custName" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Customer Name</Label>
                      <Input
                        id="custName"
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        placeholder="e.g. Rohan Shah"
                        className="border-gold focus:ring-saffron"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custPhone" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Phone Number</Label>
                      <Input
                        id="custPhone"
                        value={custPhone}
                        onChange={(e) => setCustPhone(e.target.value)}
                        placeholder="e.g. 9824092261"
                        className="border-gold focus:ring-saffron"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custAddress" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Business Address</Label>
                    <Input
                      id="custAddress"
                      value={custAddress}
                      onChange={(e) => setCustAddress(e.target.value)}
                      placeholder="e.g. C-45, Vastrapur, Ahmedabad"
                      className="border-gold focus:ring-saffron"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custGst" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">GSTIN Number</Label>
                    <Input
                      id="custGst"
                      value={custGst}
                      onChange={(e) => setCustGst(e.target.value)}
                      placeholder="e.g. 24APYPP8111N1Z4"
                      className="border-gold focus:ring-saffron"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-gold/10">
                    {editingCust && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCustId('');
                          setCustName('');
                          setCustAddress('');
                          setCustPhone('');
                          setCustGst('');
                          setEditingCust(null);
                        }}
                        className="border-gold text-maroon hover:bg-gold/10"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={isSavingCustomer}
                      className="bg-maroon hover:bg-maroon/90 text-white font-semibold border border-gold/30 shadow-sm"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {editingCust ? 'Update Customer' : 'Add Customer'}
                    </Button>
                  </div>
                </form>

                <div className="flex flex-wrap gap-2 items-center justify-between pb-3 border-b border-gold/10">
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleExportCustomers}
                      className="border-gold text-maroon hover:bg-gold/10 h-8 text-xs font-semibold"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
                    </Button>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept=".csv,.json" 
                        onChange={handleImportCustomers} 
                        className="hidden" 
                        id="import-customers-file" 
                      />
                      <Label 
                        htmlFor="import-customers-file"
                        className="inline-flex items-center justify-center h-8 rounded-md px-3 text-xs font-semibold border border-gold text-maroon hover:bg-gold/10 cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5 mr-1" /> Import CSV/JSON
                      </Label>
                    </div>
                  </div>
                  {isMasterAdmin && selectedCustIds.length > 0 && (
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleBulkDeleteCustomers}
                      className="h-8 text-xs font-semibold"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Bulk Delete ({selectedCustIds.length})
                    </Button>
                  )}
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800 max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                        <TableHead className="w-12 text-center">
                          <input 
                            type="checkbox" 
                            className="h-3.5 w-3.5 rounded border-gold accent-maroon"
                            checked={selectedCustIds.length > 0 && selectedCustIds.length === (customers || []).length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCustIds((customers || []).map(c => c.id));
                              } else {
                                setSelectedCustIds([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead className="font-bold text-maroon">Name</TableHead>
                        <TableHead className="font-bold text-maroon">Phone / GST</TableHead>
                        <TableHead className="font-bold text-maroon text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers && customers.length > 0 ? (
                        customers.map((c) => (
                          <TableRow key={c.id} className="hover:bg-amber-50/20 text-xs">
                            <TableCell className="text-center">
                              <input 
                                type="checkbox" 
                                className="h-3.5 w-3.5 rounded border-gold accent-maroon"
                                checked={selectedCustIds.includes(c.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCustIds(prev => [...prev, c.id]);
                                  } else {
                                    setSelectedCustIds(prev => prev.filter(id => id !== c.id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-semibold text-slate-800 dark:text-slate-100">
                              <p className="font-bold">{c.name}</p>
                              <p className="text-[10px] text-slate-500 font-normal leading-tight">{c.businessAddress}</p>
                            </TableCell>
                            <TableCell>
                              <p className="font-semibold font-mono">{c.phone || 'N/A'}</p>
                              <p className="text-[10px] text-slate-500 font-mono">GST: {c.gstNo || 'N/A'}</p>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditCustomer(c)}
                                  className="text-saffron hover:bg-saffron/10 h-7 w-7"
                                >
                                  <Edit className="h-3.5 w-3.5 text-saffron" />
                                </Button>
                                {isMasterAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteCustomer(c.id)}
                                    className="text-red-600 hover:bg-red-50 h-7 w-7"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-gray-500">No customers in directory.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="raw-materials" className="space-y-8 mt-4 outline-none">
          <RawMaterialsInventory />
        </TabsContent>

        {(isAdmin || isManager) && (
          <TabsContent value="vendors" className="space-y-8 mt-4 outline-none">
            <VendorAccounts />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;
