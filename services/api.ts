/**
 * CareConnect — Base API Client
 *
 * Single entry point for all HTTP communication.
 * UI components, hooks, and screens NEVER call fetch() directly.
 * They call service functions, which in turn use this client.
 */

import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL =
    Constants.expoConfig?.extra?.apiUrl ??
    process.env.EXPO_PUBLIC_API_URL ??
    'https://api.careconnect.dev';

// Callbacks assigned by AuthProvider to bridge React state
let updateTokenCallback: ((token: string) => void) | null = null;
let logoutCallback: (() => void) | null = null;

export function setApiCallbacks(onTokenUpdate: (token: string) => void, onLogout: () => void) {
    updateTokenCallback = onTokenUpdate;
    logoutCallback = onLogout;
}

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

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
    refreshSubscribers.push(cb);
}

export async function apiRequest<T>(config: RequestConfig): Promise<T> {
    const { method, path, body, headers = {}, params, token } = config;

    let url = `${API_BASE_URL}${path}`;
    if (params) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
    }

    const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
    };

    let res = await fetch(url, {
        method,
        headers: reqHeaders,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
        if (!isRefreshing) {
            isRefreshing = true;
            try {
                // Attempt to refresh the token using the HttpOnly cookie
                const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });

                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    const newToken = data.access_token;
                    
                    // Update SecureStore and React Context
                    await SecureStore.setItemAsync('careconnect_auth_token', newToken);
                    if (updateTokenCallback) {
                        updateTokenCallback(newToken);
                    }

                    isRefreshing = false;
                    onRefreshed(newToken);
                } else {
                    throw new Error('Refresh failed');
                }
            } catch (e) {
                isRefreshing = false;
                onRefreshed(''); // empty string indicates failure
                
                try {
                    await SecureStore.deleteItemAsync('careconnect_auth_token');
                    await SecureStore.deleteItemAsync('careconnect_user');
                } catch (e) {}

                if (logoutCallback) {
                    logoutCallback();
                }

                const error = await res.json().catch(() => ({ message: res.statusText }));
                throw new ApiError(error.message || `API error: ${res.status}`, res.status);
            }
        }

        // Wait for the refresh to complete
        const newToken = await new Promise<string>((resolve) => {
            addRefreshSubscriber(resolve);
        });

        if (newToken) {
            // Retry original request with new token
            reqHeaders['Authorization'] = `Bearer ${newToken}`;
            res = await fetch(url, {
                method,
                headers: reqHeaders,
                body: body ? JSON.stringify(body) : undefined,
            });
        } else {
            // Refresh failed entirely, throw 401
            const error = await res.json().catch(() => ({ message: res.statusText }));
            throw new ApiError(error.message || `API error: 401`, 401);
        }
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        console.log('API Error Data:', JSON.stringify(error, null, 2));
        throw new ApiError(error.message || (error.detail ? JSON.stringify(error.detail) : `API error: ${res.status}`), res.status);
    }

    if (res.status === 204 || res.headers.get('content-length') === '0') {
        return undefined as unknown as T;
    }

    return res.json() as Promise<T>;
}
