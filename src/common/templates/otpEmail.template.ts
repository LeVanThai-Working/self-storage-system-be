export function otpEmailTemplate(otp: string): string {
  return `
    <div>
      <h2>Email Verification</h2>

      <p>Your OTP code is:</p>

      <h1>${otp}</h1>

      <p>This code will expire in 5 minutes.</p>

      <p>If you did not request this code, please ignore this email.</p>
    </div>
  `;
}
