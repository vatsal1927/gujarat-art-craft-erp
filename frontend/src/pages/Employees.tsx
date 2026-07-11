import { useState } from 'react';
import { useEmployees, useSaveEmployee, useDeleteEmployee } from '../hooks/useQueries';
import ProductionLayout from '../components/ProductionLayout';
import { useAuth } from '../components/AuthGuard';
import Unauthorized from './Unauthorized';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Users, Plus, Trash2, Edit2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { formatERPDate } from '../utils/calculations';

const SKILLS = [
  'Toran Making',
  'Jhumar Making',
  'Beading Work',
  'Packing Work',
  'Finishing Work'
];

const Employees = () => {
  const { user } = useAuth();
  const isStaff = !!(user?.role && 'Staff' in user.role);

  const { data: employees = [], isLoading } = useEmployees({ enabled: !isStaff && !!user });
  const saveEmployeeMutation = useSaveEmployee();
  const deleteEmployeeMutation = useDeleteEmployee();

  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [skillType, setSkillType] = useState('Toran Making');
  const [status, setStatus] = useState('Active');

  if (!user) return null;
  if (isStaff) {
    return <Unauthorized />;
  }

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setMobile('');
    setAddress('');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setSkillType('Toran Making');
    setStatus('Active');
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleEdit = (emp: any) => {
    setEditingId(emp.id);
    setName(emp.name);
    setMobile(emp.mobile);
    setAddress(emp.address);
    // Convert BigInt nanoseconds to ISO date string
    const dateMs = Number(emp.joiningDate / 1000000n);
    setJoiningDate(new Date(dateMs).toISOString().split('T')[0]);
    setSkillType(emp.skillType);
    setStatus(emp.status);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile) {
      toast.error('Please enter name and mobile number');
      return;
    }

    const id = editingId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
    const dateNs = BigInt(new Date(joiningDate).getTime()) * 1000000n;

    try {
      await saveEmployeeMutation.mutateAsync({
        id,
        name,
        mobile,
        address,
        joiningDate: dateNs,
        skillType,
        status
      });
      toast.success(editingId ? 'Employee updated successfully' : 'Employee added successfully');
      setIsOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save employee');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      await deleteEmployeeMutation.mutateAsync(id);
      toast.success('Employee deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete employee');
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.mobile.includes(search) ||
    emp.id.toLowerCase().includes(search.toLowerCase()) ||
    emp.skillType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProductionLayout title="Employee Registry">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-gold/40 focus-visible:ring-maroon"
          />
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAdd} className="bg-maroon hover:bg-maroon/90 text-white font-semibold flex items-center gap-1.5 w-full md:w-auto">
              <Plus className="h-4.5 w-4.5" /> Register Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md border-2 border-gold bg-white dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-maroon font-bold text-xl">
                {editingId ? 'Edit Employee Details' : 'Register New Employee'}
              </DialogTitle>
              <DialogDescription>
                Fill in the craft artisan details below to maintain registry.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="empId" className="text-slate-500 font-semibold text-xs">Employee ID</Label>
                <Input
                  id="empId"
                  value={editingId || 'Auto Generated'}
                  disabled
                  className="bg-slate-50 border-gold/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-slate-500 font-semibold text-xs">Employee Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-gold/30 focus-visible:ring-maroon"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mobile" className="text-slate-500 font-semibold text-xs">Mobile Number *</Label>
                <Input
                  id="mobile"
                  placeholder="Enter 10 digit number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="border-gold/30 focus-visible:ring-maroon"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-slate-500 font-semibold text-xs">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Enter full address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="border-gold/30 focus-visible:ring-maroon min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="joiningDate" className="text-slate-500 font-semibold text-xs">Joining Date</Label>
                  <Input
                    id="joiningDate"
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="border-gold/30 focus-visible:ring-maroon"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-slate-500 font-semibold text-xs">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="border-gold/30 focus:ring-maroon">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="skill" className="text-slate-500 font-semibold text-xs">Primary Skill Type</Label>
                <Select value={skillType} onValueChange={setSkillType}>
                  <SelectTrigger className="border-gold/30 focus:ring-maroon">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                    {SKILLS.map(skill => (
                      <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="border-gold/30">
                  Cancel
                </Button>
                <Button type="submit" className="bg-maroon hover:bg-maroon/90 text-white font-semibold">
                  {editingId ? 'Update' : 'Register'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-2 border-gold shadow-sm">
        <CardHeader className="bg-amber-50/10 border-b border-gold/20 py-4">
          <CardTitle className="text-maroon text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-saffron" /> Artisan Database
          </CardTitle>
          <CardDescription>Artisan employees registered for job-work production.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading registry...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No employees registered yet.</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-xs text-slate-800">ID</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Name</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Mobile</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Skill</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Joining Date</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 text-center">Status</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => {
                  const joiningDateStr = formatERPDate(emp.joiningDate);
                  return (
                    <TableRow key={emp.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono font-bold text-xs text-slate-600">{emp.id}</TableCell>
                      <TableCell className="font-semibold text-slate-800">{emp.name}</TableCell>
                      <TableCell className="font-mono text-xs">{emp.mobile}</TableCell>
                      <TableCell>
                        <Badge className="bg-amber-100/60 text-amber-800 hover:bg-amber-100 border border-gold/20 text-xs">
                          {emp.skillType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{joiningDateStr}</TableCell>
                      <TableCell className="text-center">
                        {emp.status === 'Active' ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">Active</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 text-[10px]">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-maroon hover:bg-amber-50/30" onClick={() => handleEdit(emp)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50/30" onClick={() => handleDelete(emp.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
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

export default Employees;
