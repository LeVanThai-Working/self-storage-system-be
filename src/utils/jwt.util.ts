import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  role: string;
  email: string;
  [key: string]: unknown;
}

export interface RefreshTokenPayload extends TokenPayload {
  familyId: string;
}

export interface GeneratedTokens {
  accessToken: string;
  refreshToken: string;
  familyId: string;
}

export class JwtUtil {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor() {
    this.accessSecret = process.env.JWT_ACCESS_SECRET!;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET!;

    if (!this.accessSecret || !this.refreshSecret) {
      throw new Error('JWT secrets are not configured');
    }
  }

  generateTokens(payload: TokenPayload, familyId?: string): GeneratedTokens {
    const tokenFamilyId = familyId || crypto.randomUUID();

    const accessToken = jwt.sign(payload, this.accessSecret, {
      expiresIn:
        (process.env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn']) ||
        '15m',
    });

    const refreshPayload: RefreshTokenPayload = {
      ...payload,
      familyId: tokenFamilyId,
      jti: crypto.randomUUID(),
    };

    const refreshToken = jwt.sign(refreshPayload, this.refreshSecret, {
      expiresIn:
        (process.env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn']) ||
        '7d',
    });

    return {
      accessToken,
      refreshToken,
      familyId: tokenFamilyId,
    };
  }

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.accessSecret) as TokenPayload;
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, this.refreshSecret) as RefreshTokenPayload;
  }
}
