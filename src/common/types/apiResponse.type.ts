export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  messageCode: string;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  messageCode: string;
  message: string;
  errors?: unknown;
  path: string;
  timestamp: string;
  stack?: string;
}
