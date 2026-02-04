
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASS!
  }
});

export class EmailService {
  static async sendOTP(
    email: string, otp: string) {
    return transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Verification Code",
      text: `Your OTP code is ${otp}. It expires in 10 minutes.`,
    });
  }

  static async sendBookingConfirmation(
    email: string,
    data: {
      guestName: string;
      listingName: string;
      hostName: string;
      startDate: string;
      endDate: string;
      totalPrice: number;
    }
  ) {
    return transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Booking Confirmed - ${data.listingName}`,
      html: `
        <h2>Your booking is confirmed!</h2>
        <p>Hi ${data.guestName},</p>
        <p>Great news! Your reservation has been confirmed.</p>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
          <h3 style="margin:0 0 8px 0;">${data.listingName}</h3>
          <p style="margin:4px 0;"><strong>Check-in:</strong> ${data.startDate}</p>
          <p style="margin:4px 0;"><strong>Check-out:</strong> ${data.endDate}</p>
          <p style="margin:4px 0;"><strong>Host:</strong> ${data.hostName}</p>
          <p style="margin:4px 0;"><strong>Total:</strong> SAR ${data.totalPrice}</p>
        </div>
        <p>You can message your host directly in the app.</p>
        <p>Have a great stay!</p>
      `,
    });
  }

  static async sendNewBookingNotification(
    email: string,
    data: {
      hostName: string;
      guestName: string;
      listingName: string;
      startDate: string;
      endDate: string;
      totalPrice: number;
    }
  ) {
    return transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `New Booking - ${data.listingName}`,
      html: `
        <h2>You have a new booking!</h2>
        <p>Hi ${data.hostName},</p>
        <p>Great news! Someone just booked your listing.</p>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
          <h3 style="margin:0 0 8px 0;">${data.listingName}</h3>
          <p style="margin:4px 0;"><strong>Guest:</strong> ${data.guestName}</p>
          <p style="margin:4px 0;"><strong>Check-in:</strong> ${data.startDate}</p>
          <p style="margin:4px 0;"><strong>Check-out:</strong> ${data.endDate}</p>
          <p style="margin:4px 0;"><strong>Total:</strong> SAR ${data.totalPrice}</p>
        </div>
        <p>You can message your guest directly in the app.</p>
      `,
    });
  }
}

