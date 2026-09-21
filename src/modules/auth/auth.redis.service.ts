import crypto from 'node:crypto';
import type { Redis } from 'ioredis';

export interface RefreshTokenRecord {
  userId: string;
  familyId: string;
  isRotated: boolean;
  replacedBy?: {
    accessToken: string;
    refreshToken: string;
  };
  createdAt: number;
}

export class AuthRedisService {
  private readonly defaultTtl: number = 7 * 24 * 60 * 60; // 7 days in seconds
  private readonly defaultGracePeriod: number = 30; // 30 seconds

  constructor(private readonly redis: Redis) {}

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async saveRefreshToken(
    userId: string,
    familyId: string,
    token: string,
    ttl: number = this.defaultTtl
  ): Promise<void> {
    const tokenHash = this.hashToken(token);
    const record: RefreshTokenRecord = {
      userId,
      familyId,
      isRotated: false,
      createdAt: Date.now(),
    };

    const pipeline = this.redis.pipeline();
    pipeline.set(`rt:${tokenHash}`, JSON.stringify(record), 'EX', ttl);
    pipeline.sadd(`family:${familyId}`, tokenHash);
    pipeline.expire(`family:${familyId}`, ttl);
    pipeline.sadd(`user_families:${userId}`, familyId);
    pipeline.expire(`user_families:${userId}`, ttl);

    await pipeline.exec();
  }

  async getTokenRecord(token: string): Promise<RefreshTokenRecord | null> {
    const tokenHash = this.hashToken(token);
    const data = await this.redis.get(`rt:${tokenHash}`);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as RefreshTokenRecord;
  }

  async rotateToken(
    oldToken: string,
    newTokens: { accessToken: string; refreshToken: string },
    userId: string,
    familyId: string,
    gracePeriod: number = this.defaultGracePeriod,
    ttl: number = this.defaultTtl
  ): Promise<void> {
    const oldHash = this.hashToken(oldToken);
    const newHash = this.hashToken(newTokens.refreshToken);

    const oldRecord: RefreshTokenRecord = {
      userId,
      familyId,
      isRotated: true,
      replacedBy: newTokens,
      createdAt: Date.now(),
    };

    const newRecord: RefreshTokenRecord = {
      userId,
      familyId,
      isRotated: false,
      createdAt: Date.now(),
    };

    const pipeline = this.redis.pipeline();
    pipeline.set(`rt:${oldHash}`, JSON.stringify(oldRecord), 'EX', gracePeriod);
    pipeline.set(`rt:${newHash}`, JSON.stringify(newRecord), 'EX', ttl);
    pipeline.sadd(`family:${familyId}`, newHash);
    pipeline.expire(`family:${familyId}`, ttl);
    pipeline.sadd(`user_families:${userId}`, familyId);
    pipeline.expire(`user_families:${userId}`, ttl);

    const results = await pipeline.exec();
    if (results) {
      for (const [err] of results) {
        if (err) {
          console.error('Rotate pipeline command error:', err);
        }
      }
    }
  }

  async revokeFamily(familyId: string): Promise<void> {
    const tokenHashes = await this.redis.smembers(`family:${familyId}`);
    const pipeline = this.redis.pipeline();

    if (tokenHashes.length > 0) {
      for (const tokenHash of tokenHashes) {
        pipeline.del(`rt:${tokenHash}`);
      }
    }

    pipeline.del(`family:${familyId}`);
    const results = await pipeline.exec();
    if (results) {
      for (const [err] of results) {
        if (err) {
          console.error('Pipeline command error:', err);
        }
      }
    }
  }

  async revokeAllUserFamilies(userId: string): Promise<void> {
    const families = await this.redis.smembers(`user_families:${userId}`);
    if (families.length > 0) {
      for (const familyId of families) {
        await this.revokeFamily(familyId);
      }
    }
    await this.redis.del(`user_families:${userId}`);
  }
}
