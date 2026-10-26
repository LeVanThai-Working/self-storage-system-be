import { Worker, type Job } from 'bullmq';
import { bullmqConnection } from '../../config/bullmq.config.ts';
import {
  INVENTORY_REQUEST_QUEUE_NAME,
  INVENTORY_REQUEST_JOB,
  type ScheduledAutoAcceptSingleJobData,
  inventoryRequestQueue,
} from './inventoryRequest.queue.ts';
import { inventoryRequestService } from './customerInventory.container.ts';

let worker: Worker | null = null;

/**
 * Process a single BullMQ job for the inventory request queue.
 */
async function processInventoryRequestJob(job: Job): Promise<void> {
  switch (job.name) {
    case INVENTORY_REQUEST_JOB.AUTO_ACCEPT_PENDING: {
      console.log(
        '[InventoryRequestWorker] Running periodic 24h auto-accept scan for inbound requests...'
      );
      const processedCount =
        await inventoryRequestService.autoAcceptInboundRequests();
      console.log(
        `[InventoryRequestWorker] Completed auto-accept scan. Auto-accepted: ${processedCount} requests.`
      );
      break;
    }

    case INVENTORY_REQUEST_JOB.SCHEDULED_AUTO_ACCEPT_SINGLE: {
      const data = job.data as ScheduledAutoAcceptSingleJobData;
      console.log(
        `[InventoryRequestWorker] Processing scheduled 24h auto-accept for request ${data.requestId}`
      );
      const processedCount =
        await inventoryRequestService.autoAcceptInboundRequests();
      console.log(
        `[InventoryRequestWorker] Finished auto-accept check. Processed: ${processedCount}`
      );
      break;
    }

    default:
      console.warn(`[InventoryRequestWorker] Unknown job name: ${job.name}`);
  }
}

/**
 * Initialize and start the Inventory Request Worker.
 */
export async function initInventoryRequestWorker(): Promise<Worker> {
  if (worker) {
    return worker;
  }

  worker = new Worker(
    INVENTORY_REQUEST_QUEUE_NAME,
    processInventoryRequestJob,
    {
      connection: bullmqConnection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job: Job) => {
    console.log(
      `[InventoryRequestWorker] Job ${job.id} (${job.name}) completed successfully.`
    );
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(
      `[InventoryRequestWorker] Job ${job?.id} (${job?.name}) failed:`,
      err.message
    );
  });

  worker.on('error', (err: Error) => {
    console.error('[InventoryRequestWorker] Worker error:', err.message);
  });

  // Setup the 15-minute repeatable job for scanning and auto-accepting 24h expired inbound requests
  try {
    await inventoryRequestQueue.setupAutoAcceptRepeatableJob();
    console.log(
      '[InventoryRequestWorker] Repeatable 24h auto-accept job registered (runs every 15m).'
    );
  } catch (error) {
    console.error(
      '[InventoryRequestWorker] Failed to setup auto-accept repeatable job:',
      error
    );
  }

  console.log('[InventoryRequestWorker] BullMQ Worker started successfully.');
  return worker;
}

/**
 * Gracefully close the Inventory Request Worker.
 */
export async function closeInventoryRequestWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[InventoryRequestWorker] BullMQ Worker closed.');
  }
  await inventoryRequestQueue.close();
}
