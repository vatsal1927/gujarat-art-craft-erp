import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { useUserSelf } from '../hooks/useQueries';
import { type User } from '../backend';
import { Button } from './ui/button';
import { loadConfig } from '../config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Lock, LogIn, AlertCircle, ShieldAlert, LogOut, Copy, RefreshCw, Eye, EyeOff, KeyRound, ArrowLeft, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { deriveIdentity, bufToHex } from '../utils/credentialDerivation';
import { getOptionalBoolean } from '../utils/candidHelpers';
import { MockBackend } from '../mockBackend';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { normalizeUsername, createPasswordHash, findUserByUsername, deduplicateUsers } from '../utils/passwordAuth';

interface AuthContextType {
    user: User;
    logout: () => void;
    isMock: boolean;
}

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

const verifyMasterAdminIntegrity = (users: any[]): { isValid: boolean; message: string } => {
    const masterAdmins = users.filter(u => u.role && 'Admin' in u.role);
    if (masterAdmins.length === 0) {
        return { isValid: false, message: "CRITICAL SECURITY BREACH: Master Admin account is missing or deleted!" };
    }
    if (masterAdmins.length > 1) {
        return { isValid: false, message: "CRITICAL SECURITY BREACH: Multiple Master Admin accounts detected! Duplicate identities detected." };
    }
    const master = masterAdmins[0];
    if (master.status !== 'Active' && master.status !== 'Enabled') {
        return { isValid: false, message: `CRITICAL SECURITY BREACH: Master Admin account (${master.name}) is deactivated or disabled!` };
    }
    if (master.username !== 'admin') {
        return { isValid: false, message: "CRITICAL SECURITY BREACH: Master Admin identity mismatch! Unauthorized user holds Master Admin privileges." };
    }
    return { isValid: true, message: "Master Admin integrity is intact." };
};

export type AuthState = 
    | 'INITIALIZING' 
    | 'UNAUTHENTICATED' 
    | 'AUTHENTICATING' 
    | 'AUTHENTICATED' 
    | 'AUTHENTICATED_NOT_REGISTERED' 
    | 'PASSWORD_CHANGE_REQUIRED' 
    | 'ERROR';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider/AuthGuard');
    }
    return context;
};

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();
    const { identity, login: iiLogin, clear: iiLogout } = useInternetIdentity();
    const { actor, isFetching: isFetchingActor } = useActor();
    const { data: user, isLoading, error, refetch } = useUserSelf();
    const isSessionLoggedIn = !!localStorage.getItem('user_session') || !!sessionStorage.getItem('user_session');

    const authCheckCompleted = useMemo(() => {
        if (!isSessionLoggedIn) return true;
        return !isFetchingActor && !!actor && !isLoading;
    }, [isSessionLoggedIn, isFetchingActor, actor, isLoading]);

    const logoutOnceRef = useRef(false);

    const [isMock, setIsMock] = useState(false);
    const [allowMock, setAllowMock] = useState(true);
    const [securityViolation, setSecurityViolation] = useState<string | null>(null);

    const navigate = useNavigate();
    const location = useLocation();
    const pathname = location.pathname;

    // Form inputs for password-based login
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [isLoggingInPassword, setIsLoggingInPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showRecovery, setShowRecovery] = useState(false);
    const [loginDebug, setLoginDebug] = useState<{
        userFound: 'YES' | 'NO' | 'Pending';
        matchedBy: 'username' | 'email' | 'mobile' | 'None';
        hashMatched: 'YES' | 'NO' | 'Pending';
        status: string;
        roleFound: 'YES' | 'NO' | 'Pending';
    } | null>(null);

    const [repairResults, setRepairResults] = useState<{
        overall: 'idle' | 'running' | 'pass' | 'fail';
        details: string[];
    } | null>(null);

    const isProduction = import.meta.env?.PROD || process.env.NODE_ENV === 'production';

    const handleRepairAuthUserIndex = async () => {
        if (!import.meta.env?.DEV) {
            toast.error("Repair utility is disabled in production.");
            return;
        }

        const detailsLog: string[] = [];
        const log = (msg: string) => {
            console.log(`[Repair-Index] ${msg}`);
            detailsLog.push(msg);
            setRepairResults({
                overall: 'running',
                details: [...detailsLog]
            });
        };

        setRepairResults({ overall: 'running', details: [] });
        log("Starting repair of Auth User Index...");

        try {
            let usersList: any[] = [];
            if (isMock) {
                log("Backend is in Mock mode. Reading users from localStorage...");
                const stored = localStorage.getItem('mock_users');
                usersList = stored ? JSON.parse(stored) : [];
            } else {
                log("Backend is in Canister mode. Fetching users from canister...");
                let activeActor = actor;
                if (!activeActor) {
                    throw new Error("Canister actor is not initialized.");
                }
                const fetched = await activeActor.getUsers();
                usersList = fetched.map((u: any) => ({
                    principalId: u.principalId.toString(),
                    name: u.name,
                    username: u.username,
                    role: u.role,
                    createdAt: u.createdAt.toString(),
                    email: u.email || '',
                    mobile: u.mobile || '',
                    address: u.address || '',
                    profilePhoto: u.profilePhoto || '',
                    status: u.status || 'Active',
                    passwordHash: u.passwordHash || '',
                    needsPasswordChange: getOptionalBoolean(u.needsPasswordChange, false, "needsPasswordChange"),
                    lastLogin: u.lastLogin || ''
                }));
            }

            log(`Successfully loaded ${usersList.length} users.`);
            const dedupResult = deduplicateUsers(usersList);
            let cleanUsers: any[] = [];
            let hasAdmin = false;

            for (const userItem of dedupResult.cleanUsers) {
                const usernameNormalized = userItem.username.trim().toLowerCase();
                const emailNormalized = (userItem.email || '').trim().toLowerCase();
                const mobileNormalized = (userItem.mobile || '').trim().replace(/\s+/g, '');
                const statusClean = userItem.status === 'Disabled' || userItem.status === 'Deactivated' ? 'Disabled' : 'Active';
                
                let roleClean = userItem.role;
                if (roleClean && 'Admin' in roleClean) {
                    if (usernameNormalized !== 'admin') {
                        roleClean = { Manager: null };
                        log(`Enforced Single Master Admin policy: demoted '${userItem.name}' to Manager.`);
                    } else {
                        hasAdmin = true;
                    }
                }

                cleanUsers.push({
                    ...userItem,
                    username: usernameNormalized,
                    email: emailNormalized,
                    mobile: mobileNormalized,
                    status: statusClean,
                    role: roleClean
                });
            }

            if (isMock) {
                localStorage.setItem('mock_users', JSON.stringify(cleanUsers));
            }
            log("Auth index processed successfully.");

            setRepairResults({
                overall: 'pass',
                details: [...detailsLog, "--- REPAIR REPORT: PASS ---"]
            });
            toast.success("Auth User Index validated successfully!");
        } catch (error: any) {
            log(`ERROR during repair: ${error.message}`);
            setRepairResults({
                overall: 'fail',
                details: [...detailsLog, "--- REPAIR REPORT: FAIL ---"]
            });
            toast.error(`Repair Failed: ${error.message}`);
        }
    };

    // Development-Only Mock User Cleanup
    useEffect(() => {
        if (!import.meta.env?.DEV) return;

        const storedUsersStr = localStorage.getItem('mock_users');
        if (!storedUsersStr) return;

        let usersList = storedUsersStr ? JSON.parse(storedUsersStr) : [];
        let updated = false;

        const dedupResult = deduplicateUsers(usersList);
        usersList = dedupResult.cleanUsers;
        if (dedupResult.updated) updated = true;

        usersList = usersList.map((u: any) => {
            const usernameNormalized = (u.username || '').trim().toLowerCase();
            if (usernameNormalized === 'admin') {
                if (!u.role || !('Admin' in u.role)) {
                    u.role = { Admin: null };
                    updated = true;
                }
            } else if (u.role && 'Admin' in u.role) {
                u.role = { Manager: null };
                updated = true;
            }
            return u;
        }).filter((u: any) => {
            const nameLower = (u.name || '').toLowerCase();
            const usernameLower = (u.username || '').toLowerCase();
            if (nameLower.includes('mock') || usernameLower.includes('mock')) {
                updated = true;
                return false;
            }
            return true;
        });

        if (updated) {
            localStorage.setItem('mock_users', JSON.stringify(usersList));
        }

        const integrity = verifyMasterAdminIntegrity(usersList);
        if (!integrity.isValid) {
            setSecurityViolation(integrity.message);
        } else {
            setSecurityViolation(null);
        }
    }, []);

    // Determine mock status and config
    useEffect(() => {
        const isMockActive = !identity || (actor && actor.constructor.name === 'MockBackend');
        setIsMock(!!isMockActive);

        loadConfig().then(config => {
            if (isProduction) {
                setAllowMock(false);
            } else {
                const hasCanister = config.backend_canister_id && config.backend_canister_id !== 'undefined' && config.backend_canister_id !== 'mock';
                setAllowMock(!hasCanister);
            }
        }).catch(() => {
            setAllowMock(!isProduction);
        });
    }, [identity, actor, isProduction]);

    // Canister security validation for Master Admin
    useEffect(() => {
        if (actor && actor.verifyMasterAdminIntegrity) {
            actor.verifyMasterAdminIntegrity().then((result: { isValid: boolean; message: string }) => {
                if (!result.isValid) {
                    setSecurityViolation(result.message);
                } else {
                    setSecurityViolation((prev) => prev ? prev : null);
                }
            }).catch((e: any) => console.error("Error verifying Master Admin integrity:", e));
        }
    }, [actor]);

    // Account status check & session invalidation
    useEffect(() => {
        if (!authCheckCompleted) return;
        if (isLoading) return;
        if (!isSessionLoggedIn) return;

        if (user !== null && user !== undefined) {
            const statusLower = (user.status || '').toLowerCase();
            if (statusLower === 'deactivated' || statusLower === 'disabled' || statusLower === 'deactive') {
                if (logoutOnceRef.current) return;
                logoutOnceRef.current = true;
                toast.error('Account disabled');
                handleLogout();
            }
            return;
        }

        if (user === null) {
            if (logoutOnceRef.current) return;
            logoutOnceRef.current = true;
            handleLogout();
        }
    }, [authCheckCompleted, isLoading, isSessionLoggedIn, user]);

    // Path-level route protection for Staff
    useEffect(() => {
        if (user) {
            const isStaff = user.role && 'Staff' in user.role;
            const allowedStaffPaths = [
                '/', 
                '/profile', 
                '/production', 
                '/job-work', 
                '/unauthorized', 
                '/employee-ledger', 
                '/employee-payments', 
                '/inventory', 
                '/inventory/finished-goods-logs', 
                '/collections'
            ];
            const normalizedPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
            
            if (isStaff) {
                const isAllowed = allowedStaffPaths.some(p => {
                    if (p === '/') return normalizedPath === '/';
                    return normalizedPath.startsWith(p);
                });
                
                if (!isAllowed) {
                    toast.error('Access Denied: Staff cannot access administrative pages.');
                    navigate({ to: '/unauthorized', replace: true });
                }
            }
        }
    }, [user, pathname, navigate]);

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedUser = loginUsername.trim();
        if (!trimmedUser || !loginPassword) {
            toast.error('Please enter username/email/mobile and password');
            return;
        }

        setIsLoggingInPassword(true);
        try {
            let resolveUsername = trimmedUser.toLowerCase();

            // Derive cryptographic identity using resolved username
            const derivedIdentity = await deriveIdentity(resolveUsername, loginPassword);
            const targetPrincipal = derivedIdentity.getPrincipal();
            const principalStr = targetPrincipal.toString();
            const seedHex = await createPasswordHash(resolveUsername, loginPassword);

            // Instantiate temporary actor with this derived identity
            const { createActorWithConfig } = await import('../config');
            const tempActor = await createActorWithConfig({
                agentOptions: {
                    identity: derivedIdentity
                }
            });

            const isMockBackend = tempActor instanceof MockBackend || tempActor.constructor.name === 'MockBackend';

            if (isProduction && isMockBackend) {
                toast.error('Security Violation: Mock authentication is completely disabled in production mode.');
                setIsLoggingInPassword(false);
                return;
            }

            if (!isMockBackend) {
                // Production Real Canister Authentication Path
                try {
                    let userSelf = await tempActor.registerOrGetSelf();

                    // If registerOrGetSelf returned null, lookup user in canister to resolve email/mobile to username
                    if (!userSelf) {
                        try {
                            const canisterUsers = await tempActor.getUsers();
                            const matchedUser = canisterUsers.find((u: any) => {
                                const uUser = (u.username || '').toLowerCase();
                                const uEmail = (u.email || '').toLowerCase();
                                const uMobile = (u.mobile || '').replace(/\s+/g, '');
                                const searchLower = trimmedUser.toLowerCase();
                                const searchMobile = trimmedUser.replace(/\s+/g, '');
                                return uUser === searchLower || uEmail === searchLower || (uMobile && uMobile === searchMobile);
                            });

                            if (matchedUser && matchedUser.username !== resolveUsername) {
                                resolveUsername = matchedUser.username;
                                const reDerivedIdentity = await deriveIdentity(resolveUsername, loginPassword);
                                const reTempActor = await createActorWithConfig({
                                    agentOptions: { identity: reDerivedIdentity }
                                });
                                userSelf = await reTempActor.registerOrGetSelf();
                            }
                        } catch (lookupErr) {
                            console.warn('User canister lookup error:', lookupErr);
                        }
                    }

                    if (!userSelf) {
                        toast.error('Invalid credentials');
                        setIsLoggingInPassword(false);
                        return;
                    }

                    if (userSelf.status === 'Deactivated' || userSelf.status === 'Disabled') {
                        toast.error('Account disabled');
                        setIsLoggingInPassword(false);
                        return;
                    }

                    const hasRole = userSelf.role && ('Admin' in userSelf.role || 'Manager' in userSelf.role || 'Staff' in userSelf.role);
                    if (!hasRole) {
                        toast.error('Role missing or invalid');
                        setIsLoggingInPassword(false);
                        return;
                    }

                    const session = {
                        username: userSelf.username,
                        name: userSelf.name,
                        role: userSelf.role,
                        principalId: principalStr,
                        secretKeyHex: seedHex
                    };

                    const storage = rememberMe ? localStorage : sessionStorage;
                    storage.setItem('user_session', JSON.stringify(session));

                    try {
                        await tempActor.logUserAction("User login", "User logged in with password");
                    } catch (e) {
                        console.warn("Log user action failed:", e);
                    }

                    toast.success(`Logged in successfully as ${userSelf.name}`);
                    setTimeout(() => {
                        window.location.reload();
                    }, 300);
                } catch (canisterErr: any) {
                    console.error('Canister login error:', canisterErr);
                    toast.error(canisterErr.message || 'Login failed');
                }
            } else {
                // Development-Only MockBackend Authentication Path
                if (import.meta.env?.DEV) {
                    const storedUsersStr = localStorage.getItem('mock_users');
                    const usersList = storedUsersStr ? JSON.parse(storedUsersStr) : [];
                    const cleanInputUsername = normalizeUsername(trimmedUser);
                    const mockTargetUser = findUserByUsername(usersList, cleanInputUsername);

                    if (!mockTargetUser) {
                        toast.error('Invalid credentials');
                        setIsLoggingInPassword(false);
                        return;
                    }

                    const isActive = mockTargetUser.status === 'Active' || mockTargetUser.status === 'Enabled';
                    if (!isActive) {
                        toast.error('Account disabled');
                        setIsLoggingInPassword(false);
                        return;
                    }

                    const generatedHash = await createPasswordHash(mockTargetUser.username, loginPassword);
                    const isHashMatch = mockTargetUser.passwordHash === generatedHash;

                    if (!isHashMatch) {
                        toast.error('Invalid credentials');
                        setIsLoggingInPassword(false);
                        return;
                    }

                    const session = {
                        username: mockTargetUser.username,
                        name: mockTargetUser.name,
                        role: mockTargetUser.role,
                        principalId: mockTargetUser.principalId,
                        secretKeyHex: generatedHash
                    };

                    const storage = rememberMe ? localStorage : sessionStorage;
                    storage.setItem('user_session', JSON.stringify(session));

                    toast.success(`Logged in as ${mockTargetUser.name}`);
                    setTimeout(() => {
                        window.location.reload();
                    }, 300);
                }
            }
        } catch (err: any) {
            console.error('Password login error:', err);
            toast.error(err.message || 'Login failed');
        } finally {
            setIsLoggingInPassword(false);
        }
    };

    const handleLogout = async () => {
        try {
            if (actor && user) {
                await actor.logUserAction("User logout", "User logged out");
            }
        } catch (e) {
            console.warn("Failed to write logout log to canister:", e);
        }
        localStorage.removeItem('user_session');
        sessionStorage.removeItem('user_session');
        localStorage.removeItem('mock_current_user');
        iiLogout();
        toast.success('Logged out successfully');
        setTimeout(() => {
            window.location.reload();
        }, 300);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Principal ID copied to clipboard!');
    };

    const authContextValue: AuthContextType = useMemo(() => ({
        user: user as User,
        logout: handleLogout,
        isMock
    }), [user, handleLogout, isMock]);

    // Deriving explicit AuthState
    const authState = useMemo<AuthState>(() => {
        if (isProduction && actor && (actor instanceof MockBackend || actor.constructor.name === 'MockBackend')) {
            return 'ERROR';
        }

        const isSessionActive = !!localStorage.getItem('user_session') || !!sessionStorage.getItem('user_session') || !!identity;
        if (isProduction && isSessionActive && !actor && !isFetchingActor) {
            return 'ERROR';
        }

        if (isSessionLoggedIn && (!authCheckCompleted || isLoading)) {
            return 'INITIALIZING';
        }

        if (isLoggingInPassword) {
            return 'AUTHENTICATING';
        }

        const isAuthenticated = !!identity || isSessionLoggedIn;
        if (!isAuthenticated) {
            return 'UNAUTHENTICATED';
        }

        if (!user) {
            return 'AUTHENTICATED_NOT_REGISTERED';
        }

        if (getOptionalBoolean(user.needsPasswordChange)) {
            return 'PASSWORD_CHANGE_REQUIRED';
        }

        return 'AUTHENTICATED';
    }, [isProduction, actor, isFetchingActor, isSessionLoggedIn, authCheckCompleted, isLoading, isLoggingInPassword, identity, user]);

    // 1. ERROR State
    if (authState === 'ERROR') {
        if (isProduction && actor && (actor instanceof MockBackend || actor.constructor.name === 'MockBackend')) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-950 text-white px-4 py-12">
                    <div className="text-center space-y-4 max-w-md border-2 border-red-500 rounded-lg p-6 bg-red-900/50">
                        <ShieldAlert className="h-16 w-16 text-red-500 mx-auto animate-pulse" />
                        <h1 className="text-2xl font-bold text-red-400">Security Configuration Error</h1>
                        <p className="text-sm text-red-200">
                            This application is compiled in Production Mode, but the secure canister backend is unavailable or not configured.
                        </p>
                        <p className="text-xs text-red-300 font-mono">
                            Mock authentication and local simulation are disabled in production.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
                <Card className="w-full max-w-md border-2 border-red-500 shadow-2xl overflow-hidden bg-white/95 dark:bg-gray-950/95">
                    <CardHeader className="bg-gradient-to-r from-red-700 to-red-900 text-white text-center py-6">
                        <div className="mx-auto w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2">
                            <ShieldAlert className="h-6 w-6 text-white" />
                        </div>
                        <CardTitle className="text-lg">Connection Failure</CardTitle>
                        <CardDescription className="text-white/80 text-xs">
                            Secure connection to the administrative canister backend could not be established.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4 text-center bg-white dark:bg-slate-950">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Please ensure your network connection and backend canister configuration are valid.
                        </p>
                        <Button 
                            onClick={() => window.location.reload()} 
                            className="w-full bg-maroon hover:bg-maroon/90 text-white font-semibold flex items-center justify-center border-2 border-gold/40"
                        >
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            <span>Retry Connection</span>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // 2. INITIALIZING State
    if (authState === 'INITIALIZING') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="text-center space-y-4">
                    <RefreshCw className="h-12 w-12 animate-spin text-maroon mx-auto" />
                    <p className="text-maroon font-semibold dark:text-saffron">Resolving user session...</p>
                </div>
            </div>
        );
    }

    // 3. UNAUTHENTICATED State
    if (authState === 'UNAUTHENTICATED') {
        if (showRecovery) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
                    <div className="w-full max-w-md space-y-6">
                        <div className="text-center space-y-2">
                            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-maroon to-saffron flex items-center justify-center shadow-lg border-2 border-gold">
                                <KeyRound className="h-8 w-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-extrabold text-maroon dark:text-saffron tracking-tight">
                                Password Recovery
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 font-medium text-sm">
                                Contact an administrator to assist with password resets.
                            </p>
                        </div>
                        <PasswordRecoveryForm onBack={() => setShowRecovery(false)} isMock={isMock} />
                    </div>
                </div>
            );
        }
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
                <div className="w-full max-w-md space-y-6">
                    {/* Brand Banner */}
                    <div className="text-center space-y-2">
                        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-maroon to-saffron flex items-center justify-center shadow-lg border-2 border-gold">
                            <Lock className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-maroon dark:text-saffron tracking-tight">
                            Gujarat Art & Crafts
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 font-medium">
                            Invoice Billing & Administration
                        </p>
                    </div>

                    <Card className="border-2 border-gold shadow-2xl overflow-hidden bg-white/95 dark:bg-gray-950/95 backdrop-blur">
                        <CardHeader className="bg-gradient-to-r from-maroon via-saffron to-maroon text-white text-center py-6">
                            <CardTitle className="text-xl">Authentication Portal</CardTitle>
                            <CardDescription className="text-white/80 text-xs">
                                Enter your credentials or sign in with Internet Identity.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            {/* Cryptographic Password Login */}
                            <form onSubmit={handlePasswordLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">
                                        Username, Email, or Mobile
                                    </Label>
                                    <Input 
                                        type="text"
                                        placeholder="e.g. admin, staff_user, email, mobile"
                                        value={loginUsername}
                                        onChange={(e) => setLoginUsername(e.target.value)}
                                        className="border-gold/30 focus:ring-saffron"
                                        required
                                        disabled={isLoggingInPassword}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">
                                        Password
                                    </Label>
                                    <Input 
                                        type="password"
                                        placeholder="••••••••"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        className="border-gold/30 focus:ring-saffron"
                                        required
                                        disabled={isLoggingInPassword}
                                    />
                                </div>

                                <div className="flex items-center justify-between py-1 text-xs">
                                    <div className="flex items-center space-x-2">
                                        <input 
                                            id="rememberMe"
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="h-4 w-4 rounded border-gold/30 text-maroon focus:ring-maroon accent-maroon cursor-pointer"
                                        />
                                        <label htmlFor="rememberMe" className="text-slate-650 dark:text-slate-400 font-semibold cursor-pointer">
                                            Remember Me
                                        </label>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setShowRecovery(true)}
                                        className="text-maroon dark:text-saffron font-bold hover:underline"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>

                                <Button 
                                    type="submit" 
                                    disabled={isLoggingInPassword}
                                    className="w-full bg-maroon hover:bg-maroon/90 text-white font-semibold flex items-center justify-center space-x-2 py-5 border-2 border-gold/40 hover:border-gold shadow"
                                >
                                    {isLoggingInPassword ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                            <span>Authenticating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <LogIn className="h-4 w-4 mr-1" />
                                            <span>Sign In</span>
                                        </>
                                    )}
                                </Button>
                            </form>

                            <div className="relative flex items-center justify-center py-1">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-gold/20" />
                                </div>
                                <span className="relative px-3 bg-white dark:bg-gray-950 text-xs font-semibold text-gold tracking-widest uppercase">
                                    or
                                </span>
                            </div>

                            {/* Live Canister Login */}
                            <div className="space-y-3">
                                <Button 
                                    onClick={iiLogin} 
                                    type="button"
                                    className="w-full bg-saffron hover:bg-saffron/90 text-white font-semibold flex items-center justify-center space-x-2 py-5 border-2 border-gold/20 shadow"
                                >
                                    <LogIn className="h-4 w-4 mr-1" />
                                    <span>Sign in with Internet Identity</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {import.meta.env?.DEV && (
                        <Card className="border-2 border-dashed border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-slate-800 dark:text-slate-200 shadow-xl mt-4">
                            <CardHeader className="py-3 px-4 border-b border-dashed border-amber-500/30">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                    <ShieldAlert className="h-4 w-4" /> 🔧 Dev Diagnostics & Repair
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="py-4 px-4 space-y-3">
                                {loginDebug && (
                                    <div className="text-xs space-y-1.5 font-mono border-b border-dashed border-amber-500/20 pb-3">
                                        <div className="flex justify-between">
                                            <span>Identifier matched by:</span>
                                            <span className="font-bold">{loginDebug.matchedBy}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Account status:</span>
                                            <span className="font-bold">{loginDebug.status}</span>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    type="button"
                                    onClick={handleRepairAuthUserIndex}
                                    disabled={repairResults?.overall === 'running'}
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-3.5 flex items-center justify-center gap-2"
                                >
                                    {repairResults?.overall === 'running' ? (
                                        <>
                                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                            <span>Repairing Index...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Wrench className="h-3.5 w-3.5" />
                                            <span>Repair Dev Auth User Index</span>
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        );
    }

    // 4. AUTHENTICATED_NOT_REGISTERED State
    if (authState === 'AUTHENTICATED_NOT_REGISTERED') {
        const sessionStr = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
        const principalStr = identity ? identity.getPrincipal().toString() : (sessionStr ? JSON.parse(sessionStr).principalId : 'Unknown');

        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
                <Card className="w-full max-w-md border-2 border-red-500 shadow-2xl overflow-hidden bg-white/95 dark:bg-gray-950/95">
                    <CardHeader className="bg-gradient-to-r from-red-700 to-red-900 text-white text-center py-6">
                        <div className="mx-auto w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2">
                            <ShieldAlert className="h-6 w-6 text-white" />
                        </div>
                        <CardTitle className="text-lg">Access Denied</CardTitle>
                        <CardDescription className="text-white/80 text-xs">
                            Your account is not registered in our billing registry.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Public registration is restricted. An Administrator must register your Principal ID in the backend database before you can log in.
                        </p>

                        <div className="space-y-2 text-left">
                            <Label className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider block">
                                Your Principal ID
                            </Label>
                            <div className="flex space-x-2">
                                <div className="flex-1 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded px-3 py-2 text-xs font-mono select-all overflow-x-auto truncate whitespace-nowrap self-center text-gray-700 dark:text-gray-300 font-bold">
                                    {principalStr}
                                </div>
                                <Button 
                                    size="icon" 
                                    variant="outline" 
                                    onClick={() => copyToClipboard(principalStr)}
                                    className="border-gold/30 hover:border-saffron text-maroon hover:text-saffron"
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex space-x-3 pt-2">
                            <Button 
                                onClick={handleLogout} 
                                variant="destructive" 
                                className="w-full flex items-center justify-center space-x-2"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Sign Out</span>
                            </Button>
                            <Button 
                                onClick={() => refetch()} 
                                variant="outline" 
                                className="border-gold/40 hover:bg-gold/10 text-maroon"
                            >
                                <RefreshCw className="h-4 w-4 mr-1 animate-pulse" />
                                <span>Retry</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // 5. PASSWORD_CHANGE_REQUIRED State
    if (authState === 'PASSWORD_CHANGE_REQUIRED') {
        return (
            <AuthContext.Provider value={authContextValue}>
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
                    <div className="w-full max-w-md space-y-6">
                        <div className="text-center space-y-2">
                            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-maroon to-saffron flex items-center justify-center shadow-lg border-2 border-gold">
                                <Lock className="h-8 w-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-extrabold text-maroon dark:text-saffron tracking-tight">
                                Password Change Required
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 font-medium text-sm">
                                For security reasons, you must change your default password before proceeding.
                            </p>
                        </div>

                        <Card className="border-2 border-gold shadow-2xl overflow-hidden bg-white/95 dark:bg-gray-950/95 backdrop-blur">
                            <CardHeader className="bg-gradient-to-r from-maroon via-saffron to-maroon text-white text-center py-6">
                                <CardTitle className="text-xl">Set New Password</CardTitle>
                                <CardDescription className="text-white/80 text-xs">
                                    Please choose a strong password.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <ForcePasswordChangeForm user={user!} onPasswordChanged={() => refetch()} logout={handleLogout} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </AuthContext.Provider>
        );
    }

    // 6. AUTHENTICATED State
    return (
        <AuthContext.Provider value={authContextValue}>
            {securityViolation && (
                <div className="bg-red-600 text-white p-3 text-center text-sm font-bold flex items-center justify-center space-x-2 z-50 sticky top-0 shadow-lg">
                    <ShieldAlert className="h-5 w-5" />
                    <span>{securityViolation}</span>
                </div>
            )}
            {children}
        </AuthContext.Provider>
    );
}

function ForcePasswordChangeForm({ user, onPasswordChanged, logout }: { user: User; onPasswordChanged: () => void; logout: () => void }) {
    const { actor } = useActor();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword) {
            toast.error('Please enter a new password');
            return;
        }
        const strength = isStrongPassword(newPassword);
        if (!strength.isValid) {
            toast.error(strength.message);
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setIsSubmitting(true);
        try {
            const derivedIdentity = await deriveIdentity(user.username, newPassword);
            const newPrincipalId = derivedIdentity.getPrincipal().toString();
            const seedHex = await createPasswordHash(user.username, newPassword);

            if (!actor) {
                throw new Error('Backend connection not available');
            }

            await actor.changePassword(newPassword, newPrincipalId);

            const sessionStr = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                session.principalId = newPrincipalId;
                session.secretKeyHex = seedHex;
                
                if (localStorage.getItem('user_session')) {
                    localStorage.setItem('user_session', JSON.stringify(session));
                } else {
                    sessionStorage.setItem('user_session', JSON.stringify(session));
                }
            }

            toast.success('Password updated successfully!');
            onPasswordChanged();
        } catch (err: any) {
            console.error('Password change error:', err);
            toast.error(err.message || 'Failed to update password');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">
                    New Password
                </Label>
                <div className="relative">
                    <Input 
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="border-gold/30 focus:ring-saffron pr-10"
                        required
                        disabled={isSubmitting}
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
                <Label className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">
                    Confirm Password
                </Label>
                <Input 
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="border-gold/30 focus:ring-saffron"
                    required
                    disabled={isSubmitting}
                />
            </div>

            <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-maroon hover:bg-maroon/90 text-white font-semibold flex items-center justify-center space-x-2 py-5 border-2 border-gold/40 hover:border-gold shadow"
            >
                {isSubmitting ? (
                    <>
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        <span>Updating Password...</span>
                    </>
                ) : (
                    <span>Change Password</span>
                )}
            </Button>
            
            <Button 
                type="button" 
                variant="outline"
                onClick={logout}
                className="w-full border-red-250 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold mt-2"
            >
                Cancel & Sign Out
            </Button>
        </form>
    );
}

function PasswordRecoveryForm({ onBack, isMock }: { onBack: () => void; isMock: boolean }) {
    const isDev = import.meta.env?.DEV === true;
    const showDebugPanel = isDev;

    return (
        <div className="space-y-6">
            <Card className="border-2 border-gold/30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md shadow-xl">
                <CardContent className="pt-6 space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-4 py-4 text-center">
                        <p className="text-sm text-amber-800 dark:text-amber-400 font-medium">
                            Password recovery requires assistance from an authorized administrator.
                        </p>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={onBack}
                        className="w-full border-gold/30 text-maroon dark:text-saffron hover:bg-gold/10 font-semibold flex items-center justify-center py-5"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        <span>Back to Sign In</span>
                    </Button>
                </CardContent>
            </Card>

            {showDebugPanel && (
                <Card className="border-2 border-dashed border-amber-500 bg-amber-50/50 dark:bg-amber-900/20 text-slate-800 dark:text-slate-200 shadow-xl">
                    <CardHeader className="py-3 px-4 border-b border-dashed border-amber-500/30">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <ShieldAlert className="h-4 w-4" /> 🔧 Development Debug Panel
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="py-4 px-4 space-y-3">
                        <div className="text-xs space-y-1.5 font-mono">
                            <div className="flex justify-between">
                                <span>Environment:</span>
                                <span className="font-bold">{import.meta.env.MODE}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Mock Backend:</span>
                                <span className="font-bold">{isMock ? 'Enabled' : 'Disabled'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
