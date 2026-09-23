import type { Response } from 'express';
import type {
  ApiErrorResponse,
  ApiResponse,
} from '../common/types/apiResponse.type.ts';
import type {
  PaginatedData,
  PaginationMeta,
} from '../common/types/pagination.type.ts';
import { formatMessage } from './format.util.ts';

export const ResponseUtils = {
  success<T>(
    res: Response,
    statusCode: number,
    messageCode: string,
    data: T,
    args: string[] = []
  ): Response<ApiResponse<T>> {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      messageCode,
      message: formatMessage(messageCode, args),
      data,
    });
  },

  paginated<T>(
    res: Response,
    statusCode: number,
    messageCode: string,
    items: T[],
    pagination: PaginationMeta,
    args: string[] = []
  ): Response<ApiResponse<PaginatedData<T>>> {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      messageCode,
      message: formatMessage(messageCode, args),
      data: {
        items,
        pagination,
      },
    });
  },

  error(
    res: Response,
    statusCode: number,
    messageCode: string,
    options: {
      path: string;
      errors?: unknown;
      stack?: string;
      args?: string[];
      message?: string;
    }
  ): Response<ApiErrorResponse> {
    const args = options.args || [];
    return res.status(statusCode).json({
      success: false,
      statusCode,
      messageCode,
      message: options.message || formatMessage(messageCode, args),
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
