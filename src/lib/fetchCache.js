// Stale-while-revalidate cache for API data (scoped per logged-in user).

import { apiFetch } from '@/lib/api';
import { cacheStorageKey, getCacheScope } from '@/lib/cacheScope';

const isClient = typeof window !== 'undefined';
const memCache = new Map();
const inFlight = new Map();
const listeners = new Map();
const fetchGen = new Map();

const STALE_TIME = 5 * 60 * 1000;
const MAX_AGE = 60 * 60 * 1000;

/** After any mutation, ignore cache entries written before this time. */
let cacheDirtyAt = 0;

function scopedKey(url) {
  const scope = getCacheScope();
  return scope ? `${scope}::${url}` : url;
}

function bumpGen(url) {
  const key = scopedKey(url);
  fetchGen.set(key, (fetchGen.get(key) || 0) + 1);
}

function urlFromScopedKey(key) {
  return key.includes('::') ? key.split('::').slice(1).join('::') : key;
}

function bumpGenForPrefix(urlPrefix) {
  for (const key of memCache.keys()) {
    if (urlFromScopedKey(key).startsWith(urlPrefix)) bumpGen(urlFromScopedKey(key));
  }
  for (const key of inFlight.keys()) {
    if (urlFromScopedKey(key).startsWith(urlPrefix)) bumpGen(urlFromScopedKey(key));
  }
}

function getStorageItem(url) {
  const sKey = scopedKey(url);
  if (!isClient) return memCache.get(sKey);
  try {
    const item = localStorage.getItem(cacheStorageKey(url));
    if (item) return JSON.parse(item);
  } catch {
    // ignore
  }
  return memCache.get(sKey);
}

function setStorageItem(url, val) {
  const sKey = scopedKey(url);
  memCache.set(sKey, val);
  if (!isClient) return;
  try {
    localStorage.setItem(cacheStorageKey(url), JSON.stringify(val));
  } catch {
    // ignore
  }
}

function notifyListeners(url, data) {
  const subs = listeners.get(url);
  if (subs) subs.forEach((fn) => fn(data));
}

export function subscribeCache(url, callback) {
  if (!listeners.has(url)) listeners.set(url, new Set());
  listeners.get(url).add(callback);
  return () => {
    listeners.get(url)?.delete(callback);
  };
}

export function markCacheDirty() {
  cacheDirtyAt = Date.now();
}

async function fetchAndStore(url, options = {}) {
  const genAtStart = fetchGen.get(scopedKey(url)) || 0;
  const res = await apiFetch(url, options);
  if (!res.ok) throw new Error('Fetch failed');
  const data = await res.json();

  if ((fetchGen.get(scopedKey(url)) || 0) !== genAtStart) {
    return undefined;
  }

  setStorageItem(url, { data, timestamp: Date.now() });
  notifyListeners(url, data);
  return data;
}

function revalidateInBackground(url, options = {}) {
  const flightKey = scopedKey(url);
  if (inFlight.has(flightKey)) return inFlight.get(flightKey);

  const promise = fetchAndStore(url, options)
    .catch(() => {})
    .finally(() => inFlight.delete(flightKey));

  inFlight.set(flightKey, promise);
  return promise;
}

export async function refreshCache(url, options = {}) {
  bumpGen(url);
  inFlight.delete(scopedKey(url));
  return fetchAndStore(url, options);
}

function patchList(url, updater) {
  const existing = getCachedData(url);
  if (!Array.isArray(existing)) return;
  const next = updater(existing);
  setStorageItem(url, { data: next, timestamp: Date.now() });
  notifyListeners(url, next);
}

function patchHolder(accountHolderId, updater) {
  if (!accountHolderId) return;
  const holderUrl = `/api/account-holders/${accountHolderId}`;
  const holderData = getCachedData(holderUrl);
  if (!holderData?.holder) return;
  const next = updater(holderData);
  setStorageItem(holderUrl, { data: next, timestamp: Date.now() });
  notifyListeners(holderUrl, next);
}

export function syncAfterBillCreate(bill, accountHolderId) {
  if (!bill?._id) return;
  markCacheDirty();

  patchList('/api/bills', (list) => [bill, ...list.filter((b) => b._id !== bill._id)]);

  patchHolder(accountHolderId, (holder) => ({
    ...holder,
    bills: [bill, ...(holder.bills || []).filter((b) => b._id !== bill._id)],
  }));
}

export function syncAfterBillDelete(billId, accountHolderId) {
  if (!billId) return;
  markCacheDirty();

  patchList('/api/bills', (list) => list.filter((b) => b._id !== billId));

  patchHolder(accountHolderId, (holder) => ({
    ...holder,
    bills: (holder.bills || []).filter((b) => b._id !== billId),
  }));

  const detailUrl = `/api/bills/${billId}`;
  memCache.delete(scopedKey(detailUrl));
  if (isClient) {
    try {
      localStorage.removeItem(cacheStorageKey(detailUrl));
    } catch {
      // ignore
    }
  }
  notifyListeners(detailUrl, null);
}

export function syncAfterPaymentDelete(paymentId, accountHolderId) {
  if (!paymentId) return;
  markCacheDirty();

  patchList('/api/payments', (list) => list.filter((p) => p._id !== paymentId));

  patchHolder(accountHolderId, (holder) => ({
    ...holder,
    payments: (holder.payments || []).filter((p) => p._id !== paymentId),
  }));
}

export async function refreshCachesAfterMutation(accountHolderId) {
  markCacheDirty();
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

/**
 * Call after create/update/delete so every open page gets fresh data.
 */
export async function afterDataMutation({
  accountHolderId,
  createdBill,
  deletedBillIds = [],
  deletedPaymentIds = [],
} = {}) {
  markCacheDirty();

  if (createdBill) {
    syncAfterBillCreate(createdBill, accountHolderId || createdBill.accountHolderId);
  }

  for (const billId of deletedBillIds) {
    syncAfterBillDelete(billId, accountHolderId);
  }

  for (const paymentId of deletedPaymentIds) {
    syncAfterPaymentDelete(paymentId, accountHolderId);
  }

  await refreshCachesAfterMutation(accountHolderId);
}

export async function cachedFetch(url, options = {}) {
  const { onUpdate, ...fetchOptions } = options;
  const now = Date.now();
  const entry = getStorageItem(url);
  const hasCache = entry && entry.data !== undefined;
  const age = hasCache ? now - entry.timestamp : Infinity;
  const isDirty = hasCache && entry.timestamp < cacheDirtyAt;

  if (hasCache && !isDirty && age < STALE_TIME) {
    return entry.data;
  }

  if (hasCache && !isDirty && age < MAX_AGE) {
    revalidateInBackground(url, fetchOptions).then((data) => {
      if (data !== undefined && onUpdate) onUpdate(data);
    });
    return entry.data;
  }

  const flightKey = scopedKey(url);
  if (inFlight.has(flightKey)) {
    const data = await inFlight.get(flightKey);
    if (data !== undefined && onUpdate) onUpdate(data);
    return data;
  }

  const promise = fetchAndStore(url, fetchOptions).finally(() => inFlight.delete(flightKey));
  inFlight.set(flightKey, promise);
  const data = await promise;
  if (onUpdate && data !== undefined) onUpdate(data);
  return data;
}

export function prefetch(url) {
  const entry = getStorageItem(url);
  const age = entry ? Date.now() - entry.timestamp : Infinity;
  if (age < STALE_TIME && entry.timestamp >= cacheDirtyAt) return;
  revalidateInBackground(url);
}

export function getCachedData(url) {
  const entry = getStorageItem(url);
  if (!entry || entry.data === undefined) return null;
  if (entry.timestamp < cacheDirtyAt) return null;
  return entry.data;
}

export function invalidateCache(urlPrefix) {
  markCacheDirty();
  bumpGenForPrefix(urlPrefix);

  for (const key of [...memCache.keys()]) {
    const url = urlFromScopedKey(key);
    if (url.startsWith(urlPrefix)) {
      memCache.delete(key);
      notifyListeners(url, null);
    }
  }

  for (const key of [...inFlight.keys()]) {
    if (urlFromScopedKey(key).startsWith(urlPrefix)) inFlight.delete(key);
  }

  if (!isClient) return;

  try {
    const scope = getCacheScope();
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageItemKey = localStorage.key(i);
      if (!storageItemKey?.startsWith('fc_cache_')) continue;
      let cacheUrl = storageItemKey.replace(/^fc_cache_/, '');
      if (scope && cacheUrl.startsWith(`${scope}_`)) {
        cacheUrl = cacheUrl.slice(scope.length + 1);
      }
      if (cacheUrl.startsWith(urlPrefix)) toRemove.push(storageItemKey);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/** Wipe all cached API data (logout or account switch). */
export function clearAllCache() {
  markCacheDirty();
  memCache.clear();
  inFlight.clear();
  fetchGen.clear();

  if (!isClient) return;

  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('fc_cache_')) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }

  for (const [url] of listeners) {
    notifyListeners(url, null);
  }
}
