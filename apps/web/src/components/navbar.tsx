"use client";

import Link from "next/link";
import UserButton from "./user-button";

export default function Navbar() {
	return (
		<nav className="w-full flex items-center justify-between py-4 lg:px-16 md:px-8 sm:px-6 px-4 border-b">
			<div className="flex items-center gap-6">
				<Link href="/" className="text-lg font-semibold">
					Docix
				</Link>

				<div className="hidden sm:flex items-center gap-4 text-sm">
					<Link
						href="/browse"
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						Browse
					</Link>
				</div>
			</div>

			<div className="flex gap-4 items-center">
				<UserButton />
			</div>
		</nav>
	);
}
