import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Type of hook executed after commit.
 * Supports both synchronous and asynchronous functions.
 */
export type AfterCommitHook = () => Promise<void> | void;

/**
 * Transaction scope used by the @Transactional() decorator.
 * Side effects that must only happen AFTER a successful commit
 * (e.g. writing audit logs, emitting Socket.IO events, dispatching BullMQ jobs)
 * are registered here instead of being executed immediately, so a rollback or
 * a transaction retry never produces wrong / duplicated side effects.
 */
export interface TransactionScope {
  afterCommitHooks: AfterCommitHook[];
}

const transactionScopeStorage = new AsyncLocalStorage<TransactionScope>();

export function getTransactionScope(): TransactionScope | undefined {
  return transactionScopeStorage.getStore();
}

export function createTransactionScope(): TransactionScope {
  return { afterCommitHooks: [] };
}

export function runInTransactionScope<T>(
  scope: TransactionScope,
  callback: () => Promise<T>
): Promise<T> {
  return transactionScopeStorage.run(scope, callback);
}

/**
 * Registers a hook to run after the current transaction commits.
 * @returns `false` when not inside a transaction — caller should run the
 * side effect immediately instead.
 */
export function registerAfterCommit(hook: AfterCommitHook): boolean {
  const scope = transactionScopeStorage.getStore();
  if (!scope) return false;
  scope.afterCommitHooks.push(hook);
  return true;
}

/**
 * Runs and clears all pending hooks. A failing hook never affects the others
 * nor the already-committed business operation.
 * Supports both sync exceptions and async promises safely.
 */
export async function flushAfterCommitHooks(
  scope: TransactionScope
): Promise<void> {
  const hooks = scope.afterCommitHooks.splice(0);
  await Promise.allSettled(
    hooks.map(async (hook) => {
      try {
        await hook();
      } catch (error) {
        console.error('[TransactionScope] afterCommit hook failed:', error);
      }
    })
  );
}

/**
 * Universal helper for side-effects:
 * - If running inside an active TransactionScope (@Transactional): enqueues hook
 *   to run only AFTER successful commit.
 * - If running outside of any transaction: executes hook immediately with safe error handling.
 */
export function runAfterCommit(hook: AfterCommitHook): void {
  const enqueued = registerAfterCommit(hook);
  if (!enqueued) {
    try {
      const result = hook();
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch((error) => {
          console.error(
            '[TransactionScope] async runAfterCommit hook failed:',
            error
          );
        });
      }
    } catch (error) {
      console.error('[TransactionScope] runAfterCommit hook failed:', error);
    }
  }
}
