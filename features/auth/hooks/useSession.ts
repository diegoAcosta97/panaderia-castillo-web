"use client";

import { useContext } from "react";
import { SessionContext } from "@/features/auth/components/SessionProvider";

export function useSession() {
  return useContext(SessionContext);
}

export function useCurrentProfile() {
  return useContext(SessionContext).session?.perfil ?? null;
}
