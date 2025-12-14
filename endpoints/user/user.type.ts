

export type TRole = 'guest' | 'host' | 'both';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: TRole;
  picture?: string;
  verified: boolean;
  deleted: boolean;
  otpHash: string | undefined;
  otpExpiresAt: Date | undefined;
}
