import { z } from 'zod';
import { paginationQuerySchema } from '../common/schemas/pagination.schema.ts';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  userQuerySchema,
} from '../modules/user/schemas/user.request.schema.ts';
import {
  userListResponseSchema,
  userResponseSchema,
} from '../modules/user/schemas/user.response.schema.ts';
import {
  loginSchema,
  registerSchema,
  sendOtpSchema,
} from '../modules/auth/schemas/auth.request.schema.ts';
import { authUserResponseSchema } from '../modules/auth/schemas/auth.response.schema.ts';

/**
 * Common Schemas
 */
export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(1),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  statusCode: z.number(),
  message: z.string(),
  errors: z.unknown().optional(),
  path: z.string(),
  timestamp: z.string(),
});

export const apiSuccessMessageSchema = z.object({
  success: z.literal(true),
  statusCode: z.number().default(200),
  message: z.string(),
  data: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  familyId: z.string(),
});

/**
 * Helper to wrap any Zod data schema in standard ApiResponse format
 */
export function createApiResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.boolean().default(true),
    statusCode: z.number().default(200),
    message: z.string(),
    data: dataSchema,
  });
}

/**
 * Helper to wrap an item Zod schema in standard PaginatedData format
 */
export function createPaginatedResponseSchema<T extends z.ZodType>(
  itemSchema: T
) {
  return z.object({
    success: z.boolean().default(true),
    statusCode: z.number().default(200),
    message: z.string(),
    data: z.object({
      items: z.array(itemSchema),
      pagination: paginationMetaSchema,
    }),
  });
}

/**
 * Utility to convert Zod schema to OpenAPI 3.0 schema object using Zod 4's native toJSONSchema
 */
export function zodToOpenApiSchema(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    unrepresentable: 'any',
  }) as Record<string, unknown>;
}

/**
 * Registry of all OpenAPI Component Schemas generated from Zod schemas
 */
export const swaggerSchemas: Record<string, Record<string, unknown>> = {
  // Common Schemas
  PaginationQuery: zodToOpenApiSchema(paginationQuerySchema),
  PaginationMeta: zodToOpenApiSchema(paginationMetaSchema),
  ApiErrorResponse: zodToOpenApiSchema(apiErrorResponseSchema),
  ApiSuccessMessageResponse: zodToOpenApiSchema(apiSuccessMessageSchema),

  // Auth Schemas
  SendOtpRequest: zodToOpenApiSchema(sendOtpSchema),
  RegisterRequest: zodToOpenApiSchema(registerSchema),
  LoginRequest: zodToOpenApiSchema(loginSchema),
  AuthTokens: zodToOpenApiSchema(authTokensSchema),
  AuthUserResponse: zodToOpenApiSchema(authUserResponseSchema),
  AuthRegisterResponse: zodToOpenApiSchema(
    createApiResponseSchema(authUserResponseSchema)
  ),
  AuthLoginResponse: zodToOpenApiSchema(
    createApiResponseSchema(authUserResponseSchema)
  ),
  AuthTokensResponse: zodToOpenApiSchema(
    createApiResponseSchema(authTokensSchema)
  ),
  AuthMeResponse: zodToOpenApiSchema(
    createApiResponseSchema(authUserResponseSchema)
  ),

  // User Schemas
  CreateUserRequest: zodToOpenApiSchema(createUserSchema),
  UpdateUserRequest: zodToOpenApiSchema(updateUserSchema),
  UserIdParam: zodToOpenApiSchema(userIdParamSchema),
  UserQuery: zodToOpenApiSchema(userQuerySchema),
  UserResponse: zodToOpenApiSchema(userResponseSchema),
  UserListResponse: zodToOpenApiSchema(userListResponseSchema),
  UserSingleResponse: zodToOpenApiSchema(
    createApiResponseSchema(userResponseSchema)
  ),
  UserPaginatedResponse: zodToOpenApiSchema(
    createPaginatedResponseSchema(userResponseSchema)
  ),
};
