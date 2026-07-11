import { useState, useEffect, useMemo, useRef } from 'react';
import { useRawMaterials, useProducts } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../components/AuthGuard';
import { AlertTriangle, CheckCircle, Search, RefreshCw, MessageSquare, Bell, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { StockAlertModal } from '../components/StockAlertModal';
import { checkAndCreateStockAlerts, getStockAlertsFromStorage, markStockAlertOpened } from '../services/stockAlertService';
import { parseWhatsAppNumbers, buildWhatsAppUrl, openWhatsAppLink, StockAlert } from '../utils/whatsapp';
import Unauthorized from './Unauthorized';
import { hasDeptAccess } from '../utils/auth';

const StockAlerts = () => {
  const { user } = useAuth();
  const { actor } = useActor();

  const isStaff = !!(user?.role && 'Staff' in user.role);
  const canViewAlerts = user && (
    'Admin' in user.role || 
    'Manager' in user.role || 
    hasDeptAccess(user, ['Inventory', 'Finance', 'Purchase'], 'canView')
  );

  // Queries
  const { data: rawMaterials = [], isLoading: loadingRaw, refetch: refetchRaw } = useRawMaterials({ enabled: !!canViewAlerts && !isStaff });
  const { data: products = [], isLoading: loadingProducts, refetch: refetchProducts } = useProducts({ enabled: !!canViewAlerts && !isStaff });

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('All'); // All, RAW_MATERIAL, FINISHED_GOODS
  const [statusFilter, setStatusFilter] = useState('PENDING'); // All, PENDING, OPENED
  const [stockAlertsList, setStockAlertsList] = useState<StockAlert[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // WhatsApp Modal state
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waSelectedAlert, setWaSelectedAlert] = useState<StockAlert | null>(null);

  const getImageUrl = (id: string, fallbackUrl?: string) => {
    const customImages = JSON.parse(localStorage.getItem('mock_uploaded_images') || '{}');
    return customImages[id] || fallbackUrl || 'https://images.unsplash.com/photo-1530087965147-7a72d733c56a?w=1200&h=800&fit=crop&q=90&fm=jpg';
  };

  const handleOpenWhatsAppModal = (alert: StockAlert) => {
    const fallbackImage = alert.alertScope === 'RAW_MATERIAL' 
      ? 'https://images.unsplash.com/photo-1530087965147-7a72d733c56a?w=1200&h=800&fit=crop&q=90&fm=jpg'
      : 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&h=800&fit=crop&q=90&fm=jpg';
    
    const resolvedUrl = getImageUrl(alert.productId, alert.productImage || fallbackImage);
    setWaSelectedAlert(alert);
    setIsWaModalOpen(true);
  };

  const handleExecuteSendAlert = async (phone: string) => {
    if (!waSelectedAlert) return;

    try {
      await markStockAlertOpened(actor, waSelectedAlert.id, phone);
      
      openWhatsAppLink(phone, waSelectedAlert.message);
      
      toast.success(`WhatsApp alert dispatched to ${phone}!`);
      
      // Refresh local alerts list
      setStockAlertsList(getStockAlertsFromStorage());
    } catch (e: any) {
      toast.error('Failed to dispatch alert: ' + e.message);
    }
  };

  const handleSendToAll = async () => {
    if (!waSelectedAlert) return;
    const recipients = waSelectedAlert.recipients || [];
    if (recipients.length === 0) {
      toast.error('No recipients configured to send to.');
      return;
    }

    try {
      for (const phone of recipients) {
        await markStockAlertOpened(actor, waSelectedAlert.id, phone);
        openWhatsAppLink(phone, waSelectedAlert.message);
      }
      toast.success('Dispatched alerts to all configured numbers.');
      setStockAlertsList(getStockAlertsFromStorage());
      setIsWaModalOpen(false);
    } catch (e: any) {
      toast.error('Failed to dispatch to all numbers: ' + e.message);
    }
  };

  // Run alert check
  const runAlertCheck = async () => {
    if (!actor || rawMaterials.length === 0 || products.length === 0) return;
    setIsChecking(true);
    const toastId = toast.loading('Re-checking inventory stock levels...');
    try {
      const resolved = await checkAndCreateStockAlerts(actor, products, rawMaterials);
      setStockAlertsList(Array.isArray(resolved) ? resolved : []);
      toast.success('Inventory health check completed successfully!', { id: toastId });
    } catch (e: any) {
      toast.error('Inventory check failed: ' + e.message, { id: toastId });
    } finally {
      setIsChecking(false);
    }
  };

  // Sync alerts list on boot and when data updates
  useEffect(() => {
    const list = getStockAlertsFromStorage();
    setStockAlertsList(list);
  }, []);

  const hasCheckedAlertsRef = useRef(false);
  useEffect(() => {
    if (hasCheckedAlertsRef.current || isStaff || !actor || rawMaterials.length === 0 || products.length === 0) return;

    hasCheckedAlertsRef.current = true;
    checkAndCreateStockAlerts(actor, products, rawMaterials).then((resolvedAlerts) => {
      setStockAlertsList(Array.isArray(resolvedAlerts) ? resolvedAlerts : []);
    }).catch(err => {
      console.error('Failed to auto check stock alerts:', err);
    }).finally(() => {
      hasCheckedAlertsRef.current = false;
    });
  }, [rawMaterials, products, actor, isStaff]);

  // Processed and filtered alerts
  const filteredAlerts = useMemo(() => {
    let list = [...stockAlertsList];

    // Status filter
    if (statusFilter !== 'All') {
      list = list.filter(a => a.status === statusFilter);
    }

    // Scope filter
    if (scopeFilter !== 'All') {
      list = list.filter(a => a.alertScope === scopeFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => 
        a.productName.toLowerCase().includes(q) || 
        a.productId.toLowerCase().includes(q) || 
        a.alertType.toLowerCase().includes(q)
      );
    }

    // Sort by date descending (most recent first)
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list;
  }, [stockAlertsList, statusFilter, scopeFilter, searchQuery]);

  if (!user || !canViewAlerts) {
    return <Unauthorized />;
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-maroon dark:text-saffron font-serif flex items-center gap-2">
            <Bell className="h-6 w-6 text-maroon" /> Stock Alerts Dashboard
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Monitor real-time raw material shortages, low stocks, and trigger manual WhatsApp alerts.
          </p>
        </div>
        {!isStaff && (
          <Button 
            onClick={runAlertCheck} 
            disabled={isChecking || loadingRaw || loadingProducts}
            className="bg-maroon hover:bg-maroon/90 text-white font-bold text-xs h-9 border border-gold/30 self-start md:self-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isChecking ? 'animate-spin' : ''}`} />
            Run Stock Health Check
          </Button>
        )}
      </div>

      {/* Summary counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <Card className="border border-gold/20 shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pending Alerts</p>
                <h3 className="text-3xl font-extrabold text-maroon mt-1">
                  {stockAlertsList.filter(a => a.status === 'PENDING').length}
                </h3>
              </div>
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/20 text-maroon">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Shortages or low stock levels requiring attention.</p>
          </CardContent>
        </Card>

        <Card className="border border-gold/20 shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Opened/Notified</p>
                <h3 className="text-3xl font-extrabold text-green-700 mt-1">
                  {stockAlertsList.filter(a => a.status === 'OPENED').length}
                </h3>
              </div>
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Dispatched to vendor or production personnel.</p>
          </CardContent>
        </Card>

        <Card className="border border-gold/20 shadow-sm bg-white dark:bg-slate-900 sm:col-span-2 lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scope Breakdown</p>
                <div className="flex gap-4 mt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Raw Materials</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {stockAlertsList.filter(a => a.alertScope === 'RAW_MATERIAL' && a.status === 'PENDING').length} Low
                    </span>
                  </div>
                  <div className="border-l border-gold/20 pl-4">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Finished Goods</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {stockAlertsList.filter(a => a.alertScope === 'FINISHED_GOODS' && a.status === 'PENDING').length} Low
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main card list */}
      <Card className="border-2 border-gold shadow-md">
        <CardHeader className="bg-amber-50/20 border-b border-gold/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
          <div>
            <CardTitle className="text-maroon text-lg">Alert Registry Logs</CardTitle>
            <CardDescription>Filter, view, and act on stock warnings generated by the system.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex items-center border border-gold/40 rounded bg-white dark:bg-gray-800 px-3 py-1.5 text-xs">
              <Search className="h-4 w-4 text-slate-400 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts..."
                className="outline-none bg-transparent w-40 h-5"
              />
            </div>

            {/* Scope Filter */}
            <div className="flex items-center gap-1">
              <Filter className="h-3 w-3 text-slate-455" />
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger className="border-gold/40 w-32 h-9 text-xs bg-white dark:bg-gray-800">
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gold text-xs">
                  <SelectItem value="All">All Scopes</SelectItem>
                  <SelectItem value="RAW_MATERIAL">Raw Materials</SelectItem>
                  <SelectItem value="FINISHED_GOODS">Finished Goods</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-gold/40 w-32 h-9 text-xs bg-white dark:bg-gray-800">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gold text-xs">
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending Action</SelectItem>
                <SelectItem value="OPENED">Opened/Sent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No stock alerts match the specified search or filter criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAlerts.map((alert) => {
                const isPending = alert.status === 'PENDING';
                const isRaw = alert.alertScope === 'RAW_MATERIAL';
                
                const cardBorder = isPending 
                  ? 'border-red-200 dark:border-red-955 bg-red-50/10' 
                  : 'border-slate-100 dark:border-slate-800';

                const alertBadgeColor = alert.alertType.includes('OUT_OF_STOCK') || alert.alertType.includes('SHORTAGE')
                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300';

                return (
                  <div 
                    key={alert.id} 
                    className={`border rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all ${cardBorder}`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <Badge className="text-[9px] font-bold px-1.5 h-4 tracking-wide border-none bg-maroon text-white mb-1 uppercase">
                            {isRaw ? 'Raw Material' : 'Finished Good'}
                          </Badge>
                          <h4 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm leading-tight">
                            {alert.productName}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Code: {alert.productCode}</span>
                        </div>
                        <Badge className={`text-[9px] uppercase px-1.5 border-none ${alertBadgeColor}`}>
                          {alert.alertType.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      <div className="text-xs bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-gold/10 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Current Stock:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{alert.currentStock} {alert.unit}</span>
                        </div>
                        {alert.minStockLevel !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Alert Level:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{alert.minStockLevel} {alert.unit}</span>
                          </div>
                        )}
                        {alert.shortageQty !== undefined && alert.shortageQty > 0 && (
                          <div className="flex justify-between">
                            <span className="text-red-500 font-semibold">Shortage:</span>
                            <span className="font-extrabold text-red-650">{alert.shortageQty} {alert.unit}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic leading-relaxed">
                        "{alert.message.split('\n')[0]}..."
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-150/40 dark:border-slate-800">
                      <span className="text-[9px] text-slate-400">
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleOpenWhatsAppModal(alert)}
                        className={`h-7 text-[10px] px-2.5 font-bold flex items-center gap-1.5 border-none rounded-lg text-white ${
                          isPending ? 'bg-[#25D366] hover:bg-[#20ba5a]' : 'bg-slate-400 hover:bg-slate-550'
                        }`}
                      >
                        <MessageSquare className="h-3 w-3" />
                        {isPending ? 'WhatsApp Alert' : 'Resend Alert'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Modal */}
      {isWaModalOpen && (
        <StockAlertModal
          isOpen={isWaModalOpen}
          onClose={() => {
            setIsWaModalOpen(false);
            setWaSelectedAlert(null);
          }}
          alert={waSelectedAlert}
          imageUrl={getImageUrl(waSelectedAlert?.productId || '', waSelectedAlert?.productImage)}
          onSendAlert={handleExecuteSendAlert}
          onSendToAll={handleSendToAll}
        />
      )}
    </div>
  );
};

export default StockAlerts;
