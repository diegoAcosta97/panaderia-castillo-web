"use client";

import { createContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getOwnProfile } from "@/repositories/perfilesRepository";
import { useIdleTimeout } from "@/features/auth/hooks/useIdleTimeout";
import type { Session } from "@/features/auth/types";

export interface SessionContextValue {
  session: Session | null;
  loading: boolean;
}

export const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<SessionContextValue>({
    session: null,
    loading: true,
  });
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function resolveSession(userId: string | undefined) {
      if (!userId) {
        if (!cancelled) setValue({ session: null, loading: false });
        return;
      }

      const perfil = await getOwnProfile(supabase);
      if (cancelled) return;

      if (!perfil) {
        setValue({ session: null, loading: false });
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      setValue({
        session: {
          user: { id: userId, email: user?.email ?? null },
          perfil,
          rol: perfil.rol,
        },
        loading: false,
      });
    }

    supabase.auth.getUser().then(({ data }) => resolveSession(data.user?.id));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, authSession) => {
      resolveSession(authSession?.user?.id);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // RF-10.3: no cierra el turno de caja abierto (docs/backlog/04-caja.md), solo la sesión.
  useIdleTimeout(value.session !== null, async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  });

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
