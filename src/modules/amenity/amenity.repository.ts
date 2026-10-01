import type { ClientSession, FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IAmenity } from './amenity.model.ts';
import type { AmenityQuery } from './schemas/amenity.request.schema.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';
import type {
  AmenityStatusEnum,
  AmenityTypeEnum,
} from '../../common/enums/amenity.enum.ts';

export class AmenityRepository {
  constructor(private readonly amenity: SoftDeleteModel<IAmenity>) {}

  async findAll(
    query: AmenityQuery = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<IAmenity>> {
    const filter: FilterQuery<IAmenity> = {};

    if (query.search) {
      const searchRegex = { $regex: query.search, $options: 'i' };
      filter.$or = [{ name: searchRegex }, { description: searchRegex }];
    }

    if (query.type) {
      filter.type = query.type as AmenityTypeEnum;
    }

    if (query.status) {
      filter.status = query.status as AmenityStatusEnum;
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return paginate<IAmenity>(this.amenity, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
    });
  }

  async findById(id: string, session?: ClientSession) {
    const q = this.amenity.findById(id);
    if (session) q.session(session);
    return q;
  }

  async findByName(name: string, session?: ClientSession) {
    const q = this.amenity.findOne({ name });
    if (session) q.session(session);
    return q;
  }

  async findByNameIncludeDeleted(name: string) {
    return this.amenity.findOneWithDeleted({ name });
  }

  async create(data: Partial<IAmenity>, session?: ClientSession) {
    if (session) {
      const docs = await this.amenity.create([data], { session });
      return docs[0];
    }
    return this.amenity.create(data);
  }

  async updateById(
    id: string,
    data: Partial<IAmenity>,
    session?: ClientSession
  ) {
    const q = this.amenity.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
    });
    if (session) q.session(session);
    return q;
  }

  async deleteById(id: string, deletedBy?: string) {
    return this.amenity.deleteById(id, deletedBy);
  }

  async findByIdIncludeDeleted(id: string) {
    return this.amenity.findOneWithDeleted({ _id: id });
  }

  async restoreById(id: string) {
    return this.amenity.restore({ _id: id });
  }
}
