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

/**
 * @openapi
 * /auth/send-otp:
 *   post:
 *     summary: Send OTP code to email
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendOtpRequest'
 *     responses:
 *       200:
 *         description: OTP code sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccessMessageResponse'
 *       400:
 *         description: Email already registered or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
authRouter.post(
  '/send-otp',
  validateRequest({ body: sendOtpSchema }),
  authController.sendOtp
);

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new customer account with OTP
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthRegisterResponse'
 *       400:
 *         description: Invalid OTP, email already exists, or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
authRouter.post(
  '/register',
  validateRequest({ body: registerSchema }),
  authController.register
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthLoginResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       403:
 *         description: Account banned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
authRouter.post(
  '/login',
  validateRequest({ body: loginSchema }),
  authController.login
);

/**
 * @openapi
 * /auth/google:
 *   get:
 *     summary: Authenticate with Google OAuth2
 *     tags:
 *       - Auth
 *     responses:
 *       302:
 *         description: Redirects to Google login
 */
authRouter.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

/**
 * @openapi
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth2 callback
 *     tags:
 *       - Auth
 *     responses:
 *       302:
 *         description: Redirects to profile on success or login page on failure
 */
authRouter.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/auth/login',
  }),
  authController.googleCallback
);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh tokens using refresh token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Optional if refreshToken is provided in HttpOnly cookie
 *     responses:
 *       200:
 *         description: New tokens generated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokensResponse'
 *       401:
 *         description: Invalid or revoked refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
authRouter.post('/refresh', authController.refreshToken);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Log out user and invalidate refresh token
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccessMessageResponse'
 */
authRouter.post('/logout', authController.logout);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthMeResponse'
 *       401:
 *         description: Unauthorized or token expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
authRouter.get('/me', authMiddleware, authController.getMe);

export default authRouter;
