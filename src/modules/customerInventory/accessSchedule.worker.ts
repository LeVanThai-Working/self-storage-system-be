import { Worker, type Job } from 'bullmq';
import { bullmqConnection } from '../../config/bullmq.config.ts';
import {
  ACCESS_SCHEDULE_QUEUE_NAME,
  ACCESS_SCHEDULE_JOB,
  accessScheduleQueue,
} from './accessSchedule.queue.ts';
import { accessScheduleService } from './customerInventory.container.ts';

let worker: Worker | null = null;

async function processAccessScheduleJob(job: Job): Promise<void> {
  switch (job.name) {
    case ACCESS_SCHEDULE_JOB.SCAN_NO_SHOW: {
      console.log(
        '[AccessScheduleWorker] Running periodic scan for expired access schedules to mark NO_SHOW...'
      );
      const count = await accessScheduleService.processNoShowScan();
      console.log(
        `[AccessScheduleWorker] Completed NO_SHOW scan. Marked: ${count} schedules.`
      );
      break;
    }
    default:
      console.warn(`[AccessScheduleWorker] Unknown job name: ${job.name}`);
  }
}

export async function initAccessScheduleWorker(): Promise<Worker> {
  if (worker) {
    return worker;
  }

  worker = new Worker(ACCESS_SCHEDULE_QUEUE_NAME, processAccessScheduleJob, {
    connection: bullmqConnection,
    concurrency: 3,
  });

  worker.on('completed', (job: Job) => {
    console.log(
      `[AccessScheduleWorker] Job ${job.id} (${job.name}) completed successfully.`
    );
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(
      `[AccessScheduleWorker] Job ${job?.id} (${job?.name}) failed:`,
      err.message
    );
  });

  worker.on('error', (err: Error) => {
    console.error('[AccessScheduleWorker] Worker error:', err.message);
  });

  try {
    await accessScheduleQueue.setupNoShowRepeatableJob();
    console.log(
      '[AccessScheduleWorker] Repeatable NO_SHOW scan registered (every 15m).'
    );
  } catch (error) {
    console.error(
      '[AccessScheduleWorker] Failed to setup NO_SHOW repeatable job:',
      error
    );
  }

  console.log('[AccessScheduleWorker] BullMQ Worker started successfully.');
  return worker;
}

export async function closeAccessScheduleWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[AccessScheduleWorker] BullMQ Worker closed.');
  }
  await accessScheduleQueue.close();
}
