export interface BackupRecord {
  id: number;
  filename: string;
  size: number;
  type: 'auto' | 'manual';
  createdAt: string;
  verified?: boolean;
}
export type ResetMode = 'settings_only' | 'all';
