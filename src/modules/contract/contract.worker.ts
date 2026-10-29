import { Worker, type Job } from 'bullmq';
import { bullmqConnection } from '../../config/bullmq.config.ts';
import { CONTRACT_QUEUE_NAME, CONTRACT_JOB } from './contract.queue.ts';
import { contractService } from './contract.container.ts';

let worker: Worker | null = null;

async function processContractJob(job: Job): Promise<void> {
  switch (job.name) {
    case CONTRACT_JOB.CHECK_OVERDUE: {
      console.log('[ContractWorker] Running periodic overdue contract scan...');
      const result = await contractService.processOverdueContracts();
      console.log(
        `[ContractWorker] Completed contract overdue scan. Overdue: ${result.overdueCount}, Processed: ${result.processedCount}, Failed: ${result.failedCount}.`
      );
      break;
    }

    case CONTRACT_JOB.REMIND_EXPIRY: {
      console.log(
        '[ContractWorker] Running periodic contract expiry reminder scan...'
      );
      const result = await contractService.processExpiryReminders();
      console.log(
        `[ContractWorker] Completed contract expiry reminder scan. Reminders sent: ${result.remindedCount}.`
      );
      break;
    }

    default:
      console.warn(`[ContractWorker] Unknown job name: ${job.name}`);
  }
}

export function startContractWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(CONTRACT_QUEUE_NAME, processContractJob, {
    connection: bullmqConnection,
    concurrency: 1,
  });

  worker.on('failed', (job, err) => {
    console.error(
      `[ContractWorker] Job ${job?.id} failed with error:`,
      err.message
    );
  });

  worker.on('error', (err) => {
    if (process.env.NODE_ENV === 'test') return;
    console.error('[ContractWorker] Worker error:', err.message);
  });

  return worker;
}

export async function stopContractWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
