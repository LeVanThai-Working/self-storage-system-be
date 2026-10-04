import type { ClientSession, FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { IApprovalRequest } from './approvalRequest.model.ts';
import { paginate } from '../../utils/pagination.util.ts';
import type { ApprovalRequestQuery } from './schemas/approvalRequest.request.schema.ts';

export class ApprovalRequestRepository {
  constructor(
    private readonly approvalRequest: SoftDeleteModel<IApprovalRequest>
  ) {}

  async create(data: Partial<IApprovalRequest>, session?: ClientSession) {
    if (session) {
      const [created] = await this.approvalRequest.create([data], { session });
      return created;
    }
    return this.approvalRequest.create(data);
  }

  async findById(id: string, session?: ClientSession) {
    const query = this.approvalRequest
      .findById(id)
      .populate('requesterId', 'name email phoneNumber role assignedFacilityId')
      .populate('facilityId', 'name city address status')
      .populate('approverId', 'name email role');

    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findByIdIncludeDeleted(id: string) {
    return (
      this.approvalRequest as unknown as {
        findById: (id: string) => {
          setOptions: (opts: Record<string, unknown>) => {
            populate: (
              path: string,
              select: string
            ) => {
              populate: (
                path: string,
                select: string
              ) => {
                populate: (
                  path: string,
                  select: string
                ) => {
                  exec: () => Promise<IApprovalRequest | null>;
                };
              };
            };
          };
        };
      }
    )
      .findById(id)
      .setOptions({ includeDeleted: true })
      .populate('requesterId', 'name email phoneNumber role assignedFacilityId')
      .populate('facilityId', 'name city address status')
      .populate('approverId', 'name email role')
      .exec();
  }

  async updateById(
    id: string,
    data: Partial<IApprovalRequest>,
    session?: ClientSession
  ) {
    return this.approvalRequest.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', session }
    );
  }

  async findAll(
    query?: Partial<ApprovalRequestQuery> & {
      facilityId?: string;
      requesterId?: string;
    }
  ) {
    const filter: FilterQuery<IApprovalRequest> = {};

    if (query?.facilityId) {
      filter.facilityId = query.facilityId;
    }
    if (query?.requesterId) {
      filter.requesterId = query.requesterId;
    }
    if (query?.targetType) {
      filter.targetType = query.targetType;
    }
    if (query?.status) {
      filter.status = query.status;
    }

    const sortBy = query?.sortBy || 'createdAt';
    const sortOrder = query?.sortOrder || 'desc';

    return paginate<IApprovalRequest>(this.approvalRequest, {
      page: query?.page,
      limit: query?.limit,
      sortBy,
      sortOrder,
      filter,
      populate: [
        {
          path: 'requesterId',
          select: 'name email phoneNumber role assignedFacilityId',
        },
        { path: 'facilityId', select: 'name city address status' },
        { path: 'approverId', select: 'name email role' },
      ],
    });
  }

  async softDeleteById(
    id: string,
    deletedBy?: string,
    session?: ClientSession
  ): Promise<void> {
    const doc = await this.approvalRequest
      .findById(id)
      .session(session || null);
    if (!doc) return;
    await (
      doc as unknown as {
        delete: (by?: string, cb?: () => void) => Promise<unknown>;
      }
    ).delete(deletedBy);
  }
}
