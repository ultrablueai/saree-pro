"use server";

import { redirect } from "next/navigation";
import { clearSessionUser } from "@/lib/auth";

export async function signOutWorkspace() {
  await clearSessionUser();
  redirect("/login");
}
