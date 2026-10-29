import type { ClientSession, FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { ILegalEntity } from './legalEntity.model.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';
import type { PaginationQuery } from '../../common/schemas/pagination.schema.ts';

export interface LegalEntityQuery extends PaginationQuery {
  search?: string;
  status?: 'active' | 'inactive';
}

export class LegalEntityRepository {
  constructor(private readonly legalEntity: SoftDeleteModel<ILegalEntity>) {}

  async create(
    data: Partial<ILegalEntity>,
    session?: ClientSession
  ): Promise<ILegalEntity> {
    const docs = await this.legalEntity.create([data], { session });
    return docs[0];
  }

  async findById(
    id: string,
    session?: ClientSession
  ): Promise<ILegalEntity | null> {
    return this.legalEntity.findById(id).session(session ?? null);
  }

  async findByTaxCode(
    taxCode: string,
    session?: ClientSession
  ): Promise<ILegalEntity | null> {
    return this.legalEntity
      .findOne({ taxCode: taxCode.trim() })
      .session(session ?? null);
  }

  async findAll(
    query: LegalEntityQuery = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<ILegalEntity>> {
    const filter: FilterQuery<ILegalEntity> = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search) {
      const searchRegex = { $regex: query.search, $options: 'i' };
      filter.$or = [
        { companyName: searchRegex },
        { taxCode: searchRegex },
        { 'legalRepresentative.name': searchRegex },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return paginate<ILegalEntity>(this.legalEntity, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
    });
  }

  async update(
    id: string,
    data: Partial<ILegalEntity>,
    session?: ClientSession
  ): Promise<ILegalEntity | null> {
    return this.legalEntity.findByIdAndUpdate(id, data, {
      new: true,
      session: session ?? null,
    });
  }

  async delete(id: string, deletedBy?: string) {
    return this.legalEntity.deleteById(id, deletedBy);
  }
}
