import { StockAlert, parseWhatsAppNumbers, buildStockAlertMessage } from '../utils/whatsapp';
import { toast } from 'sonner';

export function getStockAlertsFromStorage(): StockAlert[] {
  try {
    const stored = localStorage.getItem('mock_stock_alerts');
    const parsed = stored ? JSON.parse(stored) : [];
    const alerts: StockAlert[] = Array.isArray(parsed) ? parsed : [];
    let migrated = false;

    // Migrate legacy alerts lacking alertScope
    alerts.forEach(a => {
      if (a && !a.alertScope) {
        if (a.alertType && a.alertType.startsWith('RAW_MATERIAL')) {
          a.alertScope = 'RAW_MATERIAL';
          migrated = true;
        } else if (
          a.alertType &&
          (a.alertType.includes('SHORTAGE') ||
           a.alertType.includes('PRODUCTION_REQUIRED') ||
           a.alertType.includes('NEGATIVE_STOCK_PREVENTED') ||
           a.alertType.includes('FINISHED_GOODS') ||
           a.alertType === 'LOW_STOCK' ||
           a.alertType === 'OUT_OF_STOCK')
        ) {
          a.alertScope = 'FINISHED_GOODS';
          migrated = true;
        } else if (a.productId && a.productId.startsWith('RM-')) {
          a.alertScope = 'RAW_MATERIAL';
          migrated = true;
        } else if (a.productId) {
          a.alertScope = 'FINISHED_GOODS';
          migrated = true;
        } else {
          a.alertScope = 'FINISHED_GOODS';
          migrated = true;
        }
      }
    });

    if (migrated) {
      localStorage.setItem('mock_stock_alerts', JSON.stringify(alerts));
    }
    return alerts;
  } catch (e) {
    console.error('Error parsing stock alerts:', e);
    return [];
  }
}

export function saveStockAlertsToStorage(alerts: StockAlert[]) {
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const oldValue = localStorage.getItem('mock_stock_alerts');
  const newValue = JSON.stringify(safeAlerts);
  if (oldValue !== newValue) {
    localStorage.setItem('mock_stock_alerts', newValue);
  }
}

// Future Business API Mock Placeholder
export async function sendWhatsAppBusinessAlert(alertId: string): Promise<boolean> {
  console.log(`sendWhatsAppBusinessAlert triggered for: ${alertId}`);
  // "Requires WhatsApp Business Cloud API credentials and backend endpoint."
  return false;
}

/**
 * Checks all finished goods and raw materials, and creates StockAlerts when low levels are detected.
 * Auto deduplicates based YYYY-MM-DD to avoid duplicates if Alert Frequency is 'Once per day'.
 */
export async function checkAndCreateStockAlerts(
  actor: any,
  products: any[],
  rawMaterials: any[]
): Promise<StockAlert[]> {
  const settingsStored = localStorage.getItem('mock_settings');
  const settings = settingsStored ? JSON.parse(settingsStored) : {};

  // If no numbers configured, fall back to other fields safely
  const whatsappRaw =
    settings?.whatsappAlertNumbers ||
    settings?.phoneNumber ||
    settings?.businessPhone ||
    (settings.businessInfo ? settings.businessInfo.split('|')[2] || '' : '') ||
    '';
  const numbers = parseWhatsAppNumbers(whatsappRaw);
  const safeNumbers = Array.isArray(numbers) ? numbers : [];

  const enableAuto = settings.enableAutoStockAlerts !== undefined ? settings.enableAutoStockAlerts : true;
  const alertFreq = settings.alertFrequency || 'Once per day'; // Once per day / Every time / Manual only
  const threshold = settings.lowStockAlertThreshold !== undefined ? Number(settings.lowStockAlertThreshold) : 10;

  const alerts = getStockAlertsFromStorage();
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  let newAlertCreated = false;

  const checkProduct = async (prod: any) => {
    if (!prod) return;
    const currentStock = Number(prod.stock || 0);
    const shortageQty = Number(prod.shortageQty || 0);
    
    let alertType: StockAlert['alertType'] | null = null;
    let shortageAmount = 0;
    let prodRequired = 0;

    if (shortageQty > 0) {
      alertType = 'SHORTAGE';
      shortageAmount = shortageQty;
      prodRequired = shortageQty;
    } else if (currentStock === 0) {
      alertType = 'OUT_OF_STOCK';
    } else if (currentStock <= threshold) {
      alertType = 'LOW_STOCK';
    }

    if (alertType) {
      // Deduplicate strictly
      const alreadySentToday = safeAlerts.some(
        a => a && a.productId === prod.id && a.alertType === alertType && a.createdAt && a.createdAt.startsWith(todayStr)
      );

      if (alreadySentToday && alertFreq === 'Once per day') {
        return;
      }

      // Create new StockAlert
      const newAlert: StockAlert = {
        id: `FG-ALERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: prod.id,
        productName: prod.vigat,
        productCode: prod.id,
        productImage: prod.photoUrl || '',
        alertScope: 'FINISHED_GOODS',
        alertType,
        currentStock,
        shortageQty: shortageAmount > 0 ? shortageAmount : undefined,
        productionRequiredQty: prodRequired > 0 ? prodRequired : undefined,
        unit: 'pcs',
        message: '',
        recipients: safeNumbers,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

      newAlert.message = buildStockAlertMessage(newAlert);
      safeAlerts.push(newAlert);
      newAlertCreated = true;

      // Show toast
      toast.warning(`Low stock alert created for finished good ${prod.vigat}.`);

      // Trigger audit log
      if (actor) {
        try {
          const maskedNumbers = safeNumbers.map((n: string) => {
            if (n.length <= 6) return '******';
            return n.slice(0, 4) + '******' + n.slice(-2);
          }).join(', ');

          await actor.logAuditUnified(
            'ERP',
            'LOW_STOCK_ALERT_CREATED',
            `Auto-alert created for finished good ${prod.vigat} (Type: ${alertType}, Stock: ${currentStock})`,
            undefined,
            undefined,
            JSON.stringify({
              productId: prod.id,
              productName: prod.vigat,
              alertScope: 'FINISHED_GOODS',
              alertType,
              currentStock,
              shortageQty: shortageAmount,
              phoneNumberMasked: maskedNumbers,
              timestamp: new Date().toISOString()
            })
          );
        } catch (e) {
          console.error('Audit log for low stock alert failed:', e);
        }
      }
    }
  };

  const checkRaw = async (raw: any) => {
    if (!raw) return;
    const currentStock = Number(raw.currentStock || 0);
    const minStock = Number(raw.minStockAlert || threshold);

    if (currentStock <= minStock) {
      const alertType = 'RAW_MATERIAL_LOW_STOCK';
      
      const alreadySentToday = safeAlerts.some(
        a => a && a.productId === raw.id && a.alertType === alertType && a.createdAt && a.createdAt.startsWith(todayStr)
      );

      if (alreadySentToday && alertFreq === 'Once per day') {
        return;
      }

      const newAlert: StockAlert = {
        id: `RM-ALERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: raw.id,
        productName: raw.name,
        productCode: raw.id,
        productImage: raw.photoUrl || '',
        alertScope: 'RAW_MATERIAL',
        alertType,
        currentStock,
        minStockLevel: minStock,
        unit: raw.unit || 'pcs',
        message: '',
        recipients: safeNumbers,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

      newAlert.message = buildStockAlertMessage(newAlert);
      safeAlerts.push(newAlert);
      newAlertCreated = true;

      toast.warning(`Low stock alert created for raw material ${raw.name}.`);

      if (actor) {
        try {
          const maskedNumbers = safeNumbers.map((n: string) => {
            if (n.length <= 6) return '******';
            return n.slice(0, 4) + '******' + n.slice(-2);
          }).join(', ');

          await actor.logAuditUnified(
            'ERP',
            'LOW_STOCK_ALERT_CREATED',
            `Auto-alert created for raw material ${raw.name} (Stock: ${currentStock})`,
            undefined,
            undefined,
            JSON.stringify({
              productId: raw.id,
              productName: raw.name,
              alertScope: 'RAW_MATERIAL',
              alertType,
              currentStock,
              minStockLevel: minStock,
              phoneNumberMasked: maskedNumbers,
              timestamp: new Date().toISOString()
            })
          );
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const safeProducts = Array.isArray(products) ? products : [];
  const safeRawMaterials = Array.isArray(rawMaterials) ? rawMaterials : [];

  if (enableAuto) {
    for (let p of safeProducts) {
      await checkProduct(p);
    }
    for (let r of safeRawMaterials) {
      await checkRaw(r);
    }

    if (newAlertCreated) {
      saveStockAlertsToStorage(safeAlerts);
    }
  }

  // Deduplicate AUTO_STOCK_ALERT_CHECK_COMPLETED audit logging (once per day only!)
  const lastCheckLogDate = localStorage.getItem('last_auto_check_log_date');
  if (actor && lastCheckLogDate !== todayStr) {
    try {
      localStorage.setItem('last_auto_check_log_date', todayStr);
      await actor.logAuditUnified(
        'ERP',
        'AUTO_STOCK_ALERT_CHECK_COMPLETED',
        `Automatic stock alert check completed.`,
        undefined,
        undefined,
        JSON.stringify({ timestamp: new Date().toISOString() })
      );
    } catch (e) {
      console.error(e);
    }
  }

  // Dev-only logs
  console.log(`[StockAlerts] raw alerts count: ${safeAlerts.length}`);

  return Array.isArray(safeAlerts) ? safeAlerts : [];
}

export async function markStockAlertOpened(
  actor: any,
  alertId: string,
  phoneNumber: string
): Promise<void> {
  const alerts = getStockAlertsFromStorage();
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const alert = safeAlerts.find(a => a && a.id === alertId);
  if (alert) {
    alert.status = 'OPENED';
    alert.lastSentAt = new Date().toISOString();
    saveStockAlertsToStorage(safeAlerts);

    const maskedPhone = phoneNumber ? phoneNumber.slice(0, 4) + '******' + phoneNumber.slice(-2) : '******';

    if (actor) {
      try {
        await actor.logWhatsAppStockAlertOpened(
          alert.productId,
          alert.productName,
          alert.shortageQty || 0,
          maskedPhone,
          'STOCK_ALERT'
        );
      } catch (e) {
        console.error(e);
      }
    }
  }
}
