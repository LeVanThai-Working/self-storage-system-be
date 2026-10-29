import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let replSetInstance: MongoMemoryReplSet | null = null;

/**
 * Initializes an in-memory MongoDB Replica Set and connects Mongoose.
 * Ensures MongoDB transactions and sessions work seamlessly in unit/integration tests.
 */
export async function setupTestDB(): Promise<string> {
  if (replSetInstance) {
    return replSetInstance.getUri();
  }

  replSetInstance = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: 'wiredTiger',
    },
  });

  const uri = replSetInstance.getUri();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri);
  return uri;
}

/**
 * Disconnects Mongoose and stops the in-memory Replica Set instance.
 */
export async function teardownTestDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (replSetInstance) {
    await replSetInstance.stop();
    replSetInstance = null;
  }
}

/**
 * Clears all collections in the test database between test suites.
 */
export async function clearTestDB(): Promise<void> {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
}
