import { ReactNode } from 'react';
import ProductionSidebar from './ProductionSidebar';
import { Sparkles } from 'lucide-react';

export default function ProductionLayout({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-64 shrink-0">
        <ProductionSidebar />
      </div>
      <div className="flex-1 space-y-6 min-w-0">
        <div className="border-b-2 pb-3 border-[#D4A017] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[#D4A017] bg-[#7B0F1A]/10 p-1.5 rounded-lg border border-[#C89B3C]/30 flex items-center justify-center">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </span>
            <h1 className="text-2xl md:text-3xl font-bold font-serif text-[#7B0F1A] tracking-wide">{title}</h1>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
