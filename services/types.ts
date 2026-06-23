/**
 * CareConnect — API TypeScript Interfaces
 *
 * Every type here maps 1:1 to a backend Pydantic schema.
 * This is the single source of truth for the frontend API contract.
 *
 * Backend schema file: careconnect-api/app/schemas.py
 */

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface AuthCredentials {
    email: string;
    password: string;
}

export interface CaregiverRegistration extends AuthCredentials {
    fullName: string;
    hospitalId: string;
    whatsappNumber: string;
}

export interface DoctorRegistration extends AuthCredentials {
    fullName: string;
    hospitalId: string;
    specialization?: string;
}

/**
 * Maps to backend schemas.Token
 * { access_token, token_type, user_id, role }
 */
export interface AuthResponse {
    access_token: string;
    token_type: string;
    user_id: string;
    hospital_id: string;
    role: 'DOCTOR' | 'CAREGIVER' | 'SUPER_ADMIN';
}

// ─── Hospitals ──────────────────────────────────────────────────────────────

/** Maps to backend schemas.HospitalListItem */
export interface HospitalListItem {
    id: string;
    name: string;
}

/** Maps to backend schemas.HospitalBrandingResponse */
export interface HospitalBranding {
    name: string;
    brand_color: string;
    logo_url: string | null;
}

// ─── Doctors ────────────────────────────────────────────────────────────────

/** Maps to backend schemas.DoctorAvailabilityBase */
export interface DoctorAvailabilitySlot {
    day_of_week: string;
    start_time: string;     // HH:MM:SS
    end_time: string;       // HH:MM:SS
    is_enabled: boolean;
    appointment_type?: 'VIDEO' | 'IN_PERSON';
}

/** Maps to backend schemas.DoctorResponse */
export interface DoctorProfile {
    id: string;
    full_name: string;
    specialization: string;
    phone_number: string | null;
    avatar_url: string | null;
    hospital_affiliation: string | null;
    years_of_experience: string | null;
    bio: string | null;
    license_number: string | null;
    consultation_duration_minutes: number | null;
    video_consultation_fee: number | null;
    in_person_consultation_fee: number | null;
    clinic_name: string | null;
    clinic_address: string | null;
    currency: string;
    accepted_payment_methods: string[] | null;
    onboarding_completed: boolean;
    availability_slots: DoctorAvailabilitySlot[];
}

// ─── Patients ───────────────────────────────────────────────────────────────

/** Maps to backend schemas.PatientCreate (request body) */
export interface PatientCreate {
    full_name: string;
    whatsapp_number: string;
    caregiver_id?: string;
    doctor_id?: string;
    hospital_id?: string;
    date_of_birth?: string;
    gender?: string;
    blood_group?: string;
    address?: string;
    aadhar_number?: string;
    allergies?: string[];
    existing_conditions?: string[];
    medical_history_summary?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
}

/** Maps to backend schemas.PatientResponse */
export interface PatientProfile {
    id: string;
    hospital_id: string;
    full_name: string;
    whatsapp_number: string;
    date_of_birth: string | null;
    gender: string | null;
    blood_group: string | null;
    address: string | null;
    aadhar_number: string | null;
    allergies: string[] | null;
    existing_conditions: string[] | null;
    medical_history_summary: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    created_at: string;
}

// ─── Appointments ───────────────────────────────────────────────────────────

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AppointmentType = 'VIDEO' | 'FOLLOW_UP' | 'NEW_PATIENT' | 'IN_PERSON';

/** Maps to backend schemas.AppointmentCreate (request body) */
export interface AppointmentCreate {
    doctor_id: string;
    patient_id: string;
    caregiver_id?: string | null;
    hospital_id: string;
    scheduled_time: string;     // ISO 8601
    duration_minutes?: number;
    appointment_type?: AppointmentType;
    reason?: string;
}

/** Available time slot returned by GET /appointments/available-slots */
export interface AvailableSlot {
    start_time: string;   // HH:MM
    end_time: string;     // HH:MM
}

/** Maps to backend schemas.AppointmentResponse */
export interface Appointment {
    id: string;
    hospital_id: string;
    doctor_id: string;
    patient_id: string;
    caregiver_id: string;
    scheduled_time: string;     // ISO 8601
    duration_minutes: number | null;
    appointment_type: AppointmentType;
    status: AppointmentStatus;
    reason: string | null;
    meeting_room_id: string | null;
    created_at: string;
}

// ─── Medical Records & Prescriptions ────────────────────────────────────────

/** Maps to backend schemas.PrescriptionResponse */
export interface Prescription {
    id: string;
    doctor_id: string;
    patient_id: string;
    medical_record_id: string | null;
    medication_name: string;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
    notes: string | null;
    created_at: string;
}

/** Maps to backend schemas.MedicalRecordResponse */
export interface MedicalRecord {
    id: string;
    patient_id: string;
    doctor_id: string;
    appointment_id: string | null;
    diagnosis: string;
    symptoms: string | null;
    treatment: string | null;
    follow_up_date: string | null;
    vitals: Record<string, string> | null;
    prescriptions: Prescription[];
    created_at: string;
}

export interface DoctorNote {
    id: string;
    appointment_id: string;
    content: string;
    created_at: string;
}

// ─── Video Sessions ─────────────────────────────────────────────────────────

/** Maps to backend schemas.VideoJoinResponse */
export interface VideoJoinResponse {
    room_name: string;
    join_token: string;
    patient_join_token?: string;
}

// ─── Dashboard (derived client-side — no backend endpoint) ──────────────────

export interface DoctorDashboardStats {
    todayAppointments: number;
    totalPatients: number;
    pendingRequests: number;
}

export interface CaregiverDashboardStats {
    upcomingAppointments: number;
    completedConsultations: number;
    medicalRecords: number;
}

// ─── Auth Identity ──────────────────────────────────────────────────────────

/** Maps to backend /auth/me response */
export interface MeResponse {
    id: string;
    email: string;
    full_name: string;
    role: string;
    hospital_id: string;
    affiliation_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    onboarding_completed?: boolean;
}
