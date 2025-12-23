import type { Chapter } from "@docix/types";
import { Button } from "@docix/ui/components/button";
import { Dialog, DialogTrigger } from "@docix/ui/components/dialog";
import { Spinner } from "@docix/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@docix/ui/components/table";
import {
	Add01Icon,
	Delete02Icon,
	Image01Icon,
	PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface ChapterTableProps {
	seriesId: string;
	chapters: Chapter[];
	isLoading: boolean;
	isAddDialogOpen: boolean;
	onAddDialogOpenChange: (open: boolean) => void;
	onEditChapter: (chapter: Chapter) => void;
	onDeleteChapter: (chapter: Chapter) => void;
}

export function ChapterTable({
	seriesId,
	chapters,
	isLoading,
	isAddDialogOpen,
	onAddDialogOpenChange,
	onEditChapter,
	onDeleteChapter,
}: ChapterTableProps) {
	// Sort chapters by number descending (newest first)
	const sortedChapters = [...chapters].sort((a, b) => b.number - a.number);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">Chapters</h2>
				<Dialog open={isAddDialogOpen} onOpenChange={onAddDialogOpenChange}>
					<DialogTrigger render={<Button />}>
						<HugeiconsIcon icon={Add01Icon} className="size-4" />
						Add Chapter
					</DialogTrigger>
				</Dialog>
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center py-8">
					<Spinner className="size-6" />
				</div>
			) : sortedChapters.length > 0 ? (
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[100px]">Chapter</TableHead>
								<TableHead>Title</TableHead>
								<TableHead>Pages</TableHead>
								<TableHead>Views</TableHead>
								<TableHead>Added</TableHead>
								<TableHead className="w-[150px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sortedChapters.map((chapter) => (
								<TableRow key={chapter.id}>
									<TableCell className="font-medium">
										Ch. {chapter.number}
									</TableCell>
									<TableCell>
										{chapter.title || (
											<span className="text-muted-foreground">—</span>
										)}
									</TableCell>
									<TableCell>{chapter.page_count}</TableCell>
									<TableCell>{chapter.view_count.toLocaleString()}</TableCell>
									<TableCell className="text-muted-foreground">
										{formatDistanceToNow(new Date(chapter.created_at), {
											addSuffix: true,
										})}
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => onEditChapter(chapter)}
												title="Edit chapter"
											>
												<HugeiconsIcon
													icon={PencilEdit01Icon}
													className="size-4"
												/>
											</Button>
											<Link href={`/series/${seriesId}/chapters/${chapter.id}`}>
												<Button
													variant="ghost"
													size="icon"
													title="Manage pages"
												>
													<HugeiconsIcon
														icon={Image01Icon}
														className="size-4"
													/>
												</Button>
											</Link>
											<Button
												variant="ghost"
												size="icon"
												className="text-destructive hover:text-destructive"
												onClick={() => onDeleteChapter(chapter)}
												title="Delete chapter"
											>
												<HugeiconsIcon icon={Delete02Icon} className="size-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			) : (
				<div className="rounded-lg border p-8 text-center text-muted-foreground">
					No chapters yet. Add your first chapter to get started.
				</div>
			)}
		</div>
	);
}
