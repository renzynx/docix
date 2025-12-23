import type { Metadata } from "next";
import { LibraryGrid } from "./_components/library-grid";

export const metadata: Metadata = {
	title: "My Library",
	description: "Your bookmarked manga series",
};

export default function LibraryPage() {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-2xl font-bold sm:text-3xl">My Library</h1>
				<p className="text-muted-foreground mt-1">
					Your bookmarked series for easy access
				</p>
			</div>
			<LibraryGrid />
		</div>
	);
}
