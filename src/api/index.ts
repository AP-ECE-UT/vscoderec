import { getJwtTokens, setJwtTokens } from "../token";

import axios from "axios";

export default class API {
  private static api: API;
  private static axiosAPI: axios.AxiosInstance;
  private static retryMax: number = 5;
  private static retryCount: number = 0;

  private constructor() {
    API.axiosAPI = axios.create({ baseURL: "https://www.aiedut.com/api/" });
    API.registerInterceptors();
  }

  private static registerInterceptors(): void {
    API.axiosAPI.interceptors.request.use((config) => {
      API.retryCount = 0;
      const { access } = getJwtTokens();
      if (!!access && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${access}`;
      }
      return config;
    }, Promise.reject);

    API.axiosAPI.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          (error.response.status && error.response.status !== 401) ||
          API.retryCount++ >= API.retryMax
        ) {
          return Promise.reject(error);
        }
        const { refresh } = getJwtTokens();
        if (!refresh) {
          return Promise.reject(error);
        }
        try {
          const { data } = await API.axiosAPI.post("token/refresh/", {
            refresh,
          });
          const { refresh: _refresh, access } = data;
          originalRequest.headers.Authorization = `Bearer ${access}`;
          setJwtTokens(access, _refresh);
          return API.axiosAPI(originalRequest);
        } catch (err) {
          return Promise.reject(error);
        }
      }
    );
  }

  public static getInstance() {
    if (!API.api) {
      API.api = new API();
    }
    return API.axiosAPI;
  }

  welcomeMessage() {}
}
