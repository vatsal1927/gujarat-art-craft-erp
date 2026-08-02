import { useState, useEffect } from 'react';
import { 
  useUsers, useCreateUser, useEditUser, useDeleteUser, 
  useToggleUserStatus, useAdminResetPassword, useEmployees 
} from '../../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Trash2, Users, Key, Sparkles, Edit, Upload, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../AuthGuard';
import { deriveIdentity } from '../../utils/credentialDerivation';
import { formatERPDate } from '../../utils/calculations';

const isStrongPassword = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one lowercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one number." };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one special character." };
  }
  return { isValid: true, message: "" };
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const isAdmin = !!(currentUser?.role && 'Admin' in currentUser.role);
  const isManager = !!(currentUser?.role && 'Manager' in currentUser.role);

  const { data: usersList, isLoading: isLoadingUsers } = useUsers({ enabled: true });
  const masterAdminExists = !!usersList?.some((u: any) => u.role && 'Admin' in u.role);
  
  const { mutate: createUser, isPending: isCreatingUser } = useCreateUser();
  const { mutate: deleteUser } = useDeleteUser();
  const { mutate: toggleUserStatus } = useToggleUserStatus();
  const { mutate: adminResetPassword } = useAdminResetPassword();
  const { mutate: editUser, isPending: isEditingUser } = useEditUser();

  const { data: employeesList = [] } = useEmployees();

  // User editing states
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editRole, setEditRole] = useState<'Admin' | 'Manager' | 'Staff'>('Staff');
  const [editStatus, setEditStatus] = useState('Active');
  const [editLinkedEmployeeId, setEditLinkedEmployeeId] = useState('');

  // Mode select for new user registration
  const [authMethod, setAuthMethod] = useState<'password' | 'ii'>('password');
  const [newPrincipal, setNewPrincipal] = useState('');
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'Manager' | 'Staff'>('Staff');
  const [newEmail, setNewEmail] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newProfilePhoto, setNewProfilePhoto] = useState('');
  const [linkedEmployeeId, setLinkedEmployeeId] = useState('');
  const [derivedPrincipalText, setDerivedPrincipalText] = useState('');

  // Live cryptographic principal derivation helper
  useEffect(() => {
    if (authMethod === 'password' && newUsername.trim() && newPassword) {
      const delayDebounce = setTimeout(() => {
        deriveIdentity(newUsername.trim(), newPassword)
          .then((ident) => {
            setDerivedPrincipalText(ident.getPrincipal().toString());
          })
          .catch((err) => {
            console.error('Error deriving principal:', err);
            setDerivedPrincipalText('');
          });
      }, 300);
      return () => clearTimeout(delayDebounce);
    } else {
      setDerivedPrincipalText('');
    }
  }, [authMethod, newUsername, newPassword]);

  const handleNewUserPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error('Photo must be less than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewProfilePhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Please enter user Display Name');
      return;
    }

    // Validate email
    if (!newEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error('Please enter a valid Email Address');
      return;
    }

    // Validate mobile
    if (!newMobile.trim()) {
      toast.error('Mobile Number is required');
      return;
    }
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(newMobile.trim())) {
      toast.error('Mobile Number must be exactly 10 digits');
      return;
    }

    let targetPrincipalText = '';
    let targetUsernameText = '';
    let passwordHashHex = '';

    if (authMethod === 'password') {
      const trimmedUser = newUsername.trim();
      if (!trimmedUser) {
        toast.error('Please enter a Username');
        return;
      }
      if (!newPassword) {
        toast.error('Please enter a Password');
        return;
      }
      const strength = isStrongPassword(newPassword);
      if (!strength.isValid) {
        toast.error(strength.message);
        return;
      }
      const confirmPass = window.prompt("Confirm the password for the new user:");
      if (newPassword !== confirmPass) {
        toast.error("Password confirmation does not match.");
        return;
      }
      if (!derivedPrincipalText) {
        toast.error('Please wait for cryptographic principal derivation to complete');
        return;
      }
      targetPrincipalText = derivedPrincipalText;
      targetUsernameText = trimmedUser.toLowerCase();

      // Compute seed bytes & hex for storing
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest(
        'SHA-256', 
        encoder.encode(`${targetUsernameText.toLowerCase()}:${newPassword}`)
      );
      const seedBytes = new Uint8Array(hashBuffer);
      passwordHashHex = Array.from(seedBytes).map(x => ('00' + x.toString(16)).slice(-2)).join('');
    } else {
      // Internet Identity flow
      if (!newPrincipal.trim()) {
        toast.error('Please enter the user\'s Internet Identity Principal ID');
        return;
      }
      targetPrincipalText = newPrincipal.trim();
      targetUsernameText = newUsername.trim() || `ii_${targetPrincipalText.substring(0, 5)}`;
    }

    if (newRole === 'Admin') {
      const existingMasterAdmin = usersList?.find((u: any) => u.role && 'Admin' in u.role);
      if (existingMasterAdmin) {
        toast.error('Security Policy Violation: Only one Master Admin is allowed.');
        return;
      }
    }

    createUser(
      {
        principalText: targetPrincipalText,
        name: newName.trim(),
        username: targetUsernameText,
        roleText: newRole,
        email: newEmail.trim(),
        mobile: newMobile.trim(),
        address: newAddress.trim(),
        profilePhoto: newProfilePhoto,
        status: 'Active',
        passwordHash: passwordHashHex
      },
      {
        onSuccess: () => {
          if (newRole === 'Staff' && linkedEmployeeId) {
            localStorage.setItem(`staff_employee_link_${targetUsernameText.toLowerCase()}`, linkedEmployeeId);
            const selectedEmp = employeesList.find((e: any) => e.id === linkedEmployeeId);
            if (selectedEmp) {
              localStorage.setItem(`staff_employee_name_${targetUsernameText.toLowerCase()}`, selectedEmp.name);
            }
          }
          toast.success('User created successfully');
          // Reset form
          setNewName('');
          setNewUsername('');
          setNewPassword('');
          setNewEmail('');
          setNewMobile('');
          setNewAddress('');
          setNewProfilePhoto('');
          setNewPrincipal('');
          setLinkedEmployeeId('');
        },
        onError: (error) => {
          toast.error('Failed to register user: ' + error.message);
        },
      }
    );
  };

  const handleToggleStatus = (principalText: string, currentStatus: string) => {
    const targetUser = usersList?.find((u: any) => u.principalId.toString() === principalText);
    if (targetUser && targetUser.role && 'Admin' in targetUser.role) {
      toast.error('Security Policy Violation: Master Admin cannot be modified.');
      return;
    }
    const nextStatus = currentStatus === 'Deactivated' ? 'Active' : 'Deactivated';
    toggleUserStatus({ principalText, status: nextStatus }, {
      onSuccess: () => {
        toast.success(`User status updated to ${nextStatus}`);
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to update user status');
      }
    });
  };

  const handleResetPassword = async (principalText: string, username: string) => {
    const newPass = window.prompt(`Enter new password for @${username}:`);
    if (!newPass) return;
    const strength = isStrongPassword(newPass);
    if (!strength.isValid) {
      toast.error(strength.message);
      return;
    }
    const confirmPass = window.prompt(`Confirm new password for @${username}:`);
    if (newPass !== confirmPass) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const derived = await deriveIdentity(username, newPass);
      const newPrincipal = derived.getPrincipal().toString();
      
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest(
        'SHA-256', 
        encoder.encode(`${username.toLowerCase()}:${newPass}`)
      );
      const seedBytes = new Uint8Array(hashBuffer);
      const hashHex = Array.from(seedBytes).map(x => ('00' + x.toString(16)).slice(-2)).join('');

      adminResetPassword({ principalText, newPrincipalId: newPrincipal, newPasswordHash: hashHex }, {
        onSuccess: () => {
          toast.success(`Password reset successfully for @${username}`);
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to reset password');
        }
      });
    } catch (e) {
      toast.error('Cryptographic derivation failed');
    }
  };

  const handleDeleteUser = (principalText: string) => {
    const targetUser = usersList?.find((u: any) => u.principalId.toString() === principalText);
    if (targetUser && targetUser.role && 'Admin' in targetUser.role) {
      toast.error('Security Policy Violation: Master Admin cannot be modified.');
      return;
    }
    deleteUser(principalText, {
      onSuccess: () => {
        toast.success('User deleted successfully');
      },
      onError: (error) => {
        toast.error('Failed to delete user: ' + error.message);
      },
    });
  };

  const handleStartEditUser = (usr: any) => {
    const roleVal = usr?.role ? ('Admin' in usr.role ? 'Admin' : ('Manager' in usr.role ? 'Manager' : 'Staff')) : 'Staff';
    setEditingUser(usr);
    setEditName(usr.name);
    setEditUsername(usr.username || '');
    setEditEmail(usr.email || '');
    setEditMobile(usr.mobile || '');
    setEditRole(roleVal);
    setEditStatus(usr.status || 'Active');
    const linked = localStorage.getItem(`staff_employee_link_${(usr.username || '').toLowerCase()}`) || '';
    setEditLinkedEmployeeId(linked);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!editUsername.trim()) {
      toast.error('Username is required');
      return;
    }

    // Validate email
    if (!editEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail.trim())) {
      toast.error('Please enter a valid Email Address');
      return;
    }

    // Validate mobile
    if (!editMobile.trim()) {
      toast.error('Mobile Number is required');
      return;
    }
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(editMobile.trim())) {
      toast.error('Mobile Number must be exactly 10 digits');
      return;
    }

    const isEditingMasterAdmin = !!(editingUser?.role && 'Admin' in editingUser.role);
    if (isEditingMasterAdmin) {
      if (editRole !== 'Admin' || editStatus !== 'Active' || editUsername.trim().toLowerCase() !== 'admin') {
        toast.error('Security Policy Violation: Master Admin role and status cannot be modified.');
        return;
      }
    } else {
      if (editRole === 'Admin') {
        const existingMasterAdmin = usersList?.find((u: any) => u.role && 'Admin' in u.role);
        if (existingMasterAdmin) {
          toast.error('Security Policy Violation: Only one Master Admin is allowed.');
          return;
        }
      }
    }

    editUser({
      principalText: editingUser.principalId.toString(),
      name: editName.trim(),
      username: editUsername.trim().toLowerCase(),
      email: editEmail.trim(),
      mobile: editMobile.trim(),
      roleText: editRole,
      status: editStatus
    }, {
      onSuccess: () => {
        if (editRole === 'Staff') {
          localStorage.setItem(`staff_employee_link_${editUsername.trim().toLowerCase()}`, editLinkedEmployeeId);
          const selectedEmp = employeesList.find((e: any) => e.id === editLinkedEmployeeId);
          if (selectedEmp) {
            localStorage.setItem(`staff_employee_name_${editUsername.trim().toLowerCase()}`, selectedEmp.name);
          }
        } else {
          localStorage.removeItem(`staff_employee_link_${editUsername.trim().toLowerCase()}`);
          localStorage.removeItem(`staff_employee_name_${editUsername.trim().toLowerCase()}`);
        }
        toast.success('User updated successfully');
        setEditingUser(null);
      },
      onError: (err) => {
        toast.error('Failed to update user: ' + err.message);
      }
    });
  };

  const isMasterAdmin = isAdmin;

  if (isLoadingUsers) {
    return <div className="py-8 text-center text-xs text-gray-500">Loading registry users...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Card 2.1: Register User */}
      <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
        <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
          <CardTitle className="text-maroon dark:text-saffron">Register New Account</CardTitle>
          <CardDescription>Grant login authorization and define user access privileges.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Method select */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl pb-2">
            <Button 
              type="button" 
              variant={authMethod === 'password' ? 'default' : 'outline'}
              onClick={() => setAuthMethod('password')}
              className={authMethod === 'password' ? 'bg-maroon text-white font-bold' : 'border-gold/30'}
            >
              <Key className="h-4 w-4 mr-2" />
              Password User (Derived Principal)
            </Button>
            <Button 
              type="button" 
              variant={authMethod === 'ii' ? 'default' : 'outline'}
              onClick={() => setAuthMethod('ii')}
              className={authMethod === 'ii' ? 'bg-maroon text-white font-bold' : 'border-gold/30'}
            >
              <Users className="h-4 w-4 mr-2" />
              Internet Identity (II) Principal
            </Button>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="newName" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Full Name</Label>
                <Input
                  id="newName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="border-gold focus:ring-saffron"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newRole" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Access Role</Label>
                {isMasterAdmin ? (
                  <div>
                    <Select value={newRole} onValueChange={(val: any) => setNewRole(val)}>
                      <SelectTrigger id="newRole" className="border-gold bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                        <SelectItem value="Admin" disabled={masterAdminExists}>Master Admin</SelectItem>
                        <SelectItem value="Manager">Admin</SelectItem>
                        <SelectItem value="Staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                    {masterAdminExists && (
                      <p className="text-[11px] text-amber-600 font-bold mt-1">
                        Only one Master Admin is allowed.
                      </p>
                    )}
                  </div>
                ) : (
                  <Input
                    value="Staff"
                    disabled
                    className="bg-slate-50 dark:bg-gray-900 border-slate-200 font-bold"
                  />
                )}
              </div>
            </div>

            {newRole === 'Staff' && (
              <div className="space-y-2">
                <Label htmlFor="linkedEmployee" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Link to Artisan/Employee</Label>
                <Select value={linkedEmployeeId} onValueChange={(val: string) => {
                  setLinkedEmployeeId(val);
                  setNewAddress(val);
                }}>
                  <SelectTrigger id="linkedEmployee" className="border-gold bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                    {employeesList.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="newEmail" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Email Address</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. ramesh@gujaratart.com"
                  className="border-gold focus:ring-saffron"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newMobile" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Mobile Number</Label>
                <Input
                  id="newMobile"
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="border-gold focus:ring-saffron"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="newAddress" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Residential Address</Label>
                <Input
                  id="newAddress"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. 21, Madhavpura Market, Ahmedabad"
                  className="border-gold focus:ring-saffron"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider block">Profile Photo</Label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center bg-slate-50 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                    {newProfilePhoto ? (
                      <img src={newProfilePhoto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-grow">
                    <Label
                      htmlFor="newPhotoFile"
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-3 py-1.5 rounded text-xs cursor-pointer border border-gold/20 inline-block"
                    >
                      Choose Photo
                    </Label>
                    <input
                      id="newPhotoFile"
                      type="file"
                      accept="image/*"
                      onChange={handleNewUserPhotoUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {authMethod === 'password' ? (
              <div className="space-y-4 border-l-2 border-maroon/20 pl-4 py-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="newUsername" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Username</Label>
                    <Input
                      id="newUsername"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. john_doe"
                      className="border-gold focus:ring-saffron"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Login Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="border-gold focus:ring-saffron"
                      required
                    />
                  </div>
                </div>

                {derivedPrincipalText && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-900 border border-gold/30 rounded-xl p-3 flex items-start space-x-3">
                    <Sparkles className="h-5 w-5 text-saffron mt-0.5 animate-pulse flex-shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-maroon dark:text-saffron tracking-wider">Cryptographic Identity Preview</p>
                      <p className="text-xs font-mono break-all text-gray-700 dark:text-gray-300 font-semibold mt-1">
                        {derivedPrincipalText}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        A secure, deterministic public Principal ID derived locally using Web Crypto API. Password will NOT be sent raw to the canister.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 border-l-2 border-saffron/20 pl-4 py-1">
                <div className="space-y-2">
                  <Label htmlFor="newPrincipal" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Principal ID</Label>
                  <Input
                    id="newPrincipal"
                    value={newPrincipal}
                    onChange={(e) => setNewPrincipal(e.target.value)}
                    placeholder="e.g. 5xwtz-aaaaa-..."
                    className="border-gold focus:ring-saffron font-mono text-xs"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newUsernameII" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Username Alias (Optional)</Label>
                  <Input
                    id="newUsernameII"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. john_ii"
                    className="border-gold focus:ring-saffron"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3">
              <Button 
                type="submit" 
                disabled={isCreatingUser} 
                className="bg-maroon hover:bg-maroon/90 text-white font-bold border border-gold/30 shadow-sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {isCreatingUser ? 'Registering...' : 'Register User'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Card 2.2: Registry List */}
      <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
        <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
          <CardTitle className="text-maroon dark:text-saffron">Authorized Registry Users</CardTitle>
          <CardDescription>View, inspect, or delete active billing software accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-50">
                  <TableHead className="font-bold text-maroon dark:text-saffron">Name & Username</TableHead>
                  <TableHead className="font-bold text-maroon dark:text-saffron">Principal ID</TableHead>
                  <TableHead className="font-bold text-maroon dark:text-saffron">Role</TableHead>
                  <TableHead className="font-bold text-maroon dark:text-saffron">Contact Details</TableHead>
                  <TableHead className="font-bold text-maroon dark:text-saffron">Status</TableHead>
                  <TableHead className="font-bold text-maroon dark:text-saffron">Created Date</TableHead>
                  <TableHead className="font-bold text-maroon dark:text-saffron text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersList && usersList.length > 0 ? (
                  usersList.map((usr) => {
                    const principalStr = usr.principalId.toString();
                    const formattedRegDate = formatERPDate(usr.createdAt);
                    const isSelf = principalStr === currentUser.principalId.toString();
                    
                    const isRowMasterAdmin = !!(usr.role && 'Admin' in usr.role);
                    const isRowAdmin = !!(usr.role && 'Manager' in usr.role);
                    const isRowStaff = !!(usr.role && 'Staff' in usr.role);
                    
                    const canManage = isMasterAdmin ? !isSelf : (isManager && isRowStaff);

                    const roleLabel = isRowMasterAdmin 
                      ? 'Master Admin' 
                      : isRowAdmin 
                        ? 'Admin' 
                        : 'Staff';

                    const isDeactivated = usr.status === 'Deactivated';

                    return (
                      <TableRow key={principalStr} className="hover:bg-amber-50/20 dark:hover:bg-gray-800/20">
                        <TableCell className="font-semibold text-gray-800 dark:text-white py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-900 border border-gold/20 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {usr.profilePhoto ? (
                                <img src={usr.profilePhoto} alt={usr.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-maroon dark:text-saffron font-bold text-xs">
                                  {usr.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-sm leading-tight text-slate-800 dark:text-slate-100">{usr.name}</p>
                              <p className="text-xs text-slate-500 font-semibold leading-normal">@{usr.username || 'user'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs select-all text-gray-600 dark:text-gray-400 py-4 max-w-[150px] truncate" title={principalStr}>
                          {principalStr}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                              isRowMasterAdmin 
                                ? 'bg-red-100 text-red-800 dark:bg-red-955/40 dark:text-red-200 border border-red-200/30' 
                                : isRowAdmin
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-955/40 dark:text-amber-200 border border-amber-200/30'
                                  : 'bg-green-100 text-green-800 dark:bg-green-955/40 dark:text-green-200 border border-green-200/30'
                            }`}>
                              {roleLabel}
                            </span>
                            {isRowStaff && (() => {
                              const linkedEmpId = localStorage.getItem(`staff_employee_link_${(usr.username || '').toLowerCase()}`);
                              const linkedEmp = employeesList.find((e: any) => e.id === linkedEmpId);
                              return linkedEmp ? (
                                <p className="text-[10px] font-bold text-[#7B0F1A] dark:text-saffron leading-tight">
                                  Linked: {linkedEmp.name}
                                </p>
                              ) : null;
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-700 dark:text-gray-300 py-4">
                          <p className="font-semibold">{usr.email || '—'}</p>
                          <p className="text-slate-500 dark:text-slate-400 font-semibold">{usr.mobile || '—'}</p>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                            isDeactivated 
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-955/40 dark:text-rose-200 border border-rose-200/30'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-955/40 dark:text-emerald-200 border border-emerald-200/30'
                          }`}>
                            {usr.status || 'Active'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500 py-4">{formattedRegDate}</TableCell>
                        <TableCell className="text-center py-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartEditUser(usr)}
                              disabled={!canManage}
                              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 h-7 w-7 disabled:opacity-30"
                              title="Edit User"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleStatus(principalStr, usr.status || 'Active')}
                              disabled={!canManage || isRowMasterAdmin}
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 h-7 w-7 disabled:opacity-30"
                              title={isDeactivated ? "Activate Account" : "Deactivate Account"}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResetPassword(principalStr, usr.username)}
                              disabled={!canManage}
                              className="text-blue-600 hover:bg-blue-950/30 h-7 w-7 disabled:opacity-30"
                              title="Reset Password"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteUser(principalStr)}
                              disabled={!canManage || isRowMasterAdmin}
                              className="text-red-600 hover:bg-red-950/30 h-7 w-7 disabled:opacity-30"
                              title="Delete Account"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">No authorized registry users found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent className="max-w-md border-2 border-gold bg-white dark:bg-slate-900" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-maroon font-bold text-xl">Edit User Details</DialogTitle>
            <DialogDescription>
              Modify the display name, contact information, role, or status of the user.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEditUser} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="editName" className="text-slate-500 font-semibold text-xs">Full Name *</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter full name"
                className="border-gold/30 focus-visible:ring-maroon"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editUsername" className="text-slate-500 font-semibold text-xs">Username *</Label>
              <Input
                id="editUsername"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Enter username"
                className="border-gold/30 focus-visible:ring-maroon"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editEmail" className="text-slate-500 font-semibold text-xs">Email Address *</Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Enter email address"
                className="border-gold/30 focus-visible:ring-maroon"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editMobile" className="text-slate-500 font-semibold text-xs">Mobile Number *</Label>
              <Input
                id="editMobile"
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value)}
                placeholder="Enter 10-digit mobile number"
                className="border-gold/30 focus-visible:ring-maroon"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editRole" className="text-slate-500 font-semibold text-xs">Access Role</Label>
              {isMasterAdmin && !(editingUser && editingUser.role && 'Admin' in editingUser.role) ? (
                <Select value={editRole} onValueChange={(val: any) => setEditRole(val)}>
                  <SelectTrigger id="editRole" className="border-gold/30 focus:ring-maroon">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                    <SelectItem value="Admin" disabled={masterAdminExists && !(editingUser?.role && 'Admin' in editingUser.role)}>Master Admin</SelectItem>
                    <SelectItem value="Manager">Admin</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={editRole === 'Admin' ? 'Master Admin' : (editRole === 'Manager' ? 'Admin' : 'Staff')}
                  disabled
                  className="bg-slate-50 dark:bg-gray-950 border-slate-200"
                />
              )}
            </div>

            {editRole === 'Staff' && (
              <div className="space-y-1.5">
                <Label htmlFor="editLinkedEmployee" className="text-slate-500 font-semibold text-xs">Link to Artisan/Employee</Label>
                <Select value={editLinkedEmployeeId} onValueChange={setEditLinkedEmployeeId}>
                  <SelectTrigger id="editLinkedEmployee" className="border-gold/30 focus:ring-maroon bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                    {employeesList.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="editStatus" className="text-slate-500 font-semibold text-xs">Status</Label>
              {isMasterAdmin && !(editingUser && editingUser.role && 'Admin' in editingUser.role) ? (
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger id="editStatus" className="border-gold/30 focus:ring-maroon">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Disabled">Disabled</SelectItem>
                    <SelectItem value="Deactivated">Deactivated</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={editStatus}
                  disabled
                  className="bg-slate-50 dark:bg-gray-950 border-slate-200"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)} className="border-gold/30">
                Cancel
              </Button>
              <Button type="submit" disabled={isEditingUser} className="bg-maroon hover:bg-maroon/90 text-white font-semibold">
                {isEditingUser ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
