import axios, { AxiosError } from 'axios';
import type { ApiError } from './types';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

const TOKEN_KEY = 'nx_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Callback set by the auth store to react to 401s.
let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(err: unknown, fallback = 'Algo salió mal. Inténtalo de nuevo.'): string {
  const axErr = err as AxiosError<ApiError>;
  const msg = axErr?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' · ');
  if (typeof msg === 'string') return msg;
  if (axErr?.message === 'Network Error') return 'Sin conexión con el servidor.';
  return fallback;
}

/** Returns the existing beneficiary embedded in a 409 conflict, if any. */
export function conflictPayload<T = unknown>(err: unknown): T | null {
  const axErr = err as AxiosError<{ existing?: T } & ApiError>;
  if (axErr?.response?.status === 409) {
    return (axErr.response.data?.existing as T) ?? null;
  }
  return null;
}
