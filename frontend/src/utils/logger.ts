export type LogCategory =
  | 'Repository'
  | 'Actor'
  | 'Auth'
  | 'Customer'
  | 'Dashboard'
  | 'Expense'
  | 'Finance'
  | 'Inventory'
  | 'Invoice'
  | 'Product'
  | 'Production'
  | 'Purchase'
  | 'RawMaterial'
  | 'Settings'
  | 'User'
  | 'Vendor'
  | 'General';

class EnterpriseLogger {
  private get isDev(): boolean {
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        return Boolean(import.meta.env.DEV);
      }
    } catch {
      // Fallback for non-Vite execution contexts
    }
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NODE_ENV !== 'production';
    }
    return false;
  }

  info(category: LogCategory, message: string, ...details: unknown[]): void {
    if (this.isDev) {
      console.info(`[${category}] ${message}`, ...details);
    }
  }

  warn(category: LogCategory, message: string, ...details: unknown[]): void {
    if (this.isDev) {
      console.warn(`[${category}] ⚠️ ${message}`, ...details);
    }
  }

  error(category: LogCategory, message: string, error?: unknown, ...details: unknown[]): void {
    if (this.isDev) {
      if (error !== undefined) {
        console.error(`[${category}] ❌ ${message}`, error, ...details);
      } else {
        console.error(`[${category}] ❌ ${message}`, ...details);
      }
    }
  }

  debug(category: LogCategory, message: string, ...details: unknown[]): void {
    if (this.isDev) {
      console.debug(`[${category}] 🔍 ${message}`, ...details);
    }
  }
}

export const logger = new EnterpriseLogger();
