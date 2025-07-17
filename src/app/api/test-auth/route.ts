import { NextRequest, NextResponse } from 'next/server';
import { testAuthenticationSystem } from '@/lib/test-auth';

export async function GET(request: NextRequest) {
  try {
    console.log('Running authentication system test...');
    await testAuthenticationSystem();
    
    return NextResponse.json(
      { message: 'Authentication test completed successfully. Check server logs for details.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Authentication test failed:', error);
    return NextResponse.json(
      { error: 'Authentication test failed', details: error },
      { status: 500 }
    );
  }
}