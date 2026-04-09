import { NextResponse } from 'next/server';
import { searchPlatform } from '@/lib/ai-search';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSessionUser();
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';

    if (!session && !query) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchPlatform(query);
    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
