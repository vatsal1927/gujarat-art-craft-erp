import { Link, useRouterState } from '@tanstack/react-router';
import { 
  Users, 
  ClipboardList, 
  Hammer, 
  PackageCheck, 
  BookOpen, 
  CreditCard, 
  BarChart3 
} from 'lucide-react';
import { useAuth } from './AuthGuard';

const ProductionSidebar = () => {
  const routerState = useRouterState();
  const { user } = useAuth();
  if (!user) return null;
  const isStaff = !!(user.role && 'Staff' in user.role);

  const isActive = (path: string) => {
    return routerState.location.pathname === path;
  };

  const rawMenuItems = [
    { path: '/employees', label: 'Employees', icon: Users },
    { path: '/job-work', label: 'Job Work', icon: ClipboardList },
    { path: '/production', label: 'Work Progress', icon: Hammer },
    { path: '/collections', label: 'Collections', icon: PackageCheck },
    { path: '/employee-ledger', label: 'Employee Ledger', icon: BookOpen },
    { path: '/employee-payments', label: 'Payments', icon: CreditCard },
    { path: '/production-reports', label: 'Production Reports', icon: BarChart3 }
  ];

  const menuItems = rawMenuItems
    .filter(item => {
      if (isStaff) {
        return ['/production', '/collections', '/employee-ledger', '/employee-payments'].includes(item.path);
      }
      return true;
    })
    .map(item => {
      if (isStaff) {
        if (item.path === '/production') return { ...item, label: 'My Work' };
        if (item.path === '/collections') return { ...item, label: 'My Collections' };
        if (item.path === '/employee-ledger') return { ...item, label: 'My Ledger' };
        if (item.path === '/employee-payments') return { ...item, label: 'My Payments' };
      }
      return item;
    });

  return (
    <div className="relative bg-[#5C0A12] border-2 border-[#D4A017] rounded-2xl shadow-xl overflow-hidden py-4 px-3 flex flex-col">
      {/* Toran border at the top */}
      <div className="toran-border absolute top-0 left-0 right-0 h-4" />
      
      <div className="pt-4 px-2">
        <h2 className="text-sm font-extrabold text-[#D4A017] uppercase tracking-wider mb-4 border-b pb-2 border-[#D4A017]/25 font-serif">
          Production System
        </h2>
      </div>

      <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 z-10 px-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                active
                  ? 'bg-[#D4A017] text-[#7B0F1A] shadow-md border-b-2 border-[#C89B3C]'
                  : 'text-[#F8F2E8] hover:text-[#D4A017] hover:bg-white/5'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? 'text-[#7B0F1A]' : 'text-[#D4A017]'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Toran border at the bottom */}
      <div className="toran-border mt-4 h-4 w-full opacity-60" />
    </div>
  );
};

export default ProductionSidebar;
