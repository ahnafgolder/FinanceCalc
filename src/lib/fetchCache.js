// Lightweight SWR-like cache for client-side fetches.
// Shows stale data instantly while revalidating in the background.

const isClient = typeof window !== 'undefined';
const memCache = new Map();

function getStorageItem(key) {
  if (!isClient) return memCache.get(key);
  try {
    const item = sessionStorage.getItem(`fc_cache_${key}`);
    if (item) {
      return JSON.parse(item);
    }
  } catch (e) {
    // ignore
  }
  return memCache.get(key);
}

function setStorageItem(key, val) {
  if (!isClient) {
    memCache.set(key, val);
    return;
  }
  try {
    sessionStorage.setItem(`fc_cache_${key}`, JSON.stringify(val));
  } catch (e) {
    // ignore
  }
  memCache.set(key, val);
}

const STALE_TIME = 15_000; // 15 seconds

export async function cachedFetch(url, options = {}) {
  const key = url;
  const now = Date.now();
  const entry = getStorageItem(key);

  // If we have fresh data, return it immediately without fetching
  if (entry && (now - entry.timestamp) < STALE_TIME) {
    return entry.data;
  }

  // Fetch fresh data
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error('Fetch failed');
  }
  const data = await res.json();
  setStorageItem(key, { data, timestamp: now });
  return data;
}

// Get cached data synchronously (for instant rendering while background fetch runs)
export function getCachedData(url) {
  const entry = getStorageItem(url);
  return entry ? entry.data : null;
}

// Invalidate cache for a specific URL or prefix
export function invalidateCache(urlPrefix) {
  // Clear from memory
  for (const key of memCache.keys()) {
    if (key.startsWith(urlPrefix)) {
      memCache.delete(key);
    }
  }
  // Clear from sessionStorage
  if (isClient) {
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('fc_cache_') && key.replace('fc_cache_', '').startsWith(urlPrefix)) {
          sessionStorage.removeItem(key);
          i--; // adjust index since we removed an item
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

// Hook-friendly helper
export function useCachedFetch(url) {
  return { cachedFetch, getCachedData, invalidateCache };
}
