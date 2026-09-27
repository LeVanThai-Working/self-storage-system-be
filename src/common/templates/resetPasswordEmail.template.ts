export function resetPasswordEmailTemplate(otp: string): string {
  return `
    <div>
      <h2>Reset Your Password</h2>

      <p>We received a request to reset your password. Use the OTP code below to proceed:</p>

      <h1>${otp}</h1>

      <p>This code will expire in 5 minutes.</p>

      <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
    </div>
  `;
}
