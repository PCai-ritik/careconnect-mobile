# Mocked Backend Routes

Every mock function below simulates a real API call with artificial latency.
When the backend is ready, replace the mock implementation as described in each entry's TODO comment.

---

## Authentication

### Patient Login
| Property | Value |
|----------|-------|
| **Status** | `[MOCKED]` |
| **File** | `services/auth.ts` |
| **Function** | `loginPatient(credentials)` |
| **Expected Payload** | `{ email: string, password: string, userType: "patient" }` |
| **Expected Response** | `AuthResponse { user, token, refreshToken }` |
| **Latency** | 1500 ms |

### Doctor Login
| Property | Value |
|----------|-------|
| **Status** | `[MOCKED]` |
| **File** | `services/auth.ts` |
| **Function** | `loginDoctor(credentials)` |
| **Expected Payload** | `{ email: string, password: string, userType: "doctor" }` |
| **Expected Response** | `AuthResponse { user, token, refreshToken }` |
| **Latency** | 1500 ms |

### Patient Registration
| Property | Value |
|----------|-------|
| **Status** | `[MOCKED]` |
| **File** | `services/auth.ts` |
| **Function** | `registerPatient(data)` |
| **Expected Payload** | `{ fullName: string, email: string, password: string }` |
| **Expected Response** | `AuthResponse { user, token, refreshToken }` |
| **Latency** | 1500 ms |

### Doctor Registration
| Property | Value |
|----------|-------|
| **Status** | `[MOCKED]` |
| **File** | `services/auth.ts` |
| **Function** | `registerDoctor(data)` |
| **Expected Payload** | `{ fullName: string, email: string, password: string, specialization: string, userType: "doctor" }` |
| **Expected Response** | `AuthResponse { user, token, refreshToken }` — `onboardingCompleted: false` |
| **Latency** | 1500 ms |

---

## Doctor Onboarding

### AI Document Analysis (OCR)
| Property | Value |
|----------|-------|
| **Status** | `[MOCKED]` |
| **File** | `app/(auth)/doctor-onboarding.tsx` |
| **Function** | `mockAnalyzeDocument(fileUri)` |
| **Expected Payload** | `{ fileUri: string }` (multipart upload in production) |
| **Expected Response** | `{ licenseNumber: string, licenseState: string, hospitalAffiliation: string }` |
| **Latency** | 2500 ms |

### Complete Onboarding
| Property | Value |
|----------|-------|
| **Status** | `[MOCKED]` |
| **File** | `app/(auth)/doctor-onboarding.tsx` |
| **Function** | `handleComplete()` |
| **Expected Payload** | Full doctor onboarding JSON (verification + availability + payments) |
| **Expected Response** | `{ success: true }` |
| **Latency** | 1500 ms (console.log only) |

---

## Patient Dashboard Data

### Mock Doctors
| Property | Value |
|----------|-------|
| **Status** | `[MOCKED]` |
| **File** | `services/mock-data.ts` |
| **Export** | `mockDoctors: MockDoctor[]` |
| **Schema** | `{ id, user_type: "doctor", full_name, specialization, verification: { hospitalAffiliation, yearsOfExperience, bio }, availability: { schedule: Record<Day, { enabled, startTime, endTime }>, consultationDuration }, payments: { consultationFee, currency } }` |
| **Count** | 8 doctors (General Practice ×2, Cardiology ×2, Dermatology, Orthopedics, Pediatrics, Neurology) |
| **Key Alignment** | All keys match `DoctorRegistration` (services/types.ts) + onboarding form types (doctor-onboarding.tsx) |

### Mock Appointments
| Property | Value |
|----------|-------|
| **Status** | `[MOCKED]` |
| **File** | `services/mock-data.ts` |
| **Export** | `mockAppointments: MockAppointment[]` |
| **Schema** | `{ id, doctorId, doctorName, doctorSpecialization, date, time, status: "upcoming" | "scheduled" | "completed" | "cancelled", type: "video" | "follow-up" | "in-person" }` |
| **Count** | 2 appointments (1 upcoming today, 1 scheduled tomorrow) |

### Mock Medical Records
| Property | Value |
|----------|-------|
| **Status** | `[MOCKED]` |
| **File** | `services/mock-data.ts` |
| **Export** | `mockMedicalRecords: MockMedicalRecord[]` |
| **Schema** | `{ id, diagnosis, doctorName, date, symptoms, treatment, prescriptions: string[], followUp: string | null }` |
| **Count** | 3 records |
