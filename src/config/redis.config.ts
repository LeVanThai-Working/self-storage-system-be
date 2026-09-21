import { Redis } from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;

export const redis = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
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
