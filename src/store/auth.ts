import { create } from 'zustand';
import type { AuthResponse, User } from '../lib/types';
import { getStoredToken, setStoredToken, registerUnauthorizedHandler } from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  setSession: (data: AuthResponse) => void;
  setUser: (user: User) => void;
  logout: () => void;
  setHydrated: () => void;
}

const USER_KEY = 'nx_user';

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export const useAuth = create<AuthState>((set) => ({
  user: readStoredUser(),
  token: getStoredToken(),
  hydrated: false,
  setSession: ({ user, accessToken }) => {
    setStoredToken(accessToken);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* ignore */
    }
    set({ user, token: accessToken });
  },
  setUser: (user) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* ignore */
    }
    set({ user });
  },
  logout: () => {
    setStoredToken(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
    set({ user: null, token: null });
  },
  setHydrated: () => set({ hydrated: true }),
}));

// Wire the 401 handler to the store once.
registerUnauthorizedHandler(() => {
  useAuth.getState().logout();
});

export const ROLE_HOME: Record<string, string> = {
  DONOR: '/donante',
  VOLUNTEER: '/voluntario',
  // Gestor y admin aterrizan en sus campañas (cada campaña tiene su panel completo).
  MANAGER: '/organizador',
  ADMIN: '/organizador',
  REGISTRAR: '/empadronar',
};
