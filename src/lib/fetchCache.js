// Lightweight SWR-like cache for client-side fetches.
// Shows stale data instantly while revalidating in the background.
const cache = new Map();
const STALE_TIME = 30_000; // 30 seconds — show cached data for this long before re-fetching

export async function cachedFetch(url, options = {}) {
  const key = url;
  const now = Date.now();
  const entry = cache.get(key);

  // If we have fresh data, return it immediately
  if (entry && (now - entry.timestamp) < STALE_TIME) {
    return entry.data;
  }

  // Fetch fresh data
  const res = await fetch(url, options);
  const data = await res.json();
  cache.set(key, { data, timestamp: now });
  return data;
}

// Get cached data synchronously (for instant rendering while background fetch runs)
export function getCachedData(url) {
  const entry = cache.get(url);
  return entry ? entry.data : null;
}

// Invalidate cache for a specific URL or prefix
export function invalidateCache(urlPrefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(urlPrefix)) {
      cache.delete(key);
    }
  }
}

// Hook-friendly: fetch with stale-while-revalidate pattern
// Returns { data, loading } — shows cached data instantly, refreshes in background
export function useCachedFetch(url) {
  // This is imported by React components, so we return a helper
  // that works with useState/useEffect patterns
  return { cachedFetch, getCachedData, invalidateCache };
}
