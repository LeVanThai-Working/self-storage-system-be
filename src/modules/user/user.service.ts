import bcrypt from 'bcrypt';
import type { UserRepository } from './user.repository.ts';
import type { ProfileRepository } from '../profile/profile.repository.ts';
import type { AuthRedisService } from '../auth/auth.redis.service.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import {
  userListResponseSchema,
  userResponseSchema,
  type UserResponse,
} from './schemas/user.response.schema.ts';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserQuery,
} from './schemas/user.request.schema.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';
import {
  AuthProviderEnum,
  RoleEnum,
  UserStatusEnum,
} from '../../common/enums/user.enum.ts';
import { Transactional } from '../../common/decorators/transactional.decorator.ts';

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authRedisService?: AuthRedisService,
    private readonly profileRepository?: ProfileRepository
  ) {}

  private formatUser(user: unknown): unknown {
    if (!user) return user;
    const doc = user as {
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

  async findAllUser(query?: UserQuery): Promise<PaginatedData<UserResponse>> {
    try {
      const result = await this.userRepository.findAllUser(query);
      const formattedItems = result.items.map((u) => this.formatUser(u));
      const validatedItems = validateResponse(
        userListResponseSchema,
        formattedItems
      );
      return {
        items: validatedItems,
        pagination: result.pagination,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error in findAllUser:', error);
      throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106);
    }
  }

  async findUserById(id: string): Promise<UserResponse> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['User']);
    }
    return validateResponse(userResponseSchema, this.formatUser(user));
  }

  async createUser(data: CreateUserRequest): Promise<UserResponse> {
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105, ['Email']);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = await this.userRepository.createUser({
      ...data,
      password: hashedPassword,
      authProvider: AuthProviderEnum.LOCAL,
      role: data.role || RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: false,
    });

    return validateResponse(userResponseSchema, this.formatUser(newUser));
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<UserResponse> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['User']);
    }

    const updatedUser = await this.userRepository.updateUser(id, data);
    return validateResponse(userResponseSchema, this.formatUser(updatedUser));
  }

  @Transactional()
  async deleteUser(id: string, deletedBy?: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['User']);
    }

    // TODO: [Module Reservation & Contract Integration Reminder]
    // Khi hoàn thiện các module liên quan, cần bổ sung các điều kiện chặn xoá:
    // 1. Kiểm tra nếu User đang có Hợp đồng thuê hiệu lực (Contract.status === 'ACTIVE') -> Chặn xoá và báo lỗi.
    // 2. Kiểm tra nếu User đang có Đặt chỗ chưa hoàn thành (Reservation.status IN ['CONFIRMED', 'PENDING_PAYMENT']) -> Chặn xoá.
    // 3. Nếu User là FACILITY_MANAGER đang phụ trách cơ sở -> Yêu cầu gán Manager khác trước khi xoá.

    // Cascade delete: remove profile before soft-deleting user
    if (this.profileRepository) {
      await this.profileRepository.softDeleteByUserId(id);
    }

    await this.userRepository.softDeleteUser(id, deletedBy);

    if (this.authRedisService) {
      await this.authRedisService.revokeAllUserFamilies(id);
    }
  }
}
