"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Id } from "@convex/_generated/dataModel";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationType = "new_chapter" | "series_update" | "system";

export const NotificationForm = () => {
  const [type, setType] = useState<NotificationType>("system");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [selectedUser, setSelectedUser] = useState<Id<"users"> | "all" | "">(
    ""
  );
  const [seriesId, setSeriesId] = useState<Id<"series"> | "">("");
  const [chapterId, setChapterId] = useState<Id<"chapters"> | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const createNotification = useMutation(api.notifications.createNotification);
  const users = useQuery(api.users.getAllUsers);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !message || !selectedUser) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      if (selectedUser === "all") {
        // Send to all users
        if (!users) {
          toast.error("Users data not loaded");
          return;
        }

        await Promise.all(
          users.map((user) =>
            createNotification({
              userId: user._id,
              type,
              title,
              message,
              seriesId: seriesId || undefined,
              chapterId: chapterId || undefined,
              link: link || undefined,
            })
          )
        );

        toast.success(`Notification sent to ${users.length} users`);
      } else {
        // Send to specific user
        await createNotification({
          userId: selectedUser as Id<"users">,
          type,
          title,
          message,
          seriesId: seriesId || undefined,
          chapterId: chapterId || undefined,
          link: link || undefined,
        });

        toast.success("Notification created successfully");
      }

      // Reset form
      setTitle("");
      setMessage("");
      setLink("");
      setSelectedUser("");
      setSeriesId("");
      setChapterId("");
      setType("system");
    } catch (error) {
      console.error("Failed to create notification:", error);
      toast.error("Failed to create notification");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users?.filter((user) =>
    user.clerkUserId.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Create Notification</CardTitle>
        <CardDescription>
          Send notifications to users about updates, new chapters, or system
          messages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user">Send To *</Label>
            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={userSearchOpen}
                  className="w-full justify-between"
                >
                  {selectedUser === "all"
                    ? "All Users"
                    : selectedUser
                    ? users?.find((user) => user._id === selectedUser)
                        ?.clerkUserId
                    : "Select user..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput
                    placeholder="Search users..."
                    value={userSearchQuery}
                    onValueChange={setUserSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setSelectedUser("all");
                          setUserSearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedUser === "all" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Users
                      </CommandItem>
                      {filteredUsers?.map((user) => (
                        <CommandItem
                          key={user._id}
                          value={user._id}
                          onSelect={() => {
                            setSelectedUser(user._id);
                            setUserSearchOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedUser === user._id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {user.clerkUserId}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as NotificationType)}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select notification type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="new_chapter">New Chapter</SelectItem>
                <SelectItem value="series_update">Series Update</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Notification title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Notification message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link">Link (Optional)</Label>
            <Input
              id="link"
              placeholder="/manga/series-slug"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seriesId">Series ID (Optional)</Label>
            <Input
              id="seriesId"
              placeholder="Series ID"
              value={seriesId}
              onChange={(e) => setSeriesId(e.target.value as Id<"series">)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chapterId">Chapter ID (Optional)</Label>
            <Input
              id="chapterId"
              placeholder="Chapter ID"
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value as Id<"chapters">)}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Sending..." : "Send Notification"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
