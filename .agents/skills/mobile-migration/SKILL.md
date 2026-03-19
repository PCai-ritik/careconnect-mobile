---
name: CareConnect Mobile Migration
description: Architecture rules, dual design system, API service layer, and strict native performance guidelines for migrating CareConnect from web to React Native with Expo Router.
---

# CareConnect Mobile Migration Skill

You are migrating the CareConnect healthcare platform from a React web app to a **React Native + Expo Router** mobile application. This document is the single source of truth for every architectural decision. Follow it exactly.

---

## 1. Project Structure

```
app/                          # Expo Router file-based routing
├── _layout.tsx               # Root layout (providers, fonts, splash)
├── (auth)/                   # Auth group (unauthenticated)
│   ├── _layout.tsx
│   ├── login.tsx             # Patient login
│   ├── register.tsx          # Patient registration
│   ├── doctor-login.tsx      # Doctor login
│   └── doctor-register.tsx   # Doctor registration
├── (patient)/                # Patient tab group (authenticated)
│   ├── _layout.tsx           # Bottom tab navigator
│   ├── index.tsx             # Patient dashboard / home
│   ├── appointments.tsx
│   ├── consultation.tsx
│   └── profile.tsx
├── (doctor)/                 # Doctor tab group (authenticated)
│   ├── _layout.tsx           # Bottom tab navigator
│   ├── index.tsx             # Doctor dashboard / overview
│   ├── appointments.tsx
│   ├── patients/
│   │   ├── index.tsx
│   │   └── [id].tsx
│   ├── schedule.tsx
│   └── settings.tsx
└── +not-found.tsx

components/
├── shared/                   # Truly shared primitives (e.g., LoadingSpinner)
├── patient/                  # Patient-specific components
└── doctor/                   # Doctor-specific components

constants/
├── theme.ts                  # ★ THE design system (colors, spacing, typography, shadows)
└── animations.ts             # ★ Reanimated presets for both roles

services/                     # ★ Centralized API layer (CRITICAL)
├── api.ts                    # Base API client & config
├── auth.ts                   # Auth service (login, register, session)
├── patients.ts               # Patient-facing API calls
├── doctors.ts                # Doctor-facing API calls
├── appointments.ts           # Appointments CRUD
└── types.ts                  # ★ All TypeScript interfaces for API request/response shapes

hooks/
├── useAuth.ts                # Auth state & session management
├── usePatientTheme.ts        # Returns patient design tokens
└── useDoctorTheme.ts         # Returns doctor design tokens

providers/
├── AuthProvider.tsx           # Auth context wrapping the app
└── ThemeProvider.tsx          # Role-based theme context
```

### Role-Based Routing Guards

This app has two distinct authenticated experiences living in one codebase — `/(patient)` and `/(doctor)`. **You MUST enforce route guards to prevent cross-role access.**

- The root `app/_layout.tsx` (or each group's `_layout.tsx`) must use the `useAuth` hook to read the authenticated user's `userType`.
- If a **Patient** attempts to navigate to any `/(doctor)` route, immediately redirect them to `/(patient)`.
- If a **Doctor** attempts to navigate to any `/(patient)` route, immediately redirect them to `/(doctor)`.
- If an **unauthenticated** user attempts to access any protected group, redirect to `/(auth)`.

```typescript
// Example: app/(doctor)/_layout.tsx
import { useAuth } from '@/hooks/useAuth';
import { Redirect, Stack } from 'expo-router';

export default function DoctorLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null; // or splash
  if (!user) return <Redirect href="/(auth)/doctor-login" />;
  if (user.userType !== 'doctor') return <Redirect href="/(patient)" />;

  return <Stack />;
}
```

### Absolute Imports

Configure `tsconfig.json` with path aliases. **Never use relative imports like `../../`.**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

Usage:
```typescript
import { colors } from '@/constants/theme';
import { login } from '@/services/auth';
import { PatientCard } from '@/components/patient/PatientCard';
```

---

## 2. The Dual Design System

This app serves two psychologically distinct user roles. **Every screen MUST use the correct role's tokens.** Never mix them.

### 2.1 Color Palettes

Define these in `constants/theme.ts`.

#### Patient Theme — "Safe & Inviting"

> **Psychology:** Green is universally associated with healing, nature, and tranquility. It visually lowers the heart rate. The patient experience must feel safe, calming, and breathable. Use generous white space, soft borders, and muted tones.

```typescript
export const patientColors = {
  // Core greens — extracted from CareConnect web primary (HSL 174 62% 40%)
  primary:        '#27A599',   // Main teal-green — buttons, active states, links
  primaryLight:   '#DFF5F2',   // Tinted backgrounds, badges, subtle highlights
  primaryDark:    '#1E8578',   // Pressed states, emphasis text

  // Extended calming palette
  sage:           '#A8C5B8',   // Secondary surfaces, card accents
  mint:           '#E8F5E9',   // Success backgrounds, confirmation states
  seafoam:        '#B2DFDB',   // Dividers, progress bar fills

  // Neutrals (warm-tinted to avoid clinical coldness)
  background:     '#FDFCFA',   // Root background — warm off-white
  surface:        '#FFFFFF',   // Cards, modals, sheets
  surfaceMuted:   '#F5F3F0',   // Grouped table backgrounds, secondary surfaces
  border:         '#E4E1DA',   // Card borders, dividers
  borderLight:    '#EEECE7',   // Subtle separators

  // Text hierarchy
  textPrimary:    '#1A2E35',   // Headings, primary content
  textSecondary:  '#5F7278',   // Descriptions, labels
  textMuted:      '#8FA3A9',   // Placeholders, timestamps, hints

  // Semantic
  success:        '#4CAF50',
  warning:        '#FF9800',
  error:          '#E53E3E',
  info:           '#2196F3',
} as const;
```

#### Doctor Theme — "Productivity & Focus"

> **Psychology:** Orange is energetic and action-oriented. It draws the eye and encourages immediate interaction. For a medical tool, avoid bright/alarming orange. Use burnt orange, terracotta, and crisp coral strictly for primary action buttons (e.g., "Approve Prescription", "Join Call") to make the dashboard feel like a highly tuned, efficient instrument.

```typescript
export const doctorColors = {
  // Core oranges — extracted from CareConnect web accent (HSL 12 80% 65%)
  primary:        '#E2725B',   // Terracotta — primary action buttons ONLY
  primaryLight:   '#FCECE8',   // Tinted badge backgrounds, subtle highlights
  primaryDark:    '#C75B3F',   // Pressed button states

  // Extended productivity palette
  coral:          '#ED7B5E',   // Secondary action emphasis, FABs
  amber:          '#F5A623',   // Warnings, attention badges, countdowns
  warmGray:       '#6B6054',   // Sidebar text, secondary labels

  // Neutrals (cool, crisp, high-contrast for scan-ability)
  background:     '#F8F9FA',   // Root background — clean, neutral white
  surface:        '#FFFFFF',   // Cards, panels
  surfaceMuted:   '#F1F3F5',   // Table rows (alternating), secondary panels
  border:         '#DEE2E6',   // Card borders, dividers — crisp, visible
  borderLight:    '#E9ECEF',   // Subtle separators

  // Text hierarchy (high-contrast for quick scanning)
  textPrimary:    '#212529',   // Headings, patient names, key data
  textSecondary:  '#495057',   // Labels, descriptions
  textMuted:      '#868E96',   // Timestamps, metadata

  // Semantic
  success:        '#2F9E44',
  warning:        '#F59F00',
  error:          '#E03131',
  info:           '#1C7ED6',
} as const;
```

### 2.2 Spacing Scale

A consistent 4px base grid. Use these tokens everywhere — **never use arbitrary pixel values.**

```typescript
export const spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;
```

### 2.3 Typography

Use `expo-font` to load **Inter** (matches the web app's font family).

```typescript
export const typography = {
  // Font families
  fontFamily: {
    regular:    'Inter_400Regular',
    medium:     'Inter_500Medium',
    semiBold:   'Inter_600SemiBold',
    bold:       'Inter_700Bold',
  },

  // Font sizes with matching line heights
  size: {
    xs:    { fontSize: 11, lineHeight: 16 },
    sm:    { fontSize: 13, lineHeight: 18 },
    base:  { fontSize: 15, lineHeight: 22 },
    lg:    { fontSize: 17, lineHeight: 24 },
    xl:    { fontSize: 20, lineHeight: 28 },
    '2xl': { fontSize: 24, lineHeight: 32 },
    '3xl': { fontSize: 30, lineHeight: 38 },
    '4xl': { fontSize: 36, lineHeight: 44 },
  },
} as const;
```

### 2.4 Shadows & Radii

```typescript
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export const radii = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 9999,
} as const;
```

---

## 3. Animations — `react-native-reanimated`

Define all animation presets in `constants/animations.ts`. Components import presets — they **never** define raw spring/timing configs inline.

### Patient UI — Gentle, Fluid Springs

> The patient experience should feel organic and unhurried. Animations breathe.

```typescript
import { WithSpringConfig, WithTimingConfig, Easing } from 'react-native-reanimated';

export const patientAnimations = {
  // Primary spring — screen transitions, card appearances
  spring: {
    damping: 20,
    stiffness: 90,
    mass: 1,
    overshootClamping: false,
  } satisfies WithSpringConfig,

  // Gentle fade+rise for list items, staggered entrances
  fadeIn: {
    duration: 400,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  } satisfies WithTimingConfig,

  // Slow dissolve for overlays, modals
  dissolve: {
    duration: 300,
    easing: Easing.out(Easing.cubic),
  } satisfies WithTimingConfig,

  // Stagger delay between list items (ms)
  staggerDelay: 80,
};
```

### Doctor UI — Snappy, Utilitarian Transitions

> The doctor experience should feel instantaneous and precise. Animations are functional, not decorative.

```typescript
export const doctorAnimations = {
  // Crisp spring — minimal overshoot, fast settle
  spring: {
    damping: 28,
    stiffness: 250,
    mass: 0.8,
    overshootClamping: true,
  } satisfies WithSpringConfig,

  // Quick snap for tab switches, card flips
  snapIn: {
    duration: 180,
    easing: Easing.bezier(0.0, 0.0, 0.2, 1),
  } satisfies WithTimingConfig,

  // Instant feedback for toggles, button presses
  microInteraction: {
    duration: 100,
    easing: Easing.linear,
  } satisfies WithTimingConfig,

  // Stagger delay between list items (ms) — fast
  staggerDelay: 40,
};
```

---

## 4. Centralized API Service Layer (CRITICAL)

> **RULE: NEVER write `fetch()`, `axios`, or any HTTP call directly inside a UI component, hook, or screen file. ALL network communication goes through the `services/` directory.**

### 4.1 Base API Client — `services/api.ts`

```typescript
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
```

### 4.2 Mock Data Pattern (Pre-Backend)

Until the real backend is live, **every service function returns realistic mock data wrapped in a Promise with simulated latency**. This makes the swap to real API calls a single-line change per function.

```typescript
// services/helpers.ts
export function mockResponse<T>(data: T, delayMs = 600): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), delayMs));
}
```

**Example — `services/appointments.ts`:**

```typescript
import { mockResponse } from './helpers';
import { apiRequest } from './api';
import type { Appointment, AppointmentListResponse } from './types';

const USE_MOCK = !process.env.EXPO_PUBLIC_API_URL;

export async function getUpcomingAppointments(token: string): Promise<AppointmentListResponse> {
  if (USE_MOCK) {
    return mockResponse({
      appointments: [
        {
          id: 'apt-001',
          patientName: 'Sarah Johnson',
          doctorName: 'Dr. Priya Sharma',
          dateTime: '2026-03-20T09:00:00Z',
          type: 'video',
          status: 'upcoming',
        },
        {
          id: 'apt-002',
          patientName: 'Michael Chen',
          doctorName: 'Dr. Priya Sharma',
          dateTime: '2026-03-20T10:30:00Z',
          type: 'follow-up',
          status: 'upcoming',
        },
      ],
      total: 2,
    });
  }

  return apiRequest<AppointmentListResponse>({
    method: 'GET',
    path: '/appointments/upcoming',
    token,
  });
}
```

### 4.3 TypeScript Interfaces — `services/types.ts`

**Every API response shape MUST be defined here as a TypeScript interface BEFORE it is used anywhere.** This is the contract with the future backend.

```typescript
// Auth
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

// Appointments
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

// Patients
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

// Doctor
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

// Dashboard
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
```

### 4.4 Service File Rules

| Rule | Details |
|------|---------|
| **One domain per file** | `services/auth.ts`, `services/appointments.ts`, `services/patients.ts`, `services/doctors.ts` |
| **Export named functions** | `export async function login(...)`, not default exports |
| **Accept token as parameter** | Services are stateless; auth token is passed in, never read from global state inside a service |
| **Return typed Promises** | Every function has an explicit return type `Promise<SomeInterface>` |
| **Mock toggle** | Use `const USE_MOCK = !process.env.EXPO_PUBLIC_API_URL;` at the top of each file |

### 4.5 Secure Token Storage (CRITICAL)

> **Token Storage: NEVER use `AsyncStorage` or `localStorage` for authentication tokens. You MUST strictly use `expo-secure-store` to persist the user session.**

`AsyncStorage` is unencrypted and trivially readable on a rooted/jailbroken device. Healthcare data demands encrypted storage.

```typescript
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'careconnect_auth_token';
const REFRESH_KEY = 'careconnect_refresh_token';

export async function saveTokens(token: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
```

| ❌ FORBIDDEN | ✅ REQUIRED |
|---|---|
| `AsyncStorage.setItem('token', ...)` | `SecureStore.setItemAsync(TOKEN_KEY, ...)` |
| `localStorage.setItem(...)` | `SecureStore.setItemAsync(...)` |

---

## 5. Strict Native & Performance Rules

### 5.1 FORBIDDEN Patterns — NEVER Do This

```typescript
// ❌ NEVER: HTML tags
<div>, <span>, <p>, <img>, <button>, <input>, <a>, <h1>...<h6>

// ❌ NEVER: fetch/axios in components
const MyScreen = () => {
  const data = await fetch('/api/patients');  // VIOLATION
};

// ❌ NEVER: Inline styles with magic numbers
style={{ padding: 13, marginTop: 7 }}  // Use spacing tokens

// ❌ NEVER: ScrollView for dynamic lists
<ScrollView>{items.map(i => <Item />)}</ScrollView>  // Use FlatList

// ❌ NEVER: Relative imports crossing boundaries
import { thing } from '../../../components/shared/thing';  // Use @/

// ❌ NEVER: AsyncStorage for tokens
import AsyncStorage from '@react-native-async-storage/async-storage';
AsyncStorage.setItem('token', authToken);  // SECURITY VIOLATION — use SecureStore
```

### 5.2 REQUIRED Patterns — ALWAYS Do This

```typescript
// ✅ ALWAYS: React Native primitives
import { View, Text, Pressable, Image, TextInput } from 'react-native';

// ✅ ALWAYS: SafeAreaView for screens
import { SafeAreaView } from 'react-native-safe-area-context';

// ✅ ALWAYS: KeyboardAvoidingView for screens with text inputs
import { KeyboardAvoidingView, Platform } from 'react-native';
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
  style={{ flex: 1 }}
>

// ✅ ALWAYS: FlatList or FlashList for dynamic lists
import { FlatList } from 'react-native';
// OR for large datasets:
import { FlashList } from '@shopify/flash-list';

// ✅ ALWAYS: Expo Router for navigation
import { useRouter, useLocalSearchParams, Link, Stack } from 'expo-router';

// ✅ ALWAYS: Spacing tokens
import { spacing } from '@/constants/theme';
style={{ padding: spacing.lg, marginBottom: spacing.md }}

// ✅ ALWAYS: Typed service calls
import { getUpcomingAppointments } from '@/services/appointments';
```

### 5.3 Screen Template

Every screen file MUST follow this structure:

```typescript
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useNavigation } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { spacing } from '@/constants/theme';

export default function ExampleScreen() {
  const headerHeight = useHeaderHeight();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Example' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, padding: spacing.lg }}>
          {/* Screen content */}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

> Omit `KeyboardAvoidingView` only if the screen has zero `TextInput` components.

> **KeyboardAvoidingView Offset:** When using `KeyboardAvoidingView` on a screen with a visible Expo Router `Stack` header, you **must** set `keyboardVerticalOffset` to account for the header height. Use `useHeaderHeight()` from `@react-navigation/elements` for an accurate value. Without this, the keyboard will either over-push or under-push the layout on iOS.

### 5.4 List Rendering Rules

| Scenario | Component | Rationale |
|----------|-----------|-----------|
| 0–5 static items | `View` with mapped children | No virtualization overhead |
| 5–100 dynamic items | `FlatList` | Built-in virtualization |
| 100+ items | `FlashList` from `@shopify/flash-list` | Higher performance recycling |
| Horizontal carousel | `FlatList` with `horizontal` | Native scroll behavior |
| Sectioned data | `SectionList` | Built-in section headers |

**Always provide `keyExtractor` and avoid anonymous arrow functions in `renderItem` for lists over 20 items.**

### 5.5 Image Rules

```typescript
// ✅ Use expo-image for all network images (caching, placeholder, transition)
import { Image } from 'expo-image';

<Image
  source={{ uri: avatarUrl }}
  placeholder={blurhash}
  contentFit="cover"
  transition={200}
  style={{ width: 48, height: 48, borderRadius: radii.full }}
/>
```

---

## 6. File Naming & Export Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Screens (Expo Router) | `kebab-case.tsx` | `doctor-login.tsx` |
| Components | `PascalCase.tsx` | `AppointmentCard.tsx` |
| Services | `camelCase.ts` | `appointments.ts` |
| Hooks | `useCamelCase.ts` | `useAuth.ts` |
| Constants | `camelCase.ts` | `theme.ts` |
| Types | `PascalCase` interfaces in `types.ts` | `interface DoctorProfile` |

- **Screens**: `export default function` (required by Expo Router).
- **Components**: Named exports preferred (`export function AppointmentCard`).
- **Services**: Named function exports only. No default exports.

---

## 7. Key Dependencies

Install these and **only** these unless a new feature explicitly requires something else:

```bash
# Core
npx create-expo-app@latest ./ --template tabs
npx expo install expo-router expo-font expo-image expo-constants expo-secure-store

# Animation
npx expo install react-native-reanimated react-native-gesture-handler

# Safe areas & navigation
npx expo install react-native-safe-area-context react-native-screens

# Lists (for large datasets)
npx expo install @shopify/flash-list

# Forms & validation
npm install react-hook-form zod @hookform/resolvers
```

> **Do NOT install axios.** The built-in `fetch` via `services/api.ts` is sufficient.
> **Do NOT install a state management library** (Redux, MobX, Zustand) unless explicitly approved. Start with React Context + hooks.

---

## 8. Environment Configuration

Use `EXPO_PUBLIC_` prefixed env vars (Expo's convention for client-side access).

```bash
# .env (local dev — mock mode)
# Leave EXPO_PUBLIC_API_URL unset to use mock data

# .env.staging
EXPO_PUBLIC_API_URL=https://staging-api.careconnect.dev

# .env.production
EXPO_PUBLIC_API_URL=https://api.careconnect.dev
```

Access in code:
```typescript
const apiUrl = process.env.EXPO_PUBLIC_API_URL; // undefined = mock mode
```

---

## 9. Pre-Flight Checklist

Before committing any feature, verify:

- [ ] **No HTML tags** — grep for `<div`, `<span`, `<p>`, etc.
- [ ] **No inline fetch/axios** — grep for `fetch(` and `axios` outside `services/`
- [ ] **No relative imports** crossing 2+ levels — grep for `../../`
- [ ] **All lists** use `FlatList`, `FlashList`, or `SectionList`
- [ ] **All screens** wrapped in `SafeAreaView`
- [ ] **All text input screens** wrapped in `KeyboardAvoidingView`
- [ ] **All colors** reference `patientColors` or `doctorColors` — no inline hex codes
- [ ] **All spacing** uses `spacing.*` tokens — no magic numbers
- [ ] **All API calls** route through `services/*.ts`
- [ ] **All response shapes** have interfaces in `services/types.ts`
- [ ] **TypeScript strict mode** — no `any` types