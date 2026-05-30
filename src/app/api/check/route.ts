import { NextRequest, NextResponse } from 'next/server';
import { checkKelulusan } from '@/lib/sheets';

export async function GET(req: NextRequest) {
  const nisn = req.nextUrl.searchParams.get('nisn') || '';
  try {
    const result = await checkKelulusan(nisn);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
