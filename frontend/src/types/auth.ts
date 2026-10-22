import type {
  UserResponse,
  LoginInput,
  RegisterInput,
  ProfilePatch,
} from '@study-tracker/contracts';
export type User = Omit<UserResponse, 'id'> & { id: string };
export type LoginCredentials = LoginInput;
export type RegisterData = RegisterInput;

interface TokenResponse {
  accessToken: string;
  expiresIn: string;
}
export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    tokens: TokenResponse;
  };
}
export type ProfileUpdate = ProfilePatch;
