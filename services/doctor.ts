/**
 * CareConnect — Doctor Dashboard API Service
 *
 * Service functions for the doctor dashboard: profile, appointments, patients.
 * All functions use the shared apiRequest client with auth headers.
 *
 * RULE: Components call these functions — never fetch() directly.
 *
 * Mirrors the web dashboard's lib/dashboard.ts for full concurrency.
 */

import { apiRequest, API_BASE_URL, ApiError } from './api';
import type {
    DoctorProfile,
    DoctorAvailabilitySlot,
    Appointment,
    AppointmentStatus,
    PatientProfile,
    PatientCreate,
    MedicalRecord,
    VideoJoinResponse,
} from './types';

// ─── Doctor Profile / Onboarding ────────────────────────────────────────────

export async function getDoctorProfile(token: string): Promise<DoctorProfile> {
    return apiRequest<DoctorProfile>({
        method: 'GET',
        path: '/doctors/profile',
        token,
    });
}

export async function getDoctorById(doctorId: string, token: string): Promise<DoctorProfile> {
    return apiRequest<DoctorProfile>({
        method: 'GET',
        path: `/doctors/${doctorId}`,
        token,
    });
}

export async function submitDoctorOnboarding(
    token: string,
    data: {
        full_name?: string;
        specialization?: string;
        years_of_experience?: string;
        license_number?: string;
        hospital_affiliation?: string;
        bio?: string;
        phone_number?: string;
        consultation_duration_minutes?: number;
        video_consultation_fee?: number;
        in_person_consultation_fee?: number;
        clinic_name?: string;
        clinic_address?: string;
        currency?: string;
        accepted_payment_methods?: string[];
    },
): Promise<DoctorProfile> {
    return apiRequest<DoctorProfile>({
        method: 'PUT',
        path: '/doctors/onboarding',
        body: data as unknown as Record<string, unknown>,
        token,
    });
}

export async function submitDoctorAvailability(
    token: string,
    slots: DoctorAvailabilitySlot[],
): Promise<void> {
    await apiRequest<void>({
        method: 'PUT',
        path: '/doctors/availability',
        body: slots as unknown as Record<string, unknown>,
        token,
    });
}

export async function updateDoctorProfile(
    token: string,
    data: {
        full_name?: string;
        specialization?: string;
        phone_number?: string;
        license_number?: string;
        hospital_affiliation?: string;
        bio?: string;
        video_consultation_fee?: number;
        in_person_consultation_fee?: number;
        clinic_name?: string;
        clinic_address?: string;
        currency?: string;
    },
): Promise<DoctorProfile> {
    return apiRequest<DoctorProfile>({
        method: 'PATCH',
        path: '/doctors/profile',
        body: data as unknown as Record<string, unknown>,
        token,
    });
}

// ─── Appointments ───────────────────────────────────────────────────────────

export async function getAppointments(token: string): Promise<Appointment[]> {
    return apiRequest<Appointment[]>({
        method: 'GET',
        path: '/appointments',
        token,
    });
}

export async function updateAppointmentStatus(
    token: string,
    id: string,
    status: AppointmentStatus,
): Promise<Appointment> {
    return apiRequest<Appointment>({
        method: 'PATCH',
        path: `/appointments/${id}/status`,
        body: { status },
        token,
    });
}

// ─── Patients ───────────────────────────────────────────────────────────────

export async function getPatients(token: string): Promise<PatientProfile[]> {
    return apiRequest<PatientProfile[]>({
        method: 'GET',
        path: '/patients',
        token,
    });
}

export async function addPatient(
    token: string,
    data: PatientCreate,
): Promise<PatientProfile> {
    return apiRequest<PatientProfile>({
        method: 'POST',
        path: '/patients',
        body: data as unknown as Record<string, unknown>,
        token,
    });
}

// ─── Medical Records ────────────────────────────────────────────────────────

export async function getPatientRecords(
    token: string,
    patientId: string,
): Promise<MedicalRecord[]> {
    return apiRequest<MedicalRecord[]>({
        method: 'GET',
        path: `/patients/${patientId}/records`,
        token,
    });
}

export async function createMedicalRecord(
    token: string,
    data: {
        patient_id: string;
        doctor_id: string;
        diagnosis: string;
        symptoms?: string | null;
        treatment?: string | null;
        follow_up_date?: string | null;
        vitals?: Record<string, string> | null;
        prescriptions?: Array<{
            medication_name: string;
            dosage?: string | null;
            frequency?: string | null;
            duration?: string | null;
            notes?: string | null;
        }>;
    },
): Promise<MedicalRecord> {
    return apiRequest<MedicalRecord>({
        method: 'POST',
        path: '/medical-records',
        body: data as unknown as Record<string, unknown>,
        token,
    });
}

// ─── Video Sessions ─────────────────────────────────────────────────────────

export async function startVideoSession(
    token: string,
    appointmentId: string,
): Promise<VideoJoinResponse> {
    return apiRequest<VideoJoinResponse>({
        method: 'POST',
        path: `/appointments/${appointmentId}/start-session`,
        token,
    });
}

export async function getJoinToken(
    token: string,
    appointmentId: string,
): Promise<VideoJoinResponse> {
    return apiRequest<VideoJoinResponse>({
        method: 'GET',
        path: `/appointments/${appointmentId}/join`,
        token,
    });
}

export async function endVideoSession(
    token: string,
    appointmentId: string,
): Promise<void> {
    return apiRequest<void>({
        method: 'POST',
        path: `/appointments/${appointmentId}/end-session`,
        token,
    });
}

// ─── Appointment Creation (Follow-Up) ───────────────────────────────────────

export async function createAppointment(
    token: string,
    data: {
        doctor_id: string;
        patient_id: string;
        hospital_id: string;
        scheduled_time: string;
        duration_minutes?: number;
        appointment_type?: string;
        caregiver_id?: string | null;
        reason?: string | null;
    },
): Promise<Appointment> {
    return apiRequest<Appointment>({
        method: 'POST',
        path: '/appointments',
        body: data as unknown as Record<string, unknown>,
        token,
    });
}

// ─── Available Slots ────────────────────────────────────────────────────────

export async function getAvailableSlots(
    token: string,
    doctorId: string,
    date: string,
): Promise<import('./types').AvailableSlot[]> {
    return apiRequest<import('./types').AvailableSlot[]>({
        method: 'GET',
        path: '/appointments/available-slots',
        params: { doctor_id: doctorId, date },
        token,
    });
}

// ─── Auth Identity ──────────────────────────────────────────────────────────

export async function getMe(
    token: string,
): Promise<import('./types').MeResponse> {
    return apiRequest<import('./types').MeResponse>({
        method: 'GET',
        path: '/api/me',
        token,
    });
}

// ─── License Verification ────────────────────────────────────────────────────

export interface LicenseVerificationResult {
    is_valid: boolean;
    license_number: string;
    license_state: string;
}

/**
 * Uploads a medical license image/PDF to the AI Vision endpoint.
 * Uses a raw fetch with multipart/form-data because apiRequest is JSON-only.
 *
 * Backend contract: POST /doctors/verify-license
 * Requires: Bearer token (onboarding token is valid)
 * Returns: { is_valid, license_number, license_state }
 */
export async function verifyMedicalLicense(
    token: string,
    fileUri: string,
    fileName: string,
    mimeType: string,
): Promise<LicenseVerificationResult> {
    const formData = new FormData();
    formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
    } as unknown as Blob);

    const res = await fetch(`${API_BASE_URL}/doctors/verify-license`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new ApiError(
            error.detail || error.message || `License verification failed (${res.status})`,
            res.status,
        );
    }

    return res.json() as Promise<LicenseVerificationResult>;
}

// ─── Doctor Notes ───────────────────────────────────────────────────────────

export async function createDoctorNote(
    token: string,
    appointmentId: string,
    content: string,
): Promise<import('./types').DoctorNote> {
    return apiRequest<import('./types').DoctorNote>({
        method: 'POST',
        path: '/doctor-notes',
        body: { appointment_id: appointmentId, content },
        token,
    });
}

