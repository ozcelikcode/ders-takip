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
  profileImage?: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      push: boolean;
      reminders: boolean;
    };
    workGoals: {
      dailyHours: number;
      weeklyHours: number;
    };
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