import net from 'node:net';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';

const APPLICATION_QUEUES = [
  'reservation-queue',
  'access-schedule-queue',
  'billing-queue',
  'inventory-request-queue',
  'contract-queue',
] as const;

interface SessionStore {
  smembers(key: string): Promise<string[]>;
  get(key: string): Promise<string | null>;
  scan(
    cursor: string,
    match: 'MATCH',
    pattern: string,
    count: 'COUNT',
    limit: number
  ): Promise<[string, string[]]>;
  del(...keys: string[]): Promise<number>;
}

/** A database may already have been dropped: discover stale owners from app sessions. */
export async function findStaleSessionOwners(
  redis: SessionStore,
  validUserIds: string[]
) {
  const valid = new Set(validUserIds);
  const stale = new Set<string>();
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(
      cursor,
      'MATCH',
      'rt:*',
      'COUNT',
      100
    );
    cursor = next;
    for (const key of keys) {
      const value = await redis.get(key);
      if (!value) continue;
      let record: unknown;
      try {
        record = JSON.parse(value);
      } catch {
        continue;
      }
      if (
        record &&
        typeof record === 'object' &&
        'userId' in record &&
        typeof record.userId === 'string' &&
        /^[a-f0-9]{24}$/i.test(record.userId) &&
        'familyId' in record &&
        typeof record.familyId === 'string' &&
        !valid.has(record.userId)
      )
        stale.add(record.userId);
    }
  } while (cursor !== '0');
  cursor = '0';
  do {
    const [next, keys] = await redis.scan(
      cursor,
      'MATCH',
      'user_families:*',
      'COUNT',
      100
    );
    cursor = next;
    for (const key of keys) {
      const id = key.slice('user_families:'.length);
      if (/^[a-f0-9]{24}$/i.test(id) && !valid.has(id)) stale.add(id);
    }
  } while (cursor !== '0');
  return [...stale];
}

/** Restrict deletion to sessions owned by users removed by this reset. */
export async function clearOldSessions(
  redis: SessionStore,
  oldUserIds: string[]
) {
  const ids = new Set(oldUserIds);
  const keys = new Set<string>();
  const families = new Set<string>();
  for (const id of ids) {
    keys.add(`user_families:${id}`);
    for (const family of await redis.smembers(`user_families:${id}`))
      families.add(family);
  }
  let cursor = '0';
  do {
    const [next, tokens] = await redis.scan(
      cursor,
      'MATCH',
      'rt:*',
      'COUNT',
      100
    );
    cursor = next;
    for (const key of tokens) {
      const value = await redis.get(key);
      if (!value) continue;
      let record: unknown;
      try {
        record = JSON.parse(value);
      } catch {
        continue;
      }
      if (
        record &&
        typeof record === 'object' &&
        'userId' in record &&
        typeof record.userId === 'string' &&
        ids.has(record.userId)
      ) {
        keys.add(key);
        if ('familyId' in record && typeof record.familyId === 'string')
          families.add(record.familyId);
      }
    }
  } while (cursor !== '0');
  for (const family of families) {
    keys.add(`family:${family}`);
    for (const token of await redis.smembers(`family:${family}`))
      keys.add(`rt:${token}`);
  }
  let deleted = 0;
  const list = [...keys];
  for (let offset = 0; offset < list.length; offset += 100)
    deleted += await redis.del(...list.slice(offset, offset + 100));
  return deleted;
}

export async function assertLocalApiStopped() {
  const url = new URL(
    process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`
  );
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error('REMOTE_MAINTENANCE_NOT_SUPPORTED');
  const host = url.hostname === '[::1]' ? '::1' : url.hostname;
  const port = Number(
    process.env.PORT || url.port || (url.protocol === 'https:' ? 443 : 80)
  );
  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(2000);
    socket.once('connect', () => {
      socket.destroy();
      reject(new Error('API_STILL_RUNNING'));
    });
    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error('API_STOP_CHECK_TIMED_OUT'));
    });
    socket.once('error', (error: NodeJS.ErrnoException) => {
      socket.destroy();
      if (error.code === 'ECONNREFUSED') resolve();
      else reject(new Error('API_STOP_CHECK_FAILED'));
    });
  });
}

export async function beginSeedMaintenance() {
  await assertLocalApiStopped();
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 8000,
    retryStrategy: () => null,
  });
  redis.on('error', () => {
    /* Report a sanitized failure at the CLI boundary. */
  });
  const parsed = new URL(url);
  const connection = {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : 0,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: 1,
    connectTimeout: 8000,
    retryStrategy: () => null,
  };
  const queues: { queue: Queue; pausedBefore: boolean }[] = [];
  async function close(resume: boolean) {
    try {
      for (const item of queues) {
        if (resume) {
          if (item.pausedBefore) await item.queue.pause();
          else await item.queue.resume();
        }
        await item.queue.close();
      }
    } finally {
      redis.disconnect();
    }
  }
  try {
    await redis.connect();
    for (const name of APPLICATION_QUEUES) {
      const queue = new Queue(name, { connection });
      queue.on('error', () => {});
      const pausedBefore = await queue.isPaused();
      queues.push({ queue, pausedBefore });
      await queue.pause();
    }
    for (const { queue } of queues) {
      if (await queue.getActiveCount())
        throw new Error('WORKER_JOB_STILL_ACTIVE');
      if ((await queue.getWorkers()).length)
        throw new Error('WORKER_STILL_RUNNING');
    }
    return {
      async cleanup(oldUserIds: string[], validUserIds: string[]) {
        for (const { queue } of queues)
          await queue.obliterate({ force: false });
        return {
          queuesCleared: queues.length,
          authKeysDeleted: await clearOldSessions(redis, [
            ...new Set([
              ...oldUserIds,
              ...(await findStaleSessionOwners(redis, validUserIds)),
            ]),
          ]),
        };
      },
      close,
    };
  } catch (error) {
    await close(true);
    throw error;
  }
}
