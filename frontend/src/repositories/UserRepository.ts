import type { backendInterface, User, IdentityProviderType, ActivityLog } from '../backend';
import { mapCandidUser, mapCandidUsers } from '../utils/candidMappers';

export class UserRepository {
  static async registerOrGetSelf(actor: backendInterface): Promise<User | null> {
    const u = await actor.registerOrGetSelf();
    return mapCandidUser(u);
  }

  static async getUsers(actor: backendInterface): Promise<User[]> {
    const users = await actor.getUsers();
    const cleanUsers = mapCandidUsers(users);
    try {
      const serialized = cleanUsers.map(u => ({
        ...u,
        principalId: u.principalId.toString(),
        createdAt: u.createdAt.toString()
      }));
      localStorage.setItem('mock_users', JSON.stringify(serialized));
    } catch (err) {
      console.error('Failed to cache canister users in mock_users:', err);
    }
    return cleanUsers;
  }

  static async linkIdentityToUser(
    actor: backendInterface,
    data: { targetPrincipalText: string; providerTypeVariant: IdentityProviderType; providerId: string }
  ): Promise<string> {
    return actor.linkIdentityToUser(data.targetPrincipalText, data.providerTypeVariant, data.providerId);
  }

  static async unlinkIdentityFromUser(
    actor: backendInterface,
    data: { targetPrincipalText: string; providerId: string }
  ): Promise<string> {
    return actor.unlinkIdentityFromUser(data.targetPrincipalText, data.providerId);
  }

  static async createUser(
    actor: backendInterface,
    data: any
  ): Promise<string> {
    return actor.createUser(
      data.principalText,
      data.name,
      data.username,
      data.roleText || 'Staff',
      data.email,
      data.mobile,
      data.address,
      data.profilePhoto,
      data.status,
      data.passwordHash,
      data.departmentText,
      data.permissionsObj
    );
  }

  static async editUser(
    actor: backendInterface,
    data: any
  ): Promise<void> {
    return actor.editUser(
      data.principalText,
      data.name,
      data.username,
      data.email || '',
      data.mobile || '',
      data.roleText || 'Staff',
      data.status || 'Active',
      data.departmentText,
      data.permissionsObj
    );
  }

  static async deleteUser(actor: backendInterface, principalText: string): Promise<void> {
    return actor.deleteUser(principalText);
  }

  static async updateProfile(
    actor: backendInterface,
    data: any
  ): Promise<void> {
    return actor.updateProfile(
      data.email || '',
      data.name || '',
      data.mobile || '',
      data.address || '',
      data.profilePhoto || ''
    );
  }

  static async changePassword(
    actor: backendInterface,
    data: { newPassword: string; newPrincipalId: string }
  ): Promise<void> {
    return actor.changePassword(data.newPassword, data.newPrincipalId);
  }

  static async toggleUserStatus(
    actor: backendInterface,
    data: { principalText: string; status: string }
  ): Promise<void> {
    return actor.toggleUserStatus(data.principalText, data.status);
  }

  static async adminResetPassword(
    actor: backendInterface,
    data: { principalText: string; newPrincipalId: string; newPasswordHash?: string }
  ): Promise<void> {
    return actor.adminResetPassword(data.principalText, data.newPrincipalId, data.newPasswordHash);
  }

  static async logUserAction(
    actor: backendInterface,
    data: { action: string; details: string }
  ): Promise<void> {
    return (actor as any).logUserAction ? (actor as any).logUserAction(data.action, data.details) : Promise.resolve();
  }

  static async getActivityLogs(actor: backendInterface): Promise<ActivityLog[]> {
    return actor.getActivityLogs();
  }
}
