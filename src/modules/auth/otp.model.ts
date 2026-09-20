import mongoose from 'mongoose';
export interface IOtp {
  email: string;
  otp: string;
  createdAt: Date;
}

const otpSchema = new mongoose.Schema<IOtp>({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 },
});

export const Otp = mongoose.model<IOtp>('Otp', otpSchema);
