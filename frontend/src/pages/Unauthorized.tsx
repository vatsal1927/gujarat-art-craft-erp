import React from 'react';
import { Link } from '@tanstack/react-router';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../components/AuthGuard';

export default function Unauthorized() {
    const { user } = useAuth();
    if (!user) return null;
    const isStaff = !!(user.role && 'Staff' in user.role);
    const isManager = !!(user.role && 'Manager' in user.role);
    const isAdmin = !!(user.role && 'Admin' in user.role);
    const roleStr = isAdmin ? 'Master Admin' : isManager ? 'Admin' : 'Staff';

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md text-center space-y-6 bg-white dark:bg-gray-950 p-8 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-xl">
                <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400">
                    <ShieldAlert className="h-10 w-10 animate-bounce" />
                </div>
                
                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold text-red-700 dark:text-red-500 tracking-tight">
                        403 - Access Denied
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">
                        {isStaff ? 'This page is restricted for Staff role.' : 'Settings & Administration is restricted.'}
                    </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 text-left space-y-2 text-sm font-mono text-gray-700 dark:text-gray-300">
                    <div className="flex justify-between">
                        <span className="text-gray-400">User:</span>
                        <span className="font-bold">{user.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Username:</span>
                        <span>@{user.username || 'user'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Active Role:</span>
                        <span className="text-red-500 font-bold uppercase tracking-wider text-xs">{roleStr}</span>
                    </div>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                    You do not have the required administrative permissions to access this page. Please contact the administrator to upgrade your access role.
                </p>

                <div className="pt-4">
                    <Button asChild className="bg-maroon hover:bg-maroon/90 text-white w-full border-2 border-gold/20 shadow">
                        <Link to="/" className="flex items-center justify-center space-x-2">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            <span>{isStaff ? 'Return to Staff Dashboard' : 'Return to Dashboard'}</span>
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
