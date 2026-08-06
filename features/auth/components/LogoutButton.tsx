"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/hooks/useLogout";

export function LogoutButton() {
  const { logout } = useLogout();

  return (
    <Button onClick={logout} variant="outline">
      <LogOut className="size-4" />
      Cerrar sesión
    </Button>
  );
}
