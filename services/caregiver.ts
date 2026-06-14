/**
 * CareConnect — Caregiver Service Layer
 *
 * API functions for the caregiver (family member) dashboard.
 * Mirrors doctor.ts structure. All network calls flow through api.ts.
 *
 * RULE: UI components never call fetch() directly.
 */

import { apiRequest } from './api';
import type {
    HospitalListItem,
    HospitalBranding,
    DoctorProfile,
    Appointment,
    PatientProfile,
    MedicalRecord,
    VideoJoinResponse,
} from './types';

// ─── Hospitals (Public) ─────────────────────────────────────────────────────

/** Fetch all hospitals for registration dropdown. No auth required. */
export async function getHospitals(): Promise<HospitalListItem[]> {
    return apiRequest<HospitalListItem[]>({
        method: 'GET',
        path: '/hospitals',
    });
}

/** Fetch hospital branding for white-label theming. No auth required. */
export async function getHospitalBranding(hospitalId: string): Promise<HospitalBranding> {
    return apiRequest<HospitalBranding>({
        method: 'GET',
        path: `/hospitals/${hospitalId}/branding`,
    });
}

// ─── Doctors (Public) ───────────────────────────────────────────────────────

/** List onboarded doctors in a hospital. Used by booking wizard. */
export async function getDoctorsByHospital(
    hospitalId: string,
    specialization?: string,
): Promise<DoctorProfile[]> {
    const params = new URLSearchParams({ hospital_id: hospitalId });
    if (specialization) params.append('specialization', specialization);

    return apiRequest<DoctorProfile[]>({
        method: 'GET',
        path: `/doctors?${params.toString()}`,
    });
}

// ─── Appointments ───────────────────────────────────────────────────────────

/** Fetch all appointments scoped to the current user (RLS). */
export async function getMyAppointments(token: string): Promise<Appointment[]> {
    return apiRequest<Appointment[]>({
        method: 'GET',
        path: '/appointments',
        token,
    });
}

/** Book a new appointment. */
export async function bookAppointment(
    token: string,
    data: {
        doctor_id: string;
        patient_id: string;
        caregiver_id?: string;
        hospital_id: string;
        scheduled_time: string; // ISO 8601
        duration_minutes?: number;
        appointment_type?: string;
        reason?: string;
    },
): Promise<Appointment> {
    return apiRequest<Appointment>({
        method: 'POST',
        path: '/appointments',
        token,
        body: data as unknown as Record<string, unknown>,
    });
}

// ─── Patients ───────────────────────────────────────────────────────────────

/** Fetch patients linked to this caregiver (RLS-scoped). */
export async function getLinkedPatients(token: string): Promise<PatientProfile[]> {
    return apiRequest<PatientProfile[]>({
        method: 'GET',
        path: '/patients',
        token,
    });
}

/** Register a new patient under this caregiver. */
export async function addPatient(
    token: string,
    data: {
        full_name: string;
        whatsapp_number: string;
        date_of_birth?: string;
        gender?: string;
        blood_group?: string;
        address?: string;
        allergies?: string[];
        existing_conditions?: string[];
        emergency_contact_name?: string;
        emergency_contact_phone?: string;
    },
): Promise<PatientProfile> {
    return apiRequest<PatientProfile>({
        method: 'POST',
        path: '/patients',
        token,
        body: data as unknown as Record<string, unknown>,
    });
}

/** Update patient details (partial update). */
export async function updatePatient(
    token: string,
    patientId: string,
    data: Record<string, unknown>,
): Promise<PatientProfile> {
    return apiRequest<PatientProfile>({
        method: 'PATCH',
        path: `/patients/${patientId}`,
        token,
        body: data,
    });
}

// ─── Medical Records ────────────────────────────────────────────────────────

/** Fetch medical records for a specific patient. */
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

// ─── Video Sessions ─────────────────────────────────────────────────────────

/** Get the caregiver's join token for an existing video session. */
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

// ─── Profile ────────────────────────────────────────────────────────────────

export interface MeResponse {
    id: string;
    email: string;
    full_name: string;
    role: string;
    hospital_id: string;
}

/** Fetch the authenticated user's identity (name, email, role). */
export async function getMe(token: string): Promise<MeResponse> {
    return apiRequest<MeResponse>({
        method: 'GET',
        path: '/api/me',
        token,
    });
}

// ─── Post-Call Summary ──────────────────────────────────────────────────────

export interface PostCallSummary {
    id: string;
    appointment_id: string;
    diagnosis: string | null;
    symptoms: string[] | null;
    treatment_plan: string | null;
    prescriptions: string[] | null;
    follow_up: string | null;
    doctor_notes: string | null;
    summary: string | null;         // Full bilingual JSON from AI pipeline
    created_at: string;
}

/** Fetch the AI-generated post-call summary for an appointment.
 *  Returns null (not throw) if the summary isn't ready yet (404). */
export async function getPostCallSummary(
    token: string,
    appointmentId: string,
): Promise<PostCallSummary | null> {
    try {
        return await apiRequest<PostCallSummary>({
            method: 'GET',
            path: `/appointments/${appointmentId}/summary`,
            token,
        });
    } catch (e: any) {
        // 404 means the AI pipeline hasn't finished yet — not an error
        if (e?.status === 404) return null;
        throw e;
    }
}
