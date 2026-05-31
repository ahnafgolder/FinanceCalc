'use client';

import { useCallback, useEffect, useState } from 'react';
import { cachedFetch, getCachedData, invalidateCache } from '@/lib/fetchCache';

/** Load API data with instant cache display and background refresh. */
export function useCachedQuery(url, deps = []) {
  const [data, setData] = useState(() => getCachedData(url));
  const [tick, setTick] = useState(0);
  const isLoading = data === null || data === undefined;

  const refetch = useCallback(() => {
    invalidateCache(url);
    setTick((n) => n + 1);
  }, [url]);

  useEffect(() => {
    let cancelled = false;

    cachedFetch(url, {
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
