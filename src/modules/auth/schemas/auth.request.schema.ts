import z from 'zod';

export const sendOtpSchema = z.object({
  email: z.email(),
});

export const registerSchema = z.object({
  email: z.email(),
  otp: z.string().length(6, { message: 'OTP must be 6 digits' }),
  password: z.string().min(6).max(100),
  name: z.string().min(2).max(50),
  phoneNumber: z.string().min(10).max(11).optional(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6).max(100),
});

export type SendOtpRequest = z.infer<typeof sendOtpSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
