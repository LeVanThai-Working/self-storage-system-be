import 'dotenv/config';
import { vi } from 'vitest';

// Mock BullMQ across all tests so unit/integration tests do not require a live Redis instance
vi.mock('bullmq', () => {
  return {
    Queue: class MockQueue {
      name: string;
      constructor(name: string) {
        this.name = name;
      }
      on() {
        return this;
      }
      add = vi.fn().mockResolvedValue({ id: 'mock-job-id' });
      getJob = vi.fn().mockResolvedValue({
        id: 'mock-job-id',
        remove: vi.fn().mockResolvedValue(true),
      });
      upsertJobScheduler = vi.fn().mockResolvedValue(undefined);
      close = vi.fn().mockResolvedValue(undefined);
    },
    Worker: class MockWorker {
      name: string;
      constructor(name: string) {
        this.name = name;
      }
      on() {
        return this;
      }
      close = vi.fn().mockResolvedValue(undefined);
    },
  };
});

// Ensure required environment variables for test execution
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'test_jwt_access_secret_1234567890';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_1234567890';
process.env.COOKIE_SECRET =
  process.env.COOKIE_SECRET || 'test_cookie_secret_1234567890';
process.env.ALLOW_INSECURE_CALLER_FALLBACK = 'true';
process.env.ENABLE_DEMO_REFUND_SIMULATION =
  process.env.ENABLE_DEMO_REFUND_SIMULATION || 'true';

// SePay test configuration
process.env.SEPAY_WEBHOOK_API_KEY =
  process.env.SEPAY_WEBHOOK_API_KEY || 'test_sepay_api_key_123456';
process.env.SEPAY_BANK_CODE = process.env.SEPAY_BANK_CODE || 'VCB';
process.env.SEPAY_ACCOUNT_NUMBER =
  process.env.SEPAY_ACCOUNT_NUMBER || '0123456789';
process.env.SEPAY_ACCOUNT_NAME =
  process.env.SEPAY_ACCOUNT_NAME || 'TEST ACCOUNT';
process.env.SEPAY_PAYMENT_CODE_PREFIX =
  process.env.SEPAY_PAYMENT_CODE_PREFIX || 'SSM';
