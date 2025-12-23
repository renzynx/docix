"use client";

import type { ChapterNav } from "@docix/types";
import { Button } from "@docix/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@docix/ui/components/select";
import {
	ArrowLeft02Icon,
	ArrowRight02Icon,
	ArrowUp01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface ReaderAffixProps {
	seriesSlug: string;
	currentChapter: number;
	prevChapter?: ChapterNav;
	nextChapter?: ChapterNav;
	totalChapters: number;
}

export function ReaderAffix({
	seriesSlug,
	currentChapter,
	prevChapter,
	nextChapter,
	totalChapters,
}: ReaderAffixProps) {
	const router = useRouter();
	const [showScrollTop, setShowScrollTop] = useState(false);

	// Show scroll-to-top button after scrolling down
	useEffect(() => {
		const handleScroll = () => {
			setShowScrollTop(window.scrollY > 500);
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const scrollToTop = useCallback(() => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, []);

	const handleChapterChange = useCallback(
		(value: string | null) => {
			if (value) {
				router.push(`/read/${seriesSlug}/${value}`);
			}
		},
		[router, seriesSlug],
	);

	// Generate chapter options (1 to totalChapters)
	const chapterOptions = Array.from({ length: totalChapters }, (_, i) => i + 1);

	return (
		<>
			{/* Scroll to top - positioned at right on all screens */}
			<div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-50">
				<Button
					variant="secondary"
					size="icon"
					onClick={scrollToTop}
					className={`shadow-lg transition-all duration-300 size-9 sm:size-10 ${
						showScrollTop
							? "opacity-100 translate-y-0"
							: "opacity-0 translate-y-4 pointer-events-none"
					}`}
					aria-label="Scroll to top"
				>
					<HugeiconsIcon icon={ArrowUp01Icon} className="size-4 sm:size-5" />
				</Button>
			</div>

			{/* Chapter selector - centered on mobile, right-aligned on desktop */}
			<div className="fixed bottom-3 sm:bottom-6 left-1/2 sm:left-auto -translate-x-1/2 sm:translate-x-0 sm:right-6 z-50">
				<div className="flex items-center gap-0.5 sm:gap-1 bg-background/95 backdrop-blur rounded-full sm:rounded-lg shadow-lg px-1 sm:p-1 border">
					{/* Previous */}
					{prevChapter ? (
						<Button
							variant="ghost"
							size="icon"
							nativeButton={false}
							render={
								<Link href={`/read/${seriesSlug}/${prevChapter.number}`} />
							}
							aria-label="Previous chapter"
							className="size-8 sm:size-9"
						>
							<HugeiconsIcon
								icon={ArrowLeft02Icon}
								className="size-4 sm:size-[18px]"
							/>
						</Button>
					) : (
						<Button
							variant="ghost"
							size="icon"
							disabled
							aria-label="No previous chapter"
							className="size-8 sm:size-9"
						>
							<HugeiconsIcon
								icon={ArrowLeft02Icon}
								className="size-4 sm:size-[18px]"
							/>
						</Button>
					)}

					{/* Chapter dropdown */}
					<Select
						value={String(currentChapter)}
						onValueChange={handleChapterChange}
					>
						<SelectTrigger className="w-16 sm:w-20 h-7 sm:h-8 text-[11px] sm:text-xs border-0 bg-transparent px-1.5 sm:px-2">
							<SelectValue>{(value: string) => `Ch. ${value}`}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{chapterOptions.map((num) => (
								<SelectItem key={num} value={String(num)}>
									Chapter {num}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{/* Next */}
					{nextChapter ? (
						<Button
							variant="ghost"
							size="icon"
							nativeButton={false}
							render={
								<Link href={`/read/${seriesSlug}/${nextChapter.number}`} />
							}
							aria-label="Next chapter"
							className="size-8 sm:size-9"
						>
							<HugeiconsIcon
								icon={ArrowRight02Icon}
								className="size-4 sm:size-[18px]"
							/>
						</Button>
					) : (
						<Button
							variant="ghost"
							size="icon"
							disabled
							aria-label="No next chapter"
							className="size-8 sm:size-9"
						>
							<HugeiconsIcon
								icon={ArrowRight02Icon}
								className="size-4 sm:size-[18px]"
							/>
						</Button>
					)}
				</div>
			</div>
		</>
	);
}
