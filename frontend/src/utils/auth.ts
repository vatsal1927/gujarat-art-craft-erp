export function getDepartmentName(user: any): string {
  if (!user || !user.department) return '';
  if (typeof user.department === 'string') return user.department;
  return Object.keys(user.department)[0] || '';
}

export function getRoleName(user: any): string {
  if (!user || !user.role) return '';
  const roleObj = user.role;
  const roleStr = typeof roleObj === 'string' ? roleObj : Object.keys(roleObj)[0] || '';
  
  if (roleStr === 'Admin') return 'Master Admin';
  if (roleStr === 'Manager') return 'Admin';
  if (roleStr === 'Staff') return 'Staff';
  
  return roleStr;
}

export function hasDeptAccess(
  user: any,
  allowedDepts: string[],
  requiredPermission?: string
): boolean {
  if (!user) return false;
  const roleName = getRoleName(user);
  if (roleName === 'Master Admin') return true; // Master Admin has full access to everything

  // Admin operational role has access to all operational departments
  if (roleName === 'Admin') {
    if (allowedDepts.includes('AdminSettings')) return false;
    return true;
  }

  const deptName = getDepartmentName(user);
  if (!deptName) return false;

  // Check if department is allowed
  if (!allowedDepts.includes(deptName)) return false;

  // Check if specific permission toggle is required
  if (requiredPermission) {
    if (!user.permissions) return false;
    return !!user.permissions[requiredPermission];
  }

  return true;
}
