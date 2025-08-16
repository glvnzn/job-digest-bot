import './globals.css';
import { AppProviders } from '@/providers';

export const metadata = {
  title: 'Job Digest Platform',
  description: 'AI-powered job discovery and application tracking',
};

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-background font-sans antialiased">
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
