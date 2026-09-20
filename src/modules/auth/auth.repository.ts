import type { Model } from 'mongoose';
import type { IOtp } from './otp.model.ts';

export class AuthRepository {
  constructor(private readonly otpModel: Model<IOtp>) {}

  async createOtp(email: string, otp: string): Promise<IOtp> {
    return this.otpModel.create({ email, otp });
  }

  async findLatestOtp(email: string): Promise<IOtp | null> {
    return this.otpModel.findOne({ email }).sort({ createdAt: -1 });
  }

  async deleteOtp(email: string): Promise<void> {
    await this.otpModel.deleteMany({ email });
  }
}
