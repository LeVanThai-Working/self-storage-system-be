import { otpEmailTemplate } from '../common/templates/otpEmail.template.ts';
import { resetPasswordEmailTemplate } from '../common/templates/resetPasswordEmail.template.ts';
import { mailTransporter } from '../config/mail.config.ts';

export class MailUtil {
  private async sendEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<void> {
    const brevoApiKey = process.env.BREVO_API_KEY;

    if (brevoApiKey) {
      const senderName = process.env.BREVO_SENDER_NAME || 'Self Storage System';
      const senderEmail =
        process.env.BREVO_SENDER_EMAIL ||
        process.env.SMTP_USER ||
        'lethai281005@gmail.com';

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail,
          },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to send email via Brevo (${response.status}): ${errorText}`
        );
      }
      return;
    }

    // Fallback to Nodemailer SMTP
    await mailTransporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    await this.sendEmail(
      email,
      'Your OTP Verification Code',
      otpEmailTemplate(otp)
    );
  }

  async sendResetPasswordEmail(email: string, otp: string): Promise<void> {
    await this.sendEmail(
      email,
      'Reset Your Password',
      resetPasswordEmailTemplate(otp)
    );
  }

  async sendNotificationEmail(
    email: string,
    title: string,
    content: string
  ): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333333; margin-bottom: 16px;">${title}</h2>
        <p style="color: #555555; font-size: 16px; line-height: 1.5;">${content}</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
        <p style="color: #999999; font-size: 12px;">This is an automated notification from Self Storage Management System.</p>
      </div>
    `;
    await this.sendEmail(email, title, html);
  }
}
