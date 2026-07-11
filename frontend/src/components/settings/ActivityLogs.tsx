import { useState } from 'react';
import { useActivityLogs } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, History } from 'lucide-react';
import { formatERPDateTime } from '../../utils/calculations';

export default function ActivityLogs() {
  const { data: logs = [], isLoading: isLoadingLogs } = useActivityLogs();

  // Search & filter states
  const [logFilter, setLogFilter] = useState('');
  const [logCategoryFilter, setLogCategoryFilter] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUsername, setFilterUsername] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const filteredLogs = logs.filter(log => {
    const filterLower = logFilter.toLowerCase();
    const matchesSearch = (
      log.action.toLowerCase().includes(filterLower) ||
      (log.userName || '').toLowerCase().includes(filterLower) ||
      (log.details || '').toLowerCase().includes(filterLower) ||
      (log.userPrincipal || '').toLowerCase().includes(filterLower)
    );

    if (!matchesSearch) return false;

    // Filter by action category
    if (logCategoryFilter === 'sessions') {
      if (!(log.action === 'User login' || log.action === 'User logout' || log.action === 'Login' || log.action === 'Logout')) return false;
    }
    if (logCategoryFilter === 'invoices') {
      if (!log.action.includes('Invoice')) return false;
    }
    if (logCategoryFilter === 'settings') {
      if (!(log.action.includes('Settings') || log.action === 'User updated')) return false;
    }
    if (logCategoryFilter === 'users') {
      if (!(log.action.includes('User') || log.action === 'Role changed' || log.action === 'Password changed' || log.action === 'System Bootstrap')) return false;
    }

    // Module Filter
    if (filterModule !== 'all') {
      const logModule = log.module || 'ERP';
      if (logModule !== filterModule) return false;
    }

    // Action Filter
    if (filterAction !== 'all') {
      if (log.action !== filterAction) return false;
    }

    // Username Filter
    if (filterUsername.trim() !== '') {
      const logUsername = (log.operator || log.userName || '').toLowerCase();
      if (!logUsername.includes(filterUsername.toLowerCase())) return false;
    }

    // Date Filter
    if (filterDate !== '') {
      const ms = Number(log.timestamp / 1000000n);
      const logDateObj = new Date(ms);
      const logDateString = logDateObj.toISOString().split('T')[0];
      if (logDateString !== filterDate) return false;
    }

    return true;
  });

  if (isLoadingLogs) {
    return <div className="py-8 text-center text-xs text-gray-500">Loading System Activity Logs...</div>;
  }

  return (
    <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
      <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 flex flex-col gap-4 py-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
          <div>
            <CardTitle className="text-maroon dark:text-saffron flex items-center gap-2">
              <History className="h-5 w-5" />
              <span>System Audit Trail</span>
            </CardTitle>
            <CardDescription>Live audit registry of security authentications and invoice modifications.</CardDescription>
          </div>
          
          {/* Responsive search & action filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gold" />
              <Input
                placeholder="Search logs by keyword..."
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="pl-9 h-10 text-xs border-gold bg-white dark:bg-gray-900"
              />
            </div>
            <Select value={logCategoryFilter} onValueChange={(val) => setLogCategoryFilter(val)}>
              <SelectTrigger className="border-gold w-full sm:w-48 h-10 text-xs bg-white dark:bg-gray-900">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">All Logs</SelectItem>
                <SelectItem value="sessions">Sessions (Login/Logout)</SelectItem>
                <SelectItem value="invoices">Invoices (Create/Edit/Delete)</SelectItem>
                <SelectItem value="settings">Settings (Profile Updates)</SelectItem>
                <SelectItem value="users">Users (Add/Remove Staff)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced unified filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full border-t border-gold/10 pt-3">
          {/* Module Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-gray-500">Module</label>
            <Select value={filterModule} onValueChange={(val) => setFilterModule(val)}>
              <SelectTrigger className="border-gold h-9 text-xs bg-white dark:bg-gray-900 w-full">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="AUTH">AUTH</SelectItem>
                <SelectItem value="USERS">USERS</SelectItem>
                <SelectItem value="ERP">ERP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-gray-500">Action</label>
            <Select value={filterAction} onValueChange={(val) => setFilterAction(val)}>
              <SelectTrigger className="border-gold h-9 text-xs bg-white dark:bg-gray-900 w-full">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="Login">Login</SelectItem>
                <SelectItem value="Logout">Logout</SelectItem>
                <SelectItem value="Password Changed">Password Changed</SelectItem>
                <SelectItem value="User Created">User Created</SelectItem>
                <SelectItem value="User Status Changed">User Status Changed</SelectItem>
                <SelectItem value="User Role Changed">User Role Changed</SelectItem>
                <SelectItem value="User Password Reset">User Password Reset</SelectItem>
                <SelectItem value="Create Job Work">Create Job Work</SelectItem>
                <SelectItem value="Collect Job">Collect Job</SelectItem>
                <SelectItem value="Delete Collection">Delete Collection</SelectItem>
                <SelectItem value="Edit Collection">Edit Collection</SelectItem>
                <SelectItem value="Create Invoice">Create Invoice</SelectItem>
                <SelectItem value="Delete Invoice">Delete Invoice</SelectItem>
                <SelectItem value="Payment Recorded">Payment Recorded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Username Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-gray-500">Username</label>
            <Input
              placeholder="Username..."
              value={filterUsername}
              onChange={(e) => setFilterUsername(e.target.value)}
              className="border-gold h-9 text-xs bg-white dark:bg-gray-900 w-full"
            />
          </div>

          {/* Date Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-gray-500">Date</label>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="border-gold h-9 text-xs bg-white dark:bg-gray-900 w-full"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800 max-h-[550px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-50 sticky top-0 z-10">
                <TableHead className="font-bold text-maroon dark:text-saffron w-40">Timestamp</TableHead>
                <TableHead className="font-bold text-maroon dark:text-saffron w-48">Operator</TableHead>
                <TableHead className="font-bold text-maroon dark:text-saffron w-32">Action</TableHead>
                <TableHead className="font-bold text-maroon dark:text-saffron">Audit Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const formattedLogTime = formatERPDateTime(log.timestamp);

                  return (
                    <TableRow key={log.id.toString()} className="hover:bg-amber-50/10 dark:hover:bg-gray-800/10 text-xs">
                      <TableCell className="whitespace-nowrap font-mono text-gray-500 py-3.5">{formattedLogTime}</TableCell>
                      <TableCell className="font-medium text-slate-800 dark:text-slate-200 py-3.5" title={log.userPrincipal}>
                        <p className="font-bold leading-tight">{log.userName}</p>
                        <p className="text-[10px] text-gray-400 font-mono select-all truncate max-w-[160px]">{log.userPrincipal}</p>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wide inline-block ${
                          log.action.includes('Delete') ? 'bg-red-100 text-red-800 dark:bg-red-955/40 dark:text-red-200 border border-red-200/30' :
                          log.action.includes('Create') ? 'bg-green-100 text-green-800 dark:bg-green-955/40 dark:text-green-200 border border-green-200/30' :
                          log.action.includes('Update') || log.action.includes('Save') ? 'bg-blue-100 text-blue-800 dark:bg-blue-955/40 dark:text-blue-200 border border-blue-200/30' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-955/40 dark:text-amber-200 border border-amber-200/30'
                        }`}>
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300 font-medium py-3.5">{log.details}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">No matching audit logs found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
