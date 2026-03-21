/**
 * CareConnect — Doctor Login Redirect
 *
 * Thin redirect to the unified login screen with `role=doctor`.
 * Keeps the `/(auth)/doctor-login` route working for backwards compatibility
 * and deep-links, but all login UI lives in `/(auth)/login`.
 */

import { Redirect } from 'expo-router';

export default function DoctorLoginRedirect() {
    return <Redirect href="/(auth)/login?role=doctor" />;
}
