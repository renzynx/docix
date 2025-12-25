import "@docix/ui/globals.css";
import { Toaster } from "@docix/ui/components/sonner";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { MaintenancePage } from "@/components/maintenance-page";
import { ThemeProvider } from "@/components/theme-provider";
import { getSiteConfig } from "@/lib/api.server";
import { TanstackQueryProvider } from "@/lib/tanstack-query/client";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
	try {
		const config = await getSiteConfig();
		return {
			title: {
				default: config.meta_title || config.name,
				template: `%s | ${config.name}`,
			},
			description: config.meta_description || config.description,
			icons: {
				icon: config.favicon_url || "/favicon.ico",
			},
		};
	} catch {
		return {
			title: "Docix",
			description: "Manga reading platform",
		};
	}
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	let isMaintenanceMode = false;
	let maintenanceMessage = "";
	let siteName = "Docix";

	try {
		const config = await getSiteConfig();
		siteName = config.name;
		if (config.maintenance?.enabled) {
			isMaintenanceMode = true;
			maintenanceMessage =
				config.maintenance.message ||
				"We are currently performing maintenance. Please check back soon.";
		}
	} catch {
		// If we can't fetch config, continue normally
	}

	return (
		<html lang="en" className={inter.variable} suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					{isMaintenanceMode ? (
						<MaintenancePage message={maintenanceMessage} siteName={siteName} />
					) : (
						<TanstackQueryProvider>{children}</TanstackQueryProvider>
					)}
					<Toaster richColors />
				</ThemeProvider>
			</body>
		</html>
	);
}
