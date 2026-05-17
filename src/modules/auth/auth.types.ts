export type AuthenticatedUser = {
  id: string;
  email: string;
  phone: string | null;
  displayName: string;
  role: "customer" | "admin";
  createdAt: string;
};

export type AuthUserRecord = AuthenticatedUser & {
  passwordHash: string;
};

export type LoginInput = {
  identifier: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  phone?: string | null;
};

export type LoginResult = {
  sessionToken: string;
  expiresAt: string;
  user: AuthenticatedUser;
};

export type AuthSessionRecord = {
  tokenHash: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

export type PasswordResetTokenRecord = {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
};
