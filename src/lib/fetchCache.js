// Stale-while-revalidate cache for API data.
// Shows cached data instantly; refreshes in the background.

import { apiFetch } from '@/lib/api';

const isClient = typeof window !== 'undefined';
const memCache = new Map();
const inFlight = new Map();
const listeners = new Map();

const STALE_TIME = 5 * 60 * 1000; // 5 min — skip network if fresh
const MAX_AGE = 60 * 60 * 1000; // 1 hr — still show stale while revalidating

function storageKey(key) {
  return `fc_cache_${key}`;
}

function getStorageItem(key) {
  if (!isClient) return memCache.get(key);
  try {
    const item = localStorage.getItem(storageKey(key));
    if (item) return JSON.parse(item);
  } catch {
    // ignore quota / parse errors
  }
  return memCache.get(key);
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

async function fetchAndStore(key, options = {}) {
  const res = await apiFetch(key, options);
  if (!res.ok) throw new Error('Fetch failed');
  const data = await res.json();
  setStorageItem(key, { data, timestamp: Date.now() });
  notifyListeners(key, data);
  return data;
}

function revalidateInBackground(key, options = {}) {
  if (inFlight.has(key)) return inFlight.get(key);

  const promise = fetchAndStore(key, options)
    .catch(() => {})
    .finally(() => inFlight.delete(key));

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
  const { onUpdate, ...fetchOptions } = options;
  const now = Date.now();
  const entry = getStorageItem(url);
  const hasCache = entry && entry.data !== undefined;
  const age = hasCache ? now - entry.timestamp : Infinity;

  if (hasCache && age < STALE_TIME) {
    return entry.data;
  }

  if (hasCache && age < MAX_AGE) {
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

  const promise = fetchAndStore(url, fetchOptions).finally(() => inFlight.delete(url));
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
  for (const key of memCache.keys()) {
    if (key.startsWith(urlPrefix)) memCache.delete(key);
  }

  if (!isClient) return;

  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageItemKey = localStorage.key(i);
      if (!storageItemKey?.startsWith('fc_cache_')) continue;
      const cacheKey = storageItemKey.replace('fc_cache_', '');
      if (cacheKey.startsWith(urlPrefix)) toRemove.push(storageItemKey);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export function useCachedFetch(url) {
  return { cachedFetch, getCachedData, invalidateCache, prefetch };
}
