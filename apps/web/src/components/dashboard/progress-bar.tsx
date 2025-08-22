import { ProgressBarProps } from './types';

export function ProgressBar({ 
  label, 
  value, 
  maxValue, 
  color, 
  showPercentage = true 
}: ProgressBarProps) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{value}</span>
          {showPercentage && (
            <span className="text-xs text-muted-foreground">
              ({percentage.toFixed(0)}%)
            </span>
          )}
        </div>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ 
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  );
}