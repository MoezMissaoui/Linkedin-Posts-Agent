"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function republishPost(id: string): Promise<void> {
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Reset the post so the agent picks it up again on the next cycle.
  const { error } = await supabase
    .from("linkedin_posts")
    .update({ is_published: false, post_link: "" })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/posts");
  revalidatePath(`/posts/${id}`);
  revalidatePath("/dashboard");
}

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
