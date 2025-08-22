'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Briefcase } from 'lucide-react';

interface AppHeaderProps {
  className?: string;
}

export function AppHeader({ className }: AppHeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const getActiveClass = (path: string) => {
    return pathname === path ? "bg-muted" : "";
  };

  return (
    <header className={`sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className || ''}`}>
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Job Digest</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className={getActiveClass('/dashboard')}>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className={getActiveClass('/jobs')}>
              <Link href="/jobs">Jobs</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className={getActiveClass('/kanban')}>
              <Link href="/kanban">Kanban</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className={getActiveClass('/insights')}>
              <Link href="/insights">Career Insights</Link>
            </Button>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {session?.user && (
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Welcome,</span>
              <span className="font-medium">{session.user.name || session.user.email?.split('@')[0]}</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}