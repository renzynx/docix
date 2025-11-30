import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>

        {/* Description (e.g. "+5 in last 30 days") */}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}

        {/* Structured Trend (if used in future) */}
        {trend && (
          <div className="flex items-center mt-1 text-xs">
            <span
              className={cn(
                "flex items-center font-medium",
                trend.value > 0
                  ? "text-emerald-500"
                  : trend.value < 0
                  ? "text-rose-500"
                  : "text-muted-foreground"
              )}
            >
              {trend.value > 0 ? (
                <ArrowUp className="mr-1 h-3 w-3" />
              ) : trend.value < 0 ? (
                <ArrowDown className="mr-1 h-3 w-3" />
              ) : (
                <Minus className="mr-1 h-3 w-3" />
              )}
              {Math.abs(trend.value)}%
            </span>
            <span className="ml-1 text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
