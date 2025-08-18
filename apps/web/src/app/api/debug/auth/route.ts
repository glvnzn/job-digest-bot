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
        userId: (session as any)?.userId,
        user: session?.user,
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
          API_BASE_URL: process.env.API_BASE_URL,
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
          API_BASE_URL: process.env.API_BASE_URL,
          hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        }
      }
    });
  }
}