import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import { RegisterRoutes } from '../src/routes/routes.ts';
import { errorMiddleware } from '../src/middlewares/error.middleware.ts';
import { contractService } from '../src/modules/contract/contract.container.ts';
import { MESSAGE_CODE } from '../src/common/consts/messageCode.const.ts';
import { setupTestDB, teardownTestDB } from './helpers/db.helper.ts';

describe('T0.6: Endpoint Deprecation & Conflict Resolution', () => {
  let app: Express;

  beforeAll(async () => {
    await setupTestDB();
    app = express();
    app.use(express.json());
    RegisterRoutes(app);
    app.use(errorMiddleware);
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  describe('Direct Contract Renewal Deprecation (POST /contracts/:id/renew)', () => {
    it('should throw AppError 400 with MESSAGE_CODE_416 when calling contractService.renewContract directly', async () => {
      const dummyId = new Types.ObjectId().toString();
      const dummyUserId = new Types.ObjectId().toString();

      await expect(
        contractService.renewContract(dummyId, dummyUserId, {
          newEndDate: '2027-01-01',
          note: 'Trying direct renew',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        messageCode: MESSAGE_CODE.MESSAGE_CODE_416,
      });
    });

    it('should return 400 Bad Request with MESSAGE_CODE_416 when calling POST /contracts/:id/renew endpoint', async () => {
      const dummyId = new Types.ObjectId().toString();
      const dummyUserId = new Types.ObjectId().toString();

      const res = await request(app)
        .post(`/contracts/${dummyId}/renew`)
        .set('x-user-id', dummyUserId)
        .set('x-user-role', 'facility_manager')
        .send({
          newEndDate: '2027-01-01',
          note: 'Direct renew attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.messageCode).toBe(MESSAGE_CODE.MESSAGE_CODE_416);
    });
  });
});
