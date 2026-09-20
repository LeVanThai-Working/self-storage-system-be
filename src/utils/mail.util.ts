import { otpEmailTemplate } from '../common/templates/otpEmail.template.ts';
import { mailTransporter } from '../config/mail.config.ts';

export class MailUtil {
  async sendOtpEmail(email: string, otp: string): Promise<void> {
    await mailTransporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your OTP Verification Code',
      html: otpEmailTemplate(otp),
    });
  }
}
