import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';


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
    async redirect({ url, baseUrl }) {
      // Handle post-login redirects with intended URL support
      
      // If URL is from our domain, use it
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      // If it's a relative URL, make it absolute
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      
      // Default fallback hierarchy
      return `${baseUrl}/jobs`;
    },
    async jwt({ token, account, user }) {
      // Initial sign in with Google
      if (account && user && account.provider === 'google') {
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
              throw new Error('API registration failed');
            }
          } else {
            console.error('API registration HTTP error:', response.status);
            throw new Error(`API registration HTTP error: ${response.status}`);
          }
        } catch (error) {
          console.error('NextAuth API registration error:', error);
          throw new Error('API unavailable - authentication failed');
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