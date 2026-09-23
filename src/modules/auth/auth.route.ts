import { Router } from 'express';
import passport from 'passport';
import { authController } from './auth.container.ts';

const authRouter = Router();

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

export default authRouter;
