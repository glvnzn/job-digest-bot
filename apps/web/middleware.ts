import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Additional middleware logic can be added here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check if user is authenticated for protected routes
        if (req.nextUrl.pathname.startsWith('/jobs')) {
          return !!token
        }
        return true
      },
    },
  }
)

export const config = {
  matcher: ['/jobs/:path*']
}