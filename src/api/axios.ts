import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { getToken } from '../storage/tokenStorage';

const instance = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Avoid Keychain on these routes — no token yet; prevents misleading "No entry found" logs on sign-in. */
const AUTH_ROUTES_SKIP_KEYCHAIN = [
  'api/auth/sign-in',
  'api/auth/sign-up',
  'api/auth/forgot-password',
  'api/auth/reset-password',
  'api/auth/accept-invitation',
];

function isPublicAuthRequest(url: string | undefined): boolean {
  if (!url) return false;
  const path = url.split('?')[0];
  return AUTH_ROUTES_SKIP_KEYCHAIN.some((p) => path.includes(p));
}

instance.interceptors.request.use(async (axiosConfig) => {
  if (isPublicAuthRequest(axiosConfig.url)) {
    return axiosConfig;
  }
  const token = await getToken();
  if (token) {
    axiosConfig.headers.Authorization = `Bearer ${token}`;
  }
  return axiosConfig;
});

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(callback: () => void) {
  onUnauthorized = callback;
}

instance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export default instance;
