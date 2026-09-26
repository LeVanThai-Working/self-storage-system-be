import type mongoose from 'mongoose';
import type { IProfile } from './profile.model.ts';
import type { SoftDeleteModel } from 'mongoose-delete';

export class ProfileRepository {
  constructor(private readonly profile: SoftDeleteModel<IProfile>) {}

  async findByUserId(userId: string): Promise<IProfile | null> {
    return this.profile.findOne({ userId });
  }

  async upsertByUserId(
    userId: string,
    data: Partial<Omit<IProfile, '_id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<IProfile> {
    return this.profile.findOneAndUpdate(
      { userId },
      { $set: data },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ) as Promise<IProfile>;
  }

  async softDeleteByUserId(
    userId: string | mongoose.Types.ObjectId
  ): Promise<void> {
    await this.profile.delete({ userId });
  }
}
