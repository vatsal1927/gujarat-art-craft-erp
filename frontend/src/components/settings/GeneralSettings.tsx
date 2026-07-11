import { useState, useEffect } from 'react';
import { useSettings, useSaveSettings } from '../../hooks/useQueries';
import { useActor } from '../../hooks/useActor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Database, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { parseBusinessInfo } from '../../utils/businessInfoParser';
import { useAuth } from '../AuthGuard';

export default function GeneralSettings() {
  const { user: currentUser } = useAuth();
  const isAdmin = !!(currentUser?.role && 'Admin' in currentUser.role);
  const isManager = !!(currentUser?.role && 'Manager' in currentUser.role);
  const { actor } = useActor();

  const { data: settings, isLoading } = useSettings();
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

  // Copy local values from settings load
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
    }
  }, [settings]);

  const performSave = (
    successMessage = 'Settings updated successfully!',
    customAllowStaff = allowStaffCollection,
    customEnableWage = enableRejectedWage,
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
        companyLogo: settings?.companyLogo || '',
        companyName: settings?.companyName || '',
        themeColors: settings?.themeColors || 'maroon-saffron',
        sidebarStyle: settings?.sidebarStyle || 'Minimalist',
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

  const handleSaveBusinessProfile = () => {
    if (!businessName.trim()) {
      toast.error('Business Name is required');
      return;
    }
    if (!businessAddress.trim()) {
      toast.error('Business Address is required');
      return;
    }
    const phoneRegex = /^[0-9\s,+-]{10,25}$/;
    if (!phoneRegex.test(businessPhone.trim())) {
      toast.error('Please enter a valid Phone Number (minimum 10 digits)');
      return;
    }
    if (businessGst.trim()) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
      if (!gstRegex.test(businessGst.trim())) {
        toast.error('Please enter a valid 15-character GSTIN format (e.g. 24APYPP8111N1Z4)');
        return;
      }
    }
    performSave('Business Profile updated successfully!');
  };

  const handleSaveCalculations = () => {
    if (defaultGstRate < 0 || defaultGstRate > 100) {
      toast.error('Default GST rate must be between 0% and 100%');
      return;
    }
    performSave('Invoice calculation parameters updated!');
  };

  const handleSaveTerms = () => {
    performSave('Terms & Conditions updated!');
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

  if (isLoading) {
    return <div className="py-8 text-center text-xs text-gray-500">Loading General Settings...</div>;
  }

  return (
    <div className="space-y-8">
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
                    performSave('Rejected quantity wage settings updated!', allowStaffCollection, val);
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
                    performSave('Admin Backup & Restore permission updated!', allowStaffCollection, enableRejectedWage, val);
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
                    performSave('Auto stock alerts settings updated!', allowStaffCollection, enableRejectedWage, allowAdminBackupRestore, val);
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
                      performSave('Alert frequency settings updated!', allowStaffCollection, enableRejectedWage, allowAdminBackupRestore, enableAutoStockAlerts, val);
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
                      performSave('Low stock threshold updated!', allowStaffCollection, enableRejectedWage, allowAdminBackupRestore, enableAutoStockAlerts, alertFrequency, val);
                    }}
                    className="border-gold focus:ring-saffron"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 1.6: Costing & Payment Terms */}
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
                      performSave('Costing method updated!', allowStaffCollection, enableRejectedWage, allowAdminBackupRestore, enableAutoStockAlerts, alertFrequency, lowStockAlertThreshold, val, defaultPaymentTerms);
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
                      performSave('Default payment terms updated!', allowStaffCollection, enableRejectedWage, allowAdminBackupRestore, enableAutoStockAlerts, alertFrequency, lowStockAlertThreshold, costingMethod, val);
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
      {(isAdmin || (isManager && allowAdminBackupRestore)) && (
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
      )}
    </div>
  );
}
