import type { Model } from 'mongoose';
import type { IUser } from './user.model.ts';

export class UserRepository {
  constructor(private readonly user: Model<IUser>) {}

  async findAllUser() {
    return this.user.find();
  }

  async findByEmail(email: string) {
    return this.user.findOne({ email });
  }

  async findById(id: string) {
    return this.user.findById(id);
  }

  async findByGoogleId(googleId: string) {
    return this.user.findOne({ googleId });
  }

  async createUser(data: Partial<IUser>) {
    return this.user.create(data);
  }

  async updateUser(id: string, data: Partial<IUser>) {
    return this.user.findByIdAndUpdate(id, data, { new: true });
  }
}
