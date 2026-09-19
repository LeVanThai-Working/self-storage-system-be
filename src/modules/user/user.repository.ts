import type { Model } from 'mongoose';
import type { IUser } from './user.model.ts';

export class UserRepository {
  constructor(private readonly user: Model<IUser>) {}

  async findAllUser() {
    return this.user.find();
  }
}
