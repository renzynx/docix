import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const handleClerkWebhook = httpAction(async (ctx, request) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("CLERK_WEBHOOK_SECRET environment variable not set.");
  }

  // Verify the request
  const wh = new Webhook(webhookSecret);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    const payloadString = await request.text();
    const svixHeaders = {
      "svix-id": request.headers.get("svix-id")!,
      "svix-timestamp": request.headers.get("svix-timestamp")!,
      "svix-signature": request.headers.get("svix-signature")!,
    };
    event = wh.verify(payloadString, svixHeaders);
  } catch (err) {
    console.error("Error verifying Clerk webhook:", err);
    return new Response("Invalid webhook", { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case "user.created":
    case "user.updated":
      await ctx.runMutation(internal.users.updateOrCreateUser, {
        clerkUserId: event.data.id,
      });
      break;

    case "user.deleted":
      if (event.data.id) {
        await ctx.runMutation(internal.users.deleteUser, {
          clerkUserId: event.data.id,
        });
      }
      break;

    default:
      console.log("Received unhandled Clerk event type:", event.type);
  }

  return new Response(null, { status: 200 });
});

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: handleClerkWebhook,
});

export default http;
