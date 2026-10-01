import { Redis } from 'ioredis';

// Local Redis configuration
// const redisHost = process.env.REDIS_HOST || 'localhost';
// const redisPort = Number(process.env.REDIS_PORT) || 6379;
// const redisPassword = process.env.REDIS_PASSWORD || undefined;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redis.connect();
    console.log('Connected to Redis successfully.');
  } catch (error) {
    console.error('Error connecting to Redis:', error);
  }
};

redis.on('error', (error) => {
  console.error('Redis Client Error:', error);
});
