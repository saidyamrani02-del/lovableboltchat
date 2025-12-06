export interface PermissionsState {
  camera: boolean;
  microphone: boolean;
  notifications: boolean;
  grantedAt: number;
}

const PERMISSIONS_KEY = 'videocall-permissions';

export const savePermissions = (permissions: PermissionsState) => {
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
};

export const getStoredPermissions = (): PermissionsState | null => {
  const stored = localStorage.getItem(PERMISSIONS_KEY);
  if (!stored) return null;
  
  try {
    const parsed = JSON.parse(stored);
    // Check if permissions were granted more than 7 days ago
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.grantedAt > sevenDaysInMs) {
      localStorage.removeItem(PERMISSIONS_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const clearPermissions = () => {
  localStorage.removeItem(PERMISSIONS_KEY);
};
