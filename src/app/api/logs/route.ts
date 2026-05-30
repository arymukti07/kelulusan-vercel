import { NextResponse } from 'next/server';
import { getActivityLog } from '@/lib/sheets';

export async function GET() {
  try {
    const result = await getActivityLog();
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, data: [], total: 0, error: msg }, { status: 500 });
  }
}
