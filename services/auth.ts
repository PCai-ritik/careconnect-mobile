/**
 * CareConnect — Auth Service
 *
 * Login / registration functions for Caregiver and Doctor authentication.
 * All payloads match the backend API contract (careconnect-api/app/schemas.py).
 *
 * RULE: All network calls go through this service layer — never in components.
 */

import { apiRequest } from './api';
import type { AuthCredentials, AuthResponse, CaregiverRegistration, DoctorRegistration } from './types';

/**
 * Authenticate a caregiver with email and password.
 *
 * Backend contract: POST /auth/login
 * Body: { email, password }  — role is determined from DB, NOT from the request.
 */
export async function loginCaregiver(credentials: AuthCredentials): Promise<AuthResponse> {
    return apiRequest<AuthResponse>({
        method: 'POST',
        path: '/auth/login',
        body: {
            email: credentials.email,
            password: credentials.password,
        },
    });
}

/**
 * Authenticate a doctor with email and password.
 *
 * Backend contract: POST /auth/login
 * Body: { email, password }
 */
export async function loginDoctor(credentials: AuthCredentials): Promise<AuthResponse> {
    return apiRequest<AuthResponse>({
        method: 'POST',
        path: '/auth/login',
        body: {
            email: credentials.email,
            password: credentials.password,
        },
    });
}

/**
 * Register a new caregiver (family member) account.
 *
 * Backend contract: POST /auth/register/caregiver
 * Body: { email, password, full_name, hospital_id, whatsapp_number }
 */
export async function registerCaregiver(data: CaregiverRegistration): Promise<AuthResponse> {
    return apiRequest<AuthResponse>({
        method: 'POST',
        path: '/auth/register/caregiver',
        body: {
            full_name: data.fullName,
            email: data.email,
            password: data.password,
            ...(data.hospitalId ? { hospital_id: data.hospitalId } : {}),
            whatsapp_number: data.whatsappNumber,
        },
    });
}

/**
 * Register a new doctor account.
 * Returns a token — onboarding status must be checked via GET /doctors/profile.
 *
 * Backend contract: POST /auth/register/doctor
 * Body: { email, password, full_name, hospital_id, specialization? }
 */
export async function registerDoctor(data: DoctorRegistration): Promise<AuthResponse> {
    return apiRequest<AuthResponse>({
        method: 'POST',
        path: '/auth/register/doctor',
        body: {
            full_name: data.fullName,
            email: data.email,
            password: data.password,
            ...(data.hospitalId ? { hospital_id: data.hospitalId } : {}),
            specialization: data.specialization,
        },
    });
}
