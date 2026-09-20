import { Router } from 'express';
import passport from 'passport';
import { authController } from './auth.container.ts';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import { authMiddleware } from '../../middlewares/auth.middleware.ts';
import {
  loginSchema,
  registerSchema,
  sendOtpSchema,
} from './schemas/auth.request.schema.ts';

const authRouter = Router();

authRouter.post(
  '/send-otp',
  validateRequest({ body: sendOtpSchema }),
  authController.sendOtp
);

authRouter.post(
  '/register',
  validateRequest({ body: registerSchema }),
  authController.register
);

authRouter.post(
  '/login',
  validateRequest({ body: loginSchema }),
  authController.login
);

authRouter.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

authRouter.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/auth/login',
  }),
  authController.googleCallback
);

authRouter.post('/logout', authController.logout);

authRouter.get('/me', authMiddleware, authController.getMe);

export default authRouter;
