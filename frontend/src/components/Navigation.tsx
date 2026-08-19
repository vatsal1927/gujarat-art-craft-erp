import { useState, useEffect, useRef } from 'react';
import { Link, useRouterState, useNavigate } from '@tanstack/react-router';
import { useAuth } from './AuthGuard';
import { useSettings } from '../hooks/useQueries';
import { hasDeptAccess, getRoleName } from '../utils/auth';
import { 
  Home, FileText, History, Settings as SettingsIcon, Menu, X, LogOut, ChevronDown, 
  Building2, Users, FileBarChart, Wallet, Hammer, Package, BookOpen, User, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubItem {
  label: string;
  path?: string;
  tab?: string;
  isGroup?: boolean;
  disabled?: boolean;
  items?: SubItem[];
}

interface NavMenu {
  label: string;
  icon: any;
  items: SubItem[] | null;
  path?: string;
}

const Navigation = () => {
  const { user, logout } = useAuth();
  const { data: settings } = useSettings();
  const navigate = useNavigate();
  const routerState = useRouterState();

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedGroup, setMobileExpandedGroup] = useState<string | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleName = getRoleName(user);
  const isMasterAdmin = roleName === 'Master Admin';
  const isAdminOperational = roleName === 'Admin';
  const isStaff = roleName === 'Staff';

  const settingsMenuItems = isMasterAdmin ? [
    { label: 'General Settings', tab: 'general', path: '/settings' as const },
    { label: 'Theme & Branding', tab: 'branding', path: '/settings' as const },
    { label: 'User Management', tab: 'users', path: '/settings' as const },
    { label: 'Audit Logs', tab: 'logs', path: '/settings' as const },
    { label: 'Backup & Restore', tab: 'general', path: '/backup' as const },
    { label: 'Security', tab: 'users', path: '/security' as const },
    { label: 'Permission Matrix', tab: 'users', path: '/permission-matrix' as const }
  ] : [];
  const canAccessSettings = settingsMenuItems.length > 0;

  const companyName = settings?.companyName || "Gujarat Art & Crafts";
  const logoUrl = settings?.companyLogo || null;

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  // Filter main navigation items based on User Role and Department
  const hasMenuAccess = (label: string) => {
    if (isMasterAdmin) return true;
    if (isStaff) {
      return ['Dashboard', 'Inventory', 'Production System'].includes(label);
    }
    if (isAdminOperational) {
      return ['Dashboard', 'Sales', 'Inventory', 'Production System', 'Finance'].includes(label);
    }
    return false;
  };

  const allMenus: NavMenu[] = [
    {
      label: 'Dashboard',
      icon: Home,
      path: '/',
      items: null
    },
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

  const visibleMenus = (() => {
    return allMenus
      .map(menu => {
        if (!hasMenuAccess(menu.label)) return null;
        if (!menu.items) return menu;
        
        const filteredItems = menu.items.map(item => {
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
        }).filter((item): item is SubItem => item !== null);
        
        const cleanedItems = filteredItems.filter(item => {
          if (item.isGroup && (!item.items || item.items.length === 0)) return false;
          return true;
        });

        return {
          ...menu,
          items: cleanedItems.length > 0 ? cleanedItems : null
        };
      })
      .filter((menu): menu is NavMenu => menu !== null && (menu.items !== null || menu.path !== undefined));
  })();

  const isActive = (path: string, tab?: string) => {
    const currentPath = routerState.location.pathname;
    const currentSearch = routerState.location.search as any;
    const pathMatches = currentPath === path || (path !== '/' && currentPath.startsWith(path));
    
    if (tab) {
      return pathMatches && currentSearch.tab === tab;
    }
    return pathMatches;
  };

  const isGroupActive = (menu: NavMenu) => {
    if (menu.path) return isActive(menu.path);
    if (menu.items) {
      return menu.items.some(item => {
        if (item.isGroup) {
          return (item.items || []).some(child => isActive(child.path || '', child.tab));
        }
        return isActive(item.path || '', item.tab);
      });
    }
    return false;
  };

  const handleDropdownToggle = (label: string) => {
    setActiveDropdown(activeDropdown === label ? null : label);
    setProfileDropdownOpen(false);
  };

  const handleProfileToggle = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
    setActiveDropdown(null);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#7B0F1A] via-[#5C0A12] to-[#7B0F1A] border-b-2 border-[#D4A017] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16" ref={dropdownRef}>
          
          {/* Left Section: Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/" className="flex items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-9 w-auto rounded object-contain max-w-[90px]" />
              ) : (
                <Building2 className="h-6 w-6 text-[#D4A017]" />
              )}
              <span className="font-extrabold tracking-wider text-[#D4A017] hover:text-[#F8F2E8] transition-colors whitespace-nowrap hidden sm:inline text-sm md:text-base lg:text-lg uppercase">
                GUJARAT ART & CRAFT
              </span>
              <span className="font-extrabold tracking-wider text-[#D4A017] hover:text-[#F8F2E8] transition-colors whitespace-nowrap sm:hidden text-xs">
                Gujarat Art & Craft
              </span>
            </Link>
          </div>

          {/* Middle Section: Desktop Nav Items */}
          <div className="hidden lg:flex items-center space-x-1">
            {visibleMenus.map((menu) => {
              const Icon = menu.icon;
              const hasSubmenu = !!menu.items;
              const isOpen = activeDropdown === menu.label;
              const active = isGroupActive(menu);

              if (!hasSubmenu && menu.path) {
                return (
                  <Link
                    key={menu.label}
                    to={menu.path}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                      active
                        ? 'bg-[#D4A017] text-[#7B0F1A] shadow-md border-b-2 border-[#C89B3C]'
                        : 'text-[#F8F2E8] hover:text-[#D4A017] hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'text-[#7B0F1A]' : 'text-[#D4A017]'}`} />
                    {menu.label}
                  </Link>
                );
              }

              return (
                <div key={menu.label} className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDropdownToggle(menu.label); }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 focus:outline-none ${
                      active
                        ? 'bg-[#D4A017]/15 text-[#D4A017] border border-[#D4A017]/30'
                        : 'text-[#F8F2E8] hover:text-[#D4A017] hover:bg-white/5'
                    }`}
                  >
                    <Icon className="h-4 w-4 text-[#D4A017]" />
                    <span>{menu.label}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-250 ${isOpen ? 'rotate-180' : ''} text-[#D4A017]`} />
                  </button>

                  {/* Dropdown Card */}
                  {isOpen && menu.items && (
                    <div className="absolute left-0 mt-2 w-64 rounded-xl border-2 border-[#C89B3C] bg-[#F8F2E8] shadow-xl py-2.5 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                      {menu.items.map((subItem) => {
                        if (subItem.isGroup) {
                          return (
                            <div key={subItem.label} className="mt-2.5 first:mt-0 px-4 py-1">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7B0F1A]/80 dark:text-saffron/80">
                                {subItem.label}
                              </span>
                              <div className="pl-2.5 border-l border-[#C89B3C]/20 mt-1 space-y-1">
                                {subItem.items?.map((child) => {
                                  const childActive = isActive(child.path || '', child.tab);
                                  return (
                                    <Link
                                      key={child.label}
                                      to={child.disabled ? undefined : child.path}
                                      search={child.tab ? ({ tab: child.tab } as any) : undefined}
                                      onClick={() => !child.disabled && setActiveDropdown(null)}
                                      className={`block px-2.5 py-1.5 text-xs font-bold transition-colors rounded ${
                                        child.disabled
                                          ? 'opacity-40 cursor-not-allowed text-[#3A1F12]/60'
                                          : childActive
                                          ? 'bg-[#7B0F1A]/10 text-[#7B0F1A]'
                                          : 'text-[#3A1F12] hover:bg-[#EFE4D2] hover:text-[#7B0F1A]'
                                      }`}
                                    >
                                      {child.label}
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                        
                        const subActive = isActive(subItem.path || '', subItem.tab);
                        return (
                          <Link
                            key={subItem.label}
                            to={subItem.disabled ? undefined : subItem.path}
                            search={subItem.tab ? ({ tab: subItem.tab } as any) : undefined}
                            onClick={() => !subItem.disabled && setActiveDropdown(null)}
                            className={`block px-4 py-2 text-xs font-bold transition-colors ${
                              subItem.disabled
                                ? 'opacity-40 cursor-not-allowed text-[#3A1F12]/60'
                                : subActive
                                ? 'bg-[#7B0F1A]/10 text-[#7B0F1A]'
                                : 'text-[#3A1F12] hover:bg-[#EFE4D2] hover:text-[#7B0F1A]'
                            }`}
                          >
                            {subItem.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Section: Settings dropdown & Profile */}
          <div className="hidden lg:flex items-center gap-3">


            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); handleProfileToggle(); }}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[#D4A017]/40 hover:bg-white/5 transition-all focus:outline-none"
              >
                {user?.profilePhoto ? (
                  <img src={user.profilePhoto} alt={user?.name || 'User'} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#D4A017]/10 text-[#D4A017] font-bold text-sm flex items-center justify-center">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="text-left leading-none hidden xl:block text-[#F8F2E8]">
                  <p className="text-xs font-extrabold">{user?.name || 'User'}</p>
                  <span className="text-[9px] font-bold text-[#D4A017] uppercase mt-0.5 block leading-none">
                    {roleName}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-[#D4A017]" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border-2 border-[#C89B3C] bg-[#F8F2E8] shadow-xl py-1.5 z-50 text-[#3A1F12]">
                  <div className="px-4 py-2 border-b border-[#C89B3C]/20 mb-1">
                    <p className="text-xs font-bold text-[#7B0F1A]">{user?.name || 'User'}</p>
                    <p className="text-[10px] text-slate-500 truncate">@{user?.username || 'user'}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold hover:bg-[#EFE4D2] hover:text-[#7B0F1A]"
                  >
                    <User className="h-4 w-4 text-[#D4A017]" />
                    My Profile
                  </Link>
                  <div className="h-px bg-[#C89B3C]/20 my-1" />
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-650 hover:bg-[#EFE4D2] flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4 text-red-600" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Left/Right Section: Mobile Hamburger Toggle */}
          <div className="flex items-center lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-[#D4A017] hover:bg-white/10"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t-2 border-[#D4A017] bg-[#F8F2E8] animate-in slide-in-from-top duration-200 shadow-xl z-50">
          <div className="px-4 py-3 space-y-1.5 max-h-[85vh] overflow-y-auto">
            {visibleMenus.map((menu) => {
              const Icon = menu.icon;
              const hasSubmenu = !!menu.items;
              const isExpanded = mobileExpandedGroup === menu.label;

              if (!hasSubmenu && menu.path) {
                return (
                  <Link
                    key={menu.label}
                    to={menu.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                      isActive(menu.path)
                        ? 'bg-[#7B0F1A] text-[#F8F2E8] border-b-2 border-[#D4A017] shadow-md'
                        : 'text-[#3A1F12] hover:bg-[#EFE4D2] hover:text-[#7B0F1A]'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive(menu.path) ? 'text-[#D4A017]' : 'text-[#7B0F1A]'}`} />
                    <span>{menu.label}</span>
                  </Link>
                );
              }

              return (
                <div key={menu.label} className="space-y-1">
                  <button
                    onClick={() => setMobileExpandedGroup(isExpanded ? null : menu.label)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-all focus:outline-none ${
                      isGroupActive(menu)
                        ? 'bg-[#EFE4D2]/60 text-[#7B0F1A] border-l-4 border-[#7B0F1A]'
                        : 'text-[#3A1F12] hover:bg-[#EFE4D2] hover:text-[#7B0F1A]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-[#7B0F1A]" />
                      <span>{menu.label}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} text-[#D4A017]`} />
                  </button>

                  {isExpanded && menu.items && (
                    <div className="pl-8 border-l border-[#C89B3C]/20 ml-5 py-1 space-y-2">
                      {menu.items.map((subItem) => {
                        if (subItem.isGroup) {
                          return (
                            <div key={subItem.label} className="space-y-1 mt-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {subItem.label}
                              </span>
                              <div className="pl-3 border-l border-[#C89B3C]/10 space-y-1">
                                {subItem.items?.map((child) => (
                                  <Link
                                    key={child.label}
                                    to={child.disabled ? undefined : child.path}
                                    search={child.tab ? ({ tab: child.tab } as any) : undefined}
                                    onClick={() => !child.disabled && setMobileMenuOpen(false)}
                                    className={`block px-2 py-1 text-xs font-bold rounded transition-colors ${
                                      child.disabled
                                        ? 'opacity-40 cursor-not-allowed text-[#3A1F12]/60'
                                        : isActive(child.path || '', child.tab)
                                        ? 'bg-[#7B0F1A]/10 text-[#7B0F1A]'
                                        : 'text-[#3A1F12] hover:bg-[#EFE4D2] hover:text-[#7B0F1A]'
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
                            key={subItem.label}
                            to={subItem.disabled ? undefined : subItem.path}
                            search={subItem.tab ? ({ tab: subItem.tab } as any) : undefined}
                            onClick={() => !subItem.disabled && setMobileMenuOpen(false)}
                            className={`block px-3 py-2 text-xs font-bold rounded transition-colors ${
                              subItem.disabled
                                ? 'opacity-40 cursor-not-allowed text-[#3A1F12]/60'
                                : isActive(subItem.path || '', subItem.tab)
                                ? 'bg-[#7B0F1A]/10 text-[#7B0F1A]'
                                : 'text-[#3A1F12] hover:bg-[#EFE4D2] hover:text-[#7B0F1A]'
                            }`}
                          >
                            {subItem.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}



            {/* Mobile Profile Display & Logout */}
            <div className="border-t border-[#C89B3C]/20 pt-3 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {user?.profilePhoto ? (
                  <img src={user.profilePhoto} alt={user?.name || 'User'} className="w-8 h-8 rounded-full object-cover border border-[#D4A017]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#7B0F1A]/10 text-[#7B0F1A] font-bold text-sm flex items-center justify-center border border-[#D4A017]/30">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="text-left leading-none">
                  <p className="text-xs font-extrabold text-[#7B0F1A]">{user?.name || 'User'}</p>
                  <span className="text-[9px] font-bold text-[#D4A017] uppercase mt-0.5 block leading-none">
                    {roleName}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-[#7B0F1A]/10 text-[#7B0F1A] border border-[#C89B3C]/30 text-xs py-1 px-2.5 h-8 font-bold flex items-center rounded-lg hover:bg-[#7B0F1A]/20 transition-all"
                >
                  Profile
                </Link>
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-red-650 hover:bg-red-50 text-xs py-1 px-2.5 h-8 font-bold"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
