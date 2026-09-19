import type { UserRepository } from './user.repository.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import { userListResponseSchema } from './schemas/user.response.schema.ts';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findAllUser() {
    try {
      const users = await this.userRepository.findAllUser();
      return validateResponse(userListResponseSchema, users);
    } catch (error) {
      console.error('Error in findAllUser:', error);
      throw new AppError(500, MESSAGE_CODE.MESSAGE_CODE_106);
    }
  }
}
