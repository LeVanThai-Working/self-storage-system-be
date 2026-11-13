import {
  Body,
  Controller,
  Get,
  Middlewares,
  Patch,
  Request,
  Route,
  Tags,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middlewares/auth.middleware.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import type { IUser } from '../user/user.model.ts';
import type { ApiResponse } from '../../common/types/apiResponse.type.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { formatMessage } from '../../utils/format.util.ts';
import { SystemSettingsService } from './systemSettings.service.ts';

@Route('system-settings')
@Tags('System Settings')
@Middlewares(authMiddleware)
export class SystemSettingsController extends Controller {
  private readonly service = new SystemSettingsService();

  @Get('check-in-time-validation')
  async getCheckInTimeValidation(
    @Request() req: ExpressRequest
  ): Promise<ApiResponse<{ enabled: boolean }>> {
    const user = req.user as IUser;
    return this.respond(await this.service.getCheckInTimeValidation(user.role));
  }

  @Patch('check-in-time-validation')
  @Middlewares(validateRequest({ body: z.object({ enabled: z.boolean() }) }))
  async setCheckInTimeValidation(
    @Request() req: ExpressRequest,
    @Body() body: { enabled: boolean }
  ): Promise<ApiResponse<{ enabled: boolean }>> {
    const user = req.user as IUser;
    return this.respond(
      await this.service.setCheckInTimeValidation(body.enabled, {
        id: String(user._id),
        role: user.role,
      })
    );
  }

  private respond(data: {
    enabled: boolean;
  }): ApiResponse<{ enabled: boolean }> {
    return {
      success: true,
      statusCode: 200,
      messageCode: MESSAGE_CODE.MESSAGE_CODE_001,
      message: formatMessage(MESSAGE_CODE.MESSAGE_CODE_001),
      data,
    };
  }
}
