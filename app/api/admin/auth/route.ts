import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'סיסמה שגויה' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: 'שגיאה בבקשה' }, { status: 400 });
  }
}
