import {
  userResponseSchema,
  type UserResponse,
} from '@study-tracker/contracts';
import type { User } from '../models/User';
export function userResponse(user: User): UserResponse {
  return userResponseSchema.parse({
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.getFullName(),
    role: user.role,
    isActive: user.isActive,
    profileImage: user.profileImage ?? null,
    preferences: user.preferences,
    userCategory: user.userCategory ?? null,
    lastLogin: user.lastLogin?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
}
