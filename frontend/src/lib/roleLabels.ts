import type { UserResponse } from '@study-tracker/contracts';

/** Single display name per persisted role; the stored value `student` stays unchanged. */
export const roleLabel = (role: UserResponse['role']) =>
  role === 'admin' ? 'Yönetici' : 'Kullanıcı';
