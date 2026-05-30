import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/sheets';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: true, message: msg }, { status: 500 });
  }
}
