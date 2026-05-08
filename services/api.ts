/**
 * CareConnect — Base API Client
 *
 * Single entry point for all HTTP communication.
 * UI components, hooks, and screens NEVER call fetch() directly.
 * They call service functions, which in turn use this client.
 */

import Constants from 'expo-constants';

const API_BASE_URL =
    Constants.expoConfig?.extra?.apiUrl ??
    process.env.EXPO_PUBLIC_API_URL ??
    'https://api.careconnect.dev';

/** Custom error that preserves the HTTP status code for conflict detection. */
export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

interface RequestConfig {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    params?: Record<string, string>;
    token?: string;
}

export async function apiRequest<T>(config: RequestConfig): Promise<T> {
    const { method, path, body, headers = {}, params, token } = config;

    let url = `${API_BASE_URL}${path}`;
    if (params) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
    }

    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new ApiError(error.message || `API error: ${res.status}`, res.status);
    }

    return res.json() as Promise<T>;
}
