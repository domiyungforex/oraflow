import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import { db } from "@orderflow/db";

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{
      id: string;
      email_address: string;
      verification?: { status: string };
    }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
    phone_numbers?: Array<{
      id: string;
      phone_number: string;
    }>;
  };
}

async function handleUserCreated(event: ClerkWebhookEvent) {
  const { id, email_addresses, first_name, last_name, image_url, phone_numbers } = event.data;

  const primaryEmail = email_addresses?.find(
    (e) => e.verification?.status === "verified"
  ) || email_addresses?.[0];

  if (!primaryEmail) {
    console.error("No email found for user:", id);
    return;
  }

  const existing = await db.user.findUnique({
    where: { clerkId: id },
  });

  if (existing) {
    console.log("User already exists, updating:", id);
    await db.user.update({
      where: { clerkId: id },
      data: {
        email: primaryEmail.email_address,
        firstName: first_name || null,
        lastName: last_name || null,
        avatarUrl: image_url || null,
        phone: phone_numbers?.[0]?.phone_number || null,
      },
    });
    return;
  }

  await db.user.create({
    data: {
      clerkId: id,
      email: primaryEmail.email_address,
      firstName: first_name || null,
      lastName: last_name || null,
      avatarUrl: image_url || null,
      phone: phone_numbers?.[0]?.phone_number || null,
    },
  });

  console.log("User created:", id, primaryEmail.email_address);
}

async function handleUserUpdated(event: ClerkWebhookEvent) {
  const { id, email_addresses, first_name, last_name, image_url, phone_numbers } = event.data;

  const primaryEmail = email_addresses?.[0];

  await db.user.updateMany({
    where: { clerkId: id },
    data: {
      email: primaryEmail?.email_address || undefined,
      firstName: first_name || undefined,
      lastName: last_name || undefined,
      avatarUrl: image_url || undefined,
      phone: phone_numbers?.[0]?.phone_number || undefined,
    },
  });

  console.log("User updated:", id);
}

async function handleUserDeleted(event: ClerkWebhookEvent) {
  const { id } = event.data;
  console.log("User deleted in Clerk:", id, "- keeping database record for audit trail");
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headerStore = await headers();

  const svixId = headerStore.get("svix-id");
  const svixTimestamp = headerStore.get("svix-timestamp");
  const svixSignature = headerStore.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const wh = new Webhook(webhookSecret);
  let event: ClerkWebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "user.created":
        await handleUserCreated(event);
        break;
      case "user.updated":
        await handleUserUpdated(event);
        break;
      case "user.deleted":
        await handleUserDeleted(event);
        break;
      default:
        console.log(`Unhandled Clerk event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ received: true, error: "Internal error" });
  }
}
