export interface AuditLogEntry {
  id: string;
  userId?: string;
  username?: string;
  role: string;
  action: string;
  module: 'AUTH' | 'USERS' | 'ERP';
  description: string;
  metadata: any;
  timestamp: string;
}

export function formatAuditDescription(description: string, metadata?: any): string {
  if (!metadata) return description;
  try {
    return `${description} | Metadata: ${JSON.stringify(metadata)}`;
  } catch {
    return description;
  }
}
