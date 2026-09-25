import { AuthRepository } from './auth.repository.ts';
import { AuthService } from './auth.service.ts';
import { AuthController } from './auth.controller.ts';
import { Otp } from './otp.model.ts';
import { User } from '../user/user.model.ts';
import { UserRepository } from '../user/user.repository.ts';
import { MailUtil } from '../../utils/mail.util.ts';
import { JwtUtil } from '../../utils/jwt.util.ts';
import { redis } from '../../config/redis.config.ts';
import { AuthRedisService } from './auth.redis.service.ts';
import { profileRepository } from '../profile/profile.container.ts';

const authRepository = new AuthRepository(Otp);
const userRepository = new UserRepository(User);
const mailUtil = new MailUtil();
export const jwtUtil = new JwtUtil();
export const authRedisService = new AuthRedisService(redis);

const authService = new AuthService(
  authRepository,
  userRepository,
  profileRepository,
  mailUtil,
  jwtUtil,
  authRedisService
);

export const authController = new AuthController(authService);
