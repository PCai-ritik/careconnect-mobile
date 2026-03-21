/**
 * CareConnect — Mock Data for Patient Dashboard
 *
 * Strict data contract: every key in MockDoctor traces directly
 * to the DoctorRegistration interface or the onboarding form types
 * in doctor-onboarding.tsx. No invented keys.
 *
 * When the backend is live, delete this file and fetch from the API.
 */

// ─── Day Schedule (matches AvailabilityData in doctor-onboarding.tsx) ────────

export type DaySchedule = {
    enabled: boolean;
    startTime: string;
    endTime: string;
};

// ─── Mock Doctor ────────────────────────────────────────────────────────────
// Keys sourced from:
//   - DoctorRegistration (services/types.ts): full_name, specialization, user_type
//   - VerificationData   (doctor-onboarding.tsx): hospitalAffiliation, experience, bio
//   - AvailabilityData   (doctor-onboarding.tsx): schedule, consultationDuration
//   - PaymentsData       (doctor-onboarding.tsx): consultationFee, currency, acceptedPaymentMethods

export type MockDoctor = {
    id: string;
    user_type: 'doctor';
    full_name: string;
    specialization: string;
    verification: {
        hospitalAffiliation: string;
        yearsOfExperience: string;
        bio: string;
    };
    availability: {
        schedule: Record<string, DaySchedule>;
        consultationDuration: string; // e.g. "30 min"
    };
    payments: {
        consultationFee: string;
        currency: string;
        acceptedPaymentMethods: string[]; // e.g. ['upi', 'card', 'netbanking', 'cash']
    };
};

// Helper to build a schedule quickly
const makeSchedule = (
    days: Record<string, boolean>,
    start = '09:00',
    end = '17:00',
): Record<string, DaySchedule> => {
    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return allDays.reduce((acc, day) => ({
        ...acc,
        [day]: {
            enabled: days[day] ?? false,
            startTime: start,
            endTime: end,
        },
    }), {} as Record<string, DaySchedule>);
};

export const mockDoctors: MockDoctor[] = [
    {
        id: 'doc-001',
        user_type: 'doctor',
        full_name: 'Dr. Sarah Johnson',
        specialization: 'General Practice',
        verification: {
            hospitalAffiliation: 'Cedars-Sinai Medical Center',
            yearsOfExperience: '11-20 years',
            bio: 'Board-certified general practitioner with 15 years of experience in primary care and preventive medicine.',
        },
        availability: {
            schedule: makeSchedule({
                Monday: true, Tuesday: true, Wednesday: true,
                Thursday: true, Friday: true, Saturday: false, Sunday: false,
            }, '09:00', '17:00'),
            consultationDuration: '30 min',
        },
        payments: { consultationFee: '500', currency: 'INR', acceptedPaymentMethods: ['upi', 'card', 'cash'] },
    },
    {
        id: 'doc-002',
        user_type: 'doctor',
        full_name: 'Dr. Michael Chen',
        specialization: 'Cardiology',
        verification: {
            hospitalAffiliation: 'AIIMS Delhi',
            yearsOfExperience: '11-20 years',
            bio: 'Interventional cardiologist specializing in heart failure management and cardiac rehabilitation.',
        },
        availability: {
            schedule: makeSchedule({
                Monday: true, Tuesday: true, Wednesday: true,
                Thursday: true, Friday: true, Saturday: true, Sunday: false,
            }, '10:00', '18:00'),
            consultationDuration: '45 min',
        },
        payments: { consultationFee: '1200', currency: 'INR', acceptedPaymentMethods: ['upi', 'card', 'netbanking'] },
    },
    {
        id: 'doc-003',
        user_type: 'doctor',
        full_name: 'Dr. Sneha Reddy',
        specialization: 'Dermatology',
        verification: {
            hospitalAffiliation: 'Apollo Hospitals Hyderabad',
            yearsOfExperience: '6-10 years',
            bio: 'Dermatologist focused on skin allergies, acne management, and cosmetic dermatology procedures.',
        },
        availability: {
            schedule: makeSchedule({
                Monday: true, Tuesday: false, Wednesday: true,
                Thursday: false, Friday: true, Saturday: true, Sunday: false,
            }, '10:00', '16:00'),
            consultationDuration: '30 min',
        },
        payments: { consultationFee: '800', currency: 'INR', acceptedPaymentMethods: ['upi', 'card'] },
    },
    {
        id: 'doc-004',
        user_type: 'doctor',
        full_name: 'Dr. Rajesh Kumar',
        specialization: 'Orthopedics',
        verification: {
            hospitalAffiliation: 'Fortis Hospital Noida',
            yearsOfExperience: '20+ years',
            bio: 'Senior orthopedic surgeon specializing in joint replacement, sports injuries, and spinal disorders.',
        },
        availability: {
            schedule: makeSchedule({
                Monday: true, Tuesday: true, Wednesday: true,
                Thursday: true, Friday: true, Saturday: false, Sunday: false,
            }, '08:00', '14:00'),
            consultationDuration: '30 min',
        },
        payments: { consultationFee: '1000', currency: 'INR', acceptedPaymentMethods: ['card', 'netbanking', 'cash'] },
    },
    {
        id: 'doc-005',
        user_type: 'doctor',
        full_name: 'Dr. Lisa Anderson',
        specialization: 'Pediatrics',
        verification: {
            hospitalAffiliation: 'Rainbow Children\'s Hospital',
            yearsOfExperience: '11-20 years',
            bio: 'Pediatrician with expertise in neonatal care, childhood vaccinations, and developmental disorders.',
        },
        availability: {
            schedule: makeSchedule({
                Monday: true, Tuesday: true, Wednesday: true,
                Thursday: true, Friday: true, Saturday: true, Sunday: false,
            }, '09:00', '17:00'),
            consultationDuration: '30 min',
        },
        payments: { consultationFee: '600', currency: 'INR', acceptedPaymentMethods: ['upi', 'card', 'cash'] },
    },
    {
        id: 'doc-006',
        user_type: 'doctor',
        full_name: 'Dr. Robert Williams',
        specialization: 'Neurology',
        verification: {
            hospitalAffiliation: 'Max Super Speciality Hospital',
            yearsOfExperience: '11-20 years',
            bio: 'Neurologist focusing on epilepsy, stroke management, and neurodegenerative conditions.',
        },
        availability: {
            schedule: makeSchedule({
                Monday: true, Tuesday: false, Wednesday: true,
                Thursday: false, Friday: true, Saturday: false, Sunday: false,
            }, '11:00', '19:00'),
            consultationDuration: '45 min',
        },
        payments: { consultationFee: '1500', currency: 'INR', acceptedPaymentMethods: ['card', 'netbanking'] },
    },
    {
        id: 'doc-007',
        user_type: 'doctor',
        full_name: 'Dr. Priya Sharma',
        specialization: 'Cardiology',
        verification: {
            hospitalAffiliation: 'Medanta The Medicity',
            yearsOfExperience: '6-10 years',
            bio: 'Non-invasive cardiologist specializing in echocardiography, preventive cardiology, and hypertension management.',
        },
        availability: {
            schedule: makeSchedule({
                Monday: true, Tuesday: true, Wednesday: true,
                Thursday: true, Friday: false, Saturday: false, Sunday: false,
            }, '09:00', '15:00'),
            consultationDuration: '30 min',
        },
        payments: { consultationFee: '900', currency: 'INR', acceptedPaymentMethods: ['upi', 'card', 'netbanking', 'cash'] },
    },
    {
        id: 'doc-008',
        user_type: 'doctor',
        full_name: 'Dr. Amit Patel',
        specialization: 'General Practice',
        verification: {
            hospitalAffiliation: 'Doon Medical College & Hospital',
            yearsOfExperience: '3-5 years',
            bio: 'General physician with a focus on chronic disease management, diabetes care, and family medicine.',
        },
        availability: {
            schedule: makeSchedule({
                Monday: true, Tuesday: true, Wednesday: true,
                Thursday: true, Friday: true, Saturday: true, Sunday: true,
            }, '08:00', '20:00'),
            consultationDuration: '15 min',
        },
        payments: { consultationFee: '300', currency: 'INR', acceptedPaymentMethods: ['upi', 'cash'] },
    },
];

// ─── Mock Appointments ──────────────────────────────────────────────────────

export type MockAppointment = {
    id: string;
    doctorId: string;
    doctorName: string;
    doctorSpecialization: string;
    date: string;
    time: string;
    status: 'upcoming' | 'scheduled' | 'completed' | 'cancelled';
    type: 'video' | 'follow-up' | 'in-person';
};

export const mockAppointments: MockAppointment[] = [
    {
        id: 'appt-001',
        doctorId: 'doc-001',
        doctorName: 'Dr. Sarah Johnson',
        doctorSpecialization: 'General Practice',
        date: 'Today',
        time: '2:00 PM',
        status: 'upcoming',
        type: 'video',
    },
    {
        id: 'appt-002',
        doctorId: 'doc-002',
        doctorName: 'Dr. Michael Chen',
        doctorSpecialization: 'Cardiology',
        date: 'Tomorrow',
        time: '10:30 AM',
        status: 'scheduled',
        type: 'video',
    },
];

// ─── Mock Medical Records ───────────────────────────────────────────────────

export type MockMedicalRecord = {
    id: string;
    diagnosis: string;
    doctorName: string;
    date: string;
    symptoms: string;
    treatment: string;
    prescriptions: string[];
    followUp: string | null;
};

export const mockMedicalRecords: MockMedicalRecord[] = [
    {
        id: 'rec-001',
        diagnosis: 'Upper Respiratory Infection',
        doctorName: 'Dr. Sarah Johnson',
        date: 'Jan 10, 2026',
        symptoms: 'Cough, sore throat, mild fever',
        treatment: 'Prescribed antibiotics and rest',
        prescriptions: ['Amoxicillin 500mg - 3x daily for 7 days', 'Acetaminophen as needed'],
        followUp: 'Jan 17, 2026',
    },
    {
        id: 'rec-002',
        diagnosis: 'Annual Checkup — All Clear',
        doctorName: 'Dr. Michael Chen',
        date: 'Dec 15, 2025',
        symptoms: 'Routine examination',
        treatment: 'No treatment required',
        prescriptions: [],
        followUp: null,
    },
    {
        id: 'rec-003',
        diagnosis: 'Migraine',
        doctorName: 'Dr. Sneha Reddy',
        date: 'Nov 28, 2025',
        symptoms: 'Severe headache, light sensitivity',
        treatment: 'Prescribed migraine medication',
        prescriptions: ['Sumatriptan 50mg - as needed'],
        followUp: 'Dec 28, 2025',
    },
];

// ─── Mock Post-Call Summary ─────────────────────────────────────────────────

export const mockPostCallSummary = {
    doctorName: 'Dr. Sarah Johnson',
    diagnosis: 'Upper Respiratory Infection',
    symptoms: ['Cough', 'Mild fever', 'Sore throat'],
    treatmentPlan: 'Rest, hydration, and prescribed antibiotics.',
    prescriptions: [
        'Amoxicillin 500mg (3x daily for 5 days)',
        'Ibuprofen 400mg (as needed for fever)',
    ],
    followUp: 'In 7 days if symptoms persist.',
    doctorNotes: 'Patient was advised to avoid cold beverages and monitor temperature daily.',
};
