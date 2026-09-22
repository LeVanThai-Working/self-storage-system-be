import type { FilterQuery, Model, PopulateOptions, SortOrder } from 'mongoose';
import type { PaginationMeta } from '../common/types/pagination.type.ts';
import type { PaginationQuery } from '../common/schemas/pagination.schema.ts';

export interface PaginateOptions<T = unknown> extends Partial<PaginationQuery> {
  filter?: FilterQuery<T>;
  select?: string | Record<string, number>;
  populate?: string | PopulateOptions | (string | PopulateOptions)[];
}

export interface PaginateResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export async function paginate<T>(
  model: Model<T>,
  options: PaginateOptions<T> = {}
): Promise<PaginateResult<T>> {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 10));
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || 'createdAt';
  const sortOrder: SortOrder = options.sortOrder === 'asc' ? 1 : -1;
  const filter = (options.filter || {}) as FilterQuery<T>;

  let query = model
    .find(filter)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);

  if (options.select) {
    query = query.select(options.select);
  }

  if (options.populate) {
    query = query.populate(options.populate as unknown as string);
  }

  const [totalItems, items] = await Promise.all([
    model.countDocuments(filter),
    query.exec(),
  ]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    items: items as T[],
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
