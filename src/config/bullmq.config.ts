import type { ConnectionOptions, DefaultJobOptions } from 'bullmq';

/**
 * Parse Redis connection options for BullMQ workers and queues.
 * BullMQ requires maxRetriesPerRequest: null on all connections.
 */
function getRedisConnectionOptions(): ConnectionOptions {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  try {
    const parsed = new URL(redisUrl);
    const options: ConnectionOptions = {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? Number(parsed.port) : 6379,
      maxRetriesPerRequest: null,
    };
    if (parsed.username) {
      options.username = decodeURIComponent(parsed.username);
    }
    if (parsed.password) {
      options.password = decodeURIComponent(parsed.password);
    }
    if (parsed.protocol === 'rediss:') {
      options.tls = {};
    }
    return options;
  } catch {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
}

export const bullmqConnection: ConnectionOptions = getRedisConnectionOptions();

/**
 * Standard default job options across all queues in the system
 * (retries with exponential backoff, auto-cleanup of completed/failed jobs).
 */
export const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: {
    count: 100,
  },
  removeOnFail: {
    count: 500,
  },
};
