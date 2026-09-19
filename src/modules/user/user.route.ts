import { Router } from 'express';
import { userController } from './user.container.ts';

const userRouter = Router();

userRouter.route('/').get(userController.findAllUser);

export default userRouter;
