import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  role: string;
  email: string;
  [key: string]: unknown;
}

interface GeneratedTokens {
  accessToken: string;
  refreshToken: string;
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

  generateTokens(payload: TokenPayload): GeneratedTokens {
    const accessToken = jwt.sign(payload, this.accessSecret, {
      expiresIn: '15m',
    });

    const refreshToken = jwt.sign(payload, this.refreshSecret, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.accessSecret) as TokenPayload;
  }

  verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, this.refreshSecret) as TokenPayload;
  }
}
