import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@docix/ui/components/card";

export default function DashboardPage() {
	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
				<p className="text-muted-foreground">
					Welcome to the Docix admin dashboard.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader>
						<CardDescription>Total Users</CardDescription>
						<CardTitle className="text-3xl">0</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Total Series</CardDescription>
						<CardTitle className="text-3xl">0</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Total Chapters</CardDescription>
						<CardTitle className="text-3xl">0</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Total Views</CardDescription>
						<CardTitle className="text-3xl">0</CardTitle>
					</CardHeader>
				</Card>
			</div>
		</div>
	);
}
