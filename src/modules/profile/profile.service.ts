import type { ProfileRepository } from './profile.repository.ts';
import type { UpdateProfileRequest } from './schemas/profile.request.schema.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  profileResponseSchema,
  type ProfileResponse,
} from './schemas/profile.response.schema.ts';

export class ProfileService {
  constructor(private readonly profileRepository: ProfileRepository) {}

  private formatProfile(profile: unknown): unknown {
    if (!profile) return profile;
    const doc = profile as {
      toObject?: (options?: unknown) => Record<string, unknown>;
      _id?: unknown;
      id?: string;
    };
    const obj =
      typeof doc.toObject === 'function'
        ? doc.toObject({ virtuals: true })
        : { ...doc };
    if (!obj.id && obj._id) {
      obj.id = String(obj._id);
    }
    return obj;
  }

  async getMyProfile(userId: string): Promise<ProfileResponse> {
    // Lazy upsert — tạo profile rỗng nếu chưa có
    const profile = await this.profileRepository.upsertByUserId(userId, {});
    return validateResponse(profileResponseSchema, this.formatProfile(profile));
  }

  async updateMyProfile(
    userId: string,
    data: UpdateProfileRequest
  ): Promise<ProfileResponse> {
    const updateData: Record<string, unknown> = {};

    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.dateOfBirth !== undefined)
      updateData.dateOfBirth = new Date(data.dateOfBirth);
    if (data.address !== undefined) updateData.address = data.address;
    if (data.gender !== undefined) updateData.gender = data.gender;

    const profile = await this.profileRepository.upsertByUserId(
      userId,
      updateData
    );
    return validateResponse(profileResponseSchema, this.formatProfile(profile));
  }

  async getProfileByUserId(userId: string): Promise<ProfileResponse> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['Profile']);
    }
    return validateResponse(profileResponseSchema, this.formatProfile(profile));
  }
}
