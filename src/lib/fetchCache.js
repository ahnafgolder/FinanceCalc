// Stale-while-revalidate cache for API data.
// Shows cached data instantly; refreshes in the background.

import { apiFetch } from '@/lib/api';

const isClient = typeof window !== 'undefined';
const memCache = new Map();
const inFlight = new Map();
const listeners = new Map();
const invalidationListeners = new Set();

/** Bumped on invalidate — in-flight writes from an older epoch are discarded. */
let cacheEpoch = 0;

const STALE_TIME = 30 * 1000; // 30s — then background revalidate
const MAX_AGE = 60 * 60 * 1000; // 1 hr — still show stale while revalidating

export function cacheKeyAffected(key, prefix) {
  return key === prefix || key.startsWith(`${prefix}?`) || key.startsWith(`${prefix}/`);
}

function storageKey(key) {
  return `fc_cache_${key}`;
}

function isEntryValid(entry) {
  if (!entry || entry.data === undefined) return false;
  if (entry.epoch !== undefined && entry.epoch !== cacheEpoch) return false;
  return true;
}

function getStorageItem(key) {
  if (!isClient) {
    const entry = memCache.get(key);
    return isEntryValid(entry) ? entry : null;
  }
  try {
    const item = localStorage.getItem(storageKey(key));
    if (item) {
      const entry = JSON.parse(item);
      if (isEntryValid(entry)) return entry;
      localStorage.removeItem(storageKey(key));
    }
  } catch {
    // ignore quota / parse errors
  }
  const entry = memCache.get(key);
  return isEntryValid(entry) ? entry : null;
}

function setStorageItem(key, val) {
  memCache.set(key, val);
  if (!isClient) return;
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(val));
  } catch {
    // ignore quota errors
  }
}

function notifyListeners(key, data) {
  const subs = listeners.get(key);
  if (subs) subs.forEach((fn) => fn(data));
}

function notifyInvalidation(prefix) {
  invalidationListeners.forEach((fn) => {
    try {
      fn(prefix);
    } catch {
      // ignore listener errors
    }
  });
}

/** Subscribe to fresh data for an exact cache key (e.g. after refreshCache). */
export function subscribeCacheKey(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key)?.delete(fn);
}

/** Subscribe when invalidateCache(prefix) runs — remount/refetch mounted queries. */
export function subscribeInvalidation(fn) {
  invalidationListeners.add(fn);
  return () => invalidationListeners.delete(fn);
}

function clearInFlightForPrefix(urlPrefix) {
  for (const key of [...inFlight.keys()]) {
    if (cacheKeyAffected(key, urlPrefix)) {
      inFlight.delete(key);
    }
  }
}

function clearCacheKey(key) {
  memCache.delete(key);
  if (!isClient) return;
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
    // ignore
  }
}

function clearCacheForPrefix(urlPrefix) {
  for (const key of [...memCache.keys()]) {
    if (cacheKeyAffected(key, urlPrefix)) {
      memCache.delete(key);
    }
  }
  if (!isClient) return;
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageItemKey = localStorage.key(i);
      if (!storageItemKey?.startsWith('fc_cache_')) continue;
      const cacheKey = storageItemKey.replace('fc_cache_', '');
      if (cacheKeyAffected(cacheKey, urlPrefix)) {
        toRemove.push(storageItemKey);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

async function fetchAndStore(key, options = {}, epoch = cacheEpoch) {
  const res = await apiFetch(key, options);
  if (!res.ok) throw new Error('Fetch failed');
  const data = await res.json();
  if (epoch !== cacheEpoch) return data;
  setStorageItem(key, { data, timestamp: Date.now(), epoch: cacheEpoch });
  notifyListeners(key, data);
  return data;
}

function revalidateInBackground(key, options = {}) {
  if (inFlight.has(key)) return inFlight.get(key);

  const epoch = cacheEpoch;
  const promise = fetchAndStore(key, options, epoch)
    .catch(() => {})
    .finally(() => {
      if (inFlight.get(key) === promise) inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/**
 * Fetch with SWR semantics.
 * - Returns cached data immediately when available.
 * - Revalidates in the background when stale.
 * - Optional onUpdate callback fires when fresh data arrives.
 */
export async function cachedFetch(url, options = {}) {
  const { forceRefresh = false, onUpdate, ...fetchOptions } = options;
  const now = Date.now();

  if (forceRefresh) {
    clearInFlightForPrefix(url);
  }

  const entry = forceRefresh ? null : getStorageItem(url);
  const hasCache = !!entry;
  const age = hasCache ? now - entry.timestamp : Infinity;

  if (!forceRefresh && hasCache && age < STALE_TIME) {
    return entry.data;
  }

  if (!forceRefresh && hasCache && age < MAX_AGE) {
    revalidateInBackground(url, fetchOptions).then((data) => {
      if (data !== undefined && onUpdate) onUpdate(data);
    });
    return entry.data;
  }

  if (inFlight.has(url)) {
    const data = await inFlight.get(url);
    if (onUpdate) onUpdate(data);
    return data;
  }

  const epoch = cacheEpoch;
  const promise = fetchAndStore(url, fetchOptions, epoch).finally(() => {
    if (inFlight.get(url) === promise) inFlight.delete(url);
  });
  inFlight.set(url, promise);
  const data = await promise;
  if (onUpdate) onUpdate(data);
  return data;
}

/** Prefetch without blocking — warms cache for tab switches. */
export function prefetch(url) {
  const entry = getStorageItem(url);
  const age = entry ? Date.now() - entry.timestamp : Infinity;
  if (age < STALE_TIME) return;
  revalidateInBackground(url);
}

export function getCachedData(url) {
  const entry = getStorageItem(url);
  return entry ? entry.data : null;
}

export function invalidateCache(urlPrefix) {
  cacheEpoch += 1;
  clearInFlightForPrefix(urlPrefix);
  clearCacheForPrefix(urlPrefix);
  notifyInvalidation(urlPrefix);
}

/** Drop cache and fetch fresh data (use after create/update/delete). */
export async function refreshCache(url, options = {}) {
  clearInFlightForPrefix(url);
  clearCacheKey(url);
  notifyInvalidation(url);
  return fetchAndStore(url, options, cacheEpoch);
}

async function syncCaches(keys) {
  cacheEpoch += 1;
  keys.forEach((k) => {
    clearInFlightForPrefix(k);
    clearCacheForPrefix(k);
    notifyInvalidation(k);
  });
  const epoch = cacheEpoch;
  await Promise.all(keys.map((k) => fetchAndStore(k, {}, epoch)));
}

/** Refresh all list caches after creating/updating a bill. */
export async function syncAfterBillMutation() {
  await syncCaches(['/api/bills', '/api/dashboard', '/api/account-holders']);
}

/** Refresh all list caches after creating/updating a payment. */
export async function syncAfterPaymentMutation() {
  await syncCaches([
    '/api/payments',
    '/api/bills',
    '/api/dashboard',
    '/api/account-holders',
  ]);
}

export function useCachedFetch(url) {
  return { cachedFetch, getCachedData, invalidateCache, refreshCache, prefetch };
}
