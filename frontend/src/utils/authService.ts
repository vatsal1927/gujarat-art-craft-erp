export const normalizeText = (value: unknown): string =>
  String(value || "").trim().toLowerCase();

export const normalizeMobile = (value: unknown): string =>
  String(value || "").trim().replace(/\s+/g, "");

export interface VerificationResult {
  success: boolean;
  message: string;
  user?: any;
}

export function verifyIdentityLocal(
  username: string,
  email: string,
  mobile: string
): VerificationResult {
  if (!import.meta.env?.DEV) {
    return {
      success: false,
      message: "Local identity verification is disabled in production."
    };
  }
  const stored = localStorage.getItem('mock_users');
  const users = stored ? JSON.parse(stored) : [];
  
  const matchedUser = users.find((u: any) => {
    return (
      normalizeText(u.username) === normalizeText(username) &&
      normalizeText(u.email) === normalizeText(email) &&
      normalizeMobile(u.mobile) === normalizeMobile(mobile)
    );
  });

  if (!matchedUser) {
    return {
      success: false,
      message: "Entered details do not match any registered user."
    };
  }

  return {
    success: true,
    message: "Identity verified successfully.",
    user: matchedUser
  };
}

export function clearAuthSessions() {
  // Clear standard sessions
  localStorage.removeItem('user_session');
  sessionStorage.removeItem('user_session');
  localStorage.removeItem('mock_current_user');
  
  // Clear any keys related to authentication/principals
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('auth_') || 
      key.includes('principal') || 
      key.includes('session') ||
      key.startsWith('@dfinity/')
    )) {
      keysToRemove.push(key);
    }
  }
  
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.startsWith('auth_') || 
      key.includes('principal') || 
      key.includes('session') ||
      key.startsWith('@dfinity/')
    )) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}
