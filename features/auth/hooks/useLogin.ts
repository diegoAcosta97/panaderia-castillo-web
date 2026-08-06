"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getOwnProfile } from "@/repositories/perfilesRepository";
import { getErrorMessage } from "@/lib/errors";

export function useLogin() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function login(email: string, password: string) {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      const perfil = await getOwnProfile(supabase);
      if (!perfil) {
        throw new Error("No se encontró un perfil asociado a este usuario.");
      }

      // Redirección por rol pendiente de docs/backlog/02-roles.md#E2-1 — por ahora entra
      // siempre a "/".
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Ocurrió un error al iniciar sesión"));
    } finally {
      setIsLoading(false);
    }
  }

  return { login, error, isLoading };
}
