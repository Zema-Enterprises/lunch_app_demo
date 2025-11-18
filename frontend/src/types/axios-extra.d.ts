import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig<D = any> {
    skipAuthRefresh?: boolean;
    _retry?: boolean;
  }

  export interface InternalAxiosRequestConfig<D = any> {
    skipAuthRefresh?: boolean;
    _retry?: boolean;
  }
}
