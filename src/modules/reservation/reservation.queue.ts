import { Queue, type Job } from 'bullmq';
import {
  bullmqConnection,
  defaultJobOptions,
} from '../../config/bullmq.config.ts';

export const RESERVATION_QUEUE_NAME = 'reservation-queue';

export const RESERVATION_JOB = {
  EXPIRE_HOLDING: 'expire_holding_reservation',
  CHECK_OVERDUE: 'check_overdue_reservations',
} as const;

export interface ExpireReservationJobData {
  reservationId: string;
}

export interface CheckOverdueJobData {
  triggeredAt: string;
}

export class ReservationQueue {
  private readonly queue: Queue;

  constructor() {
    this.queue = new Queue(RESERVATION_QUEUE_NAME, {
      connection: bullmqConnection,
      defaultJobOptions,
    });

    this.queue.on('error', (err) => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }
      console.error('Reservation Queue Redis Error:', err);
    });
  }

  /**
   * Schedule a delayed job to automatically expire and release a storage unit
   * if the customer does not complete deposit payment within delayMs (default: 15 minutes).
   */
  async addExpireReservationJob(
    reservationId: string,
    delayMs: number = 15 * 60 * 1000
  ): Promise<Job<ExpireReservationJobData>> {
    const jobId = `expire-${reservationId}`;
    return this.queue.add(
      RESERVATION_JOB.EXPIRE_HOLDING,
      { reservationId },
      {
        jobId,
        delay: delayMs,
      }
    );
  }

  /**
   * Remove the delayed expiration job when payment is completed before the 15-minute timer expires.
   */
  async removeExpireReservationJob(reservationId: string): Promise<boolean> {
    const jobId = `expire-${reservationId}`;
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      return true;
    }
    return false;
  }

  /**
   * Setup a repeatable job to scan and mark overdue check-ins every hour.
   */
  async setupOverdueRepeatableJob(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'repeatable-check-overdue',
      { pattern: '*/15 * * * *' },
      {
        name: RESERVATION_JOB.CHECK_OVERDUE,
        data: { triggeredAt: new Date().toISOString() },
      }
    );
  }

  /**
   * Close the queue connection
   */
  async close(): Promise<void> {
    await this.queue.close();
  }
}

export const reservationQueue = new ReservationQueue();
