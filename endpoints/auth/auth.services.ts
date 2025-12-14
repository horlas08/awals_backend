import bcrypt from "bcryptjs";
import crypto from "crypto";
import { EmailService } from "../email/email.service.js";
import { OTPService } from "../otp/otp.service.js";
import { response } from "../../utils/req-res.js";
import type { Response } from "express";
import prisma from "../../prisma/client.js";
// import { getAuth } from "firebase-admin/auth";
import { admin } from "../../firebase/index.js";

async function createPlainTextToken(userId: string) {
  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = await bcrypt.hash(raw, 10);
  const created = await prisma.token.create({ data: { userId, tokenHash } });
  return `${created.id}|${raw}`;
}

async function validateAuthChannel(user: any, channel: string) {
  const uc = user.authChannel;
  // Email login only allowed for email accounts
  if (channel === 'email') {
    return { ok: uc === 'email', method: uc } as const;
  }
  // Social login: allow original social channel OR email-registered users
  if (channel === 'google' || channel === 'apple') {
    const ok = uc === channel || uc === 'email';
    return { ok, method: uc } as const;
  }
  // Phone flow strict
  if (channel === 'phone') {
    return { ok: uc === 'phone', method: uc } as const;
  }
  return { ok: true, method: uc } as const;
}

export class AuthService {


  // ---------- REGISTER ----------
  static async register(
    res: Response,
    data: {
      firstName: string;
      lastName: string;
      birthday: string;
      password: string;
      email?: string;
      phone?: string;
      authChannel: 'email' | 'phone' | 'google' | 'facebook' | 'apple';
    }
  ) {
    try {
      const t0 = Date.now();
      console.log('[AuthService.register] payload:', {
        firstName: data.firstName,
        lastName: data.lastName,
        birthday: data.birthday,
        email: (data.email ? 'present' : 'none'),
        phone: (data.phone ? 'present' : 'none'),
        authChannel: data.authChannel,
      });
      const {
        firstName,
        lastName,
        birthday,
        password,
        email,
        phone,
        authChannel,
      } = data;

      const lowerEmail = (email || '').toLowerCase();
      const trimmedPhone = (phone || '').trim();

      // Uniqueness checks
      if (lowerEmail) {
        const e = await prisma.user.findUnique({ where: { email: lowerEmail } });
        if (e) return response({ res, code: 400, success: false, msg: 'Email already registered' });
      }
      if (trimmedPhone) {
        const p = await prisma.user.findFirst({ where: { phone: trimmedPhone } });
        if (p) return response({ res, code: 400, success: false, msg: 'Phone already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          uid: crypto.randomUUID(),
          name: `${firstName} ${lastName}`.trim(),
          // If schema requires non-null strings, provide empty strings when not present
          email: (lowerEmail || ""),
          phone: (trimmedPhone || ""),
          verified: false,
          role: 'guest',
          authChannel,
          passwordHash,
        },
      });

      const token = await createPlainTextToken(user.id);
      console.log('[AuthService.register] created user:', user.id, 'in', (Date.now()-t0)+'ms');
      return response({ res, code: 201, success: true, msg: 'Registered', data: { user, token } });
    } catch (error: any) {
      console.error('[AuthService.register] error:', error?.message || error);
      return response({ msg: error.message, res, code: 500, success: false });
    }
  }

  // ---------- VERIFY EMAIL OTP ----------
  static async verifyOTP(res: Response, email: string, otp: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return response({ res, msg: "User not found", code: 404, success: false });

    const otpHash = OTPService.generateHash(otp);
    if (user.otpHash !== otpHash || (user.otpExpiresAt && user.otpExpiresAt < new Date())) {
      return response({ res, msg: "Invalid or expired OTP", code: 400, success: false });
    }

    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        verified: true,
        otpHash: null,
        otpExpiresAt: null
      }
    });

    return response({ res, msg: "Email verified successfully", code: 200, success: true });
  }

  // ---------- EMAIL LOGIN (PASSWORD) ----------
  static async login(res: Response, email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return response({ msg: "Invalid credentials", res, success: false, code: 404 });

    const ch = await validateAuthChannel(user, "email");
    if (!ch.ok) return response({ res, code: 400, success: false, msg: "login:failed", data: { auth_method_to_use: ch.method, username: user.name } });

    if (!user.passwordHash) return response({ msg: "Invalid credentials", res, success: false, code: 400 });
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return response({ msg: "Invalid credentials", res, success: false, code: 400 });

    const token = await createPlainTextToken(user.id);
    return response({ res, msg: "Successfully logged in", code: 200, success: true, data: { user, token } });
  }

  // ---------- EMAIL EXIST CHECK ----------
  static async emailExists(res: Response, email: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return response({ res, code: 200, success: true, msg: 'ok', data: { exists: !!user, authChannel: user?.authChannel || null, username: user?.name || null } });
  }

  // ---------- START EMAIL OTP FOR SIGNUP ----------
  static async sendEmailOtp(res: Response, email: string) {
    const otp = OTPService.generateOTP();
    const otpHash = OTPService.generateHash(otp);
    const otpExpiresAt = OTPService.generateExpiry(10);
    await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: { otpHash, otpExpiresAt },
      create: {
        uid: crypto.randomUUID(),
        name: "",
        phone: "",
        email: email.toLowerCase(),
        verified: false,
        role: 'guest',
        authChannel: 'email'
      }
    });
    await EmailService.sendOTP(email, otp);
    return response({ res, code: 200, success: true, msg: "OTP sent" });
  }

  // ---------- PHONE LOGIN (AFTER CLIENT VERIFIED VIA FIREBASE) ----------
  static async loginWithPhone(res: Response, phone: string) {
    const user = await prisma.user.findFirst({ where: { phone } });
    if (!user) {
      return response({ res, code: 200, success: true, msg: 'ok', data: { exists: false } });
    }
    const ch = await validateAuthChannel(user, "phone");
    if (!ch.ok) return response({ res, code: 400, success: false, msg: "login:failed", data: { auth_method_to_use: ch.method } });
    const token = await createPlainTextToken(user.id);
    return response({ res, code: 200, success: true, msg: 'ok', data: { exists: true, user, token } });
  }

  // ---------- SOCIAL LOGIN WITH ID TOKEN (GOOGLE/FB/APPLE) ----------
  static async loginWithIdToken(res: Response, provider: 'google' | 'apple', idToken: string) {
    try {
      const t0 = Date.now();
      console.log('[AuthService.loginWithIdToken] start provider:', provider, 'token len:', idToken?.length);
      const decoded = await admin.auth().verifyIdToken(idToken);
      console.log('[AuthService.loginWithIdToken] token verified in', (Date.now()-t0)+'ms');
      const email = decoded.email?.toLowerCase();
      const uid = decoded.uid;
      if (!email) return response({ res, code: 400, success: false, msg: "Email not present in token" });

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // No user, instruct client to register, prefill email from token
        console.log('[AuthService.loginWithIdToken] user not found for', email);
        return response({ res, code: 200, success: true, msg: 'ok', data: { exists: false, email } });
      }
      const ch = await validateAuthChannel(user, provider);
      if (!ch.ok) return response({ res, code: 400, success: false, msg: "login:failed", data: { auth_method_to_use: ch.method, username: user.name } });
      const token = await createPlainTextToken(user.id);
      console.log('[AuthService.loginWithIdToken] success for user', user.id, 'total', (Date.now()-t0)+'ms');
      return response({ res, code: 200, success: true, msg: 'ok', data: { exists: true, user, token } });
    } catch (e: any) {
      console.error('[AuthService.loginWithIdToken] error:', e?.message || e);
      return response({ res, code: 400, success: false, msg: e.message });
    }
  }

  // ---------- FORGOT PASSWORD ----------
  static async forgotPassword(res: Response, email: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return response({ msg: "User not found", code: 404, res, success: false });

    const otp = OTPService.generateOTP();
    const otpHash = OTPService.generateHash(otp);
    const otpExpiresAt = OTPService.generateExpiry(10);

    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { otpHash, otpExpiresAt }
    });

    await EmailService.sendOTP(email, otp);

    return response({ msg: "OTP sent via email", code: 200, res, success: true });
  }

  // ---------- RESET PASSWORD ----------
  static async resetPassword(res: Response, email: string, otp: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return response({ msg: "User not found", code: 404, res, success: false });

    const otpHash = OTPService.generateHash(otp);
    if (otpHash !== user.otpHash || (user.otpExpiresAt && user.otpExpiresAt < new Date())) {
      return response({ msg: "Invalid or expired OTP", code: 400, res, success: false });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { passwordHash, otpHash: null, otpExpiresAt: null }
    });

    return response({ msg: "Password reset successful", code: 200, res, success: true });
  }

}
