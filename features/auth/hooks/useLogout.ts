"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useLogout() {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return { logout };
}
