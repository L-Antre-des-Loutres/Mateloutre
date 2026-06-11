import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';

const PAPI_URL = process.env.PAPI_URL || 'http://localhost:8080';
const PAPI_USER = process.env.PAPI_USER || 'admin';
const PAPI_MDP = process.env.PAPI_MDP || 'change-me-immediately';

export class ApiError extends Error {
    readonly status: number;
    constructor(status: number, message: string) {
        super(`API Error ${status}: ${message}`);
        this.name = 'ApiError';
        this.status = status;
    }
}

const instance: AxiosInstance = axios.create({
    baseURL: PAPI_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

let authToken: string | null = null;
let loginPromise: Promise<void> | null = null;

// Interceptor to add the token to every request
instance.interceptors.request.use(async (config) => {
    if (!authToken && !config.url?.includes('/auth/login')) {
        await login();
    }
    if (authToken && config.headers) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
});

// Interceptor to handle 401 errors
instance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
            originalRequest._retry = true;
            await login();
            originalRequest.headers.Authorization = `Bearer ${authToken}`;
            return instance(originalRequest);
        }
        return Promise.reject(error);
    }
);

async function login(): Promise<void> {
    if (loginPromise) return loginPromise;

    loginPromise = (async () => {
        try {
            const response = await axios.post(`${PAPI_URL}/api/auth/login`, {
                username: PAPI_USER,
                password: PAPI_MDP,
            });
            authToken = response.data.token;
        } catch (error) {
            console.error('Failed to login to PAPI:', error);
            authToken = null;
        } finally {
            loginPromise = null;
        }
    })();

    return loginPromise;
}


async function request<T>(path: string, options: AxiosRequestConfig = {}): Promise<T> {
    try {
        const response: AxiosResponse<T> = await instance({
            url: path,
            ...options,
        });
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
            throw new ApiError(error.response.status, error.response.data?.toString() || error.message);
        }
        throw error;
    }
}

export const apiClient = {
    get:    <T>(path: string)                   => request<T>(path, { method: 'GET' }),
    post:   <T>(path: string, body?: unknown)   => request<T>(path, { method: 'POST',  data: body }),
    put:    <T>(path: string, body?: unknown)   => request<T>(path, { method: 'PUT',   data: body }),
    patch:  <T>(path: string, body?: unknown)   => request<T>(path, { method: 'PATCH', data: body }),
    delete: <T>(path: string)                   => request<T>(path, { method: 'DELETE' }),
};


