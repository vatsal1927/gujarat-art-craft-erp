import { useState } from 'react';
import { useJobWorks, useUpdateJobProgress, useEmployees } from '../hooks/useQueries';
import ProductionLayout from '../components/ProductionLayout';
import { useAuth } from '../components/AuthGuard';
import Unauthorized from './Unauthorized';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Hammer, LogIn, Search, CheckCircle, ArrowUpRight, Clock, PackageCheck, Info } from 'lucide-react';
import { toast } from 'sonner';
import { getOptionalText } from '../utils/candidHelpers';
import { formatERPDate, formatERPDateTime, safeQty, isJobDelayed } from '../utils/calculations';

const getCreatedBy = (job: any) => {
  const name = job.createdByFullName || job.createdBy;
  if (name && name !== 'System') return name;
  return "Legacy Record";
};

const getCreatedByRole = (job: any) => {
  const rawRole = job.createdByRole ?? (job.createdByFullName || job.createdBy);
  if (!rawRole || rawRole === 'System') return "Legacy Record";
  return mapDisplayRole(rawRole);
};

const getUpdatedBy = (job: any) => {
  const name = job.updatedByFullName || job.lastUpdatedBy;
  if (name && name !== 'System') return name;
  return "Legacy Record";
};

const getUpdatedByRole = (job: any) => {
  const rawRole = job.updatedByRole ?? (job.updatedByFullName || job.lastUpdatedBy || job.createdBy);
  if (!rawRole || rawRole === 'System') return "Legacy Record";
  return mapDisplayRole(rawRole);
};

const getLastAction = (job: any) => {
  if (job.lastAction && job.lastAction !== 'System') return job.lastAction;
  return "Created Job Work";
};

const mapDisplayRole = (role?: string | null) => {
  if (!role) return "Legacy Record";
  const value = String(role).toLowerCase().trim();
  if (value.includes("staff")) return "Staff";
  if (value.includes("manager") || value.includes("connected admin")) return "Admin";
  if (value === "admin" || value === "#admin" || value.includes("master admin")) return "Master Admin";
  return role;
};
  


import { hasDeptAccess } from '../utils/auth';

const Production = () => {
  const { user } = useAuth();
  const isStaff = !!(user?.role && 'Staff' in user.role);
  const isAdminOrManager = !isStaff;

  const canViewProduction = !!(user && (isStaff || hasDeptAccess(user, ['Production', 'Finance'])));

  const { data: jobWorks = [], isLoading: jobsLoading } = useJobWorks({ enabled: canViewProduction && !!user });
  const { data: employees = [] } = useEmployees({ enabled: !isStaff && canViewProduction && !!user });
  const updateProgressMutation = useUpdateJobProgress();

  const linkedEmployeeId = isStaff && user ? (localStorage.getItem(`staff_employee_link_${user.username.toLowerCase()}`) || 'EMP-1') : '';
  const staffEmployeeName = isStaff && user ? (localStorage.getItem(`staff_employee_name_${user.username.toLowerCase()}`) || 'Ramesh Patel') : user?.name || '';
  const linkedEmployee = isStaff ? { id: linkedEmployeeId, name: staffEmployeeName } : null;

  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Update Form State
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [completedQty, setCompletedQty] = useState('');
  const [remarks, setRemarks] = useState('');
  const [updateDate, setUpdateDate] = useState(new Date().toISOString().split('T')[0]);

  // Details Modal State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailJob, setDetailJob] = useState<any | null>(null);
  const [detailUpdates, setDetailUpdates] = useState<any[]>([]);
  const [detailCollections, setDetailCollections] = useState<any[]>([]);

  if (!user) return null;
  if (!canViewProduction) {
    return <Unauthorized />;
  }

  const handleOpenUpdate = (job: any) => {
    const qtyGiven = safeQty(job.qtyGiven);
    const currentCompleted = safeQty(job.completedQty);
    const pending = safeQty(qtyGiven - currentCompleted);
    if (pending <= 0) {
      toast.error("This job has already been completed.");
      return;
    }
    setSelectedJob(job);
    setCompletedQty('');
    setRemarks('');
    setUpdateDate(new Date().toISOString().split('T')[0]);
    setIsOpen(true);
  };

  const handleOpenDetails = (job: any) => {
    setDetailJob(job);
    
    // Load daily updates from localStorage
    const storedUpdates = localStorage.getItem('mock_daily_work_updates');
    const allUpdates = storedUpdates ? JSON.parse(storedUpdates) : [];
    const filteredUpdates = allUpdates.filter((u: any) => u.jobId === job.id.toString());
    setDetailUpdates(filteredUpdates);
    
    // Load collections from localStorage
    const storedCollections = localStorage.getItem('mock_collections_v2');
    const allCollections = storedCollections ? JSON.parse(storedCollections) : [];
    const filteredCollections = allCollections.filter((c: any) => c.jobWorkNo.toString() === job.id.toString());
    setDetailCollections(filteredCollections);
    
    setIsDetailsOpen(true);
  };

  const handlePrintJobSheet = () => {
    if (!detailJob) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Failed to open print window. Please allow popups.');
      return;
    }
    
    // Build Collections HTML
    let collectionsHtml = '';
    if (detailCollections.length === 0) {
      collectionsHtml = `
        <p style="font-size: 11px; color: #777777; font-style: italic; text-align: center; padding: 15px; border: 1px dashed #EFE4D2; border-radius: 6px; background: #FDFBF7;">
          No collections recorded yet. Stock updates, accepted quantity, rejected quantity, and wage calculations will begin after goods are collected and inspected.
        </p>
      `;
    } else {
      collectionsHtml = `
        <table>
          <thead>
            <tr>
              <th>Collection No</th>
              <th>Date</th>
              <th class="text-right">Collected Qty</th>
              <th class="text-right">Accepted Qty</th>
              <th class="text-right">Rejected Qty</th>
              <th>Remarks</th>
              <th>Created By</th>
              <th>Created At</th>
              <th>Inspected By</th>
              <th>Inspected At</th>
            </tr>
          </thead>
          <tbody>
            ${detailCollections.map(c => `
              <tr>
                <td style="font-weight: bold; color: #7B0F1A;">COL-${c.id.toString()}</td>
                <td>${formatERPDateTime(c.collectionDate)}</td>
                <td class="text-right">${safeQty(c.todayCollectedQty || c.collectedQty)} pcs</td>
                <td class="text-right" style="color: #2D6A4F; font-weight: bold;">${safeQty(c.acceptedQty)} pcs</td>
                <td class="text-right" style="color: #BA181B; font-weight: bold;">${safeQty(c.rejectedQty)} pcs</td>
                <td>${c.remarks || '-'}</td>
                <td>👤 ${c.createdBy || 'Unknown User'}</td>
                <td>${formatERPDateTime(c.createdAt || c.collectionDate)}</td>
                <td>🛡️ ${c.inspectedBy || 'Quality Inspector'}</td>
                <td>${formatERPDateTime(c.inspectedAt || c.collectionDate)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    // Build Production Logs HTML
    let productionLogsHtml = '';
    if (detailUpdates.length === 0) {
      productionLogsHtml = `
        <p style="font-size: 11px; color: #777777; font-style: italic; text-align: center; padding: 15px; border: 1px dashed #EFE4D2; border-radius: 6px; background: #FDFBF7;">
          No production progress logs recorded yet for this job.
        </p>
      `;
    } else {
      productionLogsHtml = `
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th class="text-right">Qty Completed</th>
              <th>Remarks</th>
              <th>Created By</th>
            </tr>
          </thead>
          <tbody>
            ${detailUpdates.map(u => `
              <tr>
                <td>${formatERPDateTime(u.date)}</td>
                <td class="text-right" style="color: #2D6A4F; font-weight: bold;">${safeQty(u.completedQty)} pcs</td>
                <td>${u.remarks || '-'}</td>
                <td>${u.userName || 'Artisan'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Job Sheet JW-${detailJob.id.toString()}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&family=Inter:wght@400;600;700&display=swap');
            
            body {
              font-family: 'Outfit', 'Inter', sans-serif;
              color: #3A1F12;
              background-color: #FFFFFF;
              padding: 20px;
              margin: 0;
            }
            .print-container {
              max-width: 850px;
              margin: 0 auto;
              border: 3px double #C89B3C;
              padding: 25px;
              border-radius: 8px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #7B0F1A;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              color: #7B0F1A;
              margin: 0 0 5px 0;
              font-size: 26px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .header p {
              margin: 0;
              font-size: 12px;
              color: #D4A017;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .meta-grid {
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 15px;
              margin-bottom: 25px;
              font-size: 13px;
            }
            .meta-item {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px dashed #EFE4D2;
              padding-bottom: 5px;
            }
            .meta-label {
              font-weight: bold;
              color: #555555;
            }
            .meta-value {
              font-weight: 600;
              color: #7B0F1A;
            }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
              color: #7B0F1A;
              border-bottom: 1px solid #7B0F1A;
              padding-bottom: 4px;
              margin-top: 25px;
              margin-bottom: 10px;
              letter-spacing: 0.5px;
            }
            .analytics-grid {
              display: grid;
              grid-template-cols: repeat(5, 1fr);
              gap: 10px;
              text-align: center;
              margin-bottom: 20px;
            }
            .analytics-card {
              border: 1px solid #EFE4D2;
              border-radius: 6px;
              padding: 10px;
              background-color: #FDFBF7;
            }
            .analytics-label {
              font-size: 9px;
              font-weight: bold;
              color: #777777;
              text-transform: uppercase;
              display: block;
              margin-bottom: 4px;
            }
            .analytics-value {
              font-size: 18px;
              font-weight: 950;
              color: #333333;
            }
            .analytics-value.accepted { color: #2D6A4F; }
            .analytics-value.rejected { color: #BA181B; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #EFE4D2;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #F8F2E8;
              color: #7B0F1A;
              font-weight: bold;
            }
            .text-right {
              text-align: right;
            }
            .status-badge {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .status-completed { background-color: #E6F4EA; color: #137333; border: 1px solid #C2E7CB; }
            .status-inprogress { background-color: #FEF7E0; color: #B06000; border: 1px solid #FADF91; }
            .status-delayed { background-color: #FCE8E6; color: #C5221F; border: 1px solid #FAD2CF; }
            .status-notstarted { background-color: #F1F3F4; color: #3C4043; border: 1px solid #DADCE0; }
            
            .footer-note {
              margin-top: 30px;
              font-size: 10px;
              color: #777777;
              text-align: center;
              border-top: 1px solid #EFE4D2;
              padding-top: 10px;
            }
            @media print {
              body { padding: 0; }
              .print-container { border: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="header">
              <h1>Gujarat Art & Craft</h1>
              <p>Production Job Sheet</p>
            </div>
            
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">Job Work No:</span>
                <span class="meta-value">JW-${detailJob.id.toString()}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Employee Name:</span>
                <span class="meta-value">${detailJob.employeeName}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Product Name:</span>
                <span class="meta-value">${detailJob.productName}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Rate Per Piece:</span>
                <span class="meta-value">₹${Number(detailJob.ratePerPiece).toFixed(2)} / piece</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Assigned Date:</span>
                <span class="meta-value">${formatERPDate(detailJob.jobDate)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Target Date:</span>
                <span class="meta-value">${formatERPDate(detailJob.expectedReturnDate)}</span>
              </div>
              <div class="meta-item" style="grid-column: span 2;">
                <span class="meta-label">Current Status:</span>
                <span class="meta-value">
                  <span class="status-badge status-${getProgressStatus(detailProgressPct, detailJob).toLowerCase().replace(/\s+/g, '')}">
                    ${getProgressStatus(detailProgressPct, detailJob)}
                  </span>
                </span>
              </div>
            </div>
            
            <div class="section-title">Progress Analytics</div>
            <div class="analytics-grid">
              <div class="analytics-card">
                <span class="analytics-label">Assigned Qty</span>
                <span class="analytics-value">${detailQtyGiven}</span>
              </div>
              <div class="analytics-card">
                <span class="analytics-label">Collected Qty</span>
                <span class="analytics-value">${detailTotalCollected}</span>
              </div>
              <div class="analytics-card" style="background-color: #FFF5F5; border-color: #FEB2B2;">
                <span class="analytics-label" style="color: #BA181B;">Rejected Qty</span>
                <span class="analytics-value rejected">${detailTotalRejected}</span>
              </div>
              <div class="analytics-card" style="background-color: #F6FFF6; border-color: #C6F6D5;">
                <span class="analytics-label" style="color: #2D6A4F;">Accepted Qty</span>
                <span class="analytics-value accepted">${detailTotalAccepted}</span>
              </div>
              <div class="analytics-card">
                <span class="analytics-label">Pending Qty</span>
                <span class="analytics-value" style="color: ${detailPending > 0 ? '#B06000' : '#333333'};">${detailPending}</span>
              </div>
            </div>
            
            <div style="font-size: 12px; font-weight: bold; margin-bottom: 25px; text-align: right; color: #7B0F1A;">
              Completion Percentage (Accepted / Assigned): ${detailProgressPct}%
            </div>
            
            <div class="section-title">Collection & Inspection Logs</div>
            ${collectionsHtml}
            
            <div class="section-title">Production Logs History (Reference Only)</div>
            <p style="font-size: 9.5px; color: #666666; font-style: italic; margin-bottom: 10px; margin-top: 5px;">
              Production logs are daily work updates for reference only. Official progress, stock movement, and wages are calculated from Collection & Inspection records.
            </p>
            ${productionLogsHtml}
            
            <div class="section-title">Audit Information</div>
            <div class="meta-grid" style="margin-top: 10px; margin-bottom: 10px;">
              <div class="meta-item">
                <span class="meta-label">Created By:</span>
                <span class="meta-value">${getCreatedBy(detailJob)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Role:</span>
                <span class="meta-value">${getCreatedByRole(detailJob)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Created Date:</span>
                <span class="meta-value">${formatERPDate(detailJob.jobDate)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Last Updated By:</span>
                <span class="meta-value">${getUpdatedBy(detailJob)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Role:</span>
                <span class="meta-value">${getUpdatedByRole(detailJob)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Last Updated Date:</span>
                <span class="meta-value">${formatERPDate(detailJob.lastUpdated || detailJob.jobDate)}</span>
              </div>
              <div class="meta-item" style="grid-column: span 2;">
                <span class="meta-label">Last Action:</span>
                <span class="meta-value">${getLastAction(detailJob)}</span>
              </div>
            </div>
            
            <div class="footer-note">
              Generated By: ${user.name || user.username || 'Administrator'}<br>
              Generated On: ${formatERPDateTime(new Date())}<br>
              System: Gujarat Art & Craft ERP
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleExportPDF = () => {
    if (!detailJob) return;
    const filename = `JobSheet_JW-${detailJob.id.toString()}`;
    const message = `To save this Job Sheet as an audit-ready PDF:\n\n1. In the print layout, select "Save as PDF" as the Destination.\n2. Suggested filename: ${filename}.pdf\n\nClick OK to open the print interface.`;
    
    if (confirm(message)) {
      handlePrintJobSheet();
    }
  };

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !completedQty) {
      toast.error('Please enter completed quantity');
      return;
    }

    const qtyVal = parseFloat(completedQty);
    if (isNaN(qtyVal) || qtyVal < 0) {
      toast.error('Completed quantity cannot be negative');
      return;
    }
    if (qtyVal === 0) {
      toast.error('Completed quantity must be greater than 0');
      return;
    }

    const qtyGiven = Number(selectedJob.qtyGiven) || 0;
    const currentCompleted = Number(selectedJob.completedQty) || 0;
    const pending = qtyGiven - currentCompleted;
    if (pending <= 0) {
      toast.error('Job already completed. No additional production can be logged.');
      return;
    }
    if (qtyVal > pending) {
      toast.error(`Remaining quantity is ${pending}. Cannot log ${qtyVal} units.`);
      return;
    }

    try {
      await updateProgressMutation.mutateAsync({
        jobId: selectedJob.id,
        completedQty: qtyVal,
        remarks: remarks || `Daily work update logged on ${updateDate}`
      });
      toast.success('Daily progress updated successfully!');
      setIsOpen(false);
      setSelectedJob(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update job progress');
    }
  };

  const isJobForCurrentUser = (job: any) => {
    if (!job) return false;
    
    // 1. Match by linked employeeId
    if (linkedEmployee && linkedEmployee.id) {
      if (job.employeeId === linkedEmployee.id) return true;
      if (job.employeeName && job.employeeName.toLowerCase() === linkedEmployee.name.toLowerCase()) return true;
    }
    
    // 2. Match by artisanName / employeeName matching user.name
    if (job.employeeName && user.name && job.employeeName.toLowerCase() === user.name.toLowerCase()) {
      return true;
    }
    if (job.artisanName && user.name && job.artisanName.toLowerCase() === user.name.toLowerCase()) {
      return true;
    }
    
    // 3. Match by staffUserId or linked staff principal/userId in remarks or directly
    const username = user.username || '';
    const principalStr = user.principalId ? user.principalId.toString() : '';
    
    if (job.staffUserId === username || job.staffUserId === principalStr) {
      return true;
    }
    
    const remarks = job.remarks || '';
    if (remarks.includes(`StaffUID:${username}`) || (principalStr && remarks.includes(`StaffUID:${principalStr}`))) {
      return true;
    }
    
    return false;
  };

  const userJobWorks = isStaff ? jobWorks.filter(isJobForCurrentUser) : jobWorks;

  // Only show jobs that are not completely collected yet (Assigned, In Progress, Partially Collected, Completed)
  const activeJobs = userJobWorks.filter(job => job.status !== 'Collected');

  const filteredJobs = activeJobs.filter(job => 
    job.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    job.productName.toLowerCase().includes(search.toLowerCase()) ||
    `JW-${job.id}`.toLowerCase().includes(search.toLowerCase())
  );

  const getProgressBarColor = (pct: number) => {
    if (pct === 100) return 'bg-green-500';
    if (pct > 0) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getProgressStatus = (pct: number, job: any) => {
    if (!job) return 'Not Started';
    const originalStatus = job.status;
    if (originalStatus === 'Collected') return 'Collected';
    if (pct >= 100 || originalStatus === 'Completed' || originalStatus === 'COMPLETED') return 'COMPLETED';
    if (isJobDelayed(job)) return 'Delayed';
    if (pct === 0) return 'Not Started';
    return 'In Progress';
  };

  const getStatusBadge = (pct: number, job: any) => {
    const statusText = getProgressStatus(pct, job);
    let colorClass = "bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-850 dark:text-slate-200";
    if (statusText === 'Collected') colorClass = "bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300";
    else if (statusText === 'Not Started') colorClass = "bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    else if (statusText === 'In Progress') colorClass = "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300";
    else if (statusText === 'COMPLETED') colorClass = "bg-green-100 text-green-800 border border-green-200 dark:bg-green-950/40 dark:text-green-300";
    else if (statusText === 'Delayed') colorClass = "bg-red-100 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300";
    
    return (
      <Badge className={`${colorClass} font-bold text-[10px] uppercase tracking-wider`}>
        {statusText}
      </Badge>
    );
  };

  // Preview values for daily logging
  const assignedQty = selectedJob ? safeQty(selectedJob.qtyGiven) : 0;
  const prevCompleted = selectedJob ? safeQty(selectedJob.completedQty) : 0;
  const currentEntry = parseFloat(completedQty) || 0;
  const previewCompletedTotal = prevCompleted + currentEntry;
  const previewRemaining = safeQty(assignedQty - previewCompletedTotal);
  const previewProgressPct = assignedQty > 0 ? Math.min(100, Math.max(0, Math.round((previewCompletedTotal / assignedQty) * 100))) : 0;

  // Sanitized details modal values
  let detailQtyGiven = 0;
  let detailTotalCollected = 0;
  let detailTotalRejected = 0;
  let detailTotalAccepted = 0;
  let detailPending = 0;
  let detailProgressPct = 0;

  if (detailJob) {
    detailQtyGiven = safeQty(detailJob.qtyGiven);
    detailTotalCollected = safeQty(detailJob.totalCollectedQty || detailJob.collectedQty);
    detailTotalRejected = safeQty(detailJob.totalRejectedQty || detailJob.rejectedQty);
    detailTotalAccepted = safeQty(detailJob.totalAcceptedQty || detailJob.acceptedQty);

    // Pending Qty = Assigned - Accepted
    detailPending = safeQty(detailQtyGiven - detailTotalAccepted);

    // Progress = (Accepted / Assigned) * 100
    if (detailQtyGiven > 0) {
      const pct = (detailTotalAccepted / detailQtyGiven) * 100;
      detailProgressPct = isNaN(pct) || !isFinite(pct) ? 0 : Math.min(100, Math.max(0, Math.round(pct)));
    } else {
      detailProgressPct = 0;
    }
  }

  return (
    <ProductionLayout title="Production Progress Tracking">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search active production..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-gold/40 focus-visible:ring-maroon"
          />
        </div>

        {/* Log Daily Production Dialog */}
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) setSelectedJob(null); }}>
          <DialogContent className="max-w-md border-2 border-gold bg-white dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-maroon font-bold text-xl flex items-center gap-2">
                <Hammer className="h-5 w-5 text-saffron" /> Log Daily Production
              </DialogTitle>
              <DialogDescription>
                Record artisan work updates to track completion progress.
              </DialogDescription>
            </DialogHeader>
            {selectedJob && (
              <form onSubmit={handleSaveUpdate} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800 p-3.5 rounded-lg border">
                  <div className="col-span-2 flex justify-between items-center pb-2 border-b">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Artisan & Job Info</span>
                      <span className="font-mono font-bold text-slate-850 dark:text-slate-200">JW-{selectedJob.id.toString()} • {selectedJob.employeeName}</span>
                    </div>
                    <div>
                      {getStatusBadge(
                        safeQty(selectedJob.qtyGiven) > 0 ? Math.min(100, Math.max(0, Math.round((safeQty(selectedJob.completedQty) / safeQty(selectedJob.qtyGiven)) * 100))) : 0,
                        selectedJob
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-slate-500 block mb-1">Assigned Qty</span>
                    <Badge className="bg-blue-100 text-blue-800 border border-blue-200 font-mono font-bold">Assigned: {safeQty(selectedJob.qtyGiven)}</Badge>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Completed So Far</span>
                    <Badge className="bg-green-100 text-green-800 border border-green-200 font-mono font-bold">Completed: {safeQty(selectedJob.completedQty)}</Badge>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Remaining Qty</span>
                    <Badge className={`${safeQty(safeQty(selectedJob.qtyGiven) - safeQty(selectedJob.completedQty)) === 0 ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'} font-mono font-bold`}>
                      Remaining: {safeQty(safeQty(selectedJob.qtyGiven) - safeQty(selectedJob.completedQty))}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Progress %</span>
                    <Badge className="bg-purple-100 text-purple-800 border border-purple-200 font-mono font-bold">
                      Progress: {safeQty(selectedJob.qtyGiven) > 0 ? Math.min(100, Math.max(0, Math.round((safeQty(selectedJob.completedQty) / safeQty(selectedJob.qtyGiven)) * 100))) : 0}%
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="updateDate" className="text-slate-500 font-semibold text-xs">Date of Completion</Label>
                  <Input
                    id="updateDate"
                    type="date"
                    value={updateDate}
                    onChange={(e) => setUpdateDate(e.target.value)}
                    className="border-gold/30 focus-visible:ring-maroon"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="completedQty" className="text-slate-500 font-semibold text-xs">Quantity Completed Now *</Label>
                    <Input
                      id="completedQty"
                      type="number"
                      placeholder="e.g. 20"
                      value={completedQty}
                      onChange={(e) => setCompletedQty(e.target.value)}
                      className="border-gold/30 focus-visible:ring-maroon font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-500 font-semibold text-xs">Remaining Pending</Label>
                    <Input
                      value={safeQty(safeQty(selectedJob.qtyGiven) - safeQty(selectedJob.completedQty) - (parseFloat(completedQty) || 0))}
                      disabled
                      className="bg-slate-50 border-gold/20 font-mono text-slate-500"
                    />
                  </div>
                </div>

                {/* Real-time preview */}
                {completedQty && currentEntry > 0 && (
                  <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-3 space-y-2">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block uppercase tracking-wider">Live Preview (Before Save)</span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white dark:bg-slate-900 p-2 rounded border border-amber-100">
                        <span className="text-slate-400 text-[10px] block">New Completed</span>
                        <span className="font-mono font-bold text-sm text-green-700">{previewCompletedTotal}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded border border-amber-100">
                        <span className="text-slate-400 text-[10px] block">Remaining</span>
                        <span className="font-mono font-bold text-sm text-amber-700">{previewRemaining}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded border border-amber-100">
                        <span className="text-slate-400 text-[10px] block">Progress</span>
                        <span className="font-mono font-bold text-sm text-purple-700">{previewProgressPct}%</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="updateRemarks" className="text-slate-500 font-semibold text-xs">Remarks / Defect Log</Label>
                  <Input
                    id="updateRemarks"
                    placeholder="Progress remarks..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="border-gold/30 focus-visible:ring-maroon"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="border-gold/30">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-maroon hover:bg-maroon/90 text-white font-semibold flex items-center gap-1">
                    Log Entry <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={(open) => { setIsDetailsOpen(open); if(!open) setDetailJob(null); }}>
          <DialogContent 
            className="border-2 border-[#D4A017] bg-[#FFF8F0] dark:bg-slate-900 rounded-[20px] shadow-2xl p-0 flex flex-col overflow-hidden max-h-[92vh] h-[92vh] w-[95vw] sm:w-[95vw] md:w-[90vw] lg:w-[1200px] xl:w-[1400px] max-w-[1400px] outline-none"
            style={{
              height: 'min(92vh, 1000px)',
              width: 'min(95vw, 1400px)',
            }}
          >
            <DialogHeader className="p-6 border-b border-[#D4A017]/30 bg-[#FFF8F0] dark:bg-slate-900 sticky top-0 z-10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Info className="h-6 w-6 text-[#D4A017]" />
                <DialogTitle className="text-[#7A0019] font-serif font-black text-2xl">
                  Job Work Details & Inspection Window
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                Comprehensive ERP inspection logs for production tracking, quality metrics, and audit history.
              </DialogDescription>
            </DialogHeader>
            {detailJob && (
              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#FFF8F0] dark:bg-slate-950 scrollbar-thin">
                {/* SECTION 1: Job Work Summary */}
                <div className="bg-white dark:bg-slate-900 border border-[#D4A017]/35 rounded-[15px] p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#7A0019] border-b border-[#D4A017]/20 pb-2">
                    SECTION 1: Job Work Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-3 md:border-r border-[#D4A017]/20 md:pr-6">
                      <div className="flex justify-between items-center py-1 border-b border-[#D4A017]/10">
                        <span className="font-bold text-slate-500">Job Work No:</span>
                        <span className="font-mono font-black text-[#7A0019] text-base">JW-{detailJob.id.toString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#D4A017]/10">
                        <span className="font-bold text-slate-500">Employee Name:</span>
                        <span className="font-extrabold text-[#7A0019]">{detailJob.employeeName}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#D4A017]/10">
                        <span className="font-bold text-slate-500">Product Name:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{detailJob.productName}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#D4A017]/10">
                        <span className="font-bold text-slate-500">Rate Per Piece:</span>
                        <span className="font-mono font-bold text-green-700 dark:text-green-400">₹{Number(detailJob.ratePerPiece).toFixed(2)} / piece</span>
                      </div>
                    </div>
                    <div className="space-y-3 pl-0 md:pl-6">
                      <div className="flex justify-between items-center py-1 border-b border-[#D4A017]/10">
                        <span className="font-bold text-slate-500">Assigned Date:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{formatERPDate(detailJob.jobDate)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#D4A017]/10">
                        <span className="font-bold text-slate-500">Target Date:</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-500">{formatERPDate(detailJob.expectedReturnDate)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#D4A017]/10">
                        <span className="font-bold text-slate-500">Assigned Quantity:</span>
                        <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">{detailQtyGiven} pcs</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#D4A017]/10">
                        <span className="font-bold text-slate-500">Current Status:</span>
                        <div>{getStatusBadge(detailProgressPct, detailJob)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Progress Analytics */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#7A0019]">
                    SECTION 2: Progress Analytics
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">
                    {/* KPI 1 */}
                    <div className="bg-white dark:bg-slate-900 border border-[#D4A017]/25 rounded-[12px] p-4 text-center shadow-xs h-24 flex flex-col justify-center items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assigned Qty</span>
                      <span className="text-2xl font-black font-mono text-slate-850 dark:text-slate-100 mt-1">{detailQtyGiven}</span>
                    </div>
                    {/* KPI 2 */}
                    <div className="bg-white dark:bg-slate-900 border border-[#D4A017]/25 rounded-[12px] p-4 text-center shadow-xs h-24 flex flex-col justify-center items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Collected Qty</span>
                      <span className="text-2xl font-black font-mono text-indigo-650 mt-1">{detailTotalCollected}</span>
                    </div>
                    {/* KPI 3 */}
                    <div className="bg-[#FFF5F5] dark:bg-red-950/10 border border-red-200 dark:border-red-950/40 rounded-[12px] p-4 text-center shadow-xs h-24 flex flex-col justify-center items-center">
                      <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Rejected Qty</span>
                      <span className="text-2xl font-black font-mono text-red-650 mt-1">{detailTotalRejected}</span>
                    </div>
                    {/* KPI 4 */}
                    <div className="bg-[#F6FFF6] dark:bg-green-950/10 border border-green-200 dark:border-green-950/40 rounded-[12px] p-4 text-center shadow-xs h-24 flex flex-col justify-center items-center">
                      <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Accepted Qty</span>
                      <span className="text-2xl font-black font-mono text-green-650 mt-1">{detailTotalAccepted}</span>
                    </div>
                    {/* KPI 5 */}
                    <div className="bg-[#FFFDF5] dark:bg-amber-950/10 border border-[#D4A017]/25 rounded-[12px] p-4 text-center shadow-xs h-24 flex flex-col justify-center items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Qty</span>
                      <span className={`text-2xl font-black font-mono mt-1 ${detailPending === 0 ? 'text-slate-400' : 'text-amber-600'}`}>
                        {detailPending}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-xs font-bold text-[#7A0019]">
                      <span>Completion Percentage (Accepted / Assigned)</span>
                      <span>{detailProgressPct}%</span>
                    </div>
                    <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-[#D4A017]/20">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          detailProgressPct === 100 
                            ? 'bg-green-600' 
                            : (detailProgressPct > 0 ? 'bg-amber-500' : 'bg-red-500')
                        }`}
                        style={{ width: `${detailProgressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Production Logs */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#7A0019] flex items-center gap-2 border-b border-[#D4A017]/20 pb-1">
                    <Clock className="h-4 w-4 text-[#D4A017]" /> SECTION 3: Production Logs (Daily Updates)
                  </h3>
                  <p className="text-[11px] text-slate-500 italic bg-amber-500/5 border border-amber-200/30 p-2.5 rounded-lg mb-3">
                    Production logs are daily work updates for reference only. Official progress, stock movement, and wages are calculated from Collection & Inspection records.
                  </p>
                  {detailUpdates.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-[#D4A017]/20 rounded-[12px] p-6 text-center text-xs text-slate-400 italic">
                      No production progress logs recorded yet for this job.
                    </div>
                  ) : (
                    <div className="border border-[#D4A017]/25 rounded-[12px] overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                      <div className="max-h-[260px] overflow-y-auto scrollbar-thin">
                        <Table className="relative">
                          <TableHeader className="bg-[#EFE4D2]/40 dark:bg-slate-800 sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                            <TableRow>
                              <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 py-3">Date</TableHead>
                              <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 text-right py-3">Qty Completed</TableHead>
                              <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 py-3">Remarks</TableHead>
                              <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 py-3">Created By</TableHead>
                              <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 py-3">Created Time</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detailUpdates.slice(0, 10).map((u: any) => {
                              return (
                                <TableRow key={u.id.toString()} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                  <TableCell className="py-2.5 font-mono text-[11px]">{formatERPDateTime(u.date)}</TableCell>
                                  <TableCell className="py-2.5 text-right font-mono text-xs font-semibold text-green-600">{Number(u.completedQty)} pcs</TableCell>
                                  <TableCell className="py-2.5 text-xs text-slate-650 dark:text-slate-400 max-w-[250px] truncate" title={u.remarks}>{u.remarks}</TableCell>
                                  <TableCell className="py-2.5 text-xs font-medium">{u.userName || 'Artisan'}</TableCell>
                                  <TableCell className="py-2.5 font-mono text-[11px] text-slate-400">
                                    {(() => {
                                      const dt = formatERPDateTime(u.date);
                                      if (dt === '-') return '-';
                                      const parts = dt.split(' ');
                                      if (parts.length < 2) return '-';
                                      const timeParts = parts[1].split(':');
                                      return `${timeParts[0]}:${timeParts[1]}`;
                                    })()}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 4: Collection & Inspection Logs */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#7A0019] flex items-center gap-2 border-b border-[#D4A017]/20 pb-1">
                    <PackageCheck className="h-4 w-4 text-green-600" /> SECTION 4: Collection & Inspection Logs
                  </h3>
                  {detailCollections.length === 0 ? (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-900/50 rounded-[12px] p-5 text-blue-800 dark:text-blue-300 text-xs flex gap-3 items-start">
                      <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">No collections recorded yet.</p>
                        <p className="font-medium text-slate-650 dark:text-slate-450">
                          Stock updates, accepted quantity, rejected quantity, and wage calculations will begin after goods are collected and inspected.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-[#D4A017]/25 rounded-[12px] overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                      <div className="max-h-[260px] overflow-y-auto scrollbar-thin">
                        <Table className="relative">
                          <TableHeader className="bg-[#EFE4D2]/40 dark:bg-slate-800 sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                            <TableRow>
                              <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 py-3">Collection No</TableHead>
                              <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 py-3">Date</TableHead>
                              <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 text-right py-3">Collected Qty</TableHead>
                              <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 text-right py-3 text-green-700 dark:text-green-400">Accepted Qty</TableHead>
                              <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 text-right py-3 text-red-700 dark:text-red-400">Rejected Qty</TableHead>
                              <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 py-3">Remarks</TableHead>
                              <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 py-3">Created By</TableHead>
                              <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 py-3">Created At</TableHead>
                              <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 py-3">Inspected By</TableHead>
                              <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 py-3">Inspected At</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detailCollections.map((c: any) => {
                              const accepted = safeQty(c.acceptedQty);
                              const rejected = safeQty(c.rejectedQty);
                              const collected = safeQty(c.todayCollectedQty || c.collectedQty);
                              return (
                                <TableRow key={c.id.toString()} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                  <TableCell className="py-2.5 font-mono text-[11px] font-bold text-[#7A0019]">COL-{c.id.toString()}</TableCell>
                                  <TableCell className="py-2.5 font-mono text-[11px]">{formatERPDateTime(c.collectionDate)}</TableCell>
                                  <TableCell className="py-2.5 text-right font-mono text-xs font-semibold text-amber-700 bg-amber-500/10 dark:text-amber-550 dark:bg-amber-500/5">{collected} pcs</TableCell>
                                  <TableCell className="py-2.5 text-right font-mono text-xs font-bold text-green-700 bg-green-500/10 dark:text-green-450 dark:bg-green-500/5">{accepted} pcs</TableCell>
                                  <TableCell className="py-2.5 text-right font-mono text-xs font-bold text-red-600 bg-red-50/10 dark:text-red-450 dark:bg-red-500/5">{rejected} pcs</TableCell>
                                  <TableCell className="py-2.5 text-xs text-slate-650 dark:text-slate-400 max-w-[200px] truncate" title={c.remarks}>{c.remarks || '-'}</TableCell>
                                  <TableCell className="py-2.5 text-xs">
                                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300 px-2 py-0.5 rounded text-[11px] font-medium cursor-help" title="User who saved this collection.">
                                      👤 {c.createdBy || 'Unknown User'}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-2.5 text-xs font-mono">{formatERPDateTime(c.createdAt || c.collectionDate)}</TableCell>
                                  <TableCell className="py-2.5 text-xs">
                                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-305 px-2 py-0.5 rounded text-[11px] font-medium cursor-help" title="User who performed quality inspection.">
                                      🛡️ {c.inspectedBy || 'Quality Inspector'}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-2.5 text-xs font-mono">{formatERPDateTime(c.inspectedAt || c.collectionDate)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 5: Audit Information */}
                <div className="bg-white dark:bg-slate-900 border border-[#D4A017]/35 rounded-[15px] p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#7A0019] border-b border-[#D4A017]/20 pb-2">
                    SECTION 5: Audit Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-3 md:border-r border-[#D4A017]/20 md:pr-6">
                      <div className="flex justify-between items-center py-1 border-b border-[#D4A017]/10">
                        <span className="font-bold text-slate-500">Created By:</span>
                        <span className="font-extrabold text-[#7A0019]">
                          {getCreatedBy(detailJob)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#D4A017]/10">
                        <span className="font-bold text-slate-500">Role:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {getCreatedByRole(detailJob)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#D4A017]/10">
                        <span className="font-bold text-slate-500">Created Date:</span>
                        <span className="font-semibold text-slate-850 dark:text-slate-200">
                          {formatERPDate(detailJob.jobDate)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#D4A017]/10">
                        <span className="font-bold text-slate-500">Last Action:</span>
                        <span className="font-semibold text-slate-850 dark:text-slate-200">
                          {getLastAction(detailJob)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3 pl-0 md:pl-6">
                      <div className="flex justify-between items-center py-1 border-b border-[#D4A017]/10">
                        <span className="font-bold text-slate-500">Last Updated By:</span>
                        <span className="font-extrabold text-[#7A0019]">
                          {getUpdatedBy(detailJob)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#D4A017]/10">
                        <span className="font-bold text-slate-500">Role:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {getUpdatedByRole(detailJob)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#D4A017]/10">
                        <span className="font-bold text-slate-500">Last Updated Date:</span>
                        <span className="font-semibold text-slate-850 dark:text-slate-200">
                          {formatERPDate(detailJob.lastUpdated || detailJob.jobDate)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#D4A017]/10">
                        <span className="font-bold text-slate-500">Current Status:</span>
                        <div>{getStatusBadge(detailProgressPct, detailJob)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {detailJob && (
              <div className="p-6 border-t border-[#D4A017]/30 bg-[#FFF8F0] dark:bg-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 sticky bottom-0 z-10 flex-shrink-0">
                <div className="flex flex-col gap-1 w-full md:w-auto">
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-450 font-medium">Assigned Qty:</span>
                      <span className="font-mono text-slate-850 dark:text-slate-100">{detailQtyGiven}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-green-700 font-medium">Accepted Qty:</span>
                      <span className="font-mono text-green-700 dark:text-green-400">{detailTotalAccepted}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-red-650 font-medium">Rejected Qty:</span>
                      <span className="font-mono text-red-650">{detailTotalRejected}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-650 font-medium">Pending Qty:</span>
                      <span className="font-mono text-amber-650">{detailPending}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-purple-700 font-medium">Completion %:</span>
                      <span className="font-mono text-purple-700 dark:text-purple-400">{detailProgressPct}%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-450 font-medium">Status:</span>
                      <div>{getStatusBadge(detailProgressPct, detailJob)}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 italic block">
                    Formula: Progress = Accepted Qty ÷ Assigned Qty × 100
                  </span>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  {isAdminOrManager && (
                    <>
                      <Button
                        type="button"
                        onClick={handlePrintJobSheet}
                        className="bg-[#D4A017] hover:bg-[#D4A017]/90 text-white font-bold text-xs px-4 h-9 rounded-lg transition-all"
                      >
                        Print Job Sheet
                      </Button>
                      <Button
                        type="button"
                        onClick={handleExportPDF}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 h-9 rounded-lg transition-all"
                      >
                        Export PDF
                      </Button>
                    </>
                  )}
                  <Button 
                    type="button" 
                    onClick={() => { setIsDetailsOpen(false); setDetailJob(null); }} 
                    className="bg-[#7A0019] hover:bg-[#7A0019]/90 text-white font-bold text-xs px-6 h-9 rounded-lg transition-all"
                  >
                    Close Details
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-2 border-gold shadow-sm">
        <CardHeader className="bg-amber-50/10 border-b border-gold/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
          <div>
            <CardTitle className="text-maroon text-base flex items-center gap-2">
              <Hammer className="h-5 w-5 text-saffron" /> Live Production Tracker
            </CardTitle>
            <CardDescription>Track daily production quantities and work completion rates.</CardDescription>
          </div>
          <Badge className={`${isStaff ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-green-100 text-green-800 border-green-200'} border text-[10px] font-bold uppercase tracking-wider`}>
            {isStaff ? 'Viewing Your Assigned Job Work' : 'Viewing All Production Records'}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {jobsLoading ? (
            <div className="text-center py-12 text-slate-500">Loading production stats...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No active production tasks found.</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-xs text-slate-800">Job No</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Artisan</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Product</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 text-right">Assigned Qty</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 text-right">Collected Qty</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 text-right">Rejected Qty</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 text-right">Accepted Qty</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 text-right">Pending Qty</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 text-center" style={{ width: '120px' }}>Progress %</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 text-center">Status</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 text-center">Last Updated</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => {
                  const qtyGiven = safeQty(job.qtyGiven);
                  const totalCollected = safeQty(job.totalCollectedQty || job.collectedQty);
                  const totalRejected = safeQty(job.totalRejectedQty || job.rejectedQty);
                  const completedQtyVal = safeQty(job.totalAcceptedQty || job.acceptedQty);

                  const progressPct = qtyGiven > 0 ? Math.min(100, Math.max(0, Math.round((completedQtyVal / qtyGiven) * 100))) : 0;
                  const pending = safeQty(qtyGiven - completedQtyVal);
                  return (
                    <TableRow key={job.id.toString()} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono font-bold text-xs">JW-{job.id.toString()}</TableCell>
                      <TableCell className="font-semibold text-slate-700">{job.employeeName}</TableCell>
                      <TableCell className="max-w-40 truncate text-slate-650">{job.productName}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{qtyGiven}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-700">{totalCollected}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-red-500 font-medium">{totalRejected}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-green-600 font-bold">{completedQtyVal}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-600 font-semibold">{pending}</TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1 max-w-[120px] mx-auto">
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                            <div 
                              className={`h-full ${getProgressBarColor(progressPct)} transition-all duration-300`} 
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[10px] text-slate-600">{progressPct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(progressPct, job)}</TableCell>
                      <TableCell className="text-center font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        {formatERPDate(job.lastUpdated || job.jobDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {progressPct < 100 ? (
                            <Badge className="bg-amber-50 text-maroon border border-gold/40 text-[10px] uppercase font-bold py-1 h-8 flex items-center justify-center gap-1">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 border border-green-200 font-bold text-[10px] uppercase py-1 h-8 flex items-center justify-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5 text-green-600" /> Completed
                            </Badge>
                          )}
                          
                          <Button
                            onClick={() => handleOpenDetails(job)}
                            size="sm"
                            variant="outline"
                            className="border-gold/40 text-xs font-bold py-1 h-8 flex items-center gap-1 hover:bg-slate-50"
                          >
                            View Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </ProductionLayout>
  );
};

export default Production;
