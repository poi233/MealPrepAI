import { NextResponse } from 'next/server';
import { seedFavoritesData } from '@/lib/db';

export async function POST() {
  try {
    await seedFavoritesData();
    return NextResponse.json({ success: true, message: 'Seed data created successfully' });
  } catch (error) {
    console.error('Failed to seed data:', error);
    return NextResponse.json({ success: false, error: 'Failed to seed data' }, { status: 500 });
  }
}