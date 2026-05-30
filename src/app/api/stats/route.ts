import { NextResponse } from 'next/server';
import { getStatistics } from '@/lib/sheets';

export async function GET() {
  try {
    const stats = await getStatistics();
    return NextResponse.json(stats);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
