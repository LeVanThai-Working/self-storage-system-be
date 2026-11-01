import { Queue, type Job } from 'bullmq';
import {
  bullmqConnection,
  defaultJobOptions,
} from '../../config/bullmq.config.ts';

export const BILLING_QUEUE_NAME = 'billing-queue';

export const BILLING_JOB = {
  GENERATE_RECURRING_INVOICES: 'generate_recurring_invoices',
  SCAN_OVERDUE_INVOICES: 'scan_overdue_invoices',
  REMIND_INVOICE_PAYMENT: 'remind_invoice_payment',
} as const;

export interface GenerateRecurringInvoicesJobData {
  triggeredAt: string;
}

export interface ScanOverdueInvoicesJobData {
  triggeredAt: string;
}

export interface RemindInvoicePaymentJobData {
  triggeredAt: string;
}

export class BillingQueue {
  private readonly queue: Queue;

  constructor() {
    this.queue = new Queue(BILLING_QUEUE_NAME, {
      connection: bullmqConnection,
      defaultJobOptions,
    });

    this.queue.on('error', (err) => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }
      console.error('Billing Queue Redis Error:', err);
    });
  }

  /**
   * Setup repeatable job to scan and generate recurring invoices daily at 01:00 AM VN.
   */
  async setupRecurringInvoiceRepeatableJob(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'repeatable-generate-recurring-invoices',
      { pattern: '0 1 * * *' },
      {
        name: BILLING_JOB.GENERATE_RECURRING_INVOICES,
        data: { triggeredAt: new Date().toISOString() },
      }
    );
  }

  /**
   * Setup repeatable job to scan overdue invoices and lock contracts daily at 02:00 AM VN.
   */
  async setupOverdueScanRepeatableJob(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'repeatable-scan-overdue-invoices',
      { pattern: '0 2 * * *' },
      {
        name: BILLING_JOB.SCAN_OVERDUE_INVOICES,
        data: { triggeredAt: new Date().toISOString() },
      }
    );
  }

  /**
   * Setup repeatable job to send multi-channel payment reminders daily at 08:00 AM VN.
   */
  async setupPaymentReminderRepeatableJob(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'repeatable-remind-invoice-payment',
      { pattern: '0 8 * * *' },
      {
        name: BILLING_JOB.REMIND_INVOICE_PAYMENT,
        data: { triggeredAt: new Date().toISOString() },
      }
    );
  }

  /**
   * Manually enqueue a recurring invoice generation job (e.g. for testing or ops trigger).
   */
  async addGenerateRecurringInvoicesJob(
    data: GenerateRecurringInvoicesJobData = {
      triggeredAt: new Date().toISOString(),
    }
  ): Promise<Job<GenerateRecurringInvoicesJobData>> {
    return this.queue.add(BILLING_JOB.GENERATE_RECURRING_INVOICES, data);
  }

  /**
   * Manually enqueue an overdue invoice scan job.
   */
  async addScanOverdueInvoicesJob(
    data: ScanOverdueInvoicesJobData = { triggeredAt: new Date().toISOString() }
  ): Promise<Job<ScanOverdueInvoicesJobData>> {
    return this.queue.add(BILLING_JOB.SCAN_OVERDUE_INVOICES, data);
  }

  /**
   * Manually enqueue a payment reminder scan job.
   */
  async addRemindInvoicePaymentJob(
    data: RemindInvoicePaymentJobData = {
      triggeredAt: new Date().toISOString(),
    }
  ): Promise<Job<RemindInvoicePaymentJobData>> {
    return this.queue.add(BILLING_JOB.REMIND_INVOICE_PAYMENT, data);
  }

  getQueue(): Queue {
    return this.queue;
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

export const billingQueue = new BillingQueue();
