import { Router } from 'express';
import { userController } from './user.container.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  userQuerySchema,
} from './schemas/user.request.schema.ts';

const userRouter = Router();

userRouter
  .route('/')
  .get(validateRequest({ query: userQuerySchema }), userController.findAllUser)
  .post(validateRequest({ body: createUserSchema }), userController.createUser);

userRouter
  .route('/search')
  .get(validateRequest({ query: userQuerySchema }), userController.searchUser);

userRouter
  .route('/:id')
  .get(
    validateRequest({ params: userIdParamSchema }),
    userController.findUserById
  )
  .patch(
    validateRequest({
      params: userIdParamSchema,
      body: updateUserSchema,
    }),
    userController.updateUser
  )
  .delete(
    validateRequest({ params: userIdParamSchema }),
    userController.deleteUser
  );

export default userRouter;
