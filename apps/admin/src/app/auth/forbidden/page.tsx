import { Button } from "@docix/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@docix/ui/components/card";
import Link from "next/link";

export default function ForbiddenPage() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center py-2">
			<Card className="max-w-md w-full text-center">
				<CardHeader>
					<CardTitle className="text-2xl text-destructive">
						Access Denied
					</CardTitle>
					<CardDescription>
						You do not have permission to access the admin dashboard.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						This area is restricted to administrators only. If you believe this
						is an error, please contact your system administrator.
					</p>
				</CardContent>
				<CardFooter className="flex flex-col gap-2">
					<Button
						className="w-full"
						nativeButton={false}
						render={<Link href="/auth/sign-in" />}
					>
						Sign in with different account
					</Button>
					<Button
						variant="outline"
						className="w-full"
						nativeButton={false}
						render={<Link href="http://localhost:3000" />}
					>
						Go to main site
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
