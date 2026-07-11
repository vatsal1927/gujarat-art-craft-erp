import { RawMaterial } from '../backend';

const METADATA_KEY = 'mock_raw_materials_metadata';
const IMAGES_KEY = 'mock_uploaded_images';
const VENDORS_KEY = 'mock_vendors';

// Default static seed vendors
const DEFAULT_VENDORS = [
  { id: 'VND-001', name: 'General Vendor', companyName: 'General Supplies', phone: 'N/A', gstin: 'N/A', businessAddress: 'N/A', status: 'Active', PAN: 'N/A', city: 'N/A', state: 'Gujarat', country: 'India', pincode: 'N/A', outstanding: 0, creditLimit: 100000, creditDays: 30, rating: 5 },
  { id: 'VND-002', name: 'Ambika Beads', companyName: 'Ambika Beads Ltd.', phone: '9999011111', gstin: '24AMBKA1111A1ZA', businessAddress: 'Bead Bazaar, Baroda', status: 'Active', PAN: 'AMBKA1111A', city: 'Baroda', state: 'Gujarat', country: 'India', pincode: '390001', outstanding: 0, creditLimit: 250000, creditDays: 45, rating: 4 },
  { id: 'VND-003', name: 'Karan Mirror House', companyName: 'Karan Mirror House', phone: '9999022222', gstin: '24KARAN2222B1ZB', businessAddress: 'Mirror Street, Ahmedabad', status: 'Active', PAN: 'KARAN2222B', city: 'Ahmedabad', state: 'Gujarat', country: 'India', pincode: '380001', outstanding: 0, creditLimit: 150000, creditDays: 30, rating: 5 },
  { id: 'VND-004', name: 'Gujarat Threads', companyName: 'Gujarat Threads Corp.', phone: '9999033333', gstin: '24GUTHR3333C1ZC', businessAddress: 'Textile Market, Surat', status: 'Active', PAN: 'GUTHR3333C', city: 'Surat', state: 'Gujarat', country: 'India', pincode: '395001', outstanding: 0, creditLimit: 500000, creditDays: 60, rating: 5 },
  { id: 'VND-005', name: 'Rajlaxmi Flowers', companyName: 'Rajlaxmi Flowers', phone: '9999044444', gstin: '24RAJLA4444D1ZD', businessAddress: 'Flower Market, Rajkot', status: 'Active', PAN: 'RAJLA4444D', city: 'Rajkot', state: 'Gujarat', country: 'India', pincode: '360001', outstanding: 0, creditLimit: 100000, creditDays: 15, rating: 3 }
];

// --- Vendor Master Data Helpers ---

export function getVendorMasters(): any[] {
  const stored = localStorage.getItem(VENDORS_KEY);
  if (!stored) {
    localStorage.setItem(VENDORS_KEY, JSON.stringify(DEFAULT_VENDORS));
    return DEFAULT_VENDORS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Error parsing vendor master data:', e);
    return DEFAULT_VENDORS;
  }
}

export function saveVendorMaster(vendor: any): any[] {
  const vendors = getVendorMasters();
  const normalized = normalizeVendorMaster(vendor);
  const index = vendors.findIndex((v: any) => v.id === normalized.id);
  if (index >= 0) {
    vendors[index] = { ...vendors[index], ...normalized };
  } else {
    vendors.push(normalized);
  }
  localStorage.setItem(VENDORS_KEY, JSON.stringify(vendors));
  return vendors;
}

export function deleteVendorMaster(id: string): any[] {
  const vendors = getVendorMasters();
  const filtered = vendors.filter((v: any) => v.id !== id);
  localStorage.setItem(VENDORS_KEY, JSON.stringify(filtered));
  return filtered;
}

export function normalizeVendorMaster(vendor: any): any {
  return {
    id: String(vendor.id || '').trim().toUpperCase(),
    name: String(vendor.name || '').trim(),
    phone: String(vendor.phone || 'N/A').trim(),
    gstin: String(vendor.gstin || vendor.gstNo || 'N/A').trim().toUpperCase(),
    businessAddress: String(vendor.businessAddress || 'N/A').trim(),
    openingBalance: Math.max(0, Number(vendor.openingBalance) || 0),
    bankName: String(vendor.bankName || '').trim(),
    bankBranch: String(vendor.bankBranch || '').trim(),
    accountNumber: String(vendor.accountNumber || '').trim(),
    ifscCode: String(vendor.ifscCode || '').trim().toUpperCase(),
    panNumber: String(vendor.panNumber || vendor.PAN || 'N/A').trim().toUpperCase(),
    PAN: String(vendor.panNumber || vendor.PAN || 'N/A').trim().toUpperCase(),
    status: vendor.status === 'Inactive' ? 'Inactive' : 'Active',
    notes: String(vendor.notes || '').trim(),
    creditLimit: Math.max(0, Number(vendor.creditLimit) || 100000),
    creditDays: Math.max(0, Number(vendor.creditDays) || 30),
    rating: Math.min(5, Math.max(1, Number(vendor.rating) || 5))
  };
}

// --- Raw Material Master Data Helpers ---

export function getRawMaterialMasters(rawMaterialsFromCanister: RawMaterial[]): any[] {
  try {
    const allMeta = JSON.parse(localStorage.getItem(METADATA_KEY) || '{}');
    const customImages = JSON.parse(localStorage.getItem(IMAGES_KEY) || '{}');

    return (rawMaterialsFromCanister || []).map((m) => {
      const meta = allMeta[m.id] || {};
      const img = customImages[m.id] || '';

      return normalizeRawMaterialMaster({
        ...m,
        purchaseRate: meta.purchaseRate || m.unitCost || 0,
        maxStockLevel: meta.maxStockLevel || 100,
        hsnCode: meta.hsnCode || '5609',
        gstPercent: meta.gstPercent || 5,
        storageRack: meta.storageRack || 'N/A',
        warehouse: meta.warehouse || 'N/A',
        status: meta.status || 'Active',
        notes: meta.notes || 'N/A',
        imageUrl: img || m.photoUrl || ''
      });
    });
  } catch (e) {
    console.error('Error getting raw material masters:', e);
    return (rawMaterialsFromCanister || []).map(normalizeRawMaterialMaster);
  }
}

export function saveRawMaterialMaster(id: string, metadata: any, photoBase64?: string): void {
  try {
    const allMeta = JSON.parse(localStorage.getItem(METADATA_KEY) || '{}');
    allMeta[id] = {
      purchaseRate: Math.max(0, Number(metadata.purchaseRate) || 0),
      maxStockLevel: Math.max(0, Number(metadata.maxStockLevel) || 100),
      hsnCode: String(metadata.hsnCode || '5609').trim(),
      gstPercent: Number(metadata.gstPercent) || 5,
      storageRack: String(metadata.storageRack || '').trim(),
      warehouse: String(metadata.warehouse || '').trim(),
      status: metadata.status === 'Inactive' ? 'Inactive' : 'Active',
      notes: String(metadata.notes || '').trim()
    };
    localStorage.setItem(METADATA_KEY, JSON.stringify(allMeta));

    if (photoBase64 !== undefined) {
      const customImages = JSON.parse(localStorage.getItem(IMAGES_KEY) || '{}');
      if (photoBase64) {
        customImages[id] = photoBase64;
      } else {
        delete customImages[id];
      }
      localStorage.setItem(IMAGES_KEY, JSON.stringify(customImages));
    }
  } catch (e) {
    console.error('Error saving raw material metadata:', e);
  }
}

// Delete raw material metadata and image
export function deleteRawMaterialMaster(id: string): void {
  try {
    const allMeta = JSON.parse(localStorage.getItem(METADATA_KEY) || '{}');
    delete allMeta[id];
    localStorage.setItem(METADATA_KEY, JSON.stringify(allMeta));

    const customImages = JSON.parse(localStorage.getItem(IMAGES_KEY) || '{}');
    delete customImages[id];
    localStorage.setItem(IMAGES_KEY, JSON.stringify(customImages));
  } catch (e) {
    console.error('Error deleting raw material metadata:', e);
  }
}

export function normalizeRawMaterialMaster(m: any): any {
  return {
    ...m,
    id: String(m.id || '').trim().toUpperCase(),
    name: String(m.name || '').trim(),
    category: String(m.category || 'Threads').trim(),
    unit: String(m.unit || 'meters').trim(),
    openingStock: Math.max(0, Number(m.openingStock) || 0),
    currentStock: Math.max(0, Number(m.currentStock !== undefined ? m.currentStock : m.openingStock) || 0),
    purchaseRate: Math.max(0, Number(m.purchaseRate) || Number(m.unitCost) || 0),
    unitCost: Math.max(0, Number(m.unitCost) || 0),
    minStock: Math.max(0, Number(m.minStock || m.minStockAlert) || 5),
    reorderLevel: Math.max(0, Number(m.reorderLevel) || 10),
    maxStockLevel: Math.max(0, Number(m.maxStockLevel) || 100),
    preferredVendor: String(m.preferredVendor || 'General Vendor').trim(),
    hsnCode: String(m.hsnCode || '5609').trim(),
    gstPercent: Number(m.gstPercent) || 5,
    storageRack: String(m.storageRack || 'N/A').trim(),
    warehouse: String(m.warehouse || 'N/A').trim(),
    status: m.status === 'Inactive' ? 'Inactive' : 'Active',
    notes: String(m.notes || 'N/A').trim(),
    imageUrl: String(m.imageUrl || m.photoUrl || '').trim()
  };
}

// --- Migrations ---

export function runVendorMigration(): void {
  try {
    const currentVendors = getVendorMasters();
    
    // Extract legacy vendor info from different sources in localStorage
    const purchases = JSON.parse(localStorage.getItem('mock_purchases') || '[]');
    const purchaseOrders = JSON.parse(localStorage.getItem('mock_purchase_orders') || '[]');
    const grns = JSON.parse(localStorage.getItem('mock_grns') || '[]');
    const rawMaterials = JSON.parse(localStorage.getItem('mock_raw_materials') || '[]');

    const normalizeName = (name: string) => String(name || '').trim().toLowerCase();
    const extracted: Record<string, { name: string, phone: string, gstin: string, address: string }> = {};

    // 1. purchases
    purchases.forEach((p: any) => {
      const name = String(p.vendorName || '').trim();
      const norm = normalizeName(name);
      if (!norm || norm === 'general vendor' || norm === 'general vendorgeneral vendor') return;
      const phone = String(p.vendorMobile || '').trim();
      const gstin = String(p.vendorGstNumber || '').trim();
      const address = String(p.vendorAddress || '').trim();
      
      if (!extracted[norm]) {
        extracted[norm] = { name, phone: '', gstin: '', address: '' };
      }
      if (phone && phone !== 'N/A' && !extracted[norm].phone) extracted[norm].phone = phone;
      if (gstin && gstin !== 'N/A' && !extracted[norm].gstin) extracted[norm].gstin = gstin;
      if (address && address !== 'N/A' && !extracted[norm].address) extracted[norm].address = address;
    });

    // 2. purchase orders
    purchaseOrders.forEach((po: any) => {
      const name = String(po.vendorId || '').trim();
      const norm = normalizeName(name);
      if (!norm || norm === 'general vendor' || norm === 'general vendorgeneral vendor') return;
      if (!extracted[norm]) {
        extracted[norm] = { name, phone: '', gstin: '', address: '' };
      }
    });

    // 3. grns
    grns.forEach((grn: any) => {
      const name = String(grn.vendorId || '').trim();
      const norm = normalizeName(name);
      if (!norm || norm === 'general vendor' || norm === 'general vendorgeneral vendor') return;
      if (!extracted[norm]) {
        extracted[norm] = { name, phone: '', gstin: '', address: '' };
      }
    });

    // 4. raw materials
    rawMaterials.forEach((rm: any) => {
      const name = String(rm.preferredVendor || '').trim();
      const norm = normalizeName(name);
      if (!norm || norm === 'general vendor' || norm === 'general vendorgeneral vendor') return;
      if (!extracted[norm]) {
        extracted[norm] = { name, phone: '', gstin: '', address: '' };
      }
    });

    // Rebuild vendor list to clean duplicates and add extracted
    const cleanVendors: any[] = [];
    const seenNames = new Set<string>();
    const seenPhones = new Set<string>();
    const seenGstins = new Set<string>();

    // Force seed General Vendor VND-001 first
    cleanVendors.push(normalizeVendorMaster({
      id: 'VND-001',
      name: 'General Vendor',
      companyName: 'General Supplies',
      phone: 'N/A',
      gstin: 'N/A',
      businessAddress: 'N/A',
      status: 'Active',
      PAN: 'N/A',
      openingBalance: 0
    }));
    seenNames.add('general vendor');

    currentVendors.forEach((v: any) => {
      const normName = normalizeName(v.name);
      if (!normName || normName === 'general vendor' || normName === 'general vendorgeneral vendor') return;
      
      const phone = String(v.phone || '').trim();
      const gstin = String(v.gstin || '').trim().toUpperCase();
      
      const hasPhoneDup = phone && phone !== 'N/A' && seenPhones.has(phone);
      const hasGstinDup = gstin && gstin !== 'N/A' && seenGstins.has(gstin);
      const hasNameDup = seenNames.has(normName);
      
      if (!hasPhoneDup && !hasGstinDup && !hasNameDup) {
        cleanVendors.push(normalizeVendorMaster(v));
        seenNames.add(normName);
        if (phone && phone !== 'N/A') seenPhones.add(phone);
        if (gstin && gstin !== 'N/A') seenGstins.add(gstin);
      }
    });

    // Add extracted missing vendors
    Object.keys(extracted).forEach((norm) => {
      const ext = extracted[norm];
      const nameExists = cleanVendors.some(cv => normalizeName(cv.name) === norm);
      const phoneExists = ext.phone && ext.phone !== 'N/A' && cleanVendors.some(cv => cv.phone === ext.phone);
      const gstinExists = ext.gstin && ext.gstin !== 'N/A' && cleanVendors.some(cv => cv.gstin === ext.gstin);
      
      if (!nameExists && !phoneExists && !gstinExists) {
        const nextNum = cleanVendors.length + 1;
        const nextCode = `VND-${String(nextNum).padStart(3, '0')}`;
        cleanVendors.push(normalizeVendorMaster({
          id: nextCode,
          name: ext.name,
          phone: ext.phone || 'N/A',
          gstin: ext.gstin || 'N/A',
          businessAddress: ext.address || 'N/A',
          openingBalance: 0,
          status: 'Active'
        }));
      }
    });

    localStorage.setItem(VENDORS_KEY, JSON.stringify(cleanVendors));
  } catch (e) {
    console.error('Error running vendor migration:', e);
  }
}

export function runRawMaterialMetadataMigration(rawMaterialsFromCanister: RawMaterial[]): void {
  try {
    const allMeta = JSON.parse(localStorage.getItem(METADATA_KEY) || '{}');
    let changed = false;
    (rawMaterialsFromCanister || []).forEach((m) => {
      if (!allMeta[m.id]) {
        allMeta[m.id] = {
          purchaseRate: m.unitCost || 0,
          maxStockLevel: 100,
          hsnCode: '5609',
          gstPercent: 5,
          storageRack: 'N/A',
          warehouse: 'N/A',
          status: 'Active',
          notes: 'Seeded Master Record'
        };
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(METADATA_KEY, JSON.stringify(allMeta));
    }
  } catch (e) {
    console.error('Error running raw material metadata migration:', e);
  }
}

export function normalizeProductMaster(prod: any): any {
  return {
    id: String(prod.id || '').trim(),
    vigat: String(prod.vigat || '').trim(),
    rate: Math.max(0, Number(prod.rate) || 0),
    hsnCode: String(prod.hsnCode || '5609').trim(),
    stock: BigInt(Number(prod.stock) || 0),
    productionCost: Math.max(0, Number(prod.productionCost) || 0),
    bom: prod.bom || []
  };
}

export function normalizeCustomerMaster(cust: any): any {
  return {
    id: String(cust.id || '').trim(),
    name: String(cust.name || '').trim(),
    businessAddress: String(cust.businessAddress || '').trim(),
    phone: String(cust.phone || '').trim(),
    gstNo: String(cust.gstNo || '').trim().toUpperCase()
  };
}

export function exportToCSV(data: any[], headers: string[], filename: string): void {
  if (!data || !data.length) return;
  const csvRows: string[] = [];
  csvRows.push(headers.join(','));
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ('' + (val === undefined || val === null ? '' : val)).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  const csvString = csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCSV(text: string): any[] {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const result: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const currentline: string[] = [];
    let insideQuote = false;
    let entry = '';
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        currentline.push(entry.replace(/^"|"$/g, '').trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    currentline.push(entry.replace(/^"|"$/g, '').trim());
    
    const obj: any = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = currentline[j] || '';
    }
    result.push(obj);
  }
  return result;
}

export function formatSafeDate(record: any): string {
  if (!record) record = {};
  const fallbacks = [
    record.date,
    record.receivedDate,
    record.invoiceDate,
    record.createdAt,
    record.updatedAt,
    record.purchaseDate,
    record.dueDate,
    record.expiryDate,
    record.timestamp
  ];
  
  let targetDate: Date | null = null;
  
  for (const val of fallbacks) {
    if (val !== undefined && val !== null && val !== '') {
      let ms = 0;
      if (typeof val === 'bigint') {
        ms = Number(val) / 1000000;
      } else if (typeof val === 'number') {
        ms = val > 100000000000 ? val : val * 1000;
      } else if (typeof val === 'string') {
        if (/^\d+$/.test(val)) {
          if (val.length > 13) {
            ms = Number(BigInt(val) / 1000000n);
          } else {
            const num = Number(val);
            ms = num > 100000000000 ? num : num * 1000;
          }
        } else {
          const parsed = Date.parse(val);
          if (!isNaN(parsed)) {
            targetDate = new Date(parsed);
            break;
          }
        }
      }
      
      if (ms > 0) {
        targetDate = new Date(ms);
        break;
      }
    }
  }
  
  if (!targetDate || isNaN(targetDate.getTime())) {
    targetDate = new Date();
  }
  
  const day = String(targetDate.getDate()).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[targetDate.getMonth()];
  const year = targetDate.getFullYear();
  
  return `${day} ${month} ${year}`;
}

export function getPurchasePaymentStatus(p: any): string {
  if (!p) return 'Unpaid';
  const totalAmount = Number(p.totalAmount) || 0;
  const paidAmount = Number(p.paidAmount) || 0;
  const outstanding = Math.max(0, totalAmount - paidAmount);
  
  if (outstanding <= 0) {
    return 'Paid';
  }
  
  if (p.dueDate) {
    let dueTime = 0;
    if (typeof p.dueDate === 'bigint') {
      dueTime = Number(p.dueDate) / 1000000;
    } else if (typeof p.dueDate === 'number') {
      dueTime = p.dueDate > 100000000000 ? p.dueDate : p.dueDate * 1000;
    } else if (typeof p.dueDate === 'string') {
      if (/^\d+$/.test(p.dueDate)) {
        if (p.dueDate.length > 13) {
          dueTime = Number(BigInt(p.dueDate) / 1000000n);
        } else {
          const num = Number(p.dueDate);
          dueTime = num > 100000000000 ? num : num * 1000;
        }
      } else {
        const parsed = Date.parse(p.dueDate);
        if (!isNaN(parsed)) {
          dueTime = parsed;
        }
      }
    }
    
    if (dueTime > 0 && dueTime < Date.now()) {
      return 'Overdue';
    }
  }
  
  if (paidAmount > 0) {
    return 'Partially Paid';
  }
  
  return 'Unpaid';
}
