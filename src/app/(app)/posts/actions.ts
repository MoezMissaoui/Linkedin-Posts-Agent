"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function deletePost(id: string): Promise<void> {
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase.from("linkedin_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/posts");
  revalidatePath("/dashboard");
  redirect("/posts");
}
