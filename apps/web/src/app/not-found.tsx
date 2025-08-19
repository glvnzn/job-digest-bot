export const dynamic = 'force-dynamic';

import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Page Not Found</h2>
        <p className="text-gray-600">Could not find the requested page.</p>
        <Link 
          href="/"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}