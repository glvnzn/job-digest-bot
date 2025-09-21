export const dynamic = 'force-dynamic';
export const revalidate = 0;

import './globals.css';
import { AppProviders } from '@/providers';

export const metadata = {
  title: 'Job Digest Bot - AI-Powered Job Alert Curation',
  description: 'Automatically curate and filter job alerts from your email using AI. Get relevant job opportunities delivered via Telegram.',
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
