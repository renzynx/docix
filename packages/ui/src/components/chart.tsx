"use client";

import { cn } from "@docix/ui/lib/utils";
import type * as React from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

// Chart colors for consistent theming
export const CHART_COLORS = [
	"hsl(var(--chart-1, 220 70% 50%))",
	"hsl(var(--chart-2, 160 60% 45%))",
	"hsl(var(--chart-3, 30 80% 55%))",
	"hsl(var(--chart-4, 280 65% 60%))",
	"hsl(var(--chart-5, 340 75% 55%))",
] as const;

// Status colors for series
export const STATUS_COLORS: Record<string, string> = {
	ongoing: "hsl(142 76% 36%)", // green
	completed: "hsl(221 83% 53%)", // blue
	hiatus: "hsl(38 92% 50%)", // yellow/orange
	cancelled: "hsl(0 84% 60%)", // red
};

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	height?: number | string;
}

/**
 * Responsive chart container with consistent styling
 */
function ChartContainer({
	children,
	className,
	height = 300,
	...props
}: ChartContainerProps) {
	return (
		<div
			className={cn(
				"[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 text-xs",
				className,
			)}
			style={{ height: typeof height === "number" ? `${height}px` : height }}
			{...props}
		>
			<ResponsiveContainer width="100%" height="100%">
				{children}
			</ResponsiveContainer>
		</div>
	);
}

interface ChartTooltipContentProps {
	active?: boolean;
	payload?: Array<{
		name: string;
		value: number;
		color?: string;
		payload?: Record<string, unknown>;
	}>;
	label?: string;
	formatter?: (value: number, name: string) => React.ReactNode;
	labelFormatter?: (label: string) => React.ReactNode;
}

/**
 * Styled tooltip content for charts
 */
function ChartTooltipContent({
	active,
	payload,
	label,
	formatter,
	labelFormatter,
}: ChartTooltipContentProps) {
	if (!active || !payload?.length) {
		return null;
	}

	return (
		<div className="rounded-lg border bg-background px-3 py-2 shadow-lg">
			{label && (
				<p className="mb-1 font-medium text-foreground">
					{labelFormatter ? labelFormatter(label) : label}
				</p>
			)}
			<div className="space-y-1">
				{payload.map((item, index) => (
					<div key={index} className="flex items-center gap-2 text-sm">
						<div
							className="size-2 rounded-full"
							style={{ backgroundColor: item.color }}
						/>
						<span className="text-muted-foreground">{item.name}:</span>
						<span className="font-medium text-foreground">
							{formatter
								? formatter(item.value, item.name)
								: item.value.toLocaleString()}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

// Re-export recharts components for convenience
export {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ChartContainer,
	ChartTooltipContent,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
};
