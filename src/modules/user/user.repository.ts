import type { FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IUser } from './user.model.ts';
import type { UserQuery } from './schemas/user.request.schema.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';
import { RoleEnum, UserStatusEnum } from '../../common/enums/user.enum.ts';

export class UserRepository {
  constructor(private readonly user: SoftDeleteModel<IUser>) {}

  async findAllUser(
    query: UserQuery = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<IUser>> {
    const filter: FilterQuery<IUser> = {};

    if (query.search) {
      const searchRegex = { $regex: query.search, $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex },
      ];
    }

    let sortBy = query.sortBy || 'createdAt';
    let sortOrder = query.sortOrder || 'desc';

    if (query.sort === 'a-z') {
      sortBy = 'name';
      sortOrder = 'asc';
    } else if (query.sort === 'z-a') {
      sortBy = 'name';
      sortOrder = 'desc';
    } else if (query.sort === 'asc') {
      sortOrder = 'asc';
    } else if (query.sort === 'desc') {
      sortOrder = 'desc';
    }

    return paginate<IUser>(this.user, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
    });
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

  async findStaffsByFacilityId(
    facilityId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: UserStatusEnum;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<IUser>> {
    const filter: FilterQuery<IUser> = {
      assignedFacilityId: facilityId,
      role: RoleEnum.FACILITY_STAFF,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search) {
      const searchRegex = { $regex: query.search, $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return paginate<IUser>(this.user, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
    });
  }

  async createUser(data: Partial<IUser>) {
    return this.user.create(data);
  }

  async updateUser(id: string, data: Partial<IUser>) {
    return this.user.findByIdAndUpdate(id, data, { new: true });
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.user.findByIdAndUpdate(id, { password: hashedPassword });
  }

  async softDeleteUser(id: string, deletedBy?: string) {
    await this.user.findByIdAndUpdate(id, { status: UserStatusEnum.DELETED });
    return this.user.deleteById(id, deletedBy);
  }

  async findByIdIncludeDeleted(id: string) {
    return this.user.findOneWithDeleted({ _id: id });
  }

  async restoreUser(id: string) {
    await this.user.findByIdAndUpdate(id, { status: UserStatusEnum.ACTIVE });
    return this.user.restore({ _id: id });
  }
}
