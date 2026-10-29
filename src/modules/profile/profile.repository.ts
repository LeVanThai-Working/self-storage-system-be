import type { ClientSession, default as mongoose } from 'mongoose';
import type { IProfile } from './profile.model.ts';
import type { SoftDeleteModel } from 'mongoose-delete';

export class ProfileRepository {
  constructor(private readonly profile: SoftDeleteModel<IProfile>) {}

  async findByUserId(userId: string): Promise<IProfile | null> {
    return this.profile.findOne({ userId });
  }

  async upsertByUserId(
    userId: string,
    data: Partial<Omit<IProfile, '_id' | 'userId' | 'createdAt' | 'updatedAt'>>,
    session?: ClientSession
  ): Promise<IProfile> {
    const q = this.profile.findOneAndUpdate(
      { userId },
      { $set: data },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    if (session) {
      q.session(session);
    }
    return q.exec() as Promise<IProfile>;
  }

  async softDeleteByUserId(
    userId: string | mongoose.Types.ObjectId
  ): Promise<void> {
    await this.profile.delete({ userId });
  }

  async restoreByUserId(
    userId: string | mongoose.Types.ObjectId
  ): Promise<void> {
    await this.profile.restore({ userId });
  }
}
