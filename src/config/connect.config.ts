import mongoose from 'mongoose';

/**
 * Checks whether the currently connected MongoDB instance is running as a Replica Set.
 * Standard MongoDB command `hello` (MongoDB 5+) returns `setName` if replica set is enabled.
 */
export async function isMongoReplicaSet(): Promise<boolean> {
  try {
    if (!mongoose.connection.db) {
      return false;
    }
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    return Boolean(hello && (hello.setName || hello.hosts));
  } catch {
    return false;
  }
}

/**
 * Enforces production safety: fails fast if MongoDB is not running as a replica set in production.
 */
export async function assertMongoReplicaSetInProduction(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    const isReplSet = await isMongoReplicaSet();
    if (!isReplSet) {
      throw new Error(
        'FATAL: MongoDB must be running in a replica set in production to ensure ACID transactions.'
      );
    }
  }
}

const connect = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB database successfully.');
    await assertMongoReplicaSetInProduction();
  } catch (error) {
    console.error('Error connecting to MongoDB database:', error);
    throw error;
  }
};

export default connect;
