import axios, { AxiosRequestConfig } from "axios";

export interface IHttpGETProps {
    url: string;
    token: string;
    params?: any;
}

export interface IHttpPOSTProps {
    url: string;
    token: string;
    data?: any;
}

export interface IHttpPUTProps {
    url: string;
    token: string;
    data?: any;
}

export interface IHttpDELETEProps {
    url: string;
    token: string;
}

export interface IHttpClient {
    get<T>(parameters: IHttpGETProps): Promise<T>;
    getExternal<T>(parameters: IHttpGETProps): Promise<T>;
    getLocal<T>(parameters: IHttpGETProps): Promise<T>;
    post<T>(parameters: IHttpPOSTProps): Promise<T>;
    put<T>(parameters: IHttpPUTProps): Promise<T>;
    postLocal<T>(parameters: IHttpPOSTProps): Promise<T>;
    postWithParams<T>(parameters: IHttpPOSTProps): Promise<T>;
    delete(parameters: IHttpDELETEProps): Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://rudyardapi-f3bydsa9avgneva5.canadacentral-01.azurewebsites.net";
const LOCAL_BASE_URL = "https://localhost:7161";

export default class HttpClient implements IHttpClient {
    private async request<T>(
        method: "get" | "post" | "put",
        url: string,
        token: string,
        dataOrParams?: any,
        isLocal = false,
        isExternal = false,
        useParamsInPost = false
    ): Promise<T> {
        const base = isExternal ? "" : isLocal ? LOCAL_BASE_URL : API_BASE_URL;
        const fullUrl = isExternal ? url : base + url;

        const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`,
        };

        const config: AxiosRequestConfig = {
            headers,
            withCredentials: true,
        };

        try {
            if (method === "get") {
                config.params = dataOrParams;
                const response = await axios.get<T>(fullUrl, config);
                return response.data;
            }

            if (method === "post" && useParamsInPost) {
                config.params = dataOrParams;
                const response = await axios.post<T>(fullUrl, null, config);
                return response.data;
            }

            if (method === "put") {
                const response = await axios.put<T>(fullUrl, dataOrParams, config);
                return response.data;
            }

            const response = await axios.post<T>(fullUrl, dataOrParams, config);
            return response.data;
        } catch (error) {
            console.error(`HTTP ${method.toUpperCase()} ${fullUrl} failed`, error);
            throw error;
        }
    }

    get<T>(p: IHttpGETProps): Promise<T> {
        return this.request<T>("get", p.url, p.token, p.params);
    }

    getLocal<T>(p: IHttpGETProps): Promise<T> {
        return this.request<T>("get", p.url, p.token, p.params, true);
    }

    getExternal<T>(p: IHttpGETProps): Promise<T> {
        return this.request<T>("get", p.url, p.token, p.params, false, true);
    }

    post<T>(p: IHttpPOSTProps): Promise<T> {
        return this.request<T>("post", p.url, p.token, p.data);
    }

    put<T>(p: IHttpPUTProps): Promise<T> {
        return this.request<T>("put", p.url, p.token, p.data);
    }

    postLocal<T>(p: IHttpPOSTProps): Promise<T> {
        return this.request<T>("post", p.url, p.token, p.data, true);
    }

    postWithParams<T>(p: IHttpPOSTProps): Promise<T> {
        return this.request<T>("post", p.url, p.token, p.data, false, false, true);
    }

    postExternal<T>(p: IHttpPOSTProps): Promise<T> {
        return this.request<T>("post", p.url, p.token, p.data, false, true);
    }

    delete(p: IHttpDELETEProps): Promise<void> {
        const headers: Record<string, string> = {
            Authorization: `Bearer ${p.token}`,
        };

        const config: AxiosRequestConfig = {
            headers,
            withCredentials: true,
        };

        const fullUrl = API_BASE_URL + p.url;

        return axios.delete(fullUrl, config).then(() => undefined).catch((error) => {
            console.error(`HTTP DELETE ${fullUrl} failed`, error);
            throw error;
        });
    }
}