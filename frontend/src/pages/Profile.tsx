import React, { useState } from 'react';
import { useAuth } from '../components/AuthGuard';
import { useUpdateProfile, useChangePassword } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { deriveIdentity } from '../utils/credentialDerivation';
import { formatERPDate, formatERPDateTime } from '../utils/calculations';
import { 
  User as UserIcon, Mail, Phone, MapPin, Shield, Calendar, Activity, 
  Lock, Key, LogOut, Camera, Eye, EyeOff, Save, Loader2 
} from 'lucide-react';

// Helper to convert buffer to hex string
function bufToHex(buffer: ArrayBuffer): string {
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

export default function Profile() {
  const { user, logout } = useAuth();
  
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile();
  const { mutate: changePassword, isPending: isChangingPassword } = useChangePassword();

  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [address, setAddress] = useState(user?.address || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');

  // Password States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Effect to sync state when user loads
  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setMobile(user.mobile || '');
      setAddress(user.address || '');
      setProfilePhoto(user.profilePhoto || '');
    }
  }, [user]);

  if (!user) {
    return null;
  }

  // Parse User Joining Date
  const formattedJoinDate = formatERPDate(user.createdAt);

  // Parse Last Login Time
  const formattedLastLogin = user.lastLogin 
    ? formatERPDateTime(user.lastLogin)
    : 'Never';

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error('Profile photo must be less than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setProfilePhoto(base64String);
      toast.success('Preview loaded. Click Save Changes to update your profile.');
    };
    reader.readAsDataURL(file);
  };

  // Handle Save Profile Changes
  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Full Name is required');
      return;
    }

    const phoneRegex = /^[0-9\s,+-]{10,25}$/;
    if (mobile.trim() && !phoneRegex.test(mobile.trim())) {
      toast.error('Please enter a valid Phone Number');
      return;
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error('Please enter a valid Email Address');
        return;
      }
    }

    updateProfile(
      {
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        address: address.trim(),
        profilePhoto: profilePhoto
      },
      {
        onSuccess: () => {
          toast.success('Profile details updated successfully');
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to update profile');
        }
      }
    );
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      // Derive new identity locally to compute new Principal ID
      const derivedIdentity = await deriveIdentity(user.username, newPassword);
      const newPrincipalId = derivedIdentity.getPrincipal().toString();

      // Compute seed hex for local session updating
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest(
        'SHA-256', 
        encoder.encode(`${user.username.toLowerCase()}:${newPassword}`)
      );
      const seedHex = bufToHex(hashBuffer);

      changePassword(
        {
          newPassword: newPassword,
          newPrincipalId: newPrincipalId
        },
        {
          onSuccess: () => {
            localStorage.removeItem('user_session');
            sessionStorage.removeItem('user_session');
            localStorage.removeItem('mock_current_user');
            toast.success('Password changed successfully. Please login again.');
            setTimeout(() => {
              window.location.reload();
            }, 500);
          },
          onError: (err) => {
            toast.error(err.message || 'Failed to change password');
          }
        }
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to change password during cryptographic derivation');
    }
  };

  // Map role key to badge format
  const getRoleText = () => {
    if (user?.role && 'Admin' in user.role) return 'Master Admin';
    if (user?.role && 'Manager' in user.role) return 'Admin';
    return 'Staff';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Banner */}
      <div>
        <h1 className="text-3xl font-extrabold text-maroon dark:text-saffron tracking-tight">My Profile</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage your personal details, visual avatar, security credentials, and active login sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: User Summary Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-2 border-gold shadow-md bg-white/95 dark:bg-gray-950/95 overflow-hidden">
            {/* Gradient Header Banner behind avatar */}
            <div className="h-32 bg-gradient-to-r from-maroon via-saffron to-maroon relative" />
            
            <CardContent className="pt-0 pb-6 relative flex flex-col items-center">
              {/* Profile Avatar with Photo Upload overlay */}
              <div className="w-28 h-28 rounded-full border-4 border-white dark:border-gray-950 bg-slate-100 dark:bg-gray-900 shadow-xl overflow-hidden -mt-14 relative group">
                {profilePhoto ? (
                  <img src={profilePhoto} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-maroon dark:text-saffron font-bold text-3xl">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Hover overlay file input */}
                <label 
                  htmlFor="profilePhotoUpload"
                  className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-[10px] uppercase font-bold tracking-wider"
                >
                  <Camera className="h-4 w-4 mb-1" />
                  Upload
                </label>
                <input 
                  id="profilePhotoUpload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {/* User Bio */}
              <div className="text-center mt-4 w-full">
                <h3 className="font-extrabold text-lg text-slate-850 dark:text-slate-100">{user.name}</h3>
                <p className="text-xs text-slate-500 font-semibold">@{user.username}</p>
                
                {/* Badges row */}
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                    user?.role && 'Admin' in user.role 
                      ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200 border border-red-200/30' 
                      : 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200 border border-green-200/30'
                  }`}>
                    {getRoleText()}
                  </span>
                  <span className="flex items-center gap-1 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200/30 px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-505 bg-emerald-500 animate-ping" />
                    Online
                  </span>
                </div>
              </div>

              {/* Meta information grid */}
              <div className="w-full mt-6 border-t border-gold/10 pt-5 space-y-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Principal ID
                  </span>
                  <span className="font-mono truncate max-w-[140px] select-all bg-slate-50 dark:bg-gray-900 border border-slate-200/50 p-1 rounded" title={user.principalId.toString()}>
                    {user.principalId.toString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Joining Date
                  </span>
                  <span>{formattedJoinDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    Last Login
                  </span>
                  <span>{formattedLastLogin}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Profile Form Settings / Change password */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Card 1: Account Information */}
          <Card className="border-2 border-gold shadow-md bg-white/95 dark:bg-gray-950/95 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
              <CardTitle className="text-maroon dark:text-saffron flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                <span>Account Profile Details</span>
              </CardTitle>
              <CardDescription>Update your contact phone numbers and residential locations.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSaveChanges} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="profileName" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Full Name</Label>
                    <Input
                      id="profileName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Patel"
                      className="border-gold focus:ring-saffron"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profileEmail" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gold" />
                      <Input
                        id="profileEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. ramesh@gujaratart.com"
                        className="pl-10 border-gold focus:ring-saffron"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="profileMobile" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gold" />
                      <Input
                        id="profileMobile"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="pl-10 border-gold focus:ring-saffron"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">System Role</Label>
                    <Input
                      value={getRoleText()}
                      disabled
                      className="bg-slate-50 dark:bg-gray-900 border-slate-200 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profileAddress" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Residential Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gold" />
                    <Input
                      id="profileAddress"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 21, Madhavpura Market, Ahmedabad"
                      className="pl-10 border-gold focus:ring-saffron"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-gold/10">
                  <Button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="bg-maroon hover:bg-maroon/90 text-white font-semibold border border-gold/30 shadow-sm"
                  >
                    {isUpdatingProfile ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Card 2: Security & Password */}
          <Card className="border-2 border-gold shadow-md bg-white/95 dark:bg-gray-950/95 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
              <CardTitle className="text-maroon dark:text-saffron flex items-center gap-2">
                <Lock className="h-5 w-5" />
                <span>Security Settings & Password</span>
              </CardTitle>
              <CardDescription>Update your local account password credentials safely.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleChangePassword} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="newPass" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">New Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gold" />
                      <Input
                        id="newPass"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 border-gold focus:ring-saffron"
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPass" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Confirm New Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gold" />
                      <Input
                        id="confirmPass"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 border-gold focus:ring-saffron"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gold/10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={logout}
                    className="border-red-250 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout from All Devices
                  </Button>

                  <Button
                    type="submit"
                    disabled={isChangingPassword}
                    className="bg-maroon hover:bg-maroon/90 text-white font-semibold border border-gold/30 shadow-sm"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Changing Password...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
