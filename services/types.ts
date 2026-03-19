/**
 * CareConnect — API TypeScript Interfaces
 *
 * Every API response shape MUST be defined here BEFORE it is used anywhere.
 * This is the contract with the future backend.
 */

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface AuthCredentials {
    email: string;
    password: string;
}

export interface DoctorRegistration extends AuthCredentials {
    fullName: string;
    specialization: string;
}

export interface PatientRegistration extends AuthCredentials {
    fullName: string;
}

export interface AuthResponse {
    user: {
        id: string;
        email: string;
        fullName: string;
        userType: 'patient' | 'doctor';
        onboardingCompleted?: boolean;
    };
    token: string;
    refreshToken: string;
}

// ─── Appointments ───────────────────────────────────────────────────────────

export interface Appointment {
    id: string;
    patientName: string;
    doctorName: string;
    dateTime: string;          // ISO 8601
    type: 'video' | 'follow-up' | 'new-patient' | 'in-person';
    status: 'upcoming' | 'in-progress' | 'completed' | 'cancelled';
}

export interface AppointmentListResponse {
    appointments: Appointment[];
    total: number;
}

// ─── Patients ───────────────────────────────────────────────────────────────

export interface PatientProfile {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
    address?: string;
    allergies: string[];
    existingConditions: string[];
    emergencyContact?: {
        name: string;
        phone: string;
    };
}

// ─── Doctor ─────────────────────────────────────────────────────────────────

export interface DoctorProfile {
    id: string;
    fullName: string;
    email: string;
    specialization: string;
    licenseNumber?: string;
    yearsExperience?: number;
    hospital?: string;
    onboardingCompleted: boolean;
    availability?: DoctorAvailability;
}

export interface DoctorAvailability {
    workingDays: string[];
    startTime: string;
    endTime: string;
    consultationDurationMinutes: number;
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export interface DoctorDashboardStats {
    todayAppointments: number;
    totalPatients: number;
    avgConsultationMinutes: number;
    monthlyRevenue: number;
    revenueChangePct: number;
}

export interface PatientDashboardStats {
    upcomingAppointments: number;
    completedConsultations: number;
    medicalRecords: number;
}
