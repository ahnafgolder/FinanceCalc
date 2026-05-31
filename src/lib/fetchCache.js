// Stale-while-revalidate cache for API data.
// Shows cached data instantly; refreshes in the background.

import { apiFetch } from '@/lib/api';

const isClient = typeof window !== 'undefined';
const memCache = new Map();
const inFlight = new Map();
const listeners = new Map();
/** Per-URL generation — bumped on invalidate so stale in-flight writes are ignored. */
const fetchGen = new Map();

const STALE_TIME = 5 * 60 * 1000;
const MAX_AGE = 60 * 60 * 1000;

function storageKey(key) {
  return `fc_cache_${key}`;
}

function bumpGen(url) {
  fetchGen.set(url, (fetchGen.get(url) || 0) + 1);
}

function bumpGenForPrefix(urlPrefix) {
  for (const key of memCache.keys()) {
    if (key.startsWith(urlPrefix)) bumpGen(key);
  }
  for (const key of inFlight.keys()) {
    if (key.startsWith(urlPrefix)) bumpGen(key);
  }
}

function getStorageItem(key) {
  if (!isClient) return memCache.get(key);
  try {
    const item = localStorage.getItem(storageKey(key));
    if (item) return JSON.parse(item);
  } catch {
    // ignore
  }
  return memCache.get(key);
}

function setStorageItem(key, val) {
  memCache.set(key, val);
  if (!isClient) return;
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(val));
  } catch {
    // ignore
  }
}

function notifyListeners(key, data) {
  const subs = listeners.get(key);
  if (subs) subs.forEach((fn) => fn(data));
}

export function subscribeCache(url, callback) {
  if (!listeners.has(url)) listeners.set(url, new Set());
  listeners.get(url).add(callback);
  return () => {
    listeners.get(url)?.delete(callback);
  };
}

async function fetchAndStore(key, options = {}) {
  const genAtStart = fetchGen.get(key) || 0;
  const res = await apiFetch(key, options);
  if (!res.ok) throw new Error('Fetch failed');
  const data = await res.json();

  if ((fetchGen.get(key) || 0) !== genAtStart) {
    return undefined;
  }

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
 * Force a network fetch and update cache (use after mutations).
 */
export async function refreshCache(url, options = {}) {
  bumpGen(url);
  inFlight.delete(url);
  return fetchAndStore(url, options);
}

/** Push a new bill into list + holder caches so UI updates immediately. */
export function syncAfterBillCreate(bill, accountHolderId) {
  if (!bill?._id) return;

  const billsUrl = '/api/bills';
  const existingList = getCachedData(billsUrl);
  if (Array.isArray(existingList)) {
    const nextList = [bill, ...existingList.filter((b) => b._id !== bill._id)];
    setStorageItem(billsUrl, { data: nextList, timestamp: Date.now() });
    notifyListeners(billsUrl, nextList);
  }

  if (accountHolderId) {
    const holderUrl = `/api/account-holders/${accountHolderId}`;
    const holderData = getCachedData(holderUrl);
    if (holderData?.holder) {
      const nextBills = [bill, ...(holderData.bills || []).filter((b) => b._id !== bill._id)];
      const next = { ...holderData, bills: nextBills };
      setStorageItem(holderUrl, { data: next, timestamp: Date.now() });
      notifyListeners(holderUrl, next);
    }
  }
}

export async function refreshCachesAfterMutation(accountHolderId) {
  const tasks = [
    refreshCache('/api/bills'),
    refreshCache('/api/payments'),
    refreshCache('/api/dashboard'),
    refreshCache('/api/account-holders'),
  ];
  if (accountHolderId) {
    tasks.push(refreshCache(`/api/account-holders/${accountHolderId}`));
  }
  await Promise.all(tasks);
}

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
    if (data !== undefined && onUpdate) onUpdate(data);
    return data;
  }

  const promise = fetchAndStore(url, fetchOptions).finally(() => inFlight.delete(url));
  inFlight.set(url, promise);
  const data = await promise;
  if (onUpdate && data !== undefined) onUpdate(data);
  return data;
}

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
  bumpGenForPrefix(urlPrefix);

  for (const key of memCache.keys()) {
    if (key.startsWith(urlPrefix)) memCache.delete(key);
  }

  for (const key of [...inFlight.keys()]) {
    if (key.startsWith(urlPrefix)) inFlight.delete(key);
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
  return { cachedFetch, getCachedData, invalidateCache, refreshCache, prefetch, syncAfterBillCreate };
}
