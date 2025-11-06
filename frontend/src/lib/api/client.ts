import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

type RequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
};

let accessToken: string | null = null;
let accessTokenListener: ((token: string | null) => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const registerAccessTokenListener = (listener: (token: string | null) => void) => {
  accessTokenListener = listener;
};

const notifyTokenChange = (token: string | null) => {
  accessTokenListener?.(token);
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

const shouldSkipAuth = (config?: RequestConfig) => {
  if (!config) return false;
  if (config.skipAuthRefresh) return true;
  const url = config.url ?? '';
  return url.includes('/auth/refresh');
};

apiClient.interceptors.request.use(
  (config: RequestConfig) => {
    if (shouldSkipAuth(config)) {
      return config;
    }

    if (accessToken) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

const performRefresh = async () => {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post<{ data: { token: string } }>('/auth/refresh', undefined, { skipAuthRefresh: true })
      .then((response) => {
        const token = response.data.data.token;
        accessToken = token;
        notifyTokenChange(token);
        return token;
      })
      .catch((error) => {
        accessToken = null;
        notifyTokenChange(null);
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const response = error.response;
    const config = error.config as RequestConfig | undefined;

    if (
      response?.status === 401 &&
      config &&
      !config._retry &&
      !shouldSkipAuth(config)
    ) {
      config._retry = true;
      try {
        const token = await performRefresh();
        if (token) {
          config.headers = config.headers ?? {};
          config.headers.Authorization = `Bearer ${token}`;
          return apiClient(config);
        }
      } catch (refreshError) {
        notifyTokenChange(null);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
