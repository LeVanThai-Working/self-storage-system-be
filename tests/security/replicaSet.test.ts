import { describe, it, expect, vi, afterEach } from 'vitest';
import mongoose from 'mongoose';
import {
  isMongoReplicaSet,
  assertMongoReplicaSetInProduction,
} from '../../src/config/connect.config.ts';
import { Transactional } from '../../src/common/decorators/transactional.decorator.ts';

describe('Production Safety: MongoDB Replica Set & Transaction Fallback (T0.4)', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalDb = mongoose.connection.db;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    (mongoose.connection as unknown as { db: unknown }).db = originalDb;
    vi.restoreAllMocks();
  });

  describe('assertMongoReplicaSetInProduction()', () => {
    it('should throw fatal error in production when MongoDB is standalone (not a replica set)', async () => {
      process.env.NODE_ENV = 'production';

      (mongoose.connection as unknown as { db: unknown }).db = {
        admin: () => ({
          command: async () => ({ isWritablePrimary: true }), // standalone: setName is undefined
        }),
      };

      await expect(assertMongoReplicaSetInProduction()).rejects.toThrow(
        'FATAL: MongoDB must be running in a replica set in production to ensure ACID transactions.'
      );
    });

    it('should pass in production when MongoDB is a replica set', async () => {
      process.env.NODE_ENV = 'production';

      (mongoose.connection as unknown as { db: unknown }).db = {
        admin: () => ({
          command: async () => ({ isWritablePrimary: true, setName: 'rs0' }),
        }),
      };

      await expect(
        assertMongoReplicaSetInProduction()
      ).resolves.toBeUndefined();
    });

    it('should not throw in development or test environment even if MongoDB is standalone', async () => {
      process.env.NODE_ENV = 'development';

      (mongoose.connection as unknown as { db: unknown }).db = {
        admin: () => ({
          command: async () => ({ isWritablePrimary: true }),
        }),
      };

      await expect(
        assertMongoReplicaSetInProduction()
      ).resolves.toBeUndefined();
    });
  });

  describe('isMongoReplicaSet()', () => {
    it('should return false if database connection is not established', async () => {
      (mongoose.connection as unknown as { db: unknown }).db = undefined;
      const result = await isMongoReplicaSet();
      expect(result).toBe(false);
    });

    it('should return true when hello returns setName', async () => {
      (mongoose.connection as unknown as { db: unknown }).db = {
        admin: () => ({
          command: async () => ({ isWritablePrimary: true, setName: 'rs0' }),
        }),
      };

      const result = await isMongoReplicaSet();
      expect(result).toBe(true);
    });

    it('should return false when hello does not return setName or hosts', async () => {
      (mongoose.connection as unknown as { db: unknown }).db = {
        admin: () => ({
          command: async () => ({ isWritablePrimary: true }),
        }),
      };

      const result = await isMongoReplicaSet();
      expect(result).toBe(false);
    });
  });

  describe('@Transactional() decorator fallback protection', () => {
    class DummyService {
      async executeMutation(failWithReplicaSetError: boolean) {
        if (failWithReplicaSetError) {
          throw new Error(
            'Transaction numbers are only allowed on a replica set member'
          );
        }
        return { success: true };
      }
    }

    // Apply Transactional decorator explicitly
    const descriptor = Object.getOwnPropertyDescriptor(
      DummyService.prototype,
      'executeMutation'
    )!;
    Transactional()(DummyService.prototype, 'executeMutation', descriptor);
    Object.defineProperty(
      DummyService.prototype,
      'executeMutation',
      descriptor
    );

    it('should NEVER fallback to non-transaction execution in production when replica set error occurs', async () => {
      process.env.NODE_ENV = 'production';

      const mockSession = {
        withTransaction: vi.fn().mockImplementation(async (cb) => {
          await cb();
        }),
        endSession: vi.fn().mockResolvedValue(undefined),
      };

      vi.spyOn(mongoose, 'startSession').mockResolvedValue(
        mockSession as unknown as mongoose.ClientSession
      );

      const service = new DummyService();

      await expect(service.executeMutation(true)).rejects.toThrow(
        'Transaction numbers are only allowed on a replica set member'
      );
    });

    it('should fallback to non-transaction execution in development when replica set error occurs', async () => {
      process.env.NODE_ENV = 'development';

      const mockSession = {
        withTransaction: vi.fn().mockImplementation(async () => {
          // Simulated replica set missing error inside withTransaction
          throw new Error(
            'Transaction numbers are only allowed on a replica set member'
          );
        }),
        endSession: vi.fn().mockResolvedValue(undefined),
      };

      vi.spyOn(mongoose, 'startSession').mockResolvedValue(
        mockSession as unknown as mongoose.ClientSession
      );

      const service = new DummyService();
      const result = await service.executeMutation(false);

      expect(result).toEqual({ success: true });
    });
  });
});
