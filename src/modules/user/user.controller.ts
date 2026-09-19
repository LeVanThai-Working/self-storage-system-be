import type { Request, Response } from 'express';
import type { UserService } from './user.service.ts';
import { ResponseUtils } from '../../utils/response.util.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';

export class UserController {
  constructor(private readonly userService: UserService) {}
  findAllUser = async (req: Request, res: Response): Promise<void> => {
    const data = await this.userService.findAllUser();

    ResponseUtils.success(res, 200, MESSAGE_CODE.MESSAGE_CODE_001, data);
  };
}
