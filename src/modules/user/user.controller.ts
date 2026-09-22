import type { Request, Response } from 'express';
import type { UserService } from './user.service.ts';
import type { IUser } from './user.model.ts';
import { ResponseUtils } from '../../utils/response.util.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import type { UserQuery } from './schemas/user.request.schema.ts';

export class UserController {
  constructor(private readonly userService: UserService) {}

  findAllUser = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as UserQuery;
    const { items, pagination } = await this.userService.findAllUser(query);

    ResponseUtils.paginated(
      res,
      200,
      MESSAGE_CODE.MESSAGE_CODE_001,
      items,
      pagination
    );
  };

  searchUser = async (req: Request, res: Response): Promise<void> => {
    return this.findAllUser(req, res);
  };

  findUserById = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.findUserById(req.params.id as string);
    ResponseUtils.success(res, 200, MESSAGE_CODE.MESSAGE_CODE_001, user);
  };

  createUser = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.createUser(req.body);
    ResponseUtils.success(res, 201, MESSAGE_CODE.MESSAGE_CODE_002, user);
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.updateUser(
      req.params.id as string,
      req.body
    );
    ResponseUtils.success(res, 200, MESSAGE_CODE.MESSAGE_CODE_003, user);
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    const deletedBy = (req.user as IUser)?._id?.toString?.();
    await this.userService.deleteUser(req.params.id as string, deletedBy);
    ResponseUtils.success(res, 200, MESSAGE_CODE.MESSAGE_CODE_004, null);
  };
}
