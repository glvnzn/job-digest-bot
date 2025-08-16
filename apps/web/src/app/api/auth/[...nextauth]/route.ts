import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:3333';

const handler = NextAuth({
  providers: [
    // Development credentials provider
    CredentialsProvider({
      id: "dev-login",
      name: "Development Login",
      credentials: {
        email: { label: "Email", type: "email" }
      },
      async authorize(credentials) {
        // In development, allow any email and create/login user via API
        if (process.env.NODE_ENV === 'development' && credentials?.email) {
          try {
            // Try to register/login the user via our API
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: credentials.email,
                googleId: `dev-${credentials.email}`, // Development Google ID
                name: credentials.email.split('@')[0]
              })
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data.user) {
                return {
                  id: data.data.user.id.toString(),
                  email: data.data.user.email,
                  name: data.data.user.name,
                  apiToken: data.data.token
                }
              }
            }
          } catch (error) {
            console.error('Dev login API error:', error);
          }
          
          // Fallback for development
          return {
            id: '1',
            email: credentials.email,
            name: credentials.email.split('@')[0],
          }
        }
        return null
      }
    }),
    // Google OAuth (when properly configured)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    ] : []),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // Initial sign in
      if (account && user) {
        if (account.provider === 'google') {
          // For Google OAuth, register/login via our API
          try {
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
              }
            }
          } catch (error) {
            console.error('Google OAuth API registration error:', error);
          }
        } else if (account.provider === 'dev-login') {
          // Development login
          token.apiToken = user.apiToken;
          token.userId = user.id;
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