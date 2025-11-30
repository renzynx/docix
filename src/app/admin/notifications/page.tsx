import { NotificationsTable } from "@/components/admin/notifications/notifications-table";
import { ConvexAuthLoading } from "@/components/convex-auth-loading";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { api } from "@convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { Loader } from "lucide-react";

export default async function Page() {
  const token =
    (await (await auth()).getToken({ template: "convex" })) ?? undefined;
  const preloadedNotifications = await preloadQuery(
    api.notifications.getAllNotifications,
    {},
    { token }
  );

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
          <CardDescription>
            View and manage all notifications sent to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConvexAuthLoading
            fallback={
              <div className="py-12 text-center text-muted-foreground">
                <Loader className="mx-auto mb-2 h-6 w-6 animate-spin" />
                Loading notifications...
              </div>
            }
          >
            <NotificationsTable
              preloadedNotifications={preloadedNotifications}
            />
          </ConvexAuthLoading>
        </CardContent>
      </Card>
    </div>
  );
}
