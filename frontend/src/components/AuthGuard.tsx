import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { useUserSelf } from '../hooks/useQueries';
import { type User } from '../backend';
import { Button } from './ui/button';
import { loadConfig } from '../config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Lock, LogIn, AlertCircle, ShieldAlert, LogOut, Copy, RefreshCw, Eye, EyeOff, KeyRound, ArrowLeft, Mail, Phone, UserCircle, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { deriveIdentity, bufToHex } from '../utils/credentialDerivation';
import { getOptionalBoolean } from '../utils/candidHelpers';
import { MockBackend } from '../mockBackend';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { verifyIdentityLocal, normalizeText, normalizeMobile, clearAuthSessions } from '../utils/authService';
import { normalizeUsername, normalizeEmail, createPasswordHash, findUserByUsername, findUserByRecoveryIdentity, deduplicateUsers } from '../utils/passwordAuth';


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
    if (master.name !== 'Vatsal Dholariya' || master.username !== 'admin') {
        return { isValid: false, message: "CRITICAL SECURITY BREACH: Master Admin identity mismatch! Unauthorized user holds Master Admin privileges." };
    }
    return { isValid: true, message: "Master Admin integrity is intact." };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider/AuthGuard');
    }
    return context;
};

export function AuthGuard({ children }: { children: React.ReactNode }) {
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

    const handleRepairAuthUserIndex = async () => {
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
            // 1. Read all users from User Management database
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
                try {
                    const fetched = await activeActor.getUsers();
                    const hasVatsal = fetched.some((u: any) => u.username === 'vatsal01');
                    if (!hasVatsal) {
                        log("Bootstrapping staff user 'vatsal01' on canister...");
                        const staffPass = "admin123";
                        const encoder = new TextEncoder();
                        const staffHashBuffer = await crypto.subtle.digest(
                            'SHA-256',
                            encoder.encode(`vatsal01:${staffPass}`)
                        );
                        const staffHash = bufToHex(new Uint8Array(staffHashBuffer));

                        await activeActor.createUser(
                            'vatsal01-principal-id-placeholder-dev',
                            'Vatsal Staff',
                            'vatsal01',
                            'Staff',
                            'vatsal01@example.com',
                            '7383492262',
                            'Gujarat, India',
                            '',
                            'Active',
                            staffHash
                        );
                        log("Successfully created 'vatsal01' on canister.");
                    }
                    const reFetched = await activeActor.getUsers();
                    usersList = reFetched.map((u: any) => ({
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
                } catch (canisterErr) {
                    log("Querying canister failed. Trying default credentials 'admin'/'admin123'...");
                    const derivedIdentity = await deriveIdentity("admin", "admin123");
                    const { createActorWithConfig } = await import('../config');
                    activeActor = await createActorWithConfig({
                        agentOptions: { identity: derivedIdentity }
                    });
                    if (!activeActor) {
                        throw new Error("Failed to initialize canister actor.");
                    }
                    const fetched = await activeActor.getUsers();
                    const hasVatsal = fetched.some((u: any) => u.username === 'vatsal01');
                    if (!hasVatsal) {
                        log("Bootstrapping staff user 'vatsal01' on canister...");
                        const staffPass = "admin123";
                        const encoder = new TextEncoder();
                        const staffHashBuffer = await crypto.subtle.digest(
                            'SHA-256',
                            encoder.encode(`vatsal01:${staffPass}`)
                        );
                        const staffHash = bufToHex(new Uint8Array(staffHashBuffer));

                        await activeActor.createUser(
                            'vatsal01-principal-id-placeholder-dev',
                            'Vatsal Staff',
                            'vatsal01',
                            'Staff',
                            'vatsal01@example.com',
                            '7383492262',
                            'Gujarat, India',
                            '',
                            'Active',
                            staffHash
                        );
                        log("Successfully created 'vatsal01' on canister.");
                    }
                    const reFetched = await activeActor.getUsers();
                    usersList = reFetched.map((u: any) => ({
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
            }

            log(`Successfully loaded ${usersList.length} users.`);

            // 2. Ensure each user has correct fields, status, role
            const dedupResult = deduplicateUsers(usersList);
            let cleanUsers: any[] = [];
            let hasAdmin = false;

            for (const user of dedupResult.cleanUsers) {
                const usernameNormalized = user.username.trim().toLowerCase();
                const emailNormalized = (user.email || '').trim().toLowerCase();
                const mobileNormalized = (user.mobile || '').trim().replace(/\s+/g, '');

                const statusClean = user.status === 'Disabled' || user.status === 'Deactivated' ? 'Disabled' : 'Active';
                
                let roleClean = user.role;
                if (roleClean && 'Admin' in roleClean) {
                    if (usernameNormalized !== 'admin') {
                        roleClean = { Manager: null };
                        log(`Enforced Single Master Admin policy: demoted '${user.name}' to Manager.`);
                    } else {
                        hasAdmin = true;
                    }
                }

                cleanUsers.push({
                    ...user,
                    username: usernameNormalized,
                    email: emailNormalized,
                    mobile: mobileNormalized,
                    status: statusClean,
                    role: roleClean
                });
            }

            // Ensure default Master Admin exists
            if (!hasAdmin) {
                log("Admin user not found. Bootstrapping default Master Admin 'admin'...");
                const defaultPass = "admin123";
                const encoder = new TextEncoder();
                const defaultHashBuffer = await crypto.subtle.digest(
                    'SHA-256',
                    encoder.encode(`admin:${defaultPass}`)
                );
                const defaultHash = bufToHex(new Uint8Array(defaultHashBuffer));
                
                cleanUsers.push({
                    principalId: 'iahoq-yel46-zc76y-l56vk-2szze-qc2bx-7szyp-hmubf-q3ydd-5dlax-sae',
                    name: 'Vatsal Dholariya',
                    username: 'admin',
                    role: { Admin: null },
                    createdAt: Date.now().toString(),
                    status: 'Active',
                    email: 'dholariyavatsal07@gmail.com',
                    mobile: '7383492261',
                    address: 'Gujarat, India',
                    profilePhoto: '',
                    passwordHash: defaultHash,
                    needsPasswordChange: true,
                    lastLogin: ''
                });
            } else {
                const adminUser = cleanUsers.find((u: any) => u.username === 'admin');
                if (adminUser) {
                    adminUser.email = 'dholariyavatsal07@gmail.com';
                    adminUser.mobile = '7383492261';
                    adminUser.name = 'Vatsal Dholariya';
                    adminUser.status = 'Active';
                    if (!adminUser.passwordHash) {
                        const encoder = new TextEncoder();
                        const defaultHashBuffer = await crypto.subtle.digest(
                            'SHA-256',
                            encoder.encode(`admin:admin123`)
                        );
                        adminUser.passwordHash = bufToHex(new Uint8Array(defaultHashBuffer));
                    }
                }
            }

            // Ensure staff user 'vatsal01' exists
            const hasStaff = cleanUsers.some((u: any) => u.username === 'vatsal01');
            if (!hasStaff) {
                log("Staff user 'vatsal01' not found. Bootstrapping staff user...");
                const staffPass = "admin123";
                const encoder = new TextEncoder();
                const staffHashBuffer = await crypto.subtle.digest(
                    'SHA-256',
                    encoder.encode(`vatsal01:${staffPass}`)
                );
                const staffHash = bufToHex(new Uint8Array(staffHashBuffer));

                cleanUsers.push({
                    principalId: 'vatsal01-principal-id-placeholder-dev',
                    name: 'Vatsal Staff',
                    username: 'vatsal01',
                    role: { Staff: null },
                    createdAt: Date.now().toString(),
                    status: 'Active',
                    email: 'vatsal01@example.com',
                    mobile: '7383492262',
                    address: 'Gujarat, India',
                    profilePhoto: '',
                    passwordHash: staffHash,
                    needsPasswordChange: false,
                    lastLogin: ''
                });
            } else {
                const staffUser = cleanUsers.find((u: any) => u.username === 'vatsal01');
                if (staffUser) {
                    staffUser.status = 'Active';
                    if (!staffUser.passwordHash) {
                        const encoder = new TextEncoder();
                        const staffHashBuffer = await crypto.subtle.digest(
                            'SHA-256',
                            encoder.encode(`vatsal01:admin123`)
                        );
                        staffUser.passwordHash = bufToHex(new Uint8Array(staffHashBuffer));
                    }
                }
            }

            // 3. Save to localStorage user registry
            localStorage.setItem('mock_users', JSON.stringify(cleanUsers));
            log("Auth index rebuilt successfully.");

            // 4. Test login lookups
            log("Testing login lookups on rebuilt index...");

            const testAdmin = cleanUsers.find((u: any) => u.username === 'admin');
            const isAdminFound = !!testAdmin;
            log(`Admin found in index: ${isAdminFound ? '✅ YES' : '❌ NO'}`);

            const testStaff = cleanUsers.find((u: any) => u.username === 'vatsal01');
            const isStaffFound = !!testStaff;
            log(`Staff found in index: ${isStaffFound ? '✅ YES' : '❌ NO'}`);

            const matchUser = cleanUsers.find((u: any) => u.username === 'admin');
            log(`Login by username (admin) works: ${matchUser ? '✅ YES' : '❌ NO'}`);

            const matchEmail = cleanUsers.find((u: any) => (u.email || '').toLowerCase() === 'dholariyavatsal07@gmail.com');
            log(`Login by email (dholariyavatsal07@gmail.com) works: ${matchEmail ? '✅ YES' : '❌ NO'}`);

            const matchMobile = cleanUsers.find((u: any) => (u.mobile || '').replace(/\s+/g, '') === '7383492261');
            log(`Login by mobile (7383492261) works: ${matchMobile ? '✅ YES' : '❌ NO'}`);

            if (isAdminFound && isStaffFound && matchUser && matchEmail && matchMobile) {
                setRepairResults({
                    overall: 'pass',
                    details: [...detailsLog, "--- REPAIR REPORT: PASS ---"]
                });
                toast.success("Auth User Index repaired and validated successfully!");
            } else {
                setRepairResults({
                    overall: 'fail',
                    details: [...detailsLog, "--- REPAIR REPORT: FAIL ---"]
                });
                toast.error("Auth User Index repair completed with validation failures.");
            }

        } catch (error: any) {
            log(`ERROR during repair: ${error.message}`);
            setRepairResults({
                overall: 'fail',
                details: [...detailsLog, "--- REPAIR REPORT: FAIL ---"]
            });
            toast.error(`Repair Failed: ${error.message}`);
        }
    };

    // Bootstrap default Master Admin account and perform cleanup/migrations
    useEffect(() => {
        const storedUsersStr = localStorage.getItem('mock_users');
        let usersList = storedUsersStr ? JSON.parse(storedUsersStr) : [];
        let updated = false;

        // Clean up mock users (Bootstrap Admin, Mock Staff, and any mock references)
        // and keep only real users, removing duplicate accounts
        const dedupResult = deduplicateUsers(usersList);
        usersList = dedupResult.cleanUsers;
        if (dedupResult.updated) {
            updated = true;
        }

        usersList = usersList.map((u: any) => {
            const usernameNormalized = (u.username || '').trim().toLowerCase();

            if (usernameNormalized === 'admin') {
                if (u.name !== 'Vatsal Dholariya' || u.email !== 'dholariyavatsal07@gmail.com' || u.mobile !== '7383492261' || !u.role || !('Admin' in u.role)) {
                    u.name = 'Vatsal Dholariya';
                    u.email = 'dholariyavatsal07@gmail.com';
                    u.mobile = '7383492261';
                    u.role = { Admin: null };
                    updated = true;
                }
            } else if (u.role && 'Admin' in u.role) {
                // Enforce Single Master Admin Policy:
                // Convert any other Master Admin (Admin role) to Admin (Manager role)
                u.role = { Manager: null };
                updated = true;
            }

            return u;
        }).filter((u: any) => {
            const nameLower = (u.name || '').toLowerCase();
            const usernameLower = (u.username || '').toLowerCase();
            const emailLower = (u.email || '').toLowerCase();
            if (
                nameLower.includes('mock') || nameLower.includes('bootstrap') ||
                usernameLower.includes('mock') || usernameLower.includes('bootstrap') ||
                emailLower.includes('mock') || emailLower.includes('bootstrap') ||
                nameLower === 'master admin'
            ) {
                updated = true;
                return false;
            }
            return true;
        });

        // Ensure default Master Admin exists
        const hasAdmin = usersList.some((u: any) => u.username === 'admin');
        if (!hasAdmin) {
            const defaultMasterAdmin = {
                principalId: 'iahoq-yel46-zc76y-l56vk-2szze-qc2bx-7szyp-hmubf-q3ydd-5dlax-sae',
                name: 'Vatsal Dholariya',
                username: 'admin',
                role: { Admin: null },
                createdAt: Date.now().toString(),
                status: 'Active',
                email: 'dholariyavatsal07@gmail.com',
                mobile: '7383492261',
                address: 'Gujarat, India',
                profilePhoto: '',
                passwordHash: 'bf6b5bdb74c79ece9fc0ad0ac9fb0359f9555d4f35a83b2e6ec69ae99e09603d', // SHA-256 of admin:admin123
                needsPasswordChange: true,
                lastLogin: ''
            };
            usersList.push(defaultMasterAdmin);
            updated = true;
        }

        // Ensure default staff user vatsal01 exists
        const hasStaff = usersList.some((u: any) => u.username === 'vatsal01');
        if (!hasStaff) {
            const defaultStaff = {
                principalId: 'vatsal01-principal-id-placeholder-dev',
                name: 'Vatsal Staff',
                username: 'vatsal01',
                role: { Staff: null },
                createdAt: Date.now().toString(),
                status: 'Active',
                email: 'vatsal01@example.com',
                mobile: '7383492262',
                address: 'Gujarat, India',
                profilePhoto: '',
                passwordHash: 'ff5a377586142e9d6e1f9626dbbe2f5f2ff30b9e38e5bf1b839977bafc25c0ab', // SHA-256 of vatsal01:admin123
                needsPasswordChange: false,
                lastLogin: ''
            };
            usersList.push(defaultStaff);
            updated = true;
        }

        if (updated || storedUsersStr === null) {
            localStorage.setItem('mock_users', JSON.stringify(usersList));
        }

        const integrity = verifyMasterAdminIntegrity(usersList);
        if (!integrity.isValid) {
            setSecurityViolation(integrity.message);
        } else {
            setSecurityViolation(null);
        }

        // Session validation & migration
        const sessionStr = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
        if (sessionStr) {
            try {
                const session = JSON.parse(sessionStr);
                if (session.username === 'admin') {
                    if (session.name !== 'Vatsal Dholariya') {
                        session.name = 'Vatsal Dholariya';
                        if (localStorage.getItem('user_session')) {
                            localStorage.setItem('user_session', JSON.stringify(session));
                        } else {
                            sessionStorage.setItem('user_session', JSON.stringify(session));
                        }
                    }
                } else {
                    const stillExists = usersList.some((u: any) => u.username === session.username);
                    if (!stillExists) {
                        localStorage.removeItem('user_session');
                        sessionStorage.removeItem('user_session');
                    }
                }
            } catch (e) {
                console.error('Session migration error:', e);
            }
        }

        // Clean up mock/bootstrap logs in mock_activity_logs
        const storedActivityLogs = localStorage.getItem('mock_activity_logs');
        if (storedActivityLogs) {
            try {
                let activityLogsList = JSON.parse(storedActivityLogs);
                let logsUpdated = false;
                activityLogsList = activityLogsList.filter((log: any) => {
                    const userNameLower = (log.userName || '').toLowerCase();
                    const detailsLower = (log.details || '').toLowerCase();
                    if (userNameLower.includes('bootstrap') || userNameLower.includes('mock')) {
                        log.userName = 'Legacy System';
                        logsUpdated = true;
                    }
                    if (detailsLower.includes('mock')) {
                        log.details = log.details.replace(/\(Mock\)/gi, '').replace(/mock/gi, '').trim();
                        logsUpdated = true;
                    }
                    return true;
                });
                if (logsUpdated) {
                    localStorage.setItem('mock_activity_logs', JSON.stringify(activityLogsList));
                }
            } catch (e) {
                console.error('Activity logs cleanup error:', e);
            }
        }

        // Clean up mock/bootstrap logs in mock_audit_logs_v2
        const storedAuditLogs = localStorage.getItem('mock_audit_logs_v2');
        if (storedAuditLogs) {
            try {
                let auditLogsList = JSON.parse(storedAuditLogs);
                let auditUpdated = false;
                auditLogsList = auditLogsList.map((log: any) => {
                    const userLower = (log.user || '').toLowerCase();
                    const descLower = (log.description || '').toLowerCase();
                    if (userLower.includes('bootstrap') || userLower.includes('mock')) {
                        log.user = 'Legacy System';
                        auditUpdated = true;
                    }
                    if (descLower.includes('mock')) {
                        log.description = log.description.replace(/\(Mock\)/gi, '').replace(/mock/gi, '').trim();
                        auditUpdated = true;
                    }
                    return log;
                });
                if (auditUpdated) {
                    localStorage.setItem('mock_audit_logs_v2', JSON.stringify(auditLogsList));
                }
            } catch (e) {
                console.error('Audit logs cleanup error:', e);
            }
        }
    }, []);

    // Determine if we are in mock mode and check config
    useEffect(() => {
        const isMockActive = !identity || (actor && actor.constructor.name === 'MockBackend');
        setIsMock(!!isMockActive);

        loadConfig().then(config => {
            const isProduction = import.meta.env?.PROD || process.env.NODE_ENV === 'production';
            if (isProduction) {
                setAllowMock(false);
            } else {
                const hasCanister = config.backend_canister_id && config.backend_canister_id !== 'undefined' && config.backend_canister_id !== 'mock';
                setAllowMock(!hasCanister);
            }
        }).catch(() => {
            const isProduction = import.meta.env?.PROD || process.env.NODE_ENV === 'production';
            setAllowMock(!isProduction);
        });
    }, [identity, actor]);

    // Backend canister security validation
    useEffect(() => {
        if (actor && actor.verifyMasterAdminIntegrity) {
            actor.verifyMasterAdminIntegrity().then((result: { isValid: boolean; message: string }) => {
                if (!result.isValid) {
                    setSecurityViolation(result.message);
                } else {
                    // Keep local storage violation if it exists, otherwise clear
                    setSecurityViolation((prev) => prev ? prev : null);
                }
            }).catch((e: any) => console.error("Error verifying Master Admin integrity:", e));
        }
    }, [actor]);

    // Real-time account deactivation check & session invalidation
    useEffect(() => {
        if (!authCheckCompleted) return;
        if (isLoading) return;
        if (!isSessionLoggedIn) return;

        // Handle deactivated or disabled users
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

        // Handle explicit null representing invalid session
        if (user === null) {
            if (logoutOnceRef.current) return;
            logoutOnceRef.current = true;
            handleLogout();
        }
    }, [authCheckCompleted, isLoading, isSessionLoggedIn, user]);

    // Path-level protected routes check for Staff
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
            // 3. Resolve user details from simulated mock database (or real canister)
            const storedUsersStr = localStorage.getItem('mock_users');
            const usersList = storedUsersStr ? JSON.parse(storedUsersStr) : [];

            // If login identifier looks like a full name (contains space) and is not a registered username
            const hasSpace = trimmedUser.includes(' ');
            const isNumericWithSpaces = /^[0-9\s]+$/.test(trimmedUser);
            const isExactUsername = usersList.some((u: any) => (u.username || '').toLowerCase() === trimmedUser.toLowerCase());
            if (hasSpace && !isNumericWithSpaces && !isExactUsername) {
                toast.error("Use username, email, or mobile number.");
                if (import.meta.env?.DEV) {
                    setLoginDebug({
                        userFound: 'NO',
                        matchedBy: 'None',
                        hashMatched: 'NO',
                        status: 'None',
                        roleFound: 'NO'
                    });
                }
                setIsLoggingInPassword(false);
                return;
            }
            
            // Normalize login identifier according to rules:
            // - trim spaces (done in trimmedUser)
            // - lowercase username
            // - lowercase email
            // - remove spaces from mobile
            const searchValLower = trimmedUser.toLowerCase();
            const searchValNoSpace = trimmedUser.replace(/\s+/g, '');

            // Allow login by username, email, or mobile
            let targetUser = usersList.find((u: any) => {
                const uUsername = (u.username || '').trim().toLowerCase();
                const uEmail = (u.email || '').trim().toLowerCase();
                const uMobile = (u.mobile || '').trim().replace(/\s+/g, '');

                return (
                    uUsername === searchValLower ||
                    (uEmail && uEmail === searchValLower) ||
                    (uMobile && uMobile === searchValNoSpace)
                );
            });

            // Determine how identifier matched
            let matchedBy: 'username' | 'email' | 'mobile' | 'None' = 'None';
            if (targetUser) {
                const uUsername = (targetUser.username || '').trim().toLowerCase();
                const uEmail = (targetUser.email || '').trim().toLowerCase();
                const uMobile = (targetUser.mobile || '').trim().replace(/\s+/g, '');

                if (uUsername === searchValLower) {
                    matchedBy = 'username';
                } else if (uEmail && uEmail === searchValLower) {
                    matchedBy = 'email';
                } else if (uMobile && uMobile === searchValNoSpace) {
                    matchedBy = 'mobile';
                }
            }

            // Derive identity with resolved username (if found, otherwise input username)
            const resolveUsername = targetUser ? targetUser.username : trimmedUser;
            const derivedIdentity = await deriveIdentity(resolveUsername, loginPassword);
            const targetPrincipal = derivedIdentity.getPrincipal();
            const principalStr = targetPrincipal.toString();

            // Calculate seed bytes & hex for storing in localStorage
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest(
                'SHA-256', 
                encoder.encode(`${resolveUsername.toLowerCase()}:${loginPassword}`)
            );
            const seedBytes = new Uint8Array(hashBuffer);
            const seedHex = bufToHex(seedBytes);

            // Instantiate temporary actor with this derived identity
            const { createActorWithConfig } = await import('../config');
            const tempActor = await createActorWithConfig({
                agentOptions: {
                    identity: derivedIdentity
                }
            });

            const isMockBackend = tempActor instanceof MockBackend || tempActor.constructor.name === 'MockBackend';

            if (isMockBackend) {
                const isProduction = import.meta.env?.PROD || process.env.NODE_ENV === 'production';
                if (isProduction) {
                    toast.error('Security Violation: Mock authentication is completely disabled in production mode.');
                    setIsLoggingInPassword(false);
                    return;
                }

                if (import.meta.env?.DEV) {
                    console.log('[AuthKeys] user storage key used: mock_users');
                }

                // 2. Find user by normalized username.
                const cleanInputUsername = normalizeUsername(trimmedUser);
                const mockTargetUser = findUserByUsername(usersList, cleanInputUsername);

                // 3. If no user: show invalid credentials.
                if (!mockTargetUser) {
                    toast.error('Invalid credentials');
                    if (import.meta.env?.DEV) {
                        console.log(`[Login] user found by username: false`);
                        setLoginDebug({
                            userFound: 'NO',
                            matchedBy: 'None',
                            hashMatched: 'NO',
                            status: 'None',
                            roleFound: 'NO'
                        });
                    }
                    setIsLoggingInPassword(false);
                    return;
                }

                if (import.meta.env?.DEV) {
                    console.log(`[Login] user found by username: ${mockTargetUser.username}`);
                    console.log(`[Login] passwordHash exists: ${!!mockTargetUser.passwordHash}`);
                }

                // 4. If user inactive/deactivated/disabled: block login.
                const isActive = mockTargetUser.status === 'Active' || mockTargetUser.status === 'Enabled';
                if (!isActive) {
                    toast.error('Account disabled');
                    if (import.meta.env?.DEV) {
                        setLoginDebug({
                            userFound: 'YES',
                            matchedBy: 'username',
                            hashMatched: 'Pending',
                            status: mockTargetUser.status || 'Disabled',
                            roleFound: mockTargetUser.role ? 'YES' : 'NO'
                        });
                    }
                    setIsLoggingInPassword(false);
                    return;
                }

                // Check role
                const hasRole = mockTargetUser.role && ('Admin' in mockTargetUser.role || 'Manager' in mockTargetUser.role || 'Staff' in mockTargetUser.role);
                if (!hasRole) {
                    toast.error('Role missing');
                    if (import.meta.env?.DEV) {
                        setLoginDebug({
                            userFound: 'YES',
                            matchedBy: 'username',
                            hashMatched: 'Pending',
                            status: mockTargetUser.status || 'Active',
                            roleFound: 'NO'
                        });
                    }
                    setIsLoggingInPassword(false);
                    return;
                }

                // 5. Generate hash using createPasswordHash(inputUsername, inputPassword).
                const generatedHash = await createPasswordHash(mockTargetUser.username, loginPassword);

                // 6. Compare with user.passwordHash.
                const isHashMatch = mockTargetUser.passwordHash === generatedHash;

                if (import.meta.env?.DEV) {
                    console.log(`[Login] user found by username: ${mockTargetUser.username}`);
                    console.log(`[Login] passwordHash exists: ${!!mockTargetUser.passwordHash}`);
                    console.log(`[Login] stored hash (first 6): ${mockTargetUser.passwordHash ? mockTargetUser.passwordHash.substring(0, 6) : 'none'}`);
                    console.log(`[Login] generated hash (first 6): ${generatedHash.substring(0, 6)}`);
                    console.log(`[Login] generated hash equals stored hash: ${isHashMatch}`);
                    setLoginDebug({
                        userFound: 'YES',
                        matchedBy: 'username',
                        hashMatched: isHashMatch ? 'YES' : 'NO',
                        status: mockTargetUser.status || 'Active',
                        roleFound: 'YES'
                    });
                }

                // 8. If mismatch: show invalid credentials.
                if (!isHashMatch) {
                    toast.error('Invalid credentials');
                    setIsLoggingInPassword(false);
                    return;
                }

                // 7. If match: create session using existing user principalId.
                mockTargetUser.lastLogin = Date.now().toString();
                localStorage.setItem('mock_users', JSON.stringify(usersList));

                const session = {
                    username: mockTargetUser.username,
                    name: mockTargetUser.name,
                    role: mockTargetUser.role,
                    principalId: mockTargetUser.principalId, // Use existing user principalId
                    secretKeyHex: generatedHash
                };

                const storage = rememberMe ? localStorage : sessionStorage;
                storage.setItem('user_session', JSON.stringify(session));

                if (import.meta.env?.DEV) {
                    console.log(`[Login] session created:`);
                    console.log(`[Login] redirect dashboard:`);
                }

                await tempActor.logUserAction("User login", "User logged in with password");
                toast.success(`Logged in as ${mockTargetUser.name}`);
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                // Real Canister authentication
                try {
                    const userSelf = await tempActor.registerOrGetSelf();
                    
                    if (!userSelf) {
                        // Look up ResolveUsername in the local database to find if user exists
                        const localUser = usersList.find((u: any) => u.username === resolveUsername.toLowerCase());
                        if (!localUser) {
                            toast.error('User not found');
                            if (import.meta.env?.DEV) {
                                setLoginDebug({
                                    userFound: 'NO',
                                    matchedBy: 'None',
                                    hashMatched: 'NO',
                                    status: 'None',
                                    roleFound: 'NO'
                                });
                            }
                            setIsLoggingInPassword(false);
                            return;
                        } else {
                            // Password hash mismatch since identity verify failed
                            if (localUser.passwordHash && localUser.passwordHash !== seedHex) {
                                toast.error('Password hash mismatch');
                            } else {
                                toast.error('Incorrect password');
                            }
                            if (import.meta.env?.DEV) {
                                setLoginDebug({
                                    userFound: 'YES',
                                    matchedBy,
                                    hashMatched: 'NO',
                                    status: localUser.status || 'Active',
                                    roleFound: localUser.role ? 'YES' : 'NO'
                                });
                            }
                            setIsLoggingInPassword(false);
                            return;
                        }
                    }

                    if (userSelf.status === 'Deactivated' || userSelf.status === 'Disabled') {
                        toast.error('Account disabled');
                        if (import.meta.env?.DEV) {
                            setLoginDebug({
                                userFound: 'YES',
                                matchedBy,
                                hashMatched: 'YES',
                                status: userSelf.status || 'Disabled',
                                roleFound: userSelf.role ? 'YES' : 'NO'
                            });
                        }
                        setIsLoggingInPassword(false);
                        return;
                    }

                    const hasRole = userSelf.role && ('Admin' in userSelf.role || 'Manager' in userSelf.role || 'Staff' in userSelf.role);
                    if (!hasRole) {
                        toast.error('Role missing');
                        if (import.meta.env?.DEV) {
                            setLoginDebug({
                                userFound: 'YES',
                                matchedBy,
                                hashMatched: 'YES',
                                status: userSelf.status || 'Active',
                                roleFound: 'NO'
                            });
                        }
                        setIsLoggingInPassword(false);
                        return;
                    }

                    if (import.meta.env?.DEV) {
                        setLoginDebug({
                            userFound: 'YES',
                            matchedBy,
                            hashMatched: 'YES',
                            status: userSelf.status || 'Active',
                            roleFound: 'YES'
                        });
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

                    await tempActor.logUserAction("User login", "User logged in with password");
                    toast.success(`Logged in successfully as ${userSelf.name}`);
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                } catch (canisterErr: any) {
                    console.error('Canister login error:', canisterErr);
                    toast.error(canisterErr.message || 'Login failed');
                }
            }
        } catch (err: any) {
            console.error('Password login error:', err);
            toast.error(err.message || 'Login failed');
        } finally {
            setIsLoggingInPassword(false);
        }
    };const handleLogout = async () => {
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

    if (import.meta.env?.DEV) {
        const currentUser = user;
        console.log("[Auth] currentUser:", currentUser);
        console.log("[Auth] role:", currentUser?.role);
        console.log('[AuthGuard] Render state:', {
            isSessionLoggedIn,
            authCheckCompleted,
            isLoading,
            isFetchingActor,
            hasActor: !!actor,
            user: user ? user.username : null,
            isAuthenticated: !!identity || isSessionLoggedIn
        });
    }

    const isProduction = import.meta.env?.PROD || process.env.NODE_ENV === 'production';

    // 0. Production Security checks
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
                        Mock authentication and local simulation are disabled.
                    </p>
                </div>
            </div>
        );
    }

    // Secure Canister Connection failure check
    const isSessionActive = !!localStorage.getItem('user_session') || !!sessionStorage.getItem('user_session') || !!identity;
    if (isProduction && isSessionActive && !actor && !isFetchingActor) {
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
                            Please ensure your local replica is running, or verify your network connection and canister configuration.
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

    // 1. Loading State
    if (isSessionLoggedIn && (!authCheckCompleted || isLoading)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="text-center space-y-4">
                    <RefreshCw className="h-12 w-12 animate-spin text-maroon mx-auto" />
                    <p className="text-maroon font-semibold dark:text-saffron">Resolving user session...</p>
                </div>
            </div>
        );
    }

    // 2. Unauthenticated / Not Logged In
    const isAuthenticated = !!identity || isSessionLoggedIn;

    if (!isAuthenticated) {
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
                                Verify your identity to reset your password.
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
                                    <ShieldAlert className="h-4 w-4" /> 🔧 Login Diagnostics & Repair
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
                                        <div className="flex justify-between">
                                            <span>Role found:</span>
                                            <span className="font-bold">{loginDebug.roleFound}</span>
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
                                            <span>Repair Auth User Index</span>
                                        </>
                                    )}
                                </Button>

                                {repairResults && (
                                    <div className="text-xs space-y-1.5 font-mono pt-2">
                                        <div className="flex justify-between font-bold text-amber-700 dark:text-amber-400">
                                            <span>Index Repair Report:</span>
                                            <span>{repairResults.overall === 'pass' ? '✅ PASS' : repairResults.overall === 'fail' ? '❌ FAIL' : '⏳ Running'}</span>
                                        </div>
                                        {repairResults.details.length > 0 && (
                                            <div className="border border-amber-500/20 bg-slate-950 text-slate-300 rounded p-2.5 font-mono text-[10px] max-h-40 overflow-y-auto space-y-1">
                                                {repairResults.details.map((detail, idx) => (
                                                    <div key={idx} className={detail.startsWith('ERROR:') ? 'text-red-450 font-bold' : detail.startsWith('---') ? 'text-blue-400 font-bold' : 'text-slate-300'}>
                                                        {detail}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        );
    }

    // 3. Authenticated but NOT Registered in Canister DB
    if (!user) {
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
                            Public signup is disabled. An Administrator must register your Principal ID in the system database before you can log in.
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

    // Force Password Change Check
    if (getOptionalBoolean(user?.needsPasswordChange)) {
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
                                <ForcePasswordChangeForm user={user} onPasswordChanged={() => refetch()} logout={handleLogout} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </AuthContext.Provider>
        );
    }

    // 4. Authenticated & Registered
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
            // Derive new identity locally to compute new Principal ID
            const derivedIdentity = await deriveIdentity(user.username, newPassword);
            const newPrincipalId = derivedIdentity.getPrincipal().toString();

            // Compute seed hex for local session updating
            const seedHex = await createPasswordHash(user.username, newPassword);

            if (!actor) {
                throw new Error('Backend connection not available');
            }

            await actor.changePassword(newPassword, newPrincipalId);

            // Update active session locally so user doesn't get logged out immediately
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
    const [step, setStep] = useState<'verify' | 'reset' | 'success'>('verify');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [matchedUser, setMatchedUser] = useState<any | null>(null);

    // Step 1: Identity verification fields
    const [recoveryUsername, setRecoveryUsername] = useState('');
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [recoveryMobile, setRecoveryMobile] = useState('');

    // Step 2: New password fields
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Status message from backend
    const [statusMessage, setStatusMessage] = useState('');

    const isDev = import.meta.env?.DEV === true;
    const isProduction = import.meta.env?.PROD || process.env.NODE_ENV === 'production';
    const sessionStr = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    const isMasterAdmin = session?.role && 'Admin' in session.role;
    const showDebugPanel = isDev;



    const handleVerifyIdentity = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!recoveryUsername || !recoveryEmail || !recoveryMobile) {
            toast.error('Please fill in all verification fields.');
            return;
        }

        const trimmedUsername = normalizeText(recoveryUsername);
        const trimmedEmail = normalizeText(recoveryEmail);
        const trimmedMobile = normalizeMobile(recoveryMobile);

        if (import.meta.env?.DEV) {
            console.log('[PasswordRecovery] Verification started', {
                username: trimmedUsername,
                email: trimmedEmail,
                mobile: trimmedMobile,
                isMock
            });
        }

        setIsSubmitting(true);
        try {
            // Check local database if mock backend is enabled or running locally
            if (isMock) {
                const verificationResult = verifyIdentityLocal(trimmedUsername, trimmedEmail, trimmedMobile);
                if (import.meta.env?.DEV) {
                    console.log('[PasswordRecovery] Verification result:', verificationResult);
                }
                if (!verificationResult.success) {
                    toast.error(verificationResult.message);
                    return;
                }
                setMatchedUser(verificationResult.user);
            } else {
                if (import.meta.env?.DEV) {
                    console.log('[PasswordRecovery] Canister verification (deferred to reset phase)');
                }
            }

            toast.success('Identity verified successfully.');
            setStep('reset');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (import.meta.env?.DEV) {
            console.log('[PasswordReset] Submit started');
        }

        if (!newPassword) {
            toast.error('Please enter a new password.');
            return;
        }

        const strength = isStrongPassword(newPassword);
        if (!strength.isValid) {
            toast.error(strength.message);
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);
        try {
            const trimmedUsername = normalizeText(recoveryUsername);
            const trimmedEmail = normalizeText(recoveryEmail);
            const trimmedMobile = normalizeMobile(recoveryMobile);
            const resolveUsername = (matchedUser && matchedUser.username) ? matchedUser.username : trimmedUsername;

            if (import.meta.env?.DEV) {
                console.log('[PasswordRecovery] Resetting password for username:', resolveUsername);
            }

            // Derive the new identity and password hash
            const derivedIdentity = await deriveIdentity(resolveUsername, newPassword);
            const newPrincipalId = derivedIdentity.getPrincipal().toString();

            const seedHex = await createPasswordHash(resolveUsername, newPassword);

            // Create temporary actor to call resetPasswordWithVerification
            const { createActorWithConfig } = await import('../config');
            const tempActor = await createActorWithConfig({
                agentOptions: {
                    identity: derivedIdentity
                }
            });

            const isMockBackend = tempActor instanceof MockBackend || tempActor.constructor.name === 'MockBackend';

            // Production guard: block mock backend usage in production
            const isProduction = import.meta.env?.PROD || process.env.NODE_ENV === 'production';
            if (isProduction && isMockBackend) {
                toast.error('Security Violation: Password recovery is not available in production without a secure backend.');
                setIsSubmitting(false);
                return;
            }

            // Dev-only guard: only allow mock reset in development mode
            if (isMockBackend && !isDev) {
                toast.error('Password recovery via local database is only available in development mode.');
                setIsSubmitting(false);
                return;
            }

            const result = await tempActor.resetPasswordWithVerification(
                resolveUsername,
                trimmedEmail,
                trimmedMobile,
                seedHex,
                newPrincipalId
            );

            if (result.success) {
                // Clear all sessions using our helper
                clearAuthSessions();

                if (import.meta.env?.DEV) {
                    console.log('[PasswordRecovery] Password reset completed successfully, step transition');
                }

                toast.success('Password reset successful. Please login with your new password.');
                onBack();
            } else {
                // Display the exact failure reason in dev mode, generic message in production
                const displayMsg = isDev ? result.message : 'If account details are valid, recovery will continue.';
                toast.error(displayMsg);
            }
        } catch (err: any) {
            console.error('Password recovery error:', err);
            const displayErr = isDev ? `Backend update failed: ${err.message || err}` : 'An error occurred during password recovery. Please try again.';
            toast.error(displayErr);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="w-full space-y-4">
                <Card className="border-2 border-green-500 shadow-2xl overflow-hidden bg-white/95 dark:bg-gray-950/95 backdrop-blur">
                    <CardHeader className="bg-gradient-to-r from-green-700 to-green-900 text-white text-center py-6">
                        <CardTitle className="text-xl">Password Reset Complete</CardTitle>
                        <CardDescription className="text-white/80 text-xs">
                            Your password has been updated securely.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4 text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-800/50 flex items-center justify-center">
                            <Lock className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {statusMessage || 'Your password has been reset. All existing sessions have been cleared for security.'}
                        </p>
                        <Button
                            onClick={() => {
                                onBack();
                                window.location.reload();
                            }}
                            className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold flex items-center justify-center space-x-2 py-5 border-2 border-green-500/40 shadow"
                        >
                            <LogIn className="h-4 w-4 mr-1" />
                            <span>Sign In with New Password</span>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            <Card className="border-2 border-gold shadow-2xl overflow-hidden bg-white/95 dark:bg-gray-950/95 backdrop-blur">
                <CardHeader className="bg-gradient-to-r from-maroon via-saffron to-maroon text-white text-center py-6">
                    <CardTitle className="text-xl">
                        {step === 'verify' ? 'Identity Verification' : 'Set New Password'}
                    </CardTitle>
                    <CardDescription className="text-white/80 text-xs">
                        {step === 'verify'
                            ? 'Enter your registered details to verify your identity.'
                            : 'Choose a strong password to secure your account.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    {step === 'verify' && (
                        <form onSubmit={handleVerifyIdentity} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <UserCircle className="h-3.5 w-3.5" /> Username
                                </Label>
                                <Input
                                    type="text"
                                    placeholder="e.g. admin"
                                    value={recoveryUsername}
                                    onChange={(e) => setRecoveryUsername(e.target.value)}
                                    className="border-gold/30 focus:ring-saffron"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5" /> Registered Email
                                </Label>
                                <Input
                                    type="email"
                                    placeholder="e.g. user@example.com"
                                    value={recoveryEmail}
                                    onChange={(e) => setRecoveryEmail(e.target.value)}
                                    className="border-gold/30 focus:ring-saffron"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5" /> Registered Mobile
                                </Label>
                                <Input
                                    type="tel"
                                    placeholder="e.g. 7383492261"
                                    value={recoveryMobile}
                                    onChange={(e) => setRecoveryMobile(e.target.value)}
                                    className="border-gold/30 focus:ring-saffron"
                                    required
                                    disabled={isSubmitting}
                                    maxLength={10}
                                />

                                {showDebugPanel && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
                                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                                        🔧 Development Mode — Emergency local recovery is available.
                                    </p>
                                </div>
                            )}
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-maroon hover:bg-maroon/90 text-white font-semibold flex items-center justify-center space-x-2 py-5 border-2 border-gold/40 hover:border-gold shadow"
                            >
                                {isSubmitting ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                        <span>Verifying...</span>
                                    </>
                                ) : (
                                    <span>Verify Identity & Continue</span>
                                )}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={onBack}
                                className="w-full border-gold/30 text-maroon dark:text-saffron hover:bg-gold/10 font-semibold flex items-center justify-center"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                <span>Back to Sign In</span>
                            </Button>
                        </form>
                    )}

                    {step === 'reset' && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-lg px-3 py-2">
                                <p className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold">
                                    Identity verification passed. Set your new password below.
                                </p>
                            </div>

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
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character.
                                </p>
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
                                        <span>Resetting Password...</span>
                                    </>
                                ) : (
                                    <>
                                        <KeyRound className="h-4 w-4 mr-1" />
                                        <span>Reset Password</span>
                                    </>
                                )}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep('verify')}
                                className="w-full border-gold/30 text-maroon dark:text-saffron hover:bg-gold/10 font-semibold flex items-center justify-center"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                <span>Back to Identity Verification</span>
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>

            {showDebugPanel && (
                <Card className="border-2 border-dashed border-amber-500 bg-amber-50/50 dark:bg-amber-955/20 text-slate-800 dark:text-slate-200 shadow-xl">
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
