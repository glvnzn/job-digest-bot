import { ChartDataPoint } from './types';

interface SimpleChartProps {
  data: ChartDataPoint[];
  type: 'bar' | 'donut';
  height?: number;
}

export function SimpleChart({ data, type, height = 200 }: SimpleChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No data available
      </div>
    );
  }

  if (type === 'bar') {
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <div className="space-y-3" style={{ height }}>
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.label}</span>
              <span className="text-muted-foreground">{item.value}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ 
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color || '#3B82F6'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'donut') {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;

    return (
      <div className="flex items-center gap-6">
        <div className="relative" style={{ width: height * 0.6, height: height * 0.6 }}>
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
            <circle
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke="#e5e7eb"
              strokeWidth="3"
            />
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const strokeDasharray = `${percentage} ${100 - percentage}`;
              const strokeDashoffset = -cumulativePercentage;
              cumulativePercentage += percentage;
              
              return (
                <circle
                  key={index}
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke={item.color || '#3B82F6'}
                  strokeWidth="3"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-700 ease-out"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold">{total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
        
        <div className="space-y-2 flex-1">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color || '#3B82F6' }}
              />
              <span className="text-sm flex-1">{item.label}</span>
              <span className="text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}