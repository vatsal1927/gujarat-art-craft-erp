import type { backendInterface, User, IdentityProviderType, ActivityLog } from '../backend';
import { mapCandidUser, mapCandidUsers } from '../utils/candidMappers';
import { executeRepository, executeRepositoryResult } from './base/repositoryRunner';
import type { ApiResult } from '../utils/apiResult';
import { logger } from '../utils/logger';

export class UserRepository {
  static async registerOrGetSelf(actor: backendInterface): Promise<User | null> {
    return executeRepository('User', 'registerOrGetSelf', actor, async () => {
      const u = await actor.registerOrGetSelf();
      return mapCandidUser(u);
    }, { allowNull: true });
  }

  static async registerOrGetSelfResult(actor: backendInterface): Promise<ApiResult<User | null>> {
    return executeRepositoryResult('User', 'registerOrGetSelf', actor, async () => {
      const u = await actor.registerOrGetSelf();
      return mapCandidUser(u);
    }, { allowNull: true });
  }

  static async getUsers(actor: backendInterface): Promise<User[]> {
    return executeRepository('User', 'getUsers', actor, async () => {
      const users = await actor.getUsers();
      return mapCandidUsers(users);
    }, { fallbackValue: [] });
  }

  static async getUsersResult(actor: backendInterface): Promise<ApiResult<User[]>> {
    return executeRepositoryResult('User', 'getUsers', actor, async () => {
      const users = await actor.getUsers();
      return mapCandidUsers(users);
    }, { fallbackValue: [] });
  }

  static async linkIdentityToUser(
    actor: backendInterface,
    data: { targetPrincipalText: string; providerTypeVariant: IdentityProviderType; providerId: string }
  ): Promise<string> {
    return executeRepository('User', 'linkIdentityToUser', actor, () =>
      actor.linkIdentityToUser(data.targetPrincipalText, data.providerTypeVariant, data.providerId)
    );
  }

  static async unlinkIdentityFromUser(
    actor: backendInterface,
    data: { targetPrincipalText: string; providerId: string }
  ): Promise<string> {
    return executeRepository('User', 'unlinkIdentityFromUser', actor, () =>
      actor.unlinkIdentityFromUser(data.targetPrincipalText, data.providerId)
    );
  }

  static async createUser(actor: backendInterface, data: any): Promise<string> {
    return executeRepository('User', 'createUser', actor, () =>
      actor.createUser(
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
      )
    );
  }

  static async editUser(actor: backendInterface, data: any): Promise<void> {
    return executeRepository('User', 'editUser', actor, () =>
      actor.editUser(
        data.principalText,
        data.name,
        data.username,
        data.email || '',
        data.mobile || '',
        data.roleText || 'Staff',
        data.status || 'Active',
        data.departmentText,
        data.permissionsObj
      )
    );
  }

  static async deleteUser(actor: backendInterface, principalText: string): Promise<void> {
    return executeRepository('User', 'deleteUser', actor, () => actor.deleteUser(principalText));
  }

  static async updateProfile(actor: backendInterface, data: any): Promise<void> {
    return executeRepository('User', 'updateProfile', actor, () =>
      actor.updateProfile(
        data.email || '',
        data.name || '',
        data.mobile || '',
        data.address || '',
        data.profilePhoto || ''
      )
    );
  }

  static async changePassword(
    actor: backendInterface,
    data: { newPassword: string; newPrincipalId: string }
  ): Promise<void> {
    return executeRepository('User', 'changePassword', actor, () =>
      actor.changePassword(data.newPassword, data.newPrincipalId)
    );
  }

  static async toggleUserStatus(
    actor: backendInterface,
    data: { principalText: string; status: string }
  ): Promise<void> {
    return executeRepository('User', 'toggleUserStatus', actor, () =>
      actor.toggleUserStatus(data.principalText, data.status)
    );
  }

  static async adminResetPassword(
    actor: backendInterface,
    data: { principalText: string; newPrincipalId: string; newPasswordHash?: string }
  ): Promise<void> {
    return executeRepository('User', 'adminResetPassword', actor, () =>
      actor.adminResetPassword(data.principalText, data.newPrincipalId, data.newPasswordHash)
    );
  }

  static async logUserAction(
    actor: backendInterface,
    data: { action: string; details: string }
  ): Promise<void> {
    return executeRepository('User', 'logUserAction', actor, async () => {
      if ((actor as any).logUserAction) {
        return (actor as any).logUserAction(data.action, data.details);
      }
    });
  }

  static async getActivityLogs(actor: backendInterface): Promise<ActivityLog[]> {
    return executeRepository('User', 'getActivityLogs', actor, () => actor.getActivityLogs(), { fallbackValue: [] });
  }
}
