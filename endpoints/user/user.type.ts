

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
  autoTranslate: boolean;
  pendingBalance: number;
  availableBalance: number;
  totalWithdrawn: number;
  payoutPaypalEmail?: string;
  payoutBankName?: string;
  payoutAccountNumber?: string;
  payoutAccountHolderName?: string;
  otpHash: string | undefined;
  otpExpiresAt: Date | undefined;
}
