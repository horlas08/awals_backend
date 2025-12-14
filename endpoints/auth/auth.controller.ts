
import { type Request, type Response } from "express";
import { AuthService } from "./auth.services.js";
import { response } from "../../utils/req-res.js";

export class AuthController {

  static async register(req: Request, res: Response) {
    try {
      console.log('[AuthController.register] incoming body:', {
        ...req.body,
        password: req.body?.password ? '***masked***' : undefined,
      });
      const {
        firstName,
        lastName,
        birthday,
        password,
        email,
        phone,
        authChannel,
      } = req.body as any;

      const errors: Record<string, string[]> = {};

      function pushErr(key: string, msg: string) {
        if (!errors[key]) errors[key] = [];
        errors[key].push(msg);
      }

      if (!firstName || String(firstName).trim() === '') pushErr('firstName', 'First name is required');
      if (!lastName || String(lastName).trim() === '') pushErr('lastName', 'Last name is required');
      if (!birthday || String(birthday).trim() === '') pushErr('birthday', 'Birthday is required');
      if (!password || String(password).trim() === '') pushErr('password', 'Password is required');

      if (!authChannel || !['email','phone','google','facebook','apple'].includes(String(authChannel))) {
        pushErr('authChannel', 'authChannel must be one of email|phone|google|facebook|apple');
      }

      const em = (email ? String(email).toLowerCase().trim() : '');
      const ph = (phone ? String(phone).trim() : '');

      if (!em && !ph) {
        pushErr('identity', 'Provide a valid email or phone number');
      }

      if (authChannel === 'email') {
        if (!em) pushErr('email', 'Email is required for email channel');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (em && !emailRegex.test(em)) pushErr('email', 'Email is invalid');
      }
      if (authChannel === 'phone') {
        if (!ph) pushErr('phone', 'Phone is required for phone channel');
        const e164 = /^\+?[1-9]\d{1,14}$/;
        if (ph && !e164.test(ph)) pushErr('phone', 'Phone must be E.164');
      }

      // Basic age check (>= 18)
      if (birthday) {
        const d = new Date(String(birthday));
        if (isNaN(d.getTime())) {
          pushErr('birthday', 'Birthday must be a valid date');
        } else {
          const now = new Date();
          let age = now.getFullYear() - d.getFullYear();
          const hasntHadBirthday = (now.getMonth() < d.getMonth()) || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
          if (hasntHadBirthday) age -= 1;
          if (age < 18) pushErr('birthday', 'You must be at least 18 years old');
        }
      }

      if (Object.keys(errors).length > 0) {
        console.log('[AuthController.register] validation errors:', errors);
        return res.status(422).json({ success: false, code: 422, errors });
      }

      console.log('[AuthController.register] calling service with:', {
        firstName,
        lastName,
        birthday,
        email: em || undefined,
        phone: ph || undefined,
        authChannel,
      });
      await AuthService.register(res, {
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        birthday: String(birthday).trim(),
        password: String(password).trim(),
        email: em || undefined,
        phone: ph || undefined,
        authChannel: String(authChannel) as any,
      });
    } catch (err: any) {
      console.error('[AuthController.register] error:', err?.message || err);
      return response({ msg: err.message, res, code: 400, success: false })
    }
  }

  static async verifyOTP(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;
      const result = await AuthService.verifyOTP(res, email, otp);
      // res.json({ success: true, data: result });
    } catch (err: any) {
      return response({ res, code: 400, success: false, msg: err.message })
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      await AuthService.login(res, email, password);
      // res.json({ success: true, data: result });
    } catch (err: any) {
      return response ({ success: false, code: 400, res, msg: err.message });
    }
  }

  static async emailExists(req: Request, res: Response) {
    try {
      const { email } = req.body;
      await AuthService.emailExists(res, email);
    } catch (err: any) {
      return response({ success: false, code: 400, res, msg: err.message });
    }
  }

  static async sendEmailOtp(req: Request, res: Response) {
    try {
      const { email } = req.body;
      await AuthService.sendEmailOtp(res, email);
    } catch (err: any) {
      return response({ success: false, code: 400, res, msg: err.message });
    }
  }

  static async loginWithPhone(req: Request, res: Response) {
    try {
      const { phone } = req.body;
      await AuthService.loginWithPhone(res, phone);
    } catch (err: any) {
      return response({ success: false, code: 400, res, msg: err.message });
    }
  }

  static async loginWithIdToken(req: Request, res: Response) {
    try {
      const { provider, idToken } = req.body as { provider: 'google'|'apple', idToken: string };
      console.log('[AuthController.loginWithIdToken] provider:', provider, ' idToken len:', idToken?.length);
      await AuthService.loginWithIdToken(res, provider, idToken);
    } catch (err: any) {
      console.error('[AuthController.loginWithIdToken] error:', err?.message || err);
      return response({ success: false, code: 400, res, msg: err.message });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      await AuthService.forgotPassword(res, email);
      // res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { email, otp, newPassword } = req.body;
      await AuthService.resetPassword(res, email, otp, newPassword);
      // res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}
