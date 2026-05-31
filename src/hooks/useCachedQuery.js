'use client';

import { useCallback, useEffect, useState } from 'react';
import { subscribeCacheScope } from '@/lib/cacheScope';
import {
  cachedFetch,
  getCachedData,
  refreshCache,
  subscribeCache,
} from '@/lib/fetchCache';

/** Load API data with instant cache display and background refresh. */
export function useCachedQuery(url, deps = []) {
  const [data, setData] = useState(() => getCachedData(url));
  const [tick, setTick] = useState(0);
  const isLoading = data === null || data === undefined;

  const refetch = useCallback(async () => {
    try {
      const fresh = await refreshCache(url);
      if (fresh !== undefined) setData(fresh);
      else setData(getCachedData(url));
    } catch {
      // keep previous data on error
    }
    setTick((n) => n + 1);
  }, [url]);

  useEffect(() => {
    const unsubscribe = subscribeCache(url, (fresh) => {
      setData(fresh ?? null);
    });
    return unsubscribe;
  }, [url]);

  useEffect(() => {
    return subscribeCacheScope(() => {
      setData(getCachedData(url));
      setTick((n) => n + 1);
    });
  }, [url]);

  useEffect(() => {
    let cancelled = false;

    cachedFetch(url, {
      onUpdate: (fresh) => {
        if (!cancelled) setData(fresh);
      },
    })
      .then((result) => {
        if (!cancelled && result !== undefined) setData(result);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick, ...deps]);

  return { data, isLoading, refetch };
}
