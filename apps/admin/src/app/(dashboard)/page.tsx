"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@docix/ui/components/card";
import {
	Cell,
	ChartContainer,
	ChartTooltipContent,
	Pie,
	PieChart,
	STATUS_COLORS,
	Tooltip,
} from "@docix/ui/components/chart";
import { Skeleton } from "@docix/ui/components/skeleton";
import {
	BookOpen01Icon,
	UserGroupIcon,
	ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { adminGetDashboardStatsQueryOptions } from "@/lib/api.generated";

export default function DashboardPage() {
	const { data: stats, isLoading } = useQuery(
		adminGetDashboardStatsQueryOptions(),
	);

	const pieChartData = stats?.series_by_status
		? Object.entries(stats.series_by_status).map(([status, count]) => ({
				name: status.charAt(0).toUpperCase() + status.slice(1),
				value: count,
				fill: STATUS_COLORS[status] ?? "hsl(var(--muted))",
			}))
		: [];

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
				<p className="text-muted-foreground">
					Welcome to the Docix admin dashboard.
				</p>
			</div>

			{/* Stats Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<StatsCard
					title="Total Users"
					value={stats?.total_users}
					isLoading={isLoading}
					icon={
						<HugeiconsIcon
							icon={UserGroupIcon}
							className="size-4 text-muted-foreground"
						/>
					}
					subtitle={
						stats
							? `${stats.verified_users} verified, ${stats.banned_users} banned`
							: undefined
					}
				/>
				<StatsCard
					title="Total Series"
					value={stats?.total_series}
					isLoading={isLoading}
					icon={
						<HugeiconsIcon
							icon={BookOpen01Icon}
							className="size-4 text-muted-foreground"
						/>
					}
				/>
				<StatsCard
					title="Total Chapters"
					value={stats?.total_chapters}
					isLoading={isLoading}
					icon={
						<HugeiconsIcon
							icon={BookOpen01Icon}
							className="size-4 text-muted-foreground"
						/>
					}
				/>
				<StatsCard
					title="Total Views"
					value={stats?.total_views}
					isLoading={isLoading}
					icon={
						<HugeiconsIcon
							icon={ViewIcon}
							className="size-4 text-muted-foreground"
						/>
					}
				/>
			</div>

			{/* Charts and Recent Activity */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
				{/* Series by Status Pie Chart */}
				<Card className="col-span-full lg:col-span-3">
					<CardHeader>
						<CardTitle>Series by Status</CardTitle>
						<CardDescription>
							Distribution of series across different statuses
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className="flex h-[300px] items-center justify-center">
								<Skeleton className="size-[200px] rounded-full" />
							</div>
						) : pieChartData.length > 0 ? (
							<ChartContainer height={300}>
								<PieChart>
									<Pie
										data={pieChartData}
										dataKey="value"
										nameKey="name"
										cx="50%"
										cy="50%"
										outerRadius={100}
										label={({
											name,
											percent,
										}: {
											name: string;
											percent: number;
										}) => `${name} ${(percent * 100).toFixed(0)}%`}
										labelLine={false}
									>
										{pieChartData.map((entry) => (
											<Cell key={entry.name} fill={entry.fill} />
										))}
									</Pie>
									<Tooltip content={<ChartTooltipContent />} />
								</PieChart>
							</ChartContainer>
						) : (
							<div className="flex h-[300px] items-center justify-center text-muted-foreground">
								No series data available
							</div>
						)}
					</CardContent>
				</Card>

				{/* Recent Series */}
				<Card className="col-span-full lg:col-span-4">
					<CardHeader>
						<CardTitle>Recent Series</CardTitle>
						<CardDescription>
							Latest series added to the platform
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className="space-y-4">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="flex items-center gap-4">
										<Skeleton className="size-10 rounded" />
										<div className="flex-1 space-y-2">
											<Skeleton className="h-4 w-3/4" />
											<Skeleton className="h-3 w-1/2" />
										</div>
									</div>
								))}
							</div>
						) : stats?.recent_series && stats.recent_series.length > 0 ? (
							<div className="space-y-4">
								{stats.recent_series.map((series) => (
									<div key={series.id} className="flex items-center gap-4">
										{series.cover_image ? (
											<img
												src={series.cover_image}
												alt={series.title}
												className="size-10 rounded object-cover"
											/>
										) : (
											<div className="flex size-10 items-center justify-center rounded bg-muted">
												<HugeiconsIcon
													icon={BookOpen01Icon}
													className="size-5 text-muted-foreground"
												/>
											</div>
										)}
										<div className="min-w-0 flex-1">
											<p className="truncate font-medium">{series.title}</p>
											<p className="text-sm text-muted-foreground">
												{series.status} &middot;{" "}
												{new Date(series.created_at).toLocaleDateString()}
											</p>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="flex h-[200px] items-center justify-center text-muted-foreground">
								No recent series
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Recent Users */}
			<Card>
				<CardHeader>
					<CardTitle>Recent Users</CardTitle>
					<CardDescription>
						Latest users who joined the platform
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
							{Array.from({ length: 5 }).map((_, i) => (
								<div key={i} className="flex items-center gap-3">
									<Skeleton className="size-8 rounded-full" />
									<div className="flex-1 space-y-1">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-3 w-16" />
									</div>
								</div>
							))}
						</div>
					) : stats?.recent_users && stats.recent_users.length > 0 ? (
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
							{stats.recent_users.map((user) => (
								<div key={user.id} className="flex items-center gap-3">
									{user.avatar ? (
										<img
											src={user.avatar}
											alt={user.username || user.email}
											className="size-8 rounded-full object-cover"
										/>
									) : (
										<div className="flex size-8 items-center justify-center rounded-full bg-muted">
											<HugeiconsIcon
												icon={UserGroupIcon}
												className="size-4 text-muted-foreground"
											/>
										</div>
									)}
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">
											{user.username || user.email.split("@")[0]}
										</p>
										<p className="text-xs text-muted-foreground">
											{new Date(user.created_at).toLocaleDateString()}
										</p>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="flex h-[100px] items-center justify-center text-muted-foreground">
							No recent users
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

interface StatsCardProps {
	title: string;
	value?: number;
	isLoading: boolean;
	icon?: ReactNode;
	subtitle?: string;
}

function StatsCard({
	title,
	value,
	isLoading,
	icon,
	subtitle,
}: StatsCardProps) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardDescription>{title}</CardDescription>
				{icon}
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-8 w-20" />
				) : (
					<>
						<div className="text-3xl font-bold">
							{(value ?? 0).toLocaleString()}
						</div>
						{subtitle && (
							<p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
