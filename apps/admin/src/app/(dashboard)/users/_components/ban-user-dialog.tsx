"use client";

import type { User } from "@docix/types";
import { Button } from "@docix/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@docix/ui/components/dialog";
import { Label } from "@docix/ui/components/label";
import { Spinner } from "@docix/ui/components/spinner";
import { Textarea } from "@docix/ui/components/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	adminBanUserMutationOptions,
	adminUnbanUserMutationOptions,
	queryKeys,
} from "@/lib/api";

interface BanUserDialogProps {
	user: User | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function BanUserDialog({
	user,
	open,
	onOpenChange,
}: BanUserDialogProps) {
	const queryClient = useQueryClient();
	const [reason, setReason] = useState("");

	const banMutation = useMutation({
		...adminBanUserMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
			onOpenChange(false);
			setReason("");
			toast.success(`User ${user?.email} has been banned`);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to ban user");
		},
	});

	const unbanMutation = useMutation({
		...adminUnbanUserMutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
			onOpenChange(false);
			toast.success(`User ${user?.email} has been unbanned`);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to unban user");
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;

		if (user.is_banned) {
			unbanMutation.mutate(user.id);
		} else {
			if (!reason.trim()) {
				toast.error("Please provide a reason for banning");
				return;
			}
			banMutation.mutate({ user_id: user.id, reason });
		}
	};

	const isPending = banMutation.isPending || unbanMutation.isPending;
	const isBanned = user?.is_banned ?? false;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{isBanned ? "Unban User" : "Ban User"}</DialogTitle>
						<DialogDescription>
							{isBanned
								? `Are you sure you want to unban ${user?.email}? They will regain access to their account.`
								: `Ban ${user?.email} from accessing the platform. This action can be reversed later.`}
						</DialogDescription>
					</DialogHeader>

					{!isBanned && (
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<Label htmlFor="ban-reason">Reason for ban</Label>
								<Textarea
									id="ban-reason"
									placeholder="Describe why this user is being banned..."
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									required
									rows={3}
								/>
							</div>
						</div>
					)}

					{isBanned && user?.ban_reason && (
						<div className="py-4">
							<p className="text-sm text-muted-foreground">
								<span className="font-medium">Previous ban reason:</span>{" "}
								{user.ban_reason}
							</p>
						</div>
					)}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant={isBanned ? "default" : "destructive"}
							disabled={isPending}
						>
							{isPending && <Spinner className="mr-2" />}
							{isBanned ? "Unban User" : "Ban User"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
