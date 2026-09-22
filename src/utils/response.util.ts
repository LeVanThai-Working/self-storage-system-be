import type { Response } from 'express';
import type {
  ApiErrorResponse,
  ApiResponse,
} from '../common/types/apiResponse.type.ts';
import type {
  PaginatedData,
  PaginationMeta,
} from '../common/types/pagination.type.ts';

export const ResponseUtils = {
  success<T>(
    res: Response,
    statusCode: number,
    message: string,
    data: T
  ): Response<ApiResponse<T>> {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data,
    });
  },

  paginated<T>(
    res: Response,
    statusCode: number,
    message: string,
    items: T[],
    pagination: PaginationMeta
  ): Response<ApiResponse<PaginatedData<T>>> {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data: {
        items,
        pagination,
      },
    });
  },

  error(
    res: Response,
    statusCode: number,
    message: string,
    options: {
      path: string;
      errors?: unknown;
      stack?: string;
    }
  ): Response<ApiErrorResponse> {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      ...(options.errors ? { errors: options.errors } : {}),
      path: options.path,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && options.stack
        ? { stack: options.stack }
        : {}),
    });
  },

  noContent(res: Response) {
    return res.status(204).send();
  },
};
