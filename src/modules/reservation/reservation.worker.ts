import { Worker, type Job } from 'bullmq';
import { bullmqConnection } from '../../config/bullmq.config.ts';
import {
  RESERVATION_QUEUE_NAME,
  RESERVATION_JOB,
  type ExpireReservationJobData,
  reservationQueue,
} from './reservation.queue.ts';
import { reservationService } from './reservation.container.ts';

let worker: Worker | null = null;

/**
 * Process a single BullMQ job for the reservation queue.
 */
async function processReservationJob(job: Job): Promise<void> {
  switch (job.name) {
    case RESERVATION_JOB.EXPIRE_HOLDING: {
      const data = job.data as ExpireReservationJobData;
      console.log(
        `[ReservationWorker] Processing expiration for reservation ${data.reservationId}`
      );
      const expired = await reservationService.expireSingleReservation(
        data.reservationId
      );
      if (expired) {
        console.log(
          `[ReservationWorker] Reservation ${data.reservationId} successfully expired and unit released.`
        );
      } else {
        console.log(
          `[ReservationWorker] Reservation ${data.reservationId} was not eligible for expiration (already paid or cancelled).`
        );
      }
      break;
    }

    case RESERVATION_JOB.CHECK_OVERDUE: {
      console.log(
        '[ReservationWorker] Running periodic overdue check-in scan...'
      );
      const result = await reservationService.processOverdueReservations();
      console.log(
        `[ReservationWorker] Completed overdue scan. Processed: ${result.processedCount} reservations.`
      );
      break;
    }

    default:
      console.warn(`[ReservationWorker] Unknown job name: ${job.name}`);
  }
}

/**
 * Initialize and start the Reservation Worker.
 * Also registers the repeatable overdue check job.
 */
export async function initReservationWorker(): Promise<Worker> {
  if (worker) {
    return worker;
  }

  worker = new Worker(RESERVATION_QUEUE_NAME, processReservationJob, {
    connection: bullmqConnection,
    concurrency: 5,
  });

  worker.on('completed', (job: Job) => {
    console.log(
      `[ReservationWorker] Job ${job.id} (${job.name}) completed successfully.`
    );
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(
      `[ReservationWorker] Job ${job?.id} (${job?.name}) failed:`,
      err.message
    );
  });

  worker.on('error', (err: Error) => {
    console.error('[ReservationWorker] Worker error:', err.message);
  });

  // Setup the hourly repeatable job for scanning overdue check-ins
  try {
    await reservationQueue.setupOverdueRepeatableJob();
    console.log(
      '[ReservationWorker] Repeatable overdue check-in job registered.'
    );
  } catch (error) {
    console.error(
      '[ReservationWorker] Failed to setup overdue repeatable job:',
      error
    );
  }

  console.log('[ReservationWorker] BullMQ Worker started successfully.');
  return worker;
}

/**
 * Gracefully close the Reservation Worker.
 */
export async function closeReservationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[ReservationWorker] BullMQ Worker closed.');
  }
}
