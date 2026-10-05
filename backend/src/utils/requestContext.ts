import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  requestId: string;
  method?: string;
  path?: string;
  businessId?: string;
  userId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

// Attaches extra fields (e.g. businessId once auth succeeds) to the current
// request so every later log line for that request carries them.
export function setRequestContext(fields: Partial<RequestContext>) {
  const store = storage.getStore();
  if (store) Object.assign(store, fields);
}
