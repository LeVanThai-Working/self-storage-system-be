import { Queue } from 'bullmq';
import {
  bullmqConnection,
  defaultJobOptions,
} from '../../config/bullmq.config.ts';

export const CONTRACT_QUEUE_NAME = 'contract-queue';

export const CONTRACT_JOB = {
  CHECK_OVERDUE: 'check_overdue_contracts',
  REMIND_EXPIRY: 'remind_expiry_contracts',
} as const;

export interface CheckContractOverdueJobData {
  triggeredAt: string;
}

export interface RemindContractExpiryJobData {
  triggeredAt: string;
}

export class ContractQueue {
  private readonly queue: Queue;

  constructor() {
    this.queue = new Queue(CONTRACT_QUEUE_NAME, {
      connection: bullmqConnection,
      defaultJobOptions,
    });

    this.queue.on('error', (err) => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }
      console.error('Contract Queue Redis Error:', err);
    });
  }

  /**
   * Setup repeatable job to scan and mark overdue contracts periodically.
   */
  async setupOverdueRepeatableJob(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'repeatable-check-contract-overdue',
      { pattern: '0 * * * *' },
      {
        name: CONTRACT_JOB.CHECK_OVERDUE,
        data: { triggeredAt: new Date().toISOString() },
      }
    );
  }

  /**
   * Setup repeatable job to remind customers of approaching contract expiry daily at 08:00 VN.
   */
  async setupExpiryReminderRepeatableJob(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'repeatable-remind-contract-expiry',
      { pattern: '0 8 * * *' },
      {
        name: CONTRACT_JOB.REMIND_EXPIRY,
        data: { triggeredAt: new Date().toISOString() },
      }
    );
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

export const contractQueue = new ContractQueue();
