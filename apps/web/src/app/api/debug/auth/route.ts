import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    return NextResponse.json({
      success: true,
      data: {
        hasSession: !!session,
        sessionKeys: session ? Object.keys(session) : [],
        hasApiToken: !!(session as any)?.apiToken,
        apiToken: (session as any)?.apiToken ? `${(session as any).apiToken.substring(0, 20)}...` : null, // Show first 20 chars
        userId: (session as any)?.userId,
        user: session?.user,
        fullSession: session, // Include full session for debugging
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
          hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        }
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
          hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        }
      }
    });
  }
}