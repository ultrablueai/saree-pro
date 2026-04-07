"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/auth";
import { markAllNotificationsAsRead, markNotificationAsRead } from "@/lib/notifications";

export async function markProfileNotificationRead(formData: FormData) {
  const session = await requireSessionUser();
  const notificationId = formData.get("notificationId");

  if (typeof notificationId !== "string" || notificationId.length === 0) {
    return;
  }

  await markNotificationAsRead(notificationId, session.id);
  revalidatePath("/workspace");
  revalidatePath("/workspace/profile");
}

export async function markProfileNotificationsRead() {
  const session = await requireSessionUser();
  await markAllNotificationsAsRead(session.id);
  revalidatePath("/workspace");
  revalidatePath("/workspace/profile");
}
