import crypto from "crypto";

export class OTPService {
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString(); 
  }

  static generateExpiry(minutes = 10) {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  static generateHash(otp: string) {
    return crypto.createHash("sha256").update(otp).digest("hex");
  }
}
