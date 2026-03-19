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

interface RequestConfig {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    token?: string;
}

export async function apiRequest<T>(config: RequestConfig): Promise<T> {
    const { method, path, body, headers = {}, token } = config;

    const url = `${API_BASE_URL}${path}`;

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
        throw new Error(error.message || `API error: ${res.status}`);
    }

    return res.json() as Promise<T>;
}
