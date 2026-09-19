// container.ts

import { UserController } from './user.controller.ts';
import { User } from './user.model.ts';
import { UserRepository } from './user.repository.ts';
import { UserService } from './user.service.ts';

const userRepository = new UserRepository(User);

const userService = new UserService(userRepository);

export const userController = new UserController(userService);
