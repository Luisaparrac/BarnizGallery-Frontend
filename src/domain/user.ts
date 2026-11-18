import type { Id, IsoDate, Language } from "./common";

export type UserRole = "ADMIN" | "ARTISAN" | "CUSTOMER";
export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "DELETED";

export interface User {
  id: Id;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  avatarId: Id | null;
  preferredLanguage: Language;
  countryCode: string | null;
  phone: string | null;
  emailVerified: boolean;
  createdAt: IsoDate;
  lastLoginAt: IsoDate | null;
}

export interface Session {
  user: User;
  accessToken: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  role: "CUSTOMER" | "ARTISAN";
  countryCode: string;
  preferredLanguage: Language;
  avatarId: Id | null;
  /** Only for artisans. */
  workshop?: string;
  city?: string;
}

export interface ProfileUpdate {
  fullName?: string;
  avatarId?: Id | null;
  preferredLanguage?: Language;
  countryCode?: string | null;
  phone?: string | null;
}

export interface Address {
  id: Id;
  recipientName: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  phone: string | null;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, "id">;
