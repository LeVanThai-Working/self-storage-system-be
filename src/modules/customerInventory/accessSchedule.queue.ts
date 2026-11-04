import { Queue } from 'bullmq';
import {
  bullmqConnection,
  defaultJobOptions,
} from '../../config/bullmq.config.ts';
import { ACCESS_SCHEDULE_CONFIG } from '../../config/accessSchedule.config.ts';

export const ACCESS_SCHEDULE_QUEUE_NAME = 'access-schedule-queue';

export const ACCESS_SCHEDULE_JOB = {
  SCAN_NO_SHOW: 'scan_no_show_access_schedules',
} as const;

export class AccessScheduleQueue {
  private readonly queue: Queue;

  constructor() {
    this.queue = new Queue(ACCESS_SCHEDULE_QUEUE_NAME, {
      connection: bullmqConnection,
      defaultJobOptions,
    });
  }

  /**
   * Cài đặt repeatable job quét các lịch hẹn quá hạn 45 phút chưa check-in để chuyển sang NO_SHOW mỗi 15 phút
   */
  async setupNoShowRepeatableJob(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'repeatable-scan-no-show-access-schedules',
      { pattern: ACCESS_SCHEDULE_CONFIG.NO_SHOW_SCAN_CRON_PATTERN },
      {
        name: ACCESS_SCHEDULE_JOB.SCAN_NO_SHOW,
        data: { triggeredAt: new Date().toISOString() },
      }
    );
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

export const accessScheduleQueue = new AccessScheduleQueue();
