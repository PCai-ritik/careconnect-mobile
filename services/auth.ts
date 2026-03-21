/**
 * CareConnect — Auth Service
 *
 * Login functions for Patient and Doctor authentication.
 * Currently uses mock data with simulated latency.
 * When the real backend is live, flip USE_MOCK to false
 * and the real apiRequest calls will take over.
 *
 * RULE: All network calls go through this service layer — never in components.
 */

import { mockResponse } from './helpers';
import { apiRequest } from './api';
import type { AuthCredentials, AuthResponse, PatientRegistration, DoctorRegistration } from './types';

const USE_MOCK = !process.env.EXPO_PUBLIC_API_URL;

/**
 * Authenticate a patient with email and password.
 */
export async function loginPatient(credentials: AuthCredentials): Promise<AuthResponse> {
    if (USE_MOCK) {
        // Log the exact payload that will be sent to the real backend
        console.log('[Mock Auth] Patient login payload:', JSON.stringify({
            email: credentials.email,
            password: credentials.password,
            userType: 'patient',
        }, null, 2));

        return mockResponse<AuthResponse>({
            user: {
                id: 'mock-patient-001',
                email: credentials.email,
                fullName: 'Sarah Johnson',
                userType: 'patient',
                onboardingCompleted: true,
            },
            token: 'mock-jwt-token-patient-001',
            refreshToken: 'mock-refresh-token-patient-001',
        }, 1500);
    }

    // TODO: Replace mock with real API call when backend is ready.
    // The endpoint, method, and payload shape below must match the backend contract.
    // ─────────────────────────────────────────────────────────────────────────
    return apiRequest<AuthResponse>({
        method: 'POST',
        path: '/auth/login',
        body: {
            email: credentials.email,
            password: credentials.password,
            userType: 'patient',
        },
    });
}

/**
 * Authenticate a doctor with email and password.
 */
export async function loginDoctor(credentials: AuthCredentials): Promise<AuthResponse> {
    if (USE_MOCK) {
        // Log the exact payload that will be sent to the real backend
        console.log('[Mock Auth] Doctor login payload:', JSON.stringify({
            email: credentials.email,
            password: credentials.password,
            userType: 'doctor',
        }, null, 2));

        return mockResponse<AuthResponse>({
            user: {
                id: 'mock-doctor-001',
                email: credentials.email,
                fullName: 'Dr. Priya Sharma',
                userType: 'doctor',
                onboardingCompleted: true,
            },
            token: 'mock-jwt-token-doctor-001',
            refreshToken: 'mock-refresh-token-doctor-001',
        }, 1500);
    }

    // TODO: Replace mock with real API call when backend is ready.
    // The endpoint, method, and payload shape below must match the backend contract.
    // ─────────────────────────────────────────────────────────────────────────
    return apiRequest<AuthResponse>({
        method: 'POST',
        path: '/auth/login',
        body: {
            email: credentials.email,
            password: credentials.password,
            userType: 'doctor',
        },
    });
}

/**
 * Register a new patient account.
 */
export async function registerPatient(data: PatientRegistration): Promise<AuthResponse> {
    if (USE_MOCK) {
        console.log('[Mock Auth] Patient registration payload:', JSON.stringify({
            fullName: data.fullName,
            email: data.email,
            password: data.password,
        }, null, 2));

        return mockResponse<AuthResponse>({
            user: {
                id: 'mock-patient-new-001',
                email: data.email,
                fullName: data.fullName,
                userType: 'patient',
                onboardingCompleted: true,
            },
            token: 'mock-jwt-token-patient-new-001',
            refreshToken: 'mock-refresh-token-patient-new-001',
        }, 1500);
    }

    // TODO: [BACKEND GATE] Replace with real API call.
    return apiRequest<AuthResponse>({
        method: 'POST',
        path: '/auth/register',
        body: {
            fullName: data.fullName,
            email: data.email,
            password: data.password,
        },
    });
}

/**
 * Register a new doctor account.
 * Returns onboardingCompleted: false so the app routes to onboarding.
 */
export async function registerDoctor(data: DoctorRegistration): Promise<AuthResponse> {
    if (USE_MOCK) {
        console.log('[Mock Auth] Doctor registration payload:', JSON.stringify({
            fullName: data.fullName,
            email: data.email,
            password: data.password,
            specialization: data.specialization,
            userType: 'doctor',
        }, null, 2));

        return mockResponse<AuthResponse>({
            user: {
                id: 'mock-doctor-new-001',
                email: data.email,
                fullName: data.fullName,
                userType: 'doctor',
                onboardingCompleted: false,
            },
            token: 'mock-jwt-token-doctor-new-001',
            refreshToken: 'mock-refresh-token-doctor-new-001',
        }, 1500);
    }

    // TODO: [BACKEND GATE] Replace with real API call.
    return apiRequest<AuthResponse>({
        method: 'POST',
        path: '/auth/register/doctor',
        body: {
            fullName: data.fullName,
            email: data.email,
            password: data.password,
            specialization: data.specialization,
            userType: 'doctor',
        },
    });
}
