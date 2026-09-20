import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import type { AuthRepository } from './auth.repository.ts';
import type { UserRepository } from '../user/user.repository.ts';
import type { MailUtil } from '../../utils/mail.util.ts';
import type { JwtUtil } from '../../utils/jwt.util.ts';
import type {
  LoginRequest,
  RegisterRequest,
} from './schemas/auth.request.schema.ts';
import type { IUser } from '../user/user.model.ts';
import { AppError } from '../../common/errors/appError.error.ts';
import { MESSAGE_CODE } from '../../common/consts/messageCode.const.ts';
import {
  AuthProviderEnum,
  RoleEnum,
  UserStatusEnum,
} from '../../common/enums/user.enum.ts';
import { validateResponse } from '../../utils/validateReponse.util.ts';
import { authUserResponseSchema } from './schemas/auth.response.schema.ts';

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly userRepository: UserRepository,
    private readonly mailUtil: MailUtil,
    private readonly jwtUtil: JwtUtil
  ) {}

  async sendOtp(email: string): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser && existingUser.status !== UserStatusEnum.INACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105);
    }

    const otp = crypto.randomInt(100000, 999999).toString();

    await this.authRepository.deleteOtp(email);
    await this.authRepository.createOtp(email, otp);
    await this.mailUtil.sendOtpEmail(email, otp);
  }

  async register(data: RegisterRequest) {
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser && existingUser.status !== UserStatusEnum.INACTIVE) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_105);
    }

    const latestOtp = await this.authRepository.findLatestOtp(data.email);
    if (!latestOtp || latestOtp.otp !== data.otp) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.userRepository.createUser({
      email: data.email,
      name: data.name,
      password: hashedPassword,
      phoneNumber: data.phoneNumber,
      authProvider: AuthProviderEnum.LOCAL,
      role: RoleEnum.CUSTOMER,
      status: UserStatusEnum.ACTIVE,
      isEmailVerified: true,
    });

    await this.authRepository.deleteOtp(data.email);

    const tokens = this.jwtUtil.generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user: validateResponse(
        authUserResponseSchema,
        typeof user.toObject === 'function' ? user.toObject() : user
      ),
      tokens,
    };
  }

  async login(data: LoginRequest) {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    if (user.authProvider !== AuthProviderEnum.LOCAL) {
      throw new AppError(400, MESSAGE_CODE.MESSAGE_CODE_101);
    }

    if (!user.password) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      throw new AppError(401, MESSAGE_CODE.MESSAGE_CODE_102);
    }

    if (user.status === UserStatusEnum.BANNED) {
      throw new AppError(403, MESSAGE_CODE.MESSAGE_CODE_103);
    }

    const tokens = this.jwtUtil.generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user: validateResponse(
        authUserResponseSchema,
        typeof user.toObject === 'function' ? user.toObject() : user
      ),
      tokens,
    };
  }

  handleGoogleLogin(user: IUser) {
    const tokens = this.jwtUtil.generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user: validateResponse(
        authUserResponseSchema,
        typeof user.toObject === 'function' ? user.toObject() : user
      ),
      tokens,
    };
  }
}
