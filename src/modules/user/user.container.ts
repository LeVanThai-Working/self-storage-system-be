import { UserController } from './user.controller.ts';
import { User } from './user.model.ts';
import { UserRepository } from './user.repository.ts';
import { UserService } from './user.service.ts';
import { authRedisService } from '../auth/auth.container.ts';
import { profileRepository } from '../profile/profile.container.ts';
import { auditLogService } from '../auditLog/auditLog.container.ts';

export const userRepository = new UserRepository(User);

export const userService = new UserService(
  userRepository,
  authRedisService,
  profileRepository,
  auditLogService
);

export const userController = new UserController(userService);
