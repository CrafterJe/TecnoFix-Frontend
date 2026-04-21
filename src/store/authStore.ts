import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/api/auth";
import type { User, AuthTokens } from "@/types";

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<string>;
  initializeAuth: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isInitialized: false,

      initializeAuth: async () => {
        const { tokens, user } = get();
        if (tokens?.access && user) {
          try {
            const res = await authApi.refresh(tokens.refresh);
            set((s) => ({
              tokens: { ...s.tokens!, access: res.access },
              isAuthenticated: true,
              isInitialized: true,
            }));
          } catch {
            set({ user: null, tokens: null, isAuthenticated: false, isInitialized: true });
          }
        } else {
          set({ isInitialized: true });
        }
      },

      login: async (email, password) => {
        const { access, refresh, user } = await authApi.login(email, password);
        set({ user, tokens: { access, refresh }, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, tokens: null, isAuthenticated: false });
      },

      refreshToken: async () => {
        const { tokens } = get();
        if (!tokens?.refresh) throw new Error("No refresh token");
        const res = await authApi.refresh(tokens.refresh);
        set((s) => ({ tokens: { ...s.tokens!, access: res.access } }));
        return res.access;
      },

      updateUser: (userData) => {
        set((s) => ({
          user: s.user ? { ...s.user, ...userData } : null,
        }));
      },
    }),
    {
      name: "tecnofix-auth",
      partialize: (s) => ({ user: s.user, tokens: s.tokens, isAuthenticated: s.isAuthenticated }),
    }
  )
);
