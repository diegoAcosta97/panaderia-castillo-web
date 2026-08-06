"use client";

import { useSession } from "@/features/auth/hooks/useSession";
import type { Rol } from "@/features/auth/types";

export function RoleGate({
  roles,
  children,
}: {
  roles: Rol[];
  children: React.ReactNode;
}) {
  const { session } = useSession();

  if (!session || !roles.includes(session.rol)) return null;
  return <>{children}</>;
}
