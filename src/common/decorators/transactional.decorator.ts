import mongoose, { type ClientSession } from 'mongoose';

/**
 * @Transactional() Method Decorator
 * Automatically wraps method execution inside a MongoDB Transaction (Mongoose Session).
 * Automatically commits on success and rolls back on any error/exception.
 */
export function Transactional() {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const session: ClientSession = await mongoose.startSession();
      try {
        let result: unknown;
        await session.withTransaction(async () => {
          result = await originalMethod.apply(this, [...args, session]);
        });
        return result;
      } catch (error: unknown) {
        // Fallback for standalone MongoDB environments (without replica set enabled)
        const errMessage = error instanceof Error ? error.message : '';
        if (
          errMessage.includes('replica set member') ||
          errMessage.includes(
            'Transaction numbers are only allowed on a replica set'
          )
        ) {
          return await originalMethod.apply(this, args);
        }
        throw error;
      } finally {
        await session.endSession();
      }
    };

    return descriptor;
  };
}
