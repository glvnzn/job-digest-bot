import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import jwt from "jsonwebtoken"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

// Helper function to generate a development JWT token
const generateDevToken = (userId: string, email: string): string => {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret-key';
  return jwt.sign(
    { 
      userId: parseInt(userId), 
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }, 
    JWT_SECRET
  );
};


const handler = NextAuth({
  providers: [
    // Google OAuth - primary authentication method
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // Initial sign in with Google
      if (account && user && account.provider === 'google') {
        // Skip API calls during build time
        if (typeof window === 'undefined' && !process.env.DATABASE_URL) {
          // Build time - generate token for builds
          const devToken = generateDevToken(user.id || '1', user.email || '');
          token.apiToken = devToken;
          token.userId = user.id || '1';
          return { ...token, user };
        }
        
        try {
          // Register/login via our API
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              googleId: account.providerAccountId,
              name: user.name,
              avatarUrl: user.image
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data.token) {
              token.apiToken = data.data.token;
              token.userId = data.data.user.id;
            } else {
              console.error('API registration failed:', data);
              // Fallback: generate token for development
              const devToken = generateDevToken(user.id || '1', user.email || '');
              token.apiToken = devToken;
              token.userId = user.id || '1';
            }
          } else {
            console.error('API registration HTTP error:', response.status);
            // Fallback: generate token for development
            const devToken = generateDevToken(user.id || '1', user.email || '');
            token.apiToken = devToken;
            token.userId = user.id || '1';
          }
        } catch (error) {
          console.error('NextAuth API registration error:', error);
          // Fallback: generate token for development
          const devToken = generateDevToken(user.id || '1', user.email || '');
          token.apiToken = devToken;
          token.userId = user.id || '1';
        }
      }
      
      return token
    },
    async session({ session, token }) {
      // Add API token and user ID to session
      if (token.apiToken) {
        session.apiToken = token.apiToken as string;
        session.userId = token.userId as string | number;
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }