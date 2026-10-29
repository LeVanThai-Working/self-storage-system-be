import type { ClientSession, FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { ISigningAuthorization } from './signingAuthorization.model.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';
import type { PaginationQuery } from '../../common/schemas/pagination.schema.ts';

export interface SigningAuthorizationQuery extends PaginationQuery {
  authorizedUserId?: string;
  legalEntityId?: string;
  facilityId?: string;
  status?: 'active' | 'revoked' | 'expired';
}

export class SigningAuthorizationRepository {
  constructor(
    private readonly signingAuth: SoftDeleteModel<ISigningAuthorization>
  ) {}

  async create(
    data: Partial<ISigningAuthorization>,
    session?: ClientSession
  ): Promise<ISigningAuthorization> {
    const docs = await this.signingAuth.create([data], { session });
    return docs[0];
  }

  async findById(
    id: string,
    session?: ClientSession
  ): Promise<ISigningAuthorization | null> {
    return this.signingAuth
      .findById(id)
      .populate('legalEntityId')
      .populate('authorizedUserId', 'name email role')
      .populate('facilityIds', 'name code address')
      .session(session ?? null);
  }

  async findValidAuthorization(
    userId: string,
    facilityId: string,
    date: Date = new Date(),
    session?: ClientSession
  ): Promise<ISigningAuthorization | null> {
    return this.signingAuth
      .findOne({
        authorizedUserId: userId,
        facilityIds: facilityId,
        status: 'active',
        validFrom: { $lte: date },
        validTo: { $gte: date },
      })
      .populate('legalEntityId')
      .session(session ?? null);
  }

  async findAll(
    query: SigningAuthorizationQuery = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  ): Promise<PaginateResult<ISigningAuthorization>> {
    const filter: FilterQuery<ISigningAuthorization> = {};

    if (query.authorizedUserId) {
      filter.authorizedUserId = query.authorizedUserId;
    }

    if (query.legalEntityId) {
      filter.legalEntityId = query.legalEntityId;
    }

    if (query.facilityId) {
      filter.facilityIds = query.facilityId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return paginate<ISigningAuthorization>(this.signingAuth, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
      populate: [
        { path: 'legalEntityId' },
        { path: 'authorizedUserId', select: 'name email role' },
        { path: 'facilityIds', select: 'name code address' },
      ],
    });
  }

  async update(
    id: string,
    data: Partial<ISigningAuthorization>,
    session?: ClientSession
  ): Promise<ISigningAuthorization | null> {
    return this.signingAuth.findByIdAndUpdate(id, data, {
      new: true,
      session: session ?? null,
    });
  }

  async revoke(
    id: string,
    session?: ClientSession
  ): Promise<ISigningAuthorization | null> {
    return this.signingAuth.findByIdAndUpdate(
      id,
      { status: 'revoked' },
      { new: true, session: session ?? null }
    );
  }
}
