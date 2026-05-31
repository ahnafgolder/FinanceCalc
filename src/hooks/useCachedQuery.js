'use client';

import { useCallback, useEffect, useState } from 'react';
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
    } catch {
      // keep showing previous data on error
    }
    setTick((n) => n + 1);
  }, [url]);

  useEffect(() => {
    const unsubscribe = subscribeCache(url, (fresh) => {
      setData(fresh);
    });
    return unsubscribe;
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
