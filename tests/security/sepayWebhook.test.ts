import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { RegisterRoutes } from '../../src/routes/routes.ts';
import { errorMiddleware } from '../../src/middlewares/error.middleware.ts';
import { sepayService } from '../../src/modules/payment/payment.container.ts';
import { MESSAGE_CODE } from '../../src/common/consts/messageCode.const.ts';
import { setupTestDB, teardownTestDB } from '../helpers/db.helper.ts';

describe('Security: SePay Webhook Authentication Verification (T0.4)', () => {
  let app: Express;
  const validApiKey =
    process.env.SEPAY_WEBHOOK_API_KEY || 'test_sepay_api_key_123456';

  beforeAll(async () => {
    await setupTestDB();
    process.env.SEPAY_WEBHOOK_API_KEY = validApiKey;
    app = express();
    app.use(express.json());
    RegisterRoutes(app);
    app.use(errorMiddleware);
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  describe('SepayService.verifyWebhookApiKey() Unit Verification', () => {
    it('should reject missing or empty authorization headers', () => {
      expect(sepayService.verifyWebhookApiKey(undefined)).toBe(false);
      expect(sepayService.verifyWebhookApiKey(null)).toBe(false);
      expect(sepayService.verifyWebhookApiKey('')).toBe(false);
      expect(sepayService.verifyWebhookApiKey('   ')).toBe(false);
    });

    it('should reject wrong or mismatched API keys', () => {
      expect(sepayService.verifyWebhookApiKey('Apikey WRONG_KEY')).toBe(false);
      expect(sepayService.verifyWebhookApiKey('Bearer DIFFERENT_KEY')).toBe(
        false
      );
      expect(sepayService.verifyWebhookApiKey('WRONG_KEY')).toBe(false);
      // Different length
      expect(
        sepayService.verifyWebhookApiKey('Apikey ' + validApiKey + '_extra')
      ).toBe(false);
      // Same length, different character
      const tamperedKey =
        validApiKey.slice(0, -1) + (validApiKey.slice(-1) === 'A' ? 'B' : 'A');
      expect(sepayService.verifyWebhookApiKey(`Apikey ${tamperedKey}`)).toBe(
        false
      );
    });

    it('should accept valid API key with Apikey prefix, Bearer prefix, or raw token', () => {
      expect(sepayService.verifyWebhookApiKey(`Apikey ${validApiKey}`)).toBe(
        true
      );
      expect(sepayService.verifyWebhookApiKey(`Bearer ${validApiKey}`)).toBe(
        true
      );
      expect(sepayService.verifyWebhookApiKey(validApiKey)).toBe(true);
    });
  });

  describe('POST /payments/sepay/webhook HTTP Boundary Verification', () => {
    const validPayload = {
      id: 999999991,
      gateway: 'Vietcombank',
      transactionDate: '2026-10-22 10:00:00',
      accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '0123456789',
      code: 'SSM_INVALID_CODE_TEST',
      content: 'Chuyen tien khong hop le',
      transferType: 'in',
      transferAmount: 500000,
    };

    it('should reject request without any authentication header with 401 MESSAGE_CODE_503', async () => {
      const res = await request(app)
        .post('/payments/sepay/webhook')
        .send(validPayload);

      expect(res.status).toBe(401);
      expect(res.body.messageCode).toBe(MESSAGE_CODE.MESSAGE_CODE_503);
    });

    it('should reject request with an invalid API key with 401 MESSAGE_CODE_503', async () => {
      const res = await request(app)
        .post('/payments/sepay/webhook')
        .set('Authorization', 'Apikey INVALID_SEPAY_KEY')
        .send(validPayload);

      expect(res.status).toBe(401);
      expect(res.body.messageCode).toBe(MESSAGE_CODE.MESSAGE_CODE_503);
    });

    it('should reject request with invalid x-api-key header with 401 MESSAGE_CODE_503', async () => {
      const res = await request(app)
        .post('/payments/sepay/webhook')
        .set('x-api-key', 'INVALID_KEY')
        .send(validPayload);

      expect(res.status).toBe(401);
      expect(res.body.messageCode).toBe(MESSAGE_CODE.MESSAGE_CODE_503);
    });

    it('should accept request with valid Authorization header and process it', async () => {
      const res = await request(app)
        .post('/payments/sepay/webhook')
        .set('Authorization', `Apikey ${validApiKey}`)
        .send(validPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should accept request with valid x-api-key header and process it', async () => {
      const res = await request(app)
        .post('/payments/sepay/webhook')
        .set('x-api-key', validApiKey)
        .send(validPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
