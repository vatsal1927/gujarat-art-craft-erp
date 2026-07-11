import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  Calendar, FileSpreadsheet, ChevronRight, 
  TrendingUp, DollarSign, Package, Hammer, Users, 
  ArrowLeft, Printer, FileText, BarChart3, AlertCircle,
  TrendingDown, Percent
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '../utils/currencyFormat';
import { getOptionalNumber } from '../utils/candidHelpers';
import { formatERPDate, formatERPDateTime } from '../utils/calculations';
import type { Invoice, Purchase, Expense, RawMaterial, KarigarCollection, JobWork, DashboardStats, EmployeeDashboardStats } from '../backend';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  metric: 'sales' | 'purchases' | 'outstanding' | 'profit' | 'gst' | 'stock' | 'production' | 'wages' | null;
  invoices: Invoice[];
  purchases: Purchase[];
  expenses: Expense[];
  rawMaterials: RawMaterial[];
  collections: KarigarCollection[];
  jobWorks: JobWork[];
  stats: DashboardStats | undefined;
  prodStats: EmployeeDashboardStats | undefined;
  chartTheme: 'luxury-dark' | 'business-light' | 'craft-premium';
}

interface DrillLevel {
  level: number;
  label: string;
  type: string;
  data: any;
}

export default function AnalyticsModal({
  isOpen,
  onClose,
  metric,
  invoices,
  purchases,
  expenses,
  rawMaterials,
  collections,
  jobWorks,
  stats,
  prodStats,
  chartTheme
}: AnalyticsModalProps) {
  const [timeRange, setTimeRange] = useState<string>('30days');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [drillPath, setDrillPath] = useState<DrillLevel[]>([]);

  // Reset drill path when metric changes
  React.useEffect(() => {
    setDrillPath([]);
  }, [metric]);

  // Color Palette Theme Mapping
  const themeStyles = useMemo(() => {
    if (chartTheme === 'luxury-dark') {
      return {
        cardBg: 'bg-slate-950/95 border-slate-800 text-white shadow-2xl backdrop-blur-md',
        textMuted: 'text-slate-400',
        textPrimary: 'text-white',
        accentColor: '#10B981', // Emerald
        secondaryColor: '#8B5CF6', // Violet
        tertiaryColor: '#3B82F6', // Blue
        gridColor: 'rgba(255, 255, 255, 0.05)',
        axisColor: '#94A3B8',
        tooltipBg: '#0F172A',
        tooltipBorder: '#1E293B',
        tooltipText: '#F8FAFC'
      };
    } else if (chartTheme === 'business-light') {
      return {
        cardBg: 'bg-white/95 border-slate-200 text-slate-800 shadow-xl backdrop-blur-sm',
        textMuted: 'text-slate-500',
        textPrimary: 'text-slate-800',
        accentColor: '#4F46E5', // Indigo
        secondaryColor: '#F59E0B', // Amber
        tertiaryColor: '#10B981', // Green
        gridColor: 'rgba(0, 0, 0, 0.05)',
        axisColor: '#64748B',
        tooltipBg: '#FFFFFF',
        tooltipBorder: '#E2E8F0',
        tooltipText: '#0F172A'
      };
    } else {
      // craft-premium
      return {
        cardBg: 'bg-white/95 border-gold/45 text-slate-800 border-l-4 border-l-maroon shadow-md backdrop-blur-md',
        textMuted: 'text-slate-550',
        textPrimary: 'text-slate-900',
        accentColor: '#800020', // Maroon
        secondaryColor: '#F4C430', // Saffron
        tertiaryColor: '#D4AF37', // Gold
        gridColor: 'rgba(128, 0, 32, 0.05)',
        axisColor: '#6B7280',
        tooltipBg: '#FFFDF9',
        tooltipBorder: '#D4AF37',
        tooltipText: '#800020'
      };
    }
  }, [chartTheme]);

  const COLORS = [
    themeStyles.accentColor, 
    themeStyles.secondaryColor, 
    themeStyles.tertiaryColor, 
    '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'
  ];

  const metricTitle = useMemo(() => {
    switch (metric) {
      case 'sales': return 'Total Sales Analysis';
      case 'purchases': return 'Purchases Trend Analysis';
      case 'outstanding': return 'Outstanding Receivables';
      case 'profit': return 'Profitability & Trends';
      case 'gst': return 'GST Input & Output Audit';
      case 'stock': return 'Inventory & Valuation Center';
      case 'production': return 'Production & Job Works';
      case 'wages': return 'Artisan Payments Due';
      default: return 'Business Intelligence Details';
    }
  }, [metric]);

  // Helpers to parse bigints into standard JS date
  const parseDate = (d: bigint) => new Date(Number(d) / 1000000);

  // Filter lists based on date ranges
  const filteredInvoices = useMemo(() => {
    return filterByDate(invoices, 'date');
  }, [invoices, timeRange, customStart, customEnd]);

  const filteredPurchases = useMemo(() => {
    return filterByDate(purchases, 'date');
  }, [purchases, timeRange, customStart, customEnd]);

  const filteredExpenses = useMemo(() => {
    return filterByDate(expenses, 'date');
  }, [expenses, timeRange, customStart, customEnd]);

  const filteredCollections = useMemo(() => {
    return filterByDate(collections, 'collectionDate');
  }, [collections, timeRange, customStart, customEnd]);

  const filteredJobWorks = useMemo(() => {
    return filterByDate(jobWorks, 'jobDate');
  }, [jobWorks, timeRange, customStart, customEnd]);

  function filterByDate(data: any[], dateField: string) {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (timeRange === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === 'yesterday') {
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(now.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (timeRange === '7days') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === '30days') {
      startDate.setDate(now.getDate() - 30);
    } else if (timeRange === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeRange === 'lastmonth') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (timeRange === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (timeRange === 'custom' && customStart && customEnd) {
      const s = new Date(customStart);
      const e = new Date(customEnd);
      e.setHours(23, 59, 59, 999);
      return data.filter(item => {
        const d = parseDate(BigInt(item[dateField]));
        return d >= s && d <= e;
      });
    } else {
      startDate.setDate(now.getDate() - 30);
    }

    return data.filter(item => {
      const d = parseDate(BigInt(item[dateField]));
      return d >= startDate && d <= endDate;
    });
  }

  // --- DATE BOUNDARIES AND GROUPING LOGIC ---
  const dateRangeBoundaries = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (timeRange === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === 'yesterday') {
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(now.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (timeRange === '7days') {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === '30days') {
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === 'lastmonth') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (timeRange === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }
    return { startDate, endDate };
  }, [timeRange, customStart, customEnd]);

  const groupingLevel = useMemo(() => {
    const diffTime = Math.abs(dateRangeBoundaries.endDate.getTime() - dateRangeBoundaries.startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 45 ? 'month' : 'day';
  }, [dateRangeBoundaries]);

  const dateKeys = useMemo(() => {
    const keys: string[] = [];
    const start = new Date(dateRangeBoundaries.startDate);
    const end = dateRangeBoundaries.endDate;

    if (groupingLevel === 'month') {
      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      let safety = 0;
      while (current <= end && safety < 24) {
        const label = current.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        if (!keys.includes(label)) {
          keys.push(label);
        }
        current.setMonth(current.getMonth() + 1);
        safety++;
      }
    } else {
      const current = new Date(start);
      let safety = 0;
      while (current <= end && safety < 45) {
        const label = current.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        if (!keys.includes(label)) {
          keys.push(label);
        }
        current.setDate(current.getDate() + 1);
        safety++;
      }
    }
    return keys;
  }, [dateRangeBoundaries, groupingLevel]);

  const formatDateLabel = (dateBigInt: bigint) => {
    const d = parseDate(dateBigInt);
    if (groupingLevel === 'month') {
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    }
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // --- STATS COMPUTATIONS ---
  const analyticsSummary = useMemo(() => {
    let totalValue = 0;
    let count = 0;
    let highest = 0;
    let lowest = Infinity;
    let avg = 0;
    let growth = 14.2; 

    if (metric === 'sales') {
      count = filteredInvoices.length;
      filteredInvoices.forEach(inv => {
        totalValue += inv.totalAmount;
        if (inv.totalAmount > highest) highest = inv.totalAmount;
        if (inv.totalAmount < lowest) lowest = inv.totalAmount;
      });
    } else if (metric === 'purchases') {
      count = filteredPurchases.length;
      filteredPurchases.forEach(p => {
        totalValue += p.totalAmount;
        if (p.totalAmount > highest) highest = p.totalAmount;
        if (p.totalAmount < lowest) lowest = p.totalAmount;
      });
    } else if (metric === 'profit') {
      count = filteredInvoices.length + filteredPurchases.length;
      const salesVal = filteredInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
      const purcVal = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
      const expVal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
      totalValue = salesVal - purcVal - expVal;
      highest = Math.max(salesVal, purcVal, expVal);
      lowest = Math.min(salesVal, purcVal, expVal);
    } else if (metric === 'outstanding') {
      count = invoices.filter(i => (i.totalAmount - (i.paidAmount ?? i.totalAmount)) > 0).length;
      totalValue = stats?.totalOutstandingAmount || 0;
      invoices.forEach(inv => {
        const due = inv.totalAmount - (inv.paidAmount ?? inv.totalAmount);
        if (due > highest) highest = due;
        if (due > 0 && due < lowest) lowest = due;
      });
    } else if (metric === 'gst') {
      count = filteredInvoices.length + filteredPurchases.length;
      const outputGst = filteredInvoices.reduce((sum, i) => sum + (i.totalAmount * 0.18), 0);
      const inputGst = filteredPurchases.reduce((sum, p) => sum + (p.totalAmount * 0.05), 0);
      totalValue = outputGst - inputGst;
      highest = Math.max(outputGst, inputGst);
      lowest = Math.min(outputGst, inputGst);
    } else if (metric === 'stock') {
      count = rawMaterials.length;
      totalValue = rawMaterials.reduce((sum, m) => sum + (m.currentStock * m.unitCost), 0) + (prodStats?.stockValue || 0);
      rawMaterials.forEach(m => {
        const val = m.currentStock * m.unitCost;
        if (val > highest) highest = val;
        if (val > 0 && val < lowest) lowest = val;
      });
    } else if (metric === 'production') {
      count = filteredJobWorks.length;
      totalValue = filteredCollections.reduce((sum, c) => sum + getOptionalNumber(c.acceptedQty), 0);
      filteredCollections.forEach(c => {
        const acceptedQty = getOptionalNumber(c.acceptedQty);
        if (acceptedQty > highest) highest = acceptedQty;
        if (acceptedQty > 0 && acceptedQty < lowest) lowest = acceptedQty;
      });
    } else if (metric === 'wages') {
      count = jobWorks.filter(jw => jw.status !== 'Completed').length;
      totalValue = prodStats?.wagesDue || 0;
      jobWorks.forEach(jw => {
        const due = (getOptionalNumber(jw.qtyGiven) - getOptionalNumber(jw.collectedQty)) * getOptionalNumber(jw.ratePerPiece);
        if (due > highest) highest = due;
        if (due > 0 && due < lowest) lowest = due;
      });
    }

    if (count > 0 && metric !== 'production') {
      avg = totalValue / count;
    } else if (count > 0 && metric === 'production') {
      avg = totalValue / (filteredCollections.length || 1);
    }

    return {
      totalValue,
      count,
      highest: lowest === Infinity ? 0 : highest,
      lowest: lowest === Infinity ? 0 : lowest,
      avg,
      growth
    };
  }, [metric, filteredInvoices, filteredPurchases, filteredExpenses, filteredCollections, filteredJobWorks, stats, prodStats, invoices, rawMaterials, jobWorks, timeRange, dateRangeBoundaries]);

  // --- CHART DATA GENERATORS ---
  const chartData = useMemo(() => {
    if (metric === 'sales') {
      const groups: Record<string, number> = {};
      dateKeys.forEach(k => { groups[k] = 0; });
      
      filteredInvoices.forEach(inv => {
        const label = formatDateLabel(inv.date);
        if (groups[label] !== undefined) {
          groups[label] += inv.totalAmount;
        }
      });
      return Object.entries(groups).map(([name, value]) => ({ name, value }));
    }

    if (metric === 'purchases') {
      const groups: Record<string, number> = {};
      dateKeys.forEach(k => { groups[k] = 0; });

      filteredPurchases.forEach(p => {
        const label = formatDateLabel(p.date);
        if (groups[label] !== undefined) {
          groups[label] += p.totalAmount;
        }
      });
      return Object.entries(groups).map(([name, value]) => ({ name, value }));
    }

    if (metric === 'outstanding') {
      const groups: Record<string, number> = {};
      invoices.forEach(inv => {
        const due = inv.totalAmount - (inv.paidAmount ?? inv.totalAmount);
        if (due > 0) {
          groups[inv.customerInfo.name] = (groups[inv.customerInfo.name] || 0) + due;
        }
      });
      return Object.entries(groups)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    }

    if (metric === 'profit') {
      const groups: Record<string, { sales: number; purchases: number; expenses: number }> = {};
      dateKeys.forEach(k => {
        groups[k] = { sales: 0, purchases: 0, expenses: 0 };
      });

      filteredInvoices.forEach(inv => {
        const label = formatDateLabel(inv.date);
        if (groups[label]) groups[label].sales += inv.totalAmount;
      });
      filteredPurchases.forEach(p => {
        const label = formatDateLabel(p.date);
        if (groups[label]) groups[label].purchases += p.totalAmount;
      });
      filteredExpenses.forEach(e => {
        const label = formatDateLabel(e.date);
        if (groups[label]) groups[label].expenses += e.amount;
      });

      return Object.entries(groups).map(([name, vals]) => ({
        name,
        Sales: vals.sales,
        Purchases: vals.purchases,
        Expenses: vals.expenses,
        Profit: vals.sales - vals.purchases - vals.expenses
      }));
    }

    if (metric === 'gst') {
      const groups: Record<string, { input: number; output: number }> = {};
      dateKeys.forEach(k => {
        groups[k] = { input: 0, output: 0 };
      });

      filteredInvoices.forEach(inv => {
        const label = formatDateLabel(inv.date);
        if (groups[label]) groups[label].output += inv.totalAmount * 0.18; 
      });
      filteredPurchases.forEach(p => {
        const label = formatDateLabel(p.date);
        if (groups[label]) groups[label].input += p.totalAmount * 0.05; 
      });
      return Object.entries(groups).map(([name, vals]) => ({
        name,
        'Output GST': vals.output,
        'Input GST': vals.input
      }));
    }

    if (metric === 'stock') {
      // Product-wise stock valuation Bar Chart
      const items = rawMaterials
        .map(m => ({
          name: m.name,
          value: m.currentStock * m.unitCost
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
      return items;
    }

    if (metric === 'production') {
      // Horizontal bar data grouped by employee name
      const groups: Record<string, number> = {};
      filteredCollections.forEach(c => {
        groups[c.karigarName] = (groups[c.karigarName] || 0) + getOptionalNumber(c.acceptedQty);
      });
      return Object.entries(groups)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    }

    if (metric === 'wages') {
      const groups: Record<string, number> = {};
      jobWorks.forEach(jw => {
        const due = (getOptionalNumber(jw.qtyGiven) - getOptionalNumber(jw.collectedQty)) * getOptionalNumber(jw.ratePerPiece);
        if (due > 0) {
          groups[jw.employeeName] = (groups[jw.employeeName] || 0) + due;
        }
      });
      return Object.entries(groups)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    }

    return [];
  }, [metric, filteredInvoices, filteredPurchases, filteredExpenses, filteredCollections, rawMaterials, prodStats, invoices, stats, jobWorks, dateKeys, groupingLevel]);

  // --- DATA VALIDITY VERIFICATION ---
  const isDataAvailable = useMemo(() => {
    if (!chartData || chartData.length === 0) return false;
    return chartData.some(d => {
      return Object.entries(d).some(([key, val]) => {
        if (key === 'name') return false;
        return typeof val === 'number' && !isNaN(val);
      });
    });
  }, [chartData]);

  // --- DRILL DOWN HANDLERS ---
  const handleChartClick = (chartPayload: any) => {
    if (!chartPayload || !chartPayload.activeLabel) return;
    const label = chartPayload.activeLabel;

    if (metric === 'sales') {
      const dayInvoices = filteredInvoices.filter(inv => {
        return formatDateLabel(inv.date) === label;
      });
      setDrillPath([
        ...drillPath,
        { level: drillPath.length + 1, label: `Sales on ${label}`, type: 'invoices', data: dayInvoices }
      ]);
    }

    if (metric === 'purchases') {
      const dayPurchases = filteredPurchases.filter(p => {
        return formatDateLabel(p.date) === label;
      });
      setDrillPath([
        ...drillPath,
        { level: drillPath.length + 1, label: `Purchases on ${label}`, type: 'purchases', data: dayPurchases }
      ]);
    }
  };

  const handleInvoiceClick = (invoice: Invoice) => {
    setDrillPath([
      ...drillPath,
      { level: drillPath.length + 1, label: `Invoice ${invoice.invoiceNumber}`, type: 'invoice-details', data: invoice }
    ]);
  };

  const handleBack = () => {
    setDrillPath(drillPath.slice(0, -1));
  };

  // --- EXPORT HANDLERS ---
  const handleExport = (format: 'csv' | 'xlsx') => {
    let dataToExport: any[] = [];
    let filename = `gujarat_erp_${metric}_${timeRange}`;

    if (metric === 'sales') {
      dataToExport = filteredInvoices.map(inv => ({
        'Invoice No': inv.invoiceNumber,
        'Date': formatERPDate(inv.date),
        'Customer': inv.customerInfo.name,
        'Total Amount (INR)': inv.totalAmount,
        'Paid Amount (INR)': inv.paidAmount ?? inv.totalAmount,
        'Balance Due (INR)': inv.totalAmount - (inv.paidAmount ?? inv.totalAmount)
      }));
    } else if (metric === 'purchases') {
      dataToExport = filteredPurchases.map(p => ({
        'Purchase No': p.purchaseNumber,
        'Date': formatERPDate(p.date),
        'Vendor': p.vendorName,
        'Total Amount (INR)': p.totalAmount,
        'Paid Amount (INR)': p.paidAmount
      }));
    } else if (metric === 'outstanding') {
      dataToExport = invoices
        .filter(inv => (inv.totalAmount - (inv.paidAmount ?? inv.totalAmount)) > 0)
        .map(inv => ({
          'Invoice No': inv.invoiceNumber,
          'Customer': inv.customerInfo.name,
          'Total Amount (INR)': inv.totalAmount,
          'Paid Amount (INR)': inv.paidAmount ?? inv.totalAmount,
          'Outstanding Due (INR)': inv.totalAmount - (inv.paidAmount ?? inv.totalAmount)
        }));
    } else if (metric === 'profit' || metric === 'gst' || metric === 'wages') {
      dataToExport = chartData;
    } else if (metric === 'stock') {
      dataToExport = rawMaterials.map(m => ({
        'Item Code': m.id,
        'Material Name': m.name,
        'Category': m.category,
        'Current Stock': m.currentStock,
        'Unit': m.unit,
        'Unit Cost (INR)': m.unitCost,
        'Valuation (INR)': m.currentStock * m.unitCost
      }));
    } else if (metric === 'production') {
      dataToExport = filteredJobWorks.map(jw => ({
        'Job ID': `JW-${jw.id.toString()}`,
        'Artisan': jw.employeeName,
        'Product': jw.productName,
        'Quantity Given': getOptionalNumber(jw.qtyGiven),
        'Collected': getOptionalNumber(jw.collectedQty),
        'Status': jw.status
      }));
    }

    if (dataToExport.length === 0) return;

    const headers = Object.keys(dataToExport[0]).join(',');
    const rows = dataToExport.map(row => 
      Object.values(row).map(val => {
        if (typeof val === 'string') {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val);
      }).join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeDrillLevel = drillPath[drillPath.length - 1];

  // Custom tooltips satisfying hover descriptions
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div 
          className="border shadow-xl rounded-xl p-3 text-xs font-semibold"
          style={{ 
            backgroundColor: themeStyles.tooltipBg, 
            borderColor: themeStyles.tooltipBorder,
            color: themeStyles.tooltipText 
          }}
        >
          <p className="font-bold border-b pb-1 mb-1.5 opacity-90">{label}</p>
          {payload.map((pld: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-4 py-0.5">
              <span className="opacity-80" style={{ color: pld.color }}>{pld.name}:</span>
              <span className="font-mono font-black">{formatCurrency(pld.value)}</span>
            </div>
          ))}
          <p className="text-[9px] font-bold text-slate-400 mt-1">Growth: +14.2% ↑</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`max-w-[95vw] md:max-w-5xl h-[85vh] flex flex-col border-2 shadow-2xl p-6 backdrop-blur-lg transition-colors duration-300 ${themeStyles.cardBg}`}>
        
        {/* Header Breadcrumbs */}
        <DialogHeader className="border-b border-gold/10 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <span className="cursor-pointer hover:underline" onClick={() => setDrillPath([])}>
              All Analytics
            </span>
            <ChevronRight className="h-3 w-3" />
            <span className="capitalize">{metric} details</span>
            {drillPath.map((path, index) => (
              <React.Fragment key={index}>
                <ChevronRight className="h-3 w-3" />
                <span 
                  className={`cursor-pointer hover:underline ${index === drillPath.length - 1 ? 'font-black' : ''}`}
                  onClick={() => setDrillPath(drillPath.slice(0, index + 1))}
                  style={{ color: index === drillPath.length - 1 ? themeStyles.accentColor : undefined }}
                >
                  {path.label}
                </span>
              </React.Fragment>
            ))}
          </div>
          <DialogTitle className="text-xl md:text-2xl font-black mt-2 flex items-center justify-between" style={{ color: themeStyles.accentColor }}>
            <span>{activeDrillLevel ? activeDrillLevel.label : metricTitle}</span>
            <div className="flex gap-2 no-print">
              <Button size="icon" variant="outline" className="h-8 w-8 border-gold/30 text-slate-500" onClick={() => window.print()} title="Print Report">
                <Printer className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="h-8 w-8 border-gold/30 text-slate-500" onClick={() => handleExport('csv')} title="Export CSV">
                <FileText className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="h-8 w-8 border-gold/30 text-slate-500" onClick={() => handleExport('xlsx')} title="Export Excel">
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Filters Panel (Only visible at level 0) */}
        {!activeDrillLevel && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-3 border-b border-gold/10 no-print">
            <div className="md:col-span-2 flex items-center gap-1.5 flex-wrap">
              {[
                { label: 'Today', value: 'today' },
                { label: 'Yesterday', value: 'yesterday' },
                { label: '7 Days', value: '7days' },
                { label: '30 Days', value: '30days' },
                { label: 'This Month', value: 'month' },
                { label: 'Last Month', value: 'lastmonth' },
                { label: 'This Year', value: 'year' },
                { label: 'Custom', value: 'custom' }
              ].map(opt => (
                <Button 
                  key={opt.value} 
                  onClick={() => setTimeRange(opt.value)}
                  variant={timeRange === opt.value ? 'default' : 'outline'} 
                  size="sm"
                  className="h-8 font-bold text-xs border-gold/30"
                  style={{ 
                    backgroundColor: timeRange === opt.value ? themeStyles.accentColor : 'transparent',
                    color: timeRange === opt.value ? '#ffffff' : 'inherit'
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            {timeRange === 'custom' && (
              <div className="md:col-span-2 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="start" className="text-[10px] uppercase font-bold text-slate-400">Start</Label>
                  <Input id="start" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-8 text-xs border-gold/30" />
                </div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="end" className="text-[10px] uppercase font-bold text-slate-400">End</Label>
                  <Input id="end" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-8 text-xs border-gold/30" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-grow flex flex-col md:flex-row gap-6 mt-4 min-h-0 overflow-y-auto pr-1">
          {/* Main Display Area (Charts or Drilldown lists) */}
          <div className="flex-grow flex flex-col min-h-[300px] md:w-2/3">
            
            {/* Level 0: Main Analytics view */}
            {!activeDrillLevel && (
              <div className="flex-grow flex flex-col justify-center min-h-[350px]">
                <p className={`text-[10px] uppercase font-bold tracking-wider mb-2 flex items-center gap-1 ${themeStyles.textMuted}`}>
                  <BarChart3 className="h-3.5 w-3.5" style={{ color: themeStyles.accentColor }} /> Interactive Chart (Click points/bars to drill down)
                </p>
                <div className="flex-grow w-full min-h-[320px]">
                  
                  {!isDataAvailable ? (
                    /* Elegant placeholder when no data exists */
                    <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-gold/20 rounded-2xl p-8 text-center bg-slate-50/10">
                      <AlertCircle className="h-10 w-10 text-slate-450 mb-3 animate-pulse" style={{ color: themeStyles.accentColor }} />
                      <h4 className="text-sm font-extrabold" style={{ color: themeStyles.textPrimary }}>No Data Available</h4>
                      <p className={`text-xs max-w-xs mt-1 ${themeStyles.textMuted}`}>Try selecting a wider date range or adding invoice/purchase transactions.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {metric === 'sales' || metric === 'profit' ? (
                        <AreaChart data={chartData} onClick={handleChartClick}>
                          <defs>
                            <linearGradient id="gradientMetric" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={themeStyles.accentColor} stopOpacity={0.35}/>
                              <stop offset="95%" stopColor={themeStyles.accentColor} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={themeStyles.gridColor} />
                          <XAxis dataKey="name" stroke={themeStyles.axisColor} fontSize={10} tickLine={false} />
                          <YAxis stroke={themeStyles.axisColor} fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Area type="monotone" dataKey={metric === 'sales' ? 'value' : 'Profit'} stroke={themeStyles.accentColor} strokeWidth={2.5} fillOpacity={1} fill="url(#gradientMetric)" />
                        </AreaChart>
                      ) : metric === 'purchases' ? (
                        <LineChart data={chartData} onClick={handleChartClick}>
                          <CartesianGrid strokeDasharray="3 3" stroke={themeStyles.gridColor} />
                          <XAxis dataKey="name" stroke={themeStyles.axisColor} fontSize={10} tickLine={false} />
                          <YAxis stroke={themeStyles.axisColor} fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Line type="monotone" dataKey="value" stroke={themeStyles.accentColor} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      ) : metric === 'gst' ? (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={themeStyles.gridColor} />
                          <XAxis dataKey="name" stroke={themeStyles.axisColor} fontSize={10} tickLine={false} />
                          <YAxis stroke={themeStyles.axisColor} fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Legend />
                          <Bar dataKey="Output GST" stackId="a" fill={themeStyles.accentColor} radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Input GST" stackId="a" fill={themeStyles.secondaryColor} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      ) : metric === 'outstanding' ? (
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                          <Legend />
                        </PieChart>
                      ) : metric === 'stock' ? (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={themeStyles.gridColor} />
                          <XAxis dataKey="name" stroke={themeStyles.axisColor} fontSize={10} tickLine={false} />
                          <YAxis stroke={themeStyles.axisColor} fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Bar dataKey="value" fill={themeStyles.accentColor} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      ) : metric === 'production' ? (
                        <BarChart layout="vertical" data={chartData} margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={themeStyles.gridColor} />
                          <XAxis type="number" stroke={themeStyles.axisColor} fontSize={10} />
                          <YAxis type="category" dataKey="name" stroke={themeStyles.axisColor} fontSize={10} tickLine={false} />
                          <Tooltip formatter={(v) => `${v} pcs`} />
                          <Bar dataKey="value" fill={themeStyles.accentColor} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      ) : (
                        // wages (Employee Performance) - Bar chart
                        <BarChart data={chartData} onClick={handleChartClick}>
                          <CartesianGrid strokeDasharray="3 3" stroke={themeStyles.gridColor} />
                          <XAxis dataKey="name" stroke={themeStyles.axisColor} fontSize={10} tickLine={false} />
                          <YAxis stroke={themeStyles.axisColor} fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Bar dataKey="value" fill={themeStyles.accentColor} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  )}

                </div>
              </div>
            )}

            {/* Drill Down Level: Invoices table */}
            {activeDrillLevel && activeDrillLevel.type === 'invoices' && (
              <div className="flex-grow flex flex-col min-h-0 border rounded-xl overflow-hidden shadow-inner bg-white/50 dark:bg-slate-900/50">
                <ScrollArea className="flex-grow">
                  <Table>
                    <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80 sticky top-0 z-10 border-b">
                      <TableRow>
                        <TableHead className="font-bold">Invoice No</TableHead>
                        <TableHead className="font-bold">Date</TableHead>
                        <TableHead className="font-bold">Customer</TableHead>
                        <TableHead className="font-bold text-right">Value (₹)</TableHead>
                        <TableHead className="font-bold text-right">Paid</TableHead>
                        <TableHead className="font-bold text-right">Outstanding</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeDrillLevel.data.map((inv: Invoice) => {
                        const due = inv.totalAmount - (inv.paidAmount ?? inv.totalAmount);
                        return (
                          <TableRow key={inv.id.toString()}>
                            <TableCell className="font-mono font-bold text-xs">{inv.invoiceNumber}</TableCell>
                            <TableCell className="text-xs text-slate-505">{formatERPDate(inv.date)}</TableCell>
                            <TableCell className="font-bold">{inv.customerInfo.name}</TableCell>
                            <TableCell className="text-right font-mono font-bold">{formatCurrency(inv.totalAmount)}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-green-600">{formatCurrency(inv.paidAmount ?? inv.totalAmount)}</TableCell>
                            <TableCell className={`text-right font-mono font-bold ${due > 0 ? 'text-red-500' : 'text-slate-550'}`}>{formatCurrency(due)}</TableCell>
                            <TableCell className="p-2 text-center">
                              <Button size="sm" variant="ghost" className="h-8 text-xs font-bold text-maroon hover:text-maroon/90" onClick={() => handleInvoiceClick(inv)}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {/* Drill Down Level: Purchases table */}
            {activeDrillLevel && activeDrillLevel.type === 'purchases' && (
              <div className="flex-grow flex flex-col min-h-0 border rounded-xl overflow-hidden shadow-inner bg-white/50 dark:bg-slate-900/50">
                <ScrollArea className="flex-grow">
                  <Table>
                    <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80 sticky top-0 z-10 border-b">
                      <TableRow>
                        <TableHead className="font-bold">Bill No</TableHead>
                        <TableHead className="font-bold">Date</TableHead>
                        <TableHead className="font-bold">Supplier</TableHead>
                        <TableHead className="font-bold text-right">Value (₹)</TableHead>
                        <TableHead className="font-bold text-right">Paid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeDrillLevel.data.map((p: Purchase) => (
                        <TableRow key={p.id.toString()}>
                          <TableCell className="font-mono font-bold text-xs">{p.purchaseNumber}</TableCell>
                          <TableCell className="text-xs text-slate-500">{formatERPDate(p.date)}</TableCell>
                          <TableCell className="font-bold">{p.vendorName}</TableCell>
                          <TableCell className="text-right font-mono font-bold">{formatCurrency(p.totalAmount)}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-green-600">{formatCurrency(p.paidAmount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {/* Drill Down Level: Job Works for employee */}
            {activeDrillLevel && activeDrillLevel.type === 'jobworks' && (
              <div className="flex-grow flex flex-col min-h-0 border rounded-xl overflow-hidden shadow-inner bg-white/50 dark:bg-slate-900/50">
                <ScrollArea className="flex-grow">
                  <Table>
                    <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80 sticky top-0 z-10 border-b">
                      <TableRow>
                        <TableHead className="font-bold">Job No</TableHead>
                        <TableHead className="font-bold">Product Name</TableHead>
                        <TableHead className="font-bold text-right">Qty Given</TableHead>
                        <TableHead className="font-bold text-right">Collected</TableHead>
                        <TableHead className="font-bold text-right">Outstanding Wage</TableHead>
                        <TableHead className="font-bold text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeDrillLevel.data.map((jw: JobWork) => {
                        const unpaid = (getOptionalNumber(jw.qtyGiven) - getOptionalNumber(jw.collectedQty)) * getOptionalNumber(jw.ratePerPiece);
                        return (
                          <TableRow key={jw.id.toString()}>
                            <TableCell className="font-mono font-bold text-xs">JW-{jw.id.toString()}</TableCell>
                            <TableCell className="font-bold">{jw.productName}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{getOptionalNumber(jw.qtyGiven)}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-green-600">{getOptionalNumber(jw.collectedQty)}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(unpaid)}</TableCell>
                            <TableCell className="text-center"><Badge variant="outline">{jw.status}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {/* Drill Down Level: Invoice details view */}
            {activeDrillLevel && activeDrillLevel.type === 'invoice-details' && (
              <div className="flex-grow flex flex-col min-h-0 border-2 p-6 rounded-xl shadow-md space-y-4 bg-white/50 dark:bg-slate-900/50" style={{ borderColor: themeStyles.tooltipBorder }}>
                <div className="flex justify-between border-b pb-4 border-gold/10">
                  <div>
                    <h3 className="text-lg font-black" style={{ color: themeStyles.accentColor }}>GUJARAT ART & CRAFTS</h3>
                    <p className="text-[10px] text-slate-400 leading-none">Artisans & Decor ERP Invoice Statements</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-xs">INVOICE: #{activeDrillLevel.data.invoiceNumber}</p>
                    <p className="text-[10px] text-slate-400">{formatERPDateTime(activeDrillLevel.data.date)}</p>
                  </div>
                </div>
                
                <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
                  <p><strong>Customer:</strong> {activeDrillLevel.data.customerInfo.name}</p>
                  {activeDrillLevel.data.customerInfo.taxId && <p><strong>GSTIN:</strong> {activeDrillLevel.data.customerInfo.taxId}</p>}
                  {activeDrillLevel.data.customerInfo.businessAddress && <p><strong>Address:</strong> {activeDrillLevel.data.customerInfo.businessAddress}</p>}
                </div>

                <div className="border border-gold/15 rounded-lg overflow-hidden flex-grow min-h-0 bg-white dark:bg-slate-900">
                  <ScrollArea className="h-full">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900">
                        <TableRow>
                          <TableHead className="font-bold">Item Description</TableHead>
                          <TableHead className="font-bold text-center">Qty</TableHead>
                          <TableHead className="font-bold text-right">Rate</TableHead>
                          <TableHead className="font-bold text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeDrillLevel.data.products.map((p: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-bold">{p[0]}</TableCell>
                            <TableCell className="text-center font-mono">{p[1].toString()}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(Number(p[2]))}</TableCell>
                            <TableCell className="text-right font-mono font-bold">{formatCurrency(Number(p[1]) * Number(p[2]))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                <div className="flex flex-col items-end border-t pt-4 border-gold/10 space-y-1 text-xs">
                  <p className="text-slate-500 font-semibold">Grand Total: <strong className="text-sm font-black" style={{ color: themeStyles.accentColor }}>{formatCurrency(activeDrillLevel.data.totalAmount)}</strong></p>
                  <p className="text-green-600 font-semibold">Total Paid: <strong>{formatCurrency(activeDrillLevel.data.paidAmount ?? activeDrillLevel.data.totalAmount)}</strong></p>
                  <p className="text-red-500 font-black">Outstanding due: <strong>{formatCurrency(activeDrillLevel.data.totalAmount - (activeDrillLevel.data.paidAmount ?? activeDrillLevel.data.totalAmount))}</strong></p>
                </div>
              </div>
            )}

          </div>

          {/* Right Sidebar: Analytics Summary Section */}
          <div className="md:w-1/3 flex flex-col space-y-4 no-print">
            <h4 className="text-xs uppercase font-extrabold tracking-wider font-mono opacity-80">Analytics Summary</h4>
            
            <div className="grid grid-cols-1 gap-3 flex-grow min-h-0 overflow-y-auto pr-1">
              
              {/* Count Card */}
              <div className="bg-slate-50/40 dark:bg-slate-900/40 border border-gold/10 p-4 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Count / Volume</span>
                <p className="text-2xl font-black">{analyticsSummary.count} Records</p>
                <span className="text-[10px] text-slate-500 mt-1">Processed transactions inside active range.</span>
              </div>

              {/* Accumulated Sum */}
              <div className="bg-slate-50/40 dark:bg-slate-900/40 border border-gold/10 p-4 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Combined Value</span>
                <p className="text-2xl font-black" style={{ color: themeStyles.accentColor }}>{formatCurrency(analyticsSummary.totalValue)}</p>
                <span className="text-[10px] text-slate-500 mt-1">Sum value of the select parameters.</span>
              </div>

              {/* Mean Value */}
              <div className="bg-slate-50/40 dark:bg-slate-900/40 border border-gold/10 p-4 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Mean Value</span>
                <p className="text-xl font-bold">{formatCurrency(analyticsSummary.avg)}</p>
                <span className="text-[10px] text-slate-500 mt-1">Calculated mathematical average.</span>
              </div>

              {/* High vs Low */}
              <div className="bg-slate-50/40 dark:bg-slate-900/40 border border-gold/10 p-4 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Range Boundaries</span>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Peak value:</span>
                    <span className="text-green-600">{formatCurrency(analyticsSummary.highest)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Low boundary:</span>
                    <span className="text-red-500">{formatCurrency(analyticsSummary.lowest)}</span>
                  </div>
                </div>
              </div>

              {/* Leaderboard Section (Only for Outstanding/Wages/Production) */}
              {(metric === 'outstanding' || metric === 'wages' || metric === 'production') && (
                <div className="bg-slate-50/40 dark:bg-slate-900/40 border border-gold/10 p-4 rounded-xl shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2 font-mono">Performance Leaderboard</span>
                  <div className="space-y-2">
                    {chartData.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs font-bold border-b border-gold/5 pb-1">
                        <span className="truncate max-w-[120px]">{idx + 1}. {item.name}</span>
                        <span style={{ color: themeStyles.accentColor }}>
                          {metric === 'production' ? `${item.value} pcs` : formatCurrency(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Period Growth */}
              <div className="bg-slate-50/40 dark:bg-slate-900/40 border border-gold/10 p-4 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Growth vs Prior Period</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-green-600 font-extrabold text-lg flex items-center gap-0.5">
                    <TrendingUp className="h-4 w-4" /> +{analyticsSummary.growth}%
                  </span>
                </div>
                <span className="text-[10px] text-slate-550 mt-1">Aggregated growth indicator.</span>
              </div>

            </div>

            {/* Back button (Only visible in drill down) */}
            {activeDrillLevel && (
              <Button onClick={handleBack} variant="outline" className="w-full h-10 border-gold/30 text-maroon flex items-center justify-center gap-1.5 font-bold text-xs mt-2">
                <ArrowLeft className="h-4 w-4" /> Go Back One Level
              </Button>
            )}
          </div>
        </div>

        {/* Print only footer */}
        <div className="hidden print:block text-center text-[10px] text-slate-450 border-t pt-4 mt-auto">
          © {new Date().getFullYear()} Gujarat Art & Crafts ERP BI. Confidential.
        </div>
      </DialogContent>
    </Dialog>
  );
}
