import { Worker, type Job } from 'bullmq';
import { bullmqConnection } from '../../config/bullmq.config.ts';
import {
  BILLING_QUEUE_NAME,
  BILLING_JOB,
  billingQueue,
} from './billing.queue.ts';
import { invoiceService } from '../invoice/invoice.container.ts';

let worker: Worker | null = null;

/**
 * Process a single BullMQ job for the billing queue.
 * Concurrency is strictly 1 to process batch jobs sequentially and prevent race conditions.
 */
export async function processBillingJob(job: Job): Promise<void> {
  const startedAt = Date.now();
  console.log(`[BillingWorker] Job ${job.id} (${job.name}) started.`);

  try {
    switch (job.name) {
      case BILLING_JOB.GENERATE_RECURRING_INVOICES: {
        console.log(
          '[BillingWorker] Running periodic recurring invoice generation scan (T-7)...'
        );
        const result = await invoiceService.processRecurringInvoicesScan();
        console.log(
          `[BillingWorker] Recurring invoices scan completed: scanned=${result.scannedCount}, generated=${result.generatedCount}, skipped=${result.skippedCount}, failed=${result.failedCount}`
        );
        break;
      }

      case BILLING_JOB.SCAN_OVERDUE_INVOICES: {
        console.log(
          '[BillingWorker] Running periodic overdue invoice scan (grace period check)...'
        );
        const result = await invoiceService.processOverdueInvoicesScan();
        console.log(
          `[BillingWorker] Overdue invoices scan completed: scanned=${result.scannedCount}, markedOverdue=${result.markedOverdueCount}, contractsLocked=${result.contractsLockedCount}, skipped=${result.skippedCount}, failed=${result.failedCount}`
        );
        break;
      }

      case BILLING_JOB.REMIND_INVOICE_PAYMENT: {
        console.log(
          '[BillingWorker] Running periodic payment reminder scan (T-3, T-1, T-0)...'
        );
        const result = await invoiceService.processPaymentRemindersScan();
        console.log(
          `[BillingWorker] Payment reminders scan completed: scanned=${result.scannedCount}, remindedT3=${result.remindedT3Count}, remindedT1=${result.remindedT1Count}, remindedT0=${result.remindedT0Count}, totalReminded=${result.totalRemindedCount}, skipped=${result.skippedCount}, failed=${result.failedCount}`
        );
        break;
      }

      default:
        console.warn(`[BillingWorker] Unknown job name: ${job.name}`);
    }

    const durationMs = Date.now() - startedAt;
    console.log(
      `[BillingWorker] Job ${job.id} (${job.name}) completed successfully in ${durationMs}ms.`
    );
  } catch (error) {
    const err = error as Error;
    console.error(
      `[BillingWorker] Error processing job ${job.id} (${job.name}):`,
      err.message
    );
    throw error;
  }
}

/**
 * Initialize and start the Billing Worker.
 * Sets up repeatable jobs for recurring invoice generation, overdue scan, and reminders.
 */
export async function initBillingWorker(): Promise<Worker> {
  if (worker) {
    return worker;
  }

  worker = new Worker(BILLING_QUEUE_NAME, processBillingJob, {
    connection: bullmqConnection,
    concurrency: 1,
  });

  worker.on('completed', (job: Job) => {
    console.log(
      `[BillingWorker] Job ${job.id} (${job.name}) completed successfully.`
    );
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(
      `[BillingWorker] Job ${job?.id} (${job?.name}) failed:`,
      err.message
    );
  });

  worker.on('error', (err: Error) => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    console.error('[BillingWorker] Worker error:', err.message);
  });

  // Setup the repeatable cron jobs
  try {
    await billingQueue.setupRecurringInvoiceRepeatableJob();
    await billingQueue.setupOverdueScanRepeatableJob();
    await billingQueue.setupPaymentReminderRepeatableJob();
    console.log('[BillingWorker] Repeatable jobs successfully registered.');
  } catch (err) {
    console.error(
      '[BillingWorker] Failed to setup repeatable schedulers:',
      (err as Error).message
    );
  }

  return worker;
}

/**
 * Gracefully stop and close the Billing Worker.
 */
export async function closeBillingWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[BillingWorker] Worker closed gracefully.');
  }
}
