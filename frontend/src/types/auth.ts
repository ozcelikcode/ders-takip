import type { PreferencesPatch, UserPreferences } from '@study-tracker/contracts';
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: 'student' | 'admin';
  userCategory?: 'student' | 'teacher' | 'employee' | 'developer' | 'freelancer' | 'other';
  isActive: boolean;
  profileImage?: string | null;
  preferences: UserPreferences;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface TokenResponse {
  accessToken: string;
  expiresIn: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    tokens: TokenResponse;
  };
}
export type ProfileUpdate = Partial<Pick<User, "firstName" | "lastName" | "username" | "profileImage">> & { preferences?: PreferencesPatch };
