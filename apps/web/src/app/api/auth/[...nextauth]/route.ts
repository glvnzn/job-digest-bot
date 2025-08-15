import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

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
        // In development, allow any email
        if (process.env.NODE_ENV === 'development' && credentials?.email) {
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
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }