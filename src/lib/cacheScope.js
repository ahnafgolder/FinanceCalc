/** Per-user cache scope so localStorage never leaks between accounts. */

let scopeId = '';
const scopeListeners = new Set();

export function getCacheScope() {
  return scopeId;
}

export function setCacheScope(id) {
  const next = id ? String(id) : '';
  if (next === scopeId) return;
  scopeId = next;
  scopeListeners.forEach((fn) => fn(next));
}

export function subscribeCacheScope(callback) {
  scopeListeners.add(callback);
  return () => scopeListeners.delete(callback);
}

export function cacheStorageKey(url) {
  const scope = getCacheScope();
  return scope ? `fc_cache_${scope}_${url}` : `fc_cache_${url}`;
}

const LAST_SCOPE_KEY = 'fc_last_cache_scope';

export function getLastCacheScope() {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(LAST_SCOPE_KEY) || '';
  } catch {
    return '';
  }
}

export function setLastCacheScope(id) {
  if (typeof window === 'undefined') return;
  try {
    if (id) sessionStorage.setItem(LAST_SCOPE_KEY, String(id));
    else sessionStorage.removeItem(LAST_SCOPE_KEY);
  } catch {
    // ignore
  }
}
