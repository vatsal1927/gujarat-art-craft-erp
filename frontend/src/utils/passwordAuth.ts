import { bufToHex } from './credentialDerivation';

export const normalizeUsername = (value: unknown): string =>
  String(value || "").trim().toLowerCase();

export const normalizeEmail = (value: unknown): string =>
  String(value || "").trim().toLowerCase();

export const normalizeMobile = (value: unknown): string =>
  String(value || "").trim().replace(/\s+/g, "");

export async function createPasswordHash(username: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const cleanUsername = normalizeUsername(username);
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`${cleanUsername}:${password}`)
  );
  return bufToHex(new Uint8Array(hashBuffer));
}

export function findUserByUsername(users: any[], username: string): any {
  const cleanUsername = normalizeUsername(username);
  return users.find((u: any) => normalizeUsername(u.username) === cleanUsername);
}

export function findUserByRecoveryIdentity(
  users: any[],
  usernameOrName: string,
  email: string,
  mobile: string
): any {
  const cleanUsernameOrName = normalizeUsername(usernameOrName);
  const cleanEmail = normalizeEmail(email);
  const cleanMobile = normalizeMobile(mobile);
  
  return users.find((u: any) => {
    const uUsername = normalizeUsername(u.username);
    const uName = normalizeUsername(u.name);
    const uEmail = normalizeEmail(u.email);
    const uMobile = normalizeMobile(u.mobile);
    
    return (
      (uUsername === cleanUsernameOrName || uName === cleanUsernameOrName) &&
      uEmail === cleanEmail &&
      uMobile === cleanMobile
    );
  });
}

export async function verifyPassword(user: any, password: string): Promise<boolean> {
  if (!user || !user.passwordHash) return false;
  const hash = await createPasswordHash(user.username, password);
  return user.passwordHash === hash;
}

export function deduplicateUsers(usersList: any[]): { cleanUsers: any[]; updated: boolean } {
  let updated = false;
  const isDev = true; // safe default for helper logs
  
  // Group users by normalized username
  const groups: { [key: string]: any[] } = {};
  for (const u of usersList) {
    const usernameNormalized = normalizeUsername(u.username);
    if (!usernameNormalized) continue;
    if (!groups[usernameNormalized]) {
      groups[usernameNormalized] = [];
    }
    groups[usernameNormalized].push(u);
  }

  const cleanUsers: any[] = [];
  const defaultAdminHash = 'bf6b5bdb74c79ece9fc0ad0ac9fb0359f9555d4f35a83b2e6ec69ae99e09603d';

  for (const username of Object.keys(groups)) {
    const list = groups[username];
    if (list.length === 1) {
      cleanUsers.push(list[0]);
      continue;
    }

    // Multiple entries exist for this username. We must select the best one.
    updated = true;
    
    // Sort the list:
    // 1. Prioritize entries where passwordHash is not the default admin hash
    // 2. Prioritize entries with latest updatedAt
    // 3. Prioritize entries with latest createdAt
    list.sort((a, b) => {
      const aHasCustomHash = a.passwordHash && a.passwordHash !== defaultAdminHash;
      const bHasCustomHash = b.passwordHash && b.passwordHash !== defaultAdminHash;
      if (aHasCustomHash && !bHasCustomHash) return -1;
      if (!aHasCustomHash && bHasCustomHash) return 1;

      const aUp = parseInt(a.updatedAt || '0') || 0;
      const bUp = parseInt(b.updatedAt || '0') || 0;
      if (bUp !== aUp) return bUp - aUp;

      const aCr = parseInt(a.createdAt || '0') || 0;
      const bCr = parseInt(b.createdAt || '0') || 0;
      return bCr - aCr;
    });

    const best = list[0];
    cleanUsers.push(best);

    console.log(`[Deduplication] Multiple records found for username "${username}". Keeping the latest updated one:`, {
      username: best.username,
      updatedAt: best.updatedAt,
      passwordHash: best.passwordHash ? best.passwordHash.substring(0, 6) + '...' : 'none'
    });
    console.log(`[Deduplication] Removed duplicate record(s):`, list.slice(1).map(r => ({
      username: r.username,
      updatedAt: r.updatedAt,
      passwordHash: r.passwordHash ? r.passwordHash.substring(0, 6) + '...' : 'none'
    })));
  }

  return { cleanUsers, updated };
}

