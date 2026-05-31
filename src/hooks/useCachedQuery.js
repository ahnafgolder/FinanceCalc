'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  cachedFetch,
  cacheKeyAffected,
  getCachedData,
  invalidateCache,
  subscribeCacheKey,
  subscribeInvalidation,
} from '@/lib/fetchCache';

/** Load API data with instant cache display and background refresh. */
export function useCachedQuery(url, deps = []) {
  const [data, setData] = useState(() => getCachedData(url));
  const [tick, setTick] = useState(0);
  const isLoading = data === null || data === undefined;

  const refetch = useCallback(() => {
    invalidateCache(url);
    setTick((n) => n + 1);
  }, [url]);

  // When another screen mutates data, refetch if this query uses that cache key
  useEffect(() => {
    return subscribeInvalidation((prefix) => {
      if (cacheKeyAffected(url, prefix)) {
        setTick((n) => n + 1);
      }
    });
  }, [url]);

  // When refreshCache() finishes elsewhere, update this screen immediately
  useEffect(() => {
    return subscribeCacheKey(url, (fresh) => {
      setData(fresh);
    });
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    const forceRefresh = tick > 0;

    cachedFetch(url, {
      forceRefresh,
      onUpdate: (fresh) => {
        if (!cancelled) setData(fresh);
      },
    })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick, ...deps]);

  return { data, isLoading, refetch };
}
