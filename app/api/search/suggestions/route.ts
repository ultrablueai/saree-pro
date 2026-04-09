import { NextResponse } from 'next/server';
import { getSearchSuggestions } from '@/lib/ai-search';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '5');

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = await getSearchSuggestions(query, limit);
    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
