import Link from "next/link";
import { ModeToggle } from "./mode-toggle";
import UserButton from "./user-button";

export default function Navbar() {
	return (
		<nav className="w-full flex items-center justify-between py-4 lg:px-16 md:px-8 sm:px-6 px-4 border-b">
			<Link href="/" className="text-lg font-semibold">
				Docix
			</Link>

			<div className="flex gap-4 items-center">
				<ModeToggle />
				<UserButton />
			</div>
		</nav>
	);
}
