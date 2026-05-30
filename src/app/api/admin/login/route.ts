import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/sheets';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await verifyAdmin(body.username, body.password);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
