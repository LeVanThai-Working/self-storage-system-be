import {
  Controller,
  Route,
  Tags,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Queries,
  Path,
  SuccessResponse,
  Response,
  Security,
  Middlewares,
  Request,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { UserService } from './user.service.ts';
import type { IUser } from './user.model.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  userQuerySchema,
  type CreateUserRequest,
  type UpdateUserRequest,
  type UserQuery,
} from './schemas/user.request.schema.ts';
import type { UserResponse } from './schemas/user.response.schema.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';
import type { PaginatedData } from '../../common/types/pagination.type.ts';

@Tags('Users')
@Route('users')
export class UserController extends Controller {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Get('')
  @Middlewares(validateRequest({ query: userQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid query parameters')
  public async findAllUser(
    @Queries() query: UserQuery
  ): Promise<ApiResponse<PaginatedData<UserResponse>>> {
    const { items, pagination } = await this.userService.findAllUser(query);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: {
        items,
        pagination,
      },
    };
  }

  @Get('search')
  @Middlewares(validateRequest({ query: userQuerySchema }))
  @Response<ApiErrorResponse>(400, 'Invalid query parameters')
  public async searchUser(
    @Queries() query: UserQuery
  ): Promise<ApiResponse<PaginatedData<UserResponse>>> {
    return this.findAllUser(query);
  }

  @Get('{id}')
  @Middlewares(validateRequest({ params: userIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid ID format')
  @Response<ApiErrorResponse>(404, 'User not found')
  public async findUserById(
    @Path() id: string
  ): Promise<ApiResponse<UserResponse>> {
    const user = await this.userService.findUserById(id);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data: user,
    };
  }

  @Post('')
  @Middlewares(validateRequest({ body: createUserSchema }))
  @SuccessResponse(201, 'User created successfully')
  @Response<ApiErrorResponse>(400, 'Validation error or email already exists')
  public async createUser(
    @Body() body: CreateUserRequest
  ): Promise<ApiResponse<UserResponse>> {
    const user = await this.userService.createUser(body);
    this.setStatus(201);

    return {
      success: true,
      statusCode: 201,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_002,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_002, ['User']),
      data: user,
    };
  }

  @Patch('{id}')
  @Middlewares(
    validateRequest({
      params: userIdParamSchema,
      body: updateUserSchema,
    })
  )
  @Response<ApiErrorResponse>(400, 'Validation error or invalid ID')
  @Response<ApiErrorResponse>(404, 'User not found')
  public async updateUser(
    @Path() id: string,
    @Body() body: UpdateUserRequest
  ): Promise<ApiResponse<UserResponse>> {
    const user = await this.userService.updateUser(id, body);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_003,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_003, ['User']),
      data: user,
    };
  }

  @Delete('{id}')
  @Security('bearerAuth')
  @Security('cookieAuth')
  @Middlewares(validateRequest({ params: userIdParamSchema }))
  @Response<ApiErrorResponse>(400, 'Invalid ID format')
  @Response<ApiErrorResponse>(404, 'User not found')
  public async deleteUser(
    @Path() id: string,
    @Request() req?: ExpressRequest
  ): Promise<ApiResponse<null>> {
    const deletedBy = (req?.user as IUser)?._id?.toString?.();
    await this.userService.deleteUser(id, deletedBy);

    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_004,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_004),
      data: null,
    };
  }
}
