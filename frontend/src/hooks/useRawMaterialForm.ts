import { useState, useEffect, useMemo } from 'react';
import { useSaveRawMaterial, useRawMaterials, usePurchases } from './useQueries';
import { toast } from 'sonner';

export interface RawMaterialFormState {
  id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  openingStock: number;
  currentStock: number;
  unitCost: number;
  purchaseRate: number;
  minStockAlert: number;
  reorderLevel: number;
  minimumStock: number;
  maxStockLevel: number;
  lowStockAlert: boolean;
  supplier: string;
  vendorId: string;
  vendorMobile: string;
  vendorGSTIN: string;
  imageUrl: string;
  lastPurchaseDate: string;
  warehouse: string;
  storageRack: string;
  binLocation: string;
}

export interface Supplier {
  vendorId?: string;
  vendorName: string;
  vendorMobile?: string;
  vendorGstNumber?: string;
  vendorAddress?: string;
}

export interface RawMaterialFormErrors {
  name?: string;
  openingStock?: string;
  unitCost?: string;
  purchaseRate?: string;
  minStockAlert?: string;
  reorderLevel?: string;
  minimumStock?: string;
  maxStockLevel?: string;
}

const METADATA_KEY = 'mock_raw_materials_metadata';

export function getAvailableSuppliers(purchases: any[], rawMaterials: any[]): Supplier[] {
  const suppliersMap = new Map<string, Supplier>();

  const staticVendors = [
    { vendorName: 'General Vendor', vendorMobile: 'N/A', vendorGstNumber: 'N/A', vendorAddress: 'N/A' },
    { vendorName: 'Ambika Beads', vendorMobile: '9999011111', vendorGstNumber: '24AMBKA1111A1ZA', vendorAddress: 'Bead Bazaar, Baroda' },
    { vendorName: 'Karan Mirror House', vendorMobile: '9999022222', vendorGstNumber: '24KARAN2222B1ZB', vendorAddress: 'Mirror Street, Ahmedabad' },
    { vendorName: 'Gujarat Threads', vendorMobile: '9999033333', vendorGstNumber: '24GUTHR3333C1ZC', vendorAddress: 'Textile Market, Surat' },
    { vendorName: 'Rajlaxmi Flowers', vendorMobile: '9999044444', vendorGstNumber: '24RAJLA4444D1ZD', vendorAddress: 'Flower Market, Rajkot' }
  ];

  staticVendors.forEach(v => {
    suppliersMap.set(v.vendorName.trim().toLowerCase(), {
      ...v,
      vendorId: v.vendorMobile || v.vendorName
    });
  });

  try {
    const mockVendors = JSON.parse(localStorage.getItem('mock_vendors') || '[]');
    mockVendors.forEach((v: any) => {
      const nameKey = v.name?.trim().toLowerCase();
      if (nameKey) {
        suppliersMap.set(nameKey, {
          vendorName: v.name,
          vendorMobile: v.phone || '',
          vendorGstNumber: v.gstin || '',
          vendorAddress: v.businessAddress || '',
          vendorId: v.id || v.phone || v.name
        });
      }
    });
  } catch (e) {
    console.error('Failed to parse mock_vendors', e);
  }

  purchases.forEach(p => {
    const nameKey = p.vendorName?.trim().toLowerCase();
    if (nameKey) {
      if (!suppliersMap.has(nameKey)) {
        suppliersMap.set(nameKey, {
          vendorName: p.vendorName,
          vendorMobile: p.vendorMobile || '',
          vendorGstNumber: p.vendorGstNumber || '',
          vendorAddress: p.vendorAddress || '',
          vendorId: p.vendorMobile || p.vendorName
        });
      } else {
        const existing = suppliersMap.get(nameKey)!;
        if ((!existing.vendorMobile || existing.vendorMobile === 'N/A') && p.vendorMobile) {
          existing.vendorMobile = p.vendorMobile;
          existing.vendorId = p.vendorMobile;
        }
        if ((!existing.vendorGstNumber || existing.vendorGstNumber === 'N/A') && p.vendorGstNumber) existing.vendorGstNumber = p.vendorGstNumber;
        if ((!existing.vendorAddress || existing.vendorAddress === 'N/A') && p.vendorAddress) existing.vendorAddress = p.vendorAddress;
      }
    }
  });

  rawMaterials.forEach(m => {
    const vendorName = m.preferredVendor || (m as any).supplier;
    const nameKey = vendorName?.trim().toLowerCase();
    if (nameKey && nameKey !== 'general vendor' && nameKey !== 'n/a') {
      if (!suppliersMap.has(nameKey)) {
        suppliersMap.set(nameKey, {
          vendorName: vendorName,
          vendorMobile: '',
          vendorGstNumber: '',
          vendorAddress: '',
          vendorId: vendorName
        });
      }
    }
  });

  return Array.from(suppliersMap.values());
}

export function useRawMaterialForm(materialId: string | null, onClose: () => void) {
  const { data: rawMaterials = [], refetch: refetchRaw } = useRawMaterials();
  const { data: allPurchases = [] } = usePurchases();
  const { mutate: saveRawMaterial } = useSaveRawMaterial();

  const [customSuppliers, setCustomSuppliers] = useState<Supplier[]>([]);

  const [formData, setFormData] = useState<RawMaterialFormState>({
    id: '',
    name: '',
    code: '',
    category: 'General',
    unit: 'pcs',
    openingStock: 0,
    currentStock: 0,
    unitCost: 0,
    purchaseRate: 0,
    minStockAlert: 0,
    reorderLevel: 0,
    minimumStock: 0,
    maxStockLevel: 0,
    lowStockAlert: true,
    supplier: 'General Vendor',
    vendorId: '',
    vendorMobile: '',
    vendorGSTIN: '',
    imageUrl: '',
    lastPurchaseDate: '',
    warehouse: 'Main Warehouse',
    storageRack: 'Rack A-1',
    binLocation: 'Bin 01',
  });

  const [errors, setErrors] = useState<RawMaterialFormErrors>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Memoized available suppliers list
  const availableSuppliers = useMemo(() => {
    const baseSuppliers = getAvailableSuppliers(allPurchases, rawMaterials);
    const combined = [...baseSuppliers];
    customSuppliers.forEach(cs => {
      if (!combined.some(s => s.vendorName.trim().toLowerCase() === cs.vendorName.trim().toLowerCase())) {
        combined.push(cs);
      }
    });
    return combined;
  }, [allPurchases, rawMaterials, customSuppliers]);

  // Load or initialize form data
  useEffect(() => {
    if (materialId) {
      const match = rawMaterials.find((m) => m.id === materialId);
      if (match) {
        // Load custom metadata (lowStockAlert, purchaseRate, maxStockLevel)
        const metadata = JSON.parse(localStorage.getItem(METADATA_KEY) || '{}');
        const custom = metadata[materialId] || {};
        
        // Load photo Url
        const customImages = JSON.parse(localStorage.getItem('mock_uploaded_images') || '{}');
        const imgUrl = customImages[materialId] || match.photoUrl || (match as any).imageUrl || '';

        const supplierName = match.preferredVendor || 'General Vendor';
        const matchedVendor = availableSuppliers.find(
          v => v.vendorName.trim().toLowerCase() === supplierName.trim().toLowerCase()
        );

        setFormData({
          id: match.id,
          name: match.name,
          code: match.id,
          category: match.category || 'General',
          unit: match.unit || 'pcs',
          openingStock: match.openingStock || 0,
          currentStock: match.currentStock || 0,
          unitCost: match.unitCost || 0,
          purchaseRate: custom.purchaseRate || match.unitCost || 0,
          minStockAlert: match.minStockAlert || 0,
          reorderLevel: match.reorderLevel || match.minStockAlert || 0,
          minimumStock: match.minimumStock || 0,
          maxStockLevel: custom.maxStockLevel || 0,
          lowStockAlert: custom.lowStockAlert !== undefined ? custom.lowStockAlert : true,
          supplier: supplierName,
          vendorId: matchedVendor?.vendorId || '',
          vendorMobile: matchedVendor?.vendorMobile || '',
          vendorGSTIN: matchedVendor?.vendorGstNumber || '',
          imageUrl: imgUrl,
          lastPurchaseDate: (match as any).lastPurchaseDate || '',
          warehouse: custom.warehouse || (match as any).warehouse || 'Main Warehouse',
          storageRack: custom.storageRack || (match as any).storageRack || 'Rack A-1',
          binLocation: custom.binLocation || (match as any).binLocation || 'Bin 01',
        });
      }
    } else {
      // New Raw Material template
      const nextIdNum = rawMaterials.length + 1;
      const nextId = `RM-${nextIdNum}`;
      setFormData({
        id: nextId,
        name: '',
        code: nextId,
        category: 'General',
        unit: 'pcs',
        openingStock: 0,
        currentStock: 0,
        unitCost: 0,
        purchaseRate: 0,
        minStockAlert: 0,
        reorderLevel: 0,
        minimumStock: 0,
        maxStockLevel: 0,
        lowStockAlert: true,
        supplier: 'General Vendor',
        vendorId: '',
        vendorMobile: '',
        vendorGSTIN: '',
        imageUrl: '',
        lastPurchaseDate: '',
        warehouse: 'Main Warehouse',
        storageRack: 'Rack A-1',
        binLocation: 'Bin 01',
      });
    }
    setErrors({});
    setUploadError(null);
  }, [materialId, rawMaterials, availableSuppliers]);

  const validateField = (name: keyof RawMaterialFormState, value: any): string | undefined => {
    if (name === 'name') {
      if (!String(value).trim()) return 'Material Name is required';
    }
    if (['openingStock', 'unitCost', 'purchaseRate', 'reorderLevel', 'minStockAlert', 'minimumStock', 'maxStockLevel'].includes(name)) {
      const num = Number(value);
      if (isNaN(num)) return 'Value must be a valid number';
      if (num < 0) return 'Value cannot be negative';
    }
    return undefined;
  };

  const onChange = (name: keyof RawMaterialFormState, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      
      // Auto-compute code if id is changed
      if (name === 'id') {
        next.code = value;
      }
      
      return next;
    });

    const error = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const onBlur = (name: keyof RawMaterialFormState) => {
    const error = validateField(name, formData[name]);
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const onFileChange = async (file: File | null) => {
    if (!file) return;
    
    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image size exceeds 2MB limit');
      toast.error('Image size exceeds 2MB limit');
      return;
    }

    // Enforce image file type check
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files (PNG, JPEG) are allowed');
      toast.error('Only image files (PNG, JPEG) are allowed');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, imageUrl: reader.result as string }));
        setIsUploading(false);
        toast.success('Image loaded successfully');
      };
      reader.onerror = () => {
        setUploadError('Failed to read image file');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      setUploadError(e.message || 'Error uploading file');
      setIsUploading(false);
    }
  };

  const onRemoveFile = () => {
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    setUploadError(null);
    toast.info('Image removed');
  };

  const onSubmit = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault();

    // Run validation across all fields
    const newErrors: RawMaterialFormErrors = {};
    let hasError = false;

    const nameErr = validateField('name', formData.name);
    if (nameErr) { newErrors.name = nameErr; hasError = true; }

    const stockErr = validateField('openingStock', formData.openingStock);
    if (stockErr) { newErrors.openingStock = stockErr; hasError = true; }

    const costErr = validateField('unitCost', formData.unitCost);
    if (costErr) { newErrors.unitCost = costErr; hasError = true; }

    const rateErr = validateField('purchaseRate', formData.purchaseRate);
    if (rateErr) { newErrors.purchaseRate = rateErr; hasError = true; }

    const minAlertErr = validateField('minStockAlert', formData.minStockAlert);
    if (minAlertErr) { newErrors.minStockAlert = minAlertErr; hasError = true; }

    const reorderErr = validateField('reorderLevel', formData.reorderLevel);
    if (reorderErr) { newErrors.reorderLevel = reorderErr; hasError = true; }

    const minStockErr = validateField('minimumStock', formData.minimumStock);
    if (minStockErr) { newErrors.minimumStock = minStockErr; hasError = true; }

    const maxStockErr = validateField('maxStockLevel', formData.maxStockLevel);
    if (maxStockErr) { newErrors.maxStockLevel = maxStockErr; hasError = true; }

    setErrors(newErrors);

    if (hasError) {
      toast.error('Please correct the validation errors before saving.');
      return false;
    }

    // Save image upload to custom images map in localStorage
    const customImages = JSON.parse(localStorage.getItem('mock_uploaded_images') || '{}');
    if (formData.imageUrl) {
      customImages[formData.id] = formData.imageUrl;
    } else {
      delete customImages[formData.id];
    }
    localStorage.setItem('mock_uploaded_images', JSON.stringify(customImages));

    // Save custom metadata (purchaseRate, lowStockAlert, maxStockLevel, warehouse, storageRack, binLocation) to metadata localStorage
    const metadata = JSON.parse(localStorage.getItem(METADATA_KEY) || '{}');
    metadata[formData.id] = {
      purchaseRate: Number(formData.purchaseRate),
      lowStockAlert: formData.lowStockAlert,
      maxStockLevel: Number(formData.maxStockLevel),
      warehouse: formData.warehouse,
      storageRack: formData.storageRack,
      binLocation: formData.binLocation,
    };
    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));

    // Call mutation to persist in mock backend database
    return new Promise((resolve) => {
      saveRawMaterial(
        {
          id: formData.id,
          name: formData.name,
          category: formData.category,
          openingStock: Number(formData.openingStock),
          unitCost: Number(formData.unitCost),
          unit: formData.unit,
          minStock: Number(formData.minStockAlert), // Maps to minStockAlert in backend
          reorderLevel: Number(formData.reorderLevel),
          minimumStock: Number(formData.minimumStock),
          preferredVendor: formData.supplier,
        },
        {
          onSuccess: () => {
            toast.success(`Raw Material "${formData.name}" saved successfully!`);
            refetchRaw();
            onClose();
            resolve(true);
          },
          onError: (err: any) => {
            toast.error(`Failed to save: ${err.message}`);
            resolve(false);
          },
        }
      );
    });
  };

  const addCustomSupplier = (supplier: Supplier) => {
    setCustomSuppliers(prev => [...prev, supplier]);
    setFormData(prev => ({
      ...prev,
      supplier: supplier.vendorName,
      vendorId: supplier.vendorId || supplier.vendorMobile || supplier.vendorName,
      vendorMobile: supplier.vendorMobile || '',
      vendorGSTIN: supplier.vendorGstNumber || '',
    }));
  };

  return {
    formData,
    errors,
    isUploading,
    uploadError,
    onChange,
    onBlur,
    onFileChange,
    onRemoveFile,
    onSubmit,
    availableSuppliers,
    addCustomSupplier,
  };
}
