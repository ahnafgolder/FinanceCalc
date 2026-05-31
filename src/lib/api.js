const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export function getApiBase() {
  return API_BASE;
}

/** Resolve API paths for web (same origin) or Capacitor (remote backend). */
export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${normalized}` : normalized;
}

export function getAuthBasePath() {
  return apiUrl('/api/auth');
}

/** Fetch with credentials so NextAuth session cookies work cross-origin on mobile. */
export async function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });
}
