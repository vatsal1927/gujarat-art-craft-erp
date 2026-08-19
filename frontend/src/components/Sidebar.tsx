import { useState, useEffect } from 'react';
import { Link, useRouterState, useNavigate } from '@tanstack/react-router';
import { useAuth } from './AuthGuard';
import { useSettings } from '../hooks/useQueries';
import { hasDeptAccess, getRoleName } from '../utils/auth';
import { 
  Home, FileText, History, BookOpen, ShoppingBag, Package, Percent, Wallet, Hammer, 
  Settings as SettingsIcon, Menu, X, LogOut, ChevronDown, ChevronRight, Search, 
  Building2, Users, FileBarChart, HardDriveDownload, UserSquare2, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Helper for navigation tree structure
interface NavSubItem {
  label: string;
  path?: string;
  tab?: string;
  isGroup?: boolean;
  disabled?: boolean;
  items?: NavSubItem[];
}

interface NavGroup {
  label: string;
  icon: any;
  items: NavSubItem[];
}

const Sidebar = () => {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data: settings } = useSettings();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  
  const handleSetCollapsed = (val: boolean) => {
    setIsCollapsed(val);
    localStorage.setItem('sidebar-collapsed', String(val));
    window.dispatchEvent(new Event('sidebar-toggle'));
  };

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const roleName = getRoleName(user);
  const isMasterAdmin = roleName === 'Master Admin';
  const isAdminOperational = roleName === 'Admin';
  const isStaff = roleName === 'Staff';
  const isAdmin = isMasterAdmin;

  // Custom branding from settings
  const companyName = settings?.companyName || "Gujarat Art & Crafts";
  const logoUrl = settings?.companyLogo || null;
  const sidebarStyle = settings?.sidebarStyle || "Minimalist"; // "Minimalist" | "Dark Sidebar" | "Light Sidebar" | "Accent Accent"

  // Load color tokens based on style
  const isDarkSidebar = sidebarStyle === "Dark Sidebar";
  const isAccentSidebar = sidebarStyle === "Accent Accent";

  const getSidebarBg = () => {
    return "bg-[#5C0A12] border-r-2 border-[#D4A017] text-[#F8F2E8]";
  };

  const getHeaderBorder = () => {
    return "border-[#D4A017]/30";
  };

  const getItemHoverClass = () => {
    return "hover:bg-white/5 text-[#F8F2E8]/80 hover:text-[#D4A017]";
  };

  const getActiveItemClass = () => {
    return "bg-[#D4A017] text-[#7B0F1A] border-l-4 border-l-[#C89B3C] font-bold shadow-md";
  };

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  // Nav Groups & Structure (Filtered by Role)
  const allGroups: NavGroup[] = [
    {
      label: 'Sales',
      icon: FileText,
      items: [
        { label: 'Create Invoice', path: '/sales' },
        { label: 'Invoice History', path: '/history' },
        { label: 'Sales Orders', path: '/sales-orders' },
        { label: 'Quotations', path: '/sales/quotations', disabled: true },
        { label: 'Customer Payments', path: '/sales/payments', disabled: true }
      ]
    },
    {
      label: 'Inventory',
      icon: Package,
      items: isStaff ? [
        { label: 'Raw Materials', path: '/inventory', tab: 'raw-materials' },
        { label: 'Finished Goods', path: '/inventory', tab: 'finished-goods' }
      ] : [
        { label: 'Raw Materials', path: '/inventory', tab: 'raw-materials' },
        { label: 'Finished Goods', path: '/inventory', tab: 'finished-goods' },
        { label: 'Consumption Logs', path: '/consumption-logs' },
        { label: 'Inventory Transactions', path: '/inventory-transactions' },
        { label: 'Stock Alerts', path: '/stock-alerts' },
        { label: 'Inventory Reports', path: '/inventory/reports', disabled: true }
      ]
    },
    {
      label: 'Production System',
      icon: Hammer,
      items: isStaff ? [
        { label: 'Job Work', path: '/production' },
        { label: 'Collections', path: '/collections' },
        { label: 'Employee Ledger', path: '/employee-ledger' },
        { label: 'Employee Payments', path: '/employee-payments' }
      ] : [
        { label: 'Job Work', path: '/production' },
        { label: 'Collections', path: '/collections' },
        { label: 'Production Planning', path: '/production-planning' },
        { label: 'Purchase Planning', path: '/purchase-planning' },
        { label: 'Employee Payments', path: '/employee-payments' },
        { label: 'Production Reports', path: '/production-reports' },
        { label: 'MRP Analytics', path: '/production/mrp-analytics', disabled: true }
      ]
    },
    {
      label: 'Finance',
      icon: Wallet,
      items: [
        {
          label: 'Purchases',
          isGroup: true,
          items: [
            { label: 'Purchase Management', path: '/purchases' },
            { label: 'Purchase Invoice History', path: '/finance/purchase-invoices' }
          ]
        },
        {
          label: 'Ledgers',
          isGroup: true,
          items: [
            { label: 'Customer Ledger', path: '/ledger', tab: 'customers' },
            { label: 'Vendor Ledger', path: '/ledger', tab: 'vendors' }
          ]
        },
        {
          label: 'Accounting',
          isGroup: true,
          items: [
            { label: 'Cash Book', path: '/cash-book' },
            { label: 'Bank Book', path: '/bank-book' },
            { label: 'Journal Entries', path: '/accounting/journal', disabled: true },
            { label: 'Trial Balance', path: '/profit-loss', tab: 'trial_balance' },
            { label: 'Balance Sheet', path: '/profit-loss', tab: 'balance_sheet' }
          ]
        },
        { label: 'Profit & Loss', path: '/profit-loss' },
        { label: 'GST Reports', path: '/gst' }
      ]
    },
    {
      label: 'Settings',
      icon: SettingsIcon,
      items: [
        { label: 'Users', path: '/users' },
        { label: 'Permissions', path: '/permissions' },
        { label: 'System Settings', path: '/settings' },
        { label: 'Costing Methods', path: '/settings/costing' },
        { label: 'Backup & Restore', path: '/settings/backup' },
        { label: 'Audit Logs', path: '/audit-logs' },
        { label: 'Company Profile', path: '/settings/profile' }
      ]
    }
  ];

  const hasGroupAccess = (label: string) => {
    if (isMasterAdmin) return true;
    if (isStaff) {
      return ['Inventory', 'Production System'].includes(label);
    }
    if (isAdminOperational) {
      return ['Sales', 'Inventory', 'Production System', 'Finance'].includes(label);
    }
    return false;
  };

  const filteredGroups = allGroups
    .map(group => {
      if (!hasGroupAccess(group.label)) return null;
      
      const filteredItems = group.items.map(item => {
        if (item.isGroup) {
          const filteredGroupItems = (item.items || []).filter(child => {
            if (isStaff) return true;
            if (isMasterAdmin) return true;
            
            if (child.path === '/purchases') {
              return hasDeptAccess(user, ['Purchase', 'Finance']);
            }
            if (child.path === '/finance/purchase-invoices') {
              return hasDeptAccess(user, ['Purchase', 'Finance']);
            }
            if (child.path === '/ledger') {
              if (child.tab === 'customers') return hasDeptAccess(user, ['Sales', 'Finance']);
              if (child.tab === 'vendors') return hasDeptAccess(user, ['Purchase', 'Finance']);
            }
            if (child.path === '/cash-book' || child.path === '/bank-book') {
              return hasDeptAccess(user, ['Finance']);
            }
            return true;
          });
          
          return {
            ...item,
            items: filteredGroupItems
          };
        }
        
        if (isStaff) return item;
        if (isMasterAdmin) return item;

        if (item.path === '/sales' || item.path === '/history') {
          return hasDeptAccess(user, ['Sales', 'Finance']) ? item : null;
        }
        if (item.path === '/inventory') {
          return hasDeptAccess(user, ['Inventory', 'Purchase', 'Production', 'Finance']) ? item : null;
        }
        if (item.path === '/consumption-logs' || item.path === '/inventory-transactions' || item.path === '/stock-alerts') {
          return hasDeptAccess(user, ['Inventory', 'Purchase', 'Production', 'Finance']) ? item : null;
        }
        if (item.path === '/gst' || item.path === '/profit-loss') {
          return hasDeptAccess(user, ['Finance']) ? item : null;
        }
        if (['/production', '/collections', '/production-planning', '/purchase-planning', '/employee-payments', '/production-reports'].includes(item.path || '')) {
          return hasDeptAccess(user, ['Production', 'Finance']) ? item : null;
        }
        if (item.path === '/sales-orders') {
          return hasDeptAccess(user, ['Sales', 'Finance']) ? item : null;
        }
        return item;
      }).filter((item): item is NavSubItem => item !== null);

      const cleanedItems = filteredItems.filter(item => {
        if (item.isGroup && (!item.items || item.items.length === 0)) return false;
        return true;
      });

      return {
        ...group,
        items: cleanedItems
      };
    })
    .filter((g): g is NavGroup => g !== null && g.items.length > 0);

  const isActive = (path: string, tab?: string) => {
    const currentPath = routerState.location.pathname;
    const currentSearch = routerState.location.search as any;
    const pathMatches = currentPath === path || (path !== '/' && currentPath.startsWith(path));
    
    if (tab) {
      return pathMatches && currentSearch.tab === tab;
    }
    return pathMatches;
  };

  // Auto-expand active group
  useEffect(() => {
    filteredGroups.forEach(group => {
      const hasActiveChild = group.items.some(item => {
        if (item.isGroup) {
          return (item.items || []).some(child => isActive(child.path || '', child.tab));
        }
        return isActive(item.path || '', item.tab);
      });
      if (hasActiveChild) {
        setOpenGroups(prev => ({ ...prev, [group.label]: true }));
      }
    });
  }, [routerState.location.pathname]);

  // Sidebar component for rendering links
  const renderNavLinks = () => {
    return (
      <div className="space-y-1.5 px-3 py-4">
        {/* Search Bar (if not collapsed) */}
        {!isCollapsed && (
          <div className="mb-4 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menus..."
              className="w-full text-xs rounded-lg pl-9 pr-3 py-2 border focus:outline-none focus:ring-1 focus:ring-[#D4A017] bg-white/10 border-[#D4A017]/30 placeholder-[#F8F2E8]/50 text-[#F8F2E8]"
            />
          </div>
        )}

        {/* Dashboard link */}
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
            isActive('/') ? getActiveItemClass() : getItemHoverClass()
          }`}
        >
          <Home className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span>Dashboard</span>}
        </Link>

        {/* Dynamic Nav Groups */}
        {filteredGroups.map(group => {
          const GroupIcon = group.icon;
          const isGroupOpen = !!openGroups[group.label];
          
          // Filter items based on search query
          const itemsFiltered = group.items.filter(item => 
            item.label.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (searchQuery && itemsFiltered.length === 0) return null;

          return (
            <div key={group.label} className="space-y-1">
              {/* Group Trigger */}
              <button
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isCollapsed ? "justify-center" : ""
                } ${getItemHoverClass()}`}
              >
                <div className="flex items-center space-x-3">
                  <GroupIcon className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span>{group.label}</span>}
                </div>
                {!isCollapsed && (
                  isGroupOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Group Items */}
              {isGroupOpen && !isCollapsed && (
                <div className={`pl-4 space-y-2 ${isDarkSidebar || isAccentSidebar ? "border-l border-white/10" : "border-l border-slate-100 dark:border-slate-800"} ml-5 py-1`}>
                  {itemsFiltered.map(item => {
                    if (item.isGroup) {
                      return (
                        <div key={item.label} className="space-y-1.5 mt-2.5 first:mt-0">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7B0F1A]/80 dark:text-saffron/80 px-2 block">
                            {item.label}
                          </span>
                          <div className="pl-3 border-l border-[#C89B3C]/20 ml-2 space-y-1">
                            {item.items?.map(child => (
                              <Link
                                key={child.label}
                                to={child.disabled ? undefined : child.path}
                                search={child.tab ? ({ tab: child.tab } as any) : undefined}
                                onClick={() => !child.disabled && setMobileOpen(false)}
                                className={`block px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                  child.disabled
                                    ? 'opacity-40 cursor-not-allowed text-[#3A1F12]/60'
                                    : isActive(child.path || '', child.tab) ? getActiveItemClass() : getItemHoverClass()
                                }`}
                              >
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <Link
                        key={item.label}
                        to={item.disabled ? undefined : item.path}
                        search={item.tab ? ({ tab: item.tab } as any) : undefined}
                        onClick={() => !item.disabled && setMobileOpen(false)}
                        className={`block px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          item.disabled
                            ? 'opacity-40 cursor-not-allowed text-[#3A1F12]/60'
                            : isActive(item.path || '', item.tab) ? getActiveItemClass() : getItemHoverClass()
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-[#7B0F1A] via-[#5C0A12] to-[#7B0F1A] border-b-2 border-[#D4A017] text-[#F8F2E8] h-16 flex items-center justify-between px-4 md:hidden shadow">
        <div className="flex items-center space-x-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-8 w-auto rounded object-contain max-w-[80px]" />
          ) : (
            <Building2 className="h-6 w-6 text-[#D4A017]" />
          )}
          <span className="font-extrabold text-sm tracking-wide">{companyName}</span>
        </div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setMobileOpen(true)}>
          <Menu className="h-6 w-6" />
        </Button>
      </header>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/50 backdrop-blur-sm">
          <div className={`w-64 max-w-[80%] flex flex-col h-full shadow-2xl relative animate-in slide-in-from-left duration-200 ${getSidebarBg()}`}>
            {/* Header */}
            <div className={`h-16 flex items-center justify-between px-4 border-b ${getHeaderBorder()}`}>
              <div className="flex items-center space-x-2">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-8 w-auto rounded object-contain max-w-[80px]" />
                ) : (
                  <Building2 className="h-5 w-5 text-[#D4A017]" />
                )}
                <span className="font-extrabold text-xs tracking-wider uppercase whitespace-nowrap">{companyName}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Scrollable Nav */}
            <div className="flex-1 overflow-y-auto">
              {renderNavLinks()}
            </div>

            {/* Footer with User Info & Logout */}
            <div className={`p-4 border-t ${getHeaderBorder()} flex items-center justify-between`}>
              <Link to="/profile" className="flex items-center gap-2 max-w-[80%]" onClick={() => setMobileOpen(false)}>
                {user?.profilePhoto ? (
                  <img src={user.profilePhoto} alt={user?.name || 'User'} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#7B0F1A]/20 text-[#D4A017] font-bold text-sm flex items-center justify-center flex-shrink-0 border border-[#D4A017]/30">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="truncate pr-2 text-left">
                  <p className="text-xs font-bold truncate">{user?.name || 'User'}</p>
                  <p className={`text-[10px] uppercase font-bold tracking-wider ${isDarkSidebar || isAccentSidebar ? "text-white/60" : "text-slate-400"}`}>
                    {roleName}
                  </p>
                </div>
              </Link>
              <Button onClick={logout} variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Collapsible) */}
      <aside className={`hidden md:flex flex-col fixed top-0 bottom-0 left-0 z-30 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      } ${getSidebarBg()}`}>
        {/* Header */}
        <div className={`h-16 flex items-center justify-between px-4 border-b ${getHeaderBorder()}`}>
          {!isCollapsed ? (
            <div className="flex items-center space-x-3 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 w-auto rounded object-contain max-w-[80px]" />
              ) : (
                <Building2 className="h-5 w-5 text-[#D4A017] flex-shrink-0 animate-pulse" />
              )}
              <span className="font-extrabold text-sm tracking-wide uppercase whitespace-nowrap">{companyName}</span>
            </div>
          ) : (
            <div className="mx-auto">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-7 w-7 rounded object-cover" />
              ) : (
                <Building2 className="h-5 w-5 text-saffron animate-pulse" />
              )}
            </div>
          )}
          
          {/* Collapse Toggle */}
          {!isCollapsed && (
            <button 
              onClick={() => handleSetCollapsed(true)} 
              className={`p-1 rounded transition-all ${isDarkSidebar || isAccentSidebar ? "hover:bg-white/10" : "hover:bg-slate-100 dark:hover:bg-gray-800"}`}
              title="Collapse Sidebar"
            >
              <ChevronRight className="h-4 w-4 transform rotate-180" />
            </button>
          )}
        </div>

        {isCollapsed && (
          <div className="flex justify-center py-2 border-b border-gold/10">
            <button 
              onClick={() => handleSetCollapsed(false)} 
              className={`p-1.5 rounded transition-all ${isDarkSidebar || isAccentSidebar ? "hover:bg-white/10" : "hover:bg-slate-100 dark:hover:bg-gray-800"}`}
              title="Expand Sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Scrollable Navigation links */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {renderNavLinks()}
        </div>

        {/* User Info & Footer */}
        <div className={`p-4 border-t ${getHeaderBorder()} flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          {!isCollapsed ? (
            <>
              <Link to="/profile" className="flex items-center gap-2 max-w-[80%] text-left">
                {user?.profilePhoto ? (
                  <img src={user.profilePhoto} alt={user?.name || 'User'} className="w-8 h-8 rounded-full object-cover border border-[#D4A017]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#7B0F1A]/20 text-[#D4A017] font-bold text-sm flex items-center justify-center flex-shrink-0 border border-[#D4A017]/30">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="truncate pr-2">
                  <p className="text-xs font-bold truncate">{user?.name || 'User'}</p>
                  <p className={`text-[9px] uppercase font-bold tracking-wider leading-none mt-0.5 ${isDarkSidebar || isAccentSidebar ? "text-white/60" : "text-slate-400"}`}>
                    {roleName}
                  </p>
                </div>
              </Link>
              <Button onClick={logout} variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20" title="Sign Out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link to="/profile" title="View Profile">
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt={user?.name || 'User'} className="w-8 h-8 rounded-full object-cover border border-[#D4A017]" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#7B0F1A]/20 text-[#D4A017] font-bold text-sm flex items-center justify-center border border-[#D4A017]/30">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </Link>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
