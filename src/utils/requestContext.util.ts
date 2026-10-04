import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuditActor } from '../common/types/auditLog.type.ts';

/**
 * Per-request context propagated automatically through async calls
 * (controllers → services → repositories) via AsyncLocalStorage.
 * Lets services know "who / from where" without changing their signatures.
 */
export interface RequestContext {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
  method: string | null;
  path: string | null;
  actor: AuditActor | null;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(
  context: RequestContext,
  callback: () => T
): T {
  return requestContextStorage.run(context, callback);
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

interface ActorSource {
  _id?: unknown;
  id?: unknown;
  role?: unknown;
  email?: unknown;
}

/**
 * Builds an AuditActor snapshot from a user document or a JWT payload.
 */
export function toAuditActor(
  source: ActorSource | null | undefined
): AuditActor | null {
  if (!source) return null;
  const rawId = source._id ?? source.id;
  if (rawId === undefined || rawId === null) return null;

  return {
    id: String(rawId),
    role: typeof source.role === 'string' ? source.role : null,
    email: typeof source.email === 'string' ? source.email : null,
  };
}

/**
 * Attaches the authenticated user to the current request context.
 * Called by the authentication middlewares after a token is verified.
 */
export function setRequestActor(source: ActorSource | null | undefined): void {
  const context = requestContextStorage.getStore();
  if (!context) return;
  context.actor = toAuditActor(source);
}
