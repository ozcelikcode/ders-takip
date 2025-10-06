export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: 'student' | 'admin';
  isActive: boolean;
  profileImage?: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      push: boolean;
      reminders: boolean;
    };
    studyGoals: {
      dailyHours: number;
      weeklyHours: number;
    };
    studyField?: 'TYT' | 'AYT' | 'SAY' | 'EA' | 'SOZ' | 'DIL';
  };
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
  refreshToken: string;
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