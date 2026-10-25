import { Types, type ClientSession, type FilterQuery } from 'mongoose';
import type { SoftDeleteModel } from 'mongoose-delete';
import type { ICustomerSku } from './customerSku.model.ts';
import { paginate, type PaginateResult } from '../../utils/pagination.util.ts';
import type { CustomerSkuQuery } from './schemas/customerSku.request.schema.ts';
import { CustomerSkuStatusEnum } from '../../common/enums/customerSku.enum.ts';

const POPULATE_CUSTOMER = {
  path: 'customerId',
  select: 'name email phoneNumber role status',
};

export class CustomerSkuRepository {
  constructor(private readonly customerSku: SoftDeleteModel<ICustomerSku>) {}

  async create(
    data: Partial<ICustomerSku>,
    session?: ClientSession
  ): Promise<ICustomerSku> {
    const doc = new this.customerSku(data);
    return doc.save({ session });
  }

  async findAll(
    query: CustomerSkuQuery = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    enforcedCustomerId?: string
  ): Promise<PaginateResult<ICustomerSku>> {
    const filter: FilterQuery<ICustomerSku> = {};

    // Nếu enforcedCustomerId được truyền vào (ví dụ caller là CUSTOMER), chỉ lấy của customer đó
    if (enforcedCustomerId) {
      filter.customerId = new Types.ObjectId(enforcedCustomerId);
    } else if (query.customerId) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }

    if (query.status) {
      filter.status = query.status as CustomerSkuStatusEnum;
    }

    if (query.category) {
      filter.category = { $regex: query.category, $options: 'i' };
    }

    // Search keyword tìm trên name, skuCode hoặc barcode
    if (query.search) {
      const searchRegex = { $regex: query.search.trim(), $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { skuCode: searchRegex },
        { barcode: searchRegex },
      ];
    } else {
      if (query.skuCode) {
        filter.skuCode = { $regex: query.skuCode.trim(), $options: 'i' };
      }
      if (query.barcode) {
        filter.barcode = { $regex: query.barcode.trim(), $options: 'i' };
      }
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return paginate<ICustomerSku>(this.customerSku, {
      page: query.page,
      limit: query.limit,
      sortBy,
      sortOrder,
      filter,
      populate: [POPULATE_CUSTOMER],
    });
  }

  async findById(id: string, includeDeleted = false) {
    if (!Types.ObjectId.isValid(id)) return null;

    if (includeDeleted) {
      return (
        this.customerSku as unknown as {
          findWithDeleted: (filter: unknown) => {
            populate: (pop: unknown) => Promise<ICustomerSku[]>;
          };
        }
      )
        .findWithDeleted({ _id: new Types.ObjectId(id) })
        .populate(POPULATE_CUSTOMER)
        .then((docs) => docs?.[0] ?? null);
    }

    return this.customerSku
      .findById(new Types.ObjectId(id))
      .populate(POPULATE_CUSTOMER);
  }

  async findBySkuCode(
    customerId: string,
    skuCode: string,
    includeDeleted = false
  ) {
    if (!Types.ObjectId.isValid(customerId)) return null;

    const filter = {
      customerId: new Types.ObjectId(customerId),
      skuCode: skuCode.trim().toUpperCase(),
    };

    if (includeDeleted) {
      return (
        this.customerSku as unknown as {
          findWithDeleted: (filter: unknown) => Promise<ICustomerSku[]>;
        }
      )
        .findWithDeleted(filter)
        .then((docs) => docs?.[0] ?? null);
    }

    return this.customerSku.findOne(filter);
  }

  async findByBarcode(
    customerId: string | undefined,
    barcode: string,
    includeDeleted = false
  ) {
    const filter: Record<string, unknown> = {
      barcode: barcode.trim(),
    };

    if (customerId && Types.ObjectId.isValid(customerId)) {
      filter.customerId = new Types.ObjectId(customerId);
    }

    if (includeDeleted) {
      return (
        this.customerSku as unknown as {
          findWithDeleted: (filter: unknown) => Promise<ICustomerSku[]>;
        }
      )
        .findWithDeleted(filter)
        .then((docs) => docs?.[0] ?? null);
    }

    return this.customerSku.findOne(filter);
  }

  async update(
    id: string,
    data: Partial<ICustomerSku>,
    session?: ClientSession
  ) {
    return this.customerSku
      .findByIdAndUpdate(new Types.ObjectId(id), data, {
        returnDocument: 'after',
        session,
      })
      .populate(POPULATE_CUSTOMER);
  }

  async softDelete(id: string, deletedBy?: string, session?: ClientSession) {
    const doc = await this.customerSku.findById(new Types.ObjectId(id));
    if (!doc) return null;

    if (session) {
      doc.$session(session);
    }

    const deleteFn = (
      doc as unknown as { delete: (by?: string) => Promise<ICustomerSku> }
    ).delete;
    return deleteFn.call(doc, deletedBy);
  }

  async restore(id: string, session?: ClientSession) {
    const rawModel = this.customerSku as unknown as {
      restore: (
        filter: unknown,
        options?: { session?: ClientSession }
      ) => Promise<unknown>;
    };
    await rawModel.restore({ _id: new Types.ObjectId(id) }, { session });
    return this.findById(id);
  }

  async countByCustomerId(
    customerId: string,
    session?: ClientSession
  ): Promise<number> {
    if (!Types.ObjectId.isValid(customerId)) return 0;
    const query = this.customerSku.countDocuments({
      customerId: new Types.ObjectId(customerId),
      deleted: { $ne: true },
    });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }
}
