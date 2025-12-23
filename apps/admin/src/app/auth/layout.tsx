import type { ReactNode } from "react";
import { ModeToggle } from "@/components/mode-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
	return (
		<>
			<div className="fixed top-4 right-4 z-50">
				<ModeToggle />
			</div>
			{children}
		</>
	);
}
