import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
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
  const trendColor = trend
    ? trend.value > 0
      ? "text-green-500"
      : trend.value < 0
        ? "text-red-500"
        : "text-muted-foreground"
    : "";

  const formattedValue =
    typeof value === "number" ? value.toLocaleString() : value;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className={cn("text-xs mt-1 flex items-center gap-1", trendColor)}>
            <span
              className={cn(
                "inline-block",
                trend.value > 0 && "rotate-0",
                trend.value < 0 && "rotate-180"
              )}
            >
              {trend.value !== 0 && "↑"}
            </span>
            <span>
              {trend.value > 0 && "+"}
              {trend.value}% {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
