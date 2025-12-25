"use client";

import type { Tag } from "@docix/types";
import { Button } from "@docix/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@docix/ui/components/dialog";
import { Input } from "@docix/ui/components/input";
import { Label } from "@docix/ui/components/label";
import { Spinner } from "@docix/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@docix/ui/components/table";
import { Textarea } from "@docix/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	adminCreateTagMutationOptions,
	adminDeleteTagMutationOptions,
	adminListTagsQueryOptions,
	adminUpdateTagMutationOptions,
	queryKeys,
} from "@docix/api";

export default function TagsPage() {
	const queryClient = useQueryClient();
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [editingTag, setEditingTag] = useState<Tag | null>(null);
	const [deleteConfirm, setDeleteConfirm] = useState<Tag | null>(null);

	const { data: tags, isLoading } = useQuery(adminListTagsQueryOptions());

	const createMutation = useMutation({
		...adminCreateTagMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminTags });
			setIsCreateOpen(false);
			toast.success("Tag created successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to create tag");
		},
	});

	const updateMutation = useMutation({
		...adminUpdateTagMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminTags });
			setEditingTag(null);
			toast.success("Tag updated successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update tag");
		},
	});

	const deleteMutation = useMutation({
		...adminDeleteTagMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminTags });
			setDeleteConfirm(null);
			toast.success("Tag deleted successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete tag");
		},
	});

	const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		createMutation.mutate({
			name: formData.get("name") as string,
			description: formData.get("description") as string,
		});
	};

	const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!editingTag) return;
		const formData = new FormData(e.currentTarget);
		updateMutation.mutate({
			id: editingTag.id,
			name: formData.get("name") as string,
			description: formData.get("description") as string,
		});
	};

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Tags</h1>
					<p className="text-muted-foreground">
						Manage content tags and categories.
					</p>
				</div>
				<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
					<DialogTrigger render={<Button />}>Add Tag</DialogTrigger>
					<DialogContent>
						<form onSubmit={handleCreate}>
							<DialogHeader>
								<DialogTitle>Create Tag</DialogTitle>
								<DialogDescription>
									Add a new tag for categorizing content.
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="grid gap-2">
									<Label htmlFor="name">Name</Label>
									<Input id="name" name="name" placeholder="Action" required />
								</div>
								<div className="grid gap-2">
									<Label htmlFor="description">Description</Label>
									<Textarea
										id="description"
										name="description"
										placeholder="Series with action scenes..."
									/>
								</div>
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsCreateOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={createMutation.isPending}>
									{createMutation.isPending && <Spinner className="mr-2" />}
									Create
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<Spinner className="size-8" />
				</div>
			) : tags && tags.length > 0 ? (
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Slug</TableHead>
								<TableHead>Description</TableHead>
								<TableHead className="w-[100px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tags.map((tag) => (
								<TableRow key={tag.id}>
									<TableCell className="font-medium">{tag.name}</TableCell>
									<TableCell className="text-muted-foreground">
										{tag.slug}
									</TableCell>
									<TableCell className="max-w-[300px] truncate">
										{tag.description || "-"}
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setEditingTag(tag)}
											>
												Edit
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="text-destructive"
												onClick={() => setDeleteConfirm(tag)}
											>
												Delete
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
					No tags found. Create your first tag to get started.
				</div>
			)}

			{/* Edit Dialog */}
			<Dialog open={!!editingTag} onOpenChange={() => setEditingTag(null)}>
				<DialogContent>
					<form onSubmit={handleUpdate}>
						<DialogHeader>
							<DialogTitle>Edit Tag</DialogTitle>
							<DialogDescription>Update the tag details.</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-name">Name</Label>
								<Input
									id="edit-name"
									name="name"
									defaultValue={editingTag?.name}
									required
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-description">Description</Label>
								<Textarea
									id="edit-description"
									name="description"
									defaultValue={editingTag?.description || ""}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditingTag(null)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={updateMutation.isPending}>
								{updateMutation.isPending && <Spinner className="mr-2" />}
								Save Changes
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog
				open={!!deleteConfirm}
				onOpenChange={() => setDeleteConfirm(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Tag</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete "{deleteConfirm?.name}"? This
							action cannot be undone and will remove the tag from all series.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteConfirm(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() =>
								deleteConfirm && deleteMutation.mutate(deleteConfirm.id)
							}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending && <Spinner className="mr-2" />}
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
