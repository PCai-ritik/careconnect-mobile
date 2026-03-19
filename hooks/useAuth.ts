/**
 * CareConnect — useAuth Hook
 *
 * Convenience hook to access auth context.
 * Used by route guards and any component that needs auth state.
 */

import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '@/providers/AuthProvider';

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an <AuthProvider>');
    }

    return context;
}
