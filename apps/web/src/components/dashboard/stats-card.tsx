import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { StatsCardProps } from './types';

export function StatsCard({ title, value, description, icon: Icon, trend }: StatsCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.isPositive) return <TrendingUp className="h-3 w-3 text-green-600" />;
    return <TrendingDown className="h-3 w-3 text-red-600" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    return trend.isPositive ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend && (
            <div className={`flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-xs font-medium">{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}