import { useAuthStore } from "@/store/authStore";
import type { UserRole } from "@/types";

export function useAuth() {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.rol);
  };

  const isAdmin = user?.rol === "admin";
  const isTecnico = user?.rol === "tecnico";
  const isRecepcion = user?.rol === "recepcion";

  return { user, isAuthenticated, login, logout, hasRole, isAdmin, isTecnico, isRecepcion };
}
