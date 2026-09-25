import type { IocContainer } from '@tsoa/runtime';
import { UserController } from './modules/user/user.controller.ts';
import { userController } from './modules/user/user.container.ts';
import { AuthController } from './modules/auth/auth.controller.ts';
import { authController } from './modules/auth/auth.container.ts';
import { ProfileController } from './modules/profile/profile.controller.ts';
import { profileController } from './modules/profile/profile.container.ts';

export const iocContainer: IocContainer = {
  get: <T>(controller: unknown): T => {
    if (controller === UserController) {
      return userController as unknown as T;
    }
    if (controller === AuthController) {
      return authController as unknown as T;
    }
    if (controller === ProfileController) {
      return profileController as unknown as T;
    }
    throw new Error(
      `Controller not found in iocContainer: ${String(controller)}`
    );
  },
};
