import type { ReactNode } from "react";
import Navbar from "@/components/navbar";

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-screen flex flex-col">
			<Navbar />

			<div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{children}
			</div>
		</div>
	);
}
