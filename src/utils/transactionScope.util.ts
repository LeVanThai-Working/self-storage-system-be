import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Transaction scope used by the @Transactional() decorator.
 * Side effects that must only happen AFTER a successful commit
 * (e.g. writing audit logs) are registered here instead of being executed
 * immediately, so a rollback or a transaction retry never produces
 * wrong / duplicated side effects.
 */
export interface TransactionScope {
  afterCommitHooks: Array<() => void>;
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
export function registerAfterCommit(hook: () => void): boolean {
  const scope = transactionScopeStorage.getStore();
  if (!scope) return false;
  scope.afterCommitHooks.push(hook);
  return true;
}

/**
 * Runs and clears all pending hooks. A failing hook never affects the others
 * nor the already-committed business operation.
 */
export function flushAfterCommitHooks(scope: TransactionScope): void {
  const hooks = scope.afterCommitHooks.splice(0);
  for (const hook of hooks) {
    try {
      hook();
    } catch (error) {
      console.error('[TransactionScope] afterCommit hook failed:', error);
    }
  }
}
