import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { getToken } from '../storage/tokenStorage';

const instance = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

instance.interceptors.request.use(async (axiosConfig) => {
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
