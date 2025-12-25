import "@docix/ui/globals.css";
import { Toaster } from "@docix/ui/components/sonner";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
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

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={inter.variable} suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<TanstackQueryProvider>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange
					>
						{children}
						<Toaster richColors />
					</ThemeProvider>
				</TanstackQueryProvider>
			</body>
		</html>
	);
}
