import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Job } from 'bullmq';
import {
  BillingQueue,
  BILLING_QUEUE_NAME,
  BILLING_JOB,
} from '../src/modules/billing/billing.queue.ts';
import {
  processBillingJob,
  initBillingWorker,
  closeBillingWorker,
} from '../src/modules/billing/billing.worker.ts';
import { invoiceService } from '../src/modules/invoice/invoice.container.ts';

describe('billing/T2.1: Billing Queue & Worker Infrastructure', () => {
  let mockQueueInstance: {
    upsertJobScheduler: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockQueueInstance = {
      upsertJobScheduler: vi.fn().mockResolvedValue({}),
      add: vi.fn().mockResolvedValue({ id: 'job-123' }),
      close: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
    };
  });

  afterEach(async () => {
    await closeBillingWorker();
  });

  describe('1. BillingQueue Configuration & Schedulers', () => {
    it('should have correct queue name and job constants', () => {
      expect(BILLING_QUEUE_NAME).toBe('billing-queue');
      expect(BILLING_JOB.GENERATE_RECURRING_INVOICES).toBe(
        'generate_recurring_invoices'
      );
      expect(BILLING_JOB.SCAN_OVERDUE_INVOICES).toBe('scan_overdue_invoices');
      expect(BILLING_JOB.REMIND_INVOICE_PAYMENT).toBe('remind_invoice_payment');
    });

    it('should register repeatable recurring invoice generation job at 01:00 AM VN', async () => {
      const queue = new BillingQueue();
      // Inject mock queue internally for deterministic test
      (queue as unknown as { queue: typeof mockQueueInstance }).queue =
        mockQueueInstance;

      await queue.setupRecurringInvoiceRepeatableJob();

      expect(mockQueueInstance.upsertJobScheduler).toHaveBeenCalledWith(
        'repeatable-generate-recurring-invoices',
        { pattern: '0 1 * * *' },
        expect.objectContaining({
          name: BILLING_JOB.GENERATE_RECURRING_INVOICES,
        })
      );
    });

    it('should register repeatable overdue invoice scan job at 02:00 AM VN', async () => {
      const queue = new BillingQueue();
      (queue as unknown as { queue: typeof mockQueueInstance }).queue =
        mockQueueInstance;

      await queue.setupOverdueScanRepeatableJob();

      expect(mockQueueInstance.upsertJobScheduler).toHaveBeenCalledWith(
        'repeatable-scan-overdue-invoices',
        { pattern: '0 2 * * *' },
        expect.objectContaining({
          name: BILLING_JOB.SCAN_OVERDUE_INVOICES,
        })
      );
    });

    it('should register repeatable payment reminder job at 08:00 AM VN', async () => {
      const queue = new BillingQueue();
      (queue as unknown as { queue: typeof mockQueueInstance }).queue =
        mockQueueInstance;

      await queue.setupPaymentReminderRepeatableJob();

      expect(mockQueueInstance.upsertJobScheduler).toHaveBeenCalledWith(
        'repeatable-remind-invoice-payment',
        { pattern: '0 8 * * *' },
        expect.objectContaining({
          name: BILLING_JOB.REMIND_INVOICE_PAYMENT,
        })
      );
    });

    it('should support manual enqueueing of recurring, overdue, and reminder jobs', async () => {
      const queue = new BillingQueue();
      (queue as unknown as { queue: typeof mockQueueInstance }).queue =
        mockQueueInstance;

      const job1 = await queue.addGenerateRecurringInvoicesJob();
      expect(mockQueueInstance.add).toHaveBeenCalledWith(
        BILLING_JOB.GENERATE_RECURRING_INVOICES,
        expect.any(Object)
      );
      expect(job1).toBeDefined();

      const job2 = await queue.addScanOverdueInvoicesJob();
      expect(mockQueueInstance.add).toHaveBeenCalledWith(
        BILLING_JOB.SCAN_OVERDUE_INVOICES,
        expect.any(Object)
      );
      expect(job2).toBeDefined();

      const job3 = await queue.addRemindInvoicePaymentJob();
      expect(mockQueueInstance.add).toHaveBeenCalledWith(
        BILLING_JOB.REMIND_INVOICE_PAYMENT,
        expect.any(Object)
      );
      expect(job3).toBeDefined();
    });
  });

  describe('2. BillingWorker Job Processing & Fault Isolation', () => {
    it('should successfully process GENERATE_RECURRING_INVOICES job', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const scanSpy = vi
        .spyOn(invoiceService, 'processRecurringInvoicesScan')
        .mockResolvedValue({
          scannedCount: 2,
          generatedCount: 1,
          skippedCount: 1,
          failedCount: 0,
        });

      const mockJob = {
        id: 'job-recur-1',
        name: BILLING_JOB.GENERATE_RECURRING_INVOICES,
        data: { triggeredAt: new Date().toISOString() },
      } as unknown as Job;

      await expect(processBillingJob(mockJob)).resolves.not.toThrow();

      expect(scanSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BillingWorker] Job job-recur-1')
      );
      scanSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should successfully process SCAN_OVERDUE_INVOICES job', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const scanSpy = vi
        .spyOn(invoiceService, 'processOverdueInvoicesScan')
        .mockResolvedValue({
          scannedCount: 2,
          markedOverdueCount: 1,
          contractsLockedCount: 1,
          skippedCount: 1,
          failedCount: 0,
        });

      const mockJob = {
        id: 'job-overdue-1',
        name: BILLING_JOB.SCAN_OVERDUE_INVOICES,
        data: { triggeredAt: new Date().toISOString() },
      } as unknown as Job;

      await expect(processBillingJob(mockJob)).resolves.not.toThrow();

      expect(scanSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BillingWorker] Job job-overdue-1')
      );
      scanSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should successfully process REMIND_INVOICE_PAYMENT job', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const scanSpy = vi
        .spyOn(invoiceService, 'processPaymentRemindersScan')
        .mockResolvedValue({
          scannedCount: 3,
          remindedT3Count: 1,
          remindedT1Count: 1,
          remindedT0Count: 1,
          totalRemindedCount: 3,
          skippedCount: 0,
          failedCount: 0,
        });

      const mockJob = {
        id: 'job-remind-1',
        name: BILLING_JOB.REMIND_INVOICE_PAYMENT,
        data: { triggeredAt: new Date().toISOString() },
      } as unknown as Job;

      await expect(processBillingJob(mockJob)).resolves.not.toThrow();

      expect(scanSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BillingWorker] Job job-remind-1')
      );
      scanSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should handle unknown job gracefully with a warning', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockJob = {
        id: 'job-unknown-1',
        name: 'UNKNOWN_BILLING_JOB',
        data: {},
      } as unknown as Job;

      await expect(processBillingJob(mockJob)).resolves.not.toThrow();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BillingWorker] Unknown job name')
      );
      warnSpy.mockRestore();
    });
  });

  describe('3. BillingWorker Lifecycle', () => {
    it('should initialize and return worker singleton', async () => {
      const worker = await initBillingWorker();
      expect(worker).toBeDefined();

      // Second call returns same instance
      const sameWorker = await initBillingWorker();
      expect(sameWorker).toBe(worker);

      await closeBillingWorker();
    });
  });
});
