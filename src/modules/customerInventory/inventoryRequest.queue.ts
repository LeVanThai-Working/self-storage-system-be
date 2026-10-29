import { Queue, type Job } from 'bullmq';
import {
  bullmqConnection,
  defaultJobOptions,
} from '../../config/bullmq.config.ts';

export const INVENTORY_REQUEST_QUEUE_NAME = 'inventory-request-queue';

export const INVENTORY_REQUEST_JOB = {
  AUTO_ACCEPT_PENDING: 'auto_accept_pending_inbound',
  SCHEDULED_AUTO_ACCEPT_SINGLE: 'scheduled_auto_accept_single_inbound',
  EXPIRE_PENDING: 'expire_pending_requests',
} as const;

export interface ScheduledAutoAcceptSingleJobData {
  requestId: string;
}

export interface AutoAcceptScanJobData {
  triggeredAt: string;
}

export class InventoryRequestQueue {
  private readonly queue: Queue;

  constructor() {
    this.queue = new Queue(INVENTORY_REQUEST_QUEUE_NAME, {
      connection: bullmqConnection,
      defaultJobOptions,
    });
  }

  /**
   * Schedule a delayed job to automatically accept an inbound request after 24h.
   */
  async addAutoAcceptSingleJob(
    requestId: string,
    delayMs: number = 24 * 60 * 60 * 1000
  ): Promise<Job<ScheduledAutoAcceptSingleJobData>> {
    const jobId = `auto-accept-${requestId}`;
    return this.queue.add(
      INVENTORY_REQUEST_JOB.SCHEDULED_AUTO_ACCEPT_SINGLE,
      { requestId },
      {
        jobId,
        delay: delayMs,
      }
    );
  }

  /**
   * Remove the delayed job if customer manually confirmed or disputed before 24h.
   */
  async removeAutoAcceptSingleJob(requestId: string): Promise<boolean> {
    const jobId = `auto-accept-${requestId}`;
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      return true;
    }
    return false;
  }

  /**
   * Setup a repeatable job to scan and auto-accept any pending confirmation inbound requests
   * older than 24h every 15 minutes.
   */
  async setupAutoAcceptRepeatableJob(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'repeatable-auto-accept-inbound',
      { pattern: '*/15 * * * *' },
      {
        name: INVENTORY_REQUEST_JOB.AUTO_ACCEPT_PENDING,
        data: { triggeredAt: new Date().toISOString() },
      }
    );
  }

  /**
   * Setup a repeatable job to scan and auto-expire pending requests older than their expiresAt
   * every 15 minutes.
   */
  async setupExpireRequestsRepeatableJob(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'repeatable-expire-inventory-requests',
      { pattern: '*/15 * * * *' },
      {
        name: INVENTORY_REQUEST_JOB.EXPIRE_PENDING,
        data: { triggeredAt: new Date().toISOString() },
      }
    );
  }

  /**
   * Close the queue connection gracefully.
   */
  async close(): Promise<void> {
    await this.queue.close();
  }
}

export const inventoryRequestQueue = new InventoryRequestQueue();
