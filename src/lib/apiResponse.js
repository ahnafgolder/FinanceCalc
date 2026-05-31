import { NextResponse } from 'next/server';

export function jsonResponse(data, { maxAge = 30 } = {}) {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': `private, max-age=${maxAge}, stale-while-revalidate=120`,
    },
  });
}
