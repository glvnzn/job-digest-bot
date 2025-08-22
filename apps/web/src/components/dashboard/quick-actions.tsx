import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  BarChart3, 
  Brain, 
  Eye,
  Target,
  Briefcase
} from 'lucide-react';

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    title: "Browse Jobs",
    description: "Find new opportunities",
    href: "/jobs",
    icon: Search,
    color: "bg-blue-500"
  },
  {
    title: "Kanban Board",
    description: "Manage applications",
    href: "/kanban",
    icon: BarChart3,
    color: "bg-green-500"
  },
  {
    title: "Career Insights",
    description: "AI-powered advice",
    href: "/insights", 
    icon: Brain,
    color: "bg-purple-500"
  }
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.href}
              asChild
              variant="outline"
              className="h-auto p-4 flex-col gap-2 hover:shadow-sm transition-shadow"
            >
              <Link href={action.href}>
                <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center mb-2`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <div className="text-sm font-medium">{action.title}</div>
                <div className="text-xs text-muted-foreground text-center">
                  {action.description}
                </div>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}