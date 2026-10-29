import mongoose, { type ClientSession } from 'mongoose';
import {
  createTransactionScope,
  flushAfterCommitHooks,
  getTransactionScope,
  runInTransactionScope,
} from '../../utils/transactionScope.util.ts';

/**
 * @Transactional() Method Decorator
 * Automatically wraps method execution inside a MongoDB Transaction (Mongoose Session).
 * Automatically commits on success and rolls back on any error/exception.
 * Integrates with TransactionScope to only execute deferred side effects (like audit logs)
 * after the transaction is successfully committed.
 */
export function Transactional() {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      // If already in an outer TransactionScope, participate in it
      const existingScope = getTransactionScope();
      if (existingScope) {
        return originalMethod.apply(this, args);
      }

      const scope = createTransactionScope();

      return runInTransactionScope(scope, async () => {
        const session: ClientSession = await mongoose.startSession();
        try {
          let result: unknown;
          await session.withTransaction(async () => {
            // Reset any hooks registered by previous attempts if withTransaction retries
            scope.afterCommitHooks = [];
            result = await originalMethod.apply(this, [...args, session]);
          });
          await flushAfterCommitHooks(scope);
          return result;
        } catch (error: unknown) {
          // Fallback only permitted in non-production environments (standalone MongoDB without replica set)
          const errMessage = error instanceof Error ? error.message : '';
          const isReplicaSetError =
            errMessage.includes('replica set member') ||
            errMessage.includes(
              'Transaction numbers are only allowed on a replica set'
            );

          if (process.env.NODE_ENV !== 'production' && isReplicaSetError) {
            scope.afterCommitHooks = [];
            const result = await originalMethod.apply(this, args);
            await flushAfterCommitHooks(scope);
            return result;
          }
          // In production or on normal business rollback/error: never fall back, discard hooks and rethrow
          scope.afterCommitHooks = [];
          throw error;
        } finally {
          await session.endSession();
        }
      });
    };

    return descriptor;
  };
}
