/**
 * CareConnect — Active Call Provider
 *
 * Tracks a call that has been minimized (user pressed back during a consultation).
 * Keeps the elapsed timer running and stores enough state for the FloatingCallBar
 * to display and for the consultation screen to restore its UI on return.
 */

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

export type ActiveCallInfo = {
    appointmentId: string;
    /** Patient name (doctor view) or doctor name (caregiver view) */
    name: string;
    role: 'doctor' | 'caregiver';
    elapsed: number;
    isMicOn: boolean;
};

type ActiveCallContextType = {
    activeCall: ActiveCallInfo | null;
    minimizeCall: (info: ActiveCallInfo) => void;
    toggleMic: () => void;
    clearCall: () => void;
};

const ActiveCallContext = createContext<ActiveCallContextType>({
    activeCall: null,
    minimizeCall: () => {},
    toggleMic: () => {},
    clearCall: () => {},
});

export function ActiveCallProvider({ children }: { children: ReactNode }) {
    const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Keep timer running while a call is minimized
    useEffect(() => {
        if (activeCall) {
            timerRef.current = setInterval(() => {
                setActiveCall((prev) => (prev ? { ...prev, elapsed: prev.elapsed + 1 } : null));
            }, 1000);
        }
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCall?.appointmentId]);

    const minimizeCall = (info: ActiveCallInfo) => {
        setActiveCall(info);
    };

    const toggleMic = () => {
        setActiveCall((prev) => (prev ? { ...prev, isMicOn: !prev.isMicOn } : null));
    };

    const clearCall = () => {
        setActiveCall(null);
    };

    return (
        <ActiveCallContext.Provider value={{ activeCall, minimizeCall, toggleMic, clearCall }}>
            {children}
        </ActiveCallContext.Provider>
    );
}

export const useActiveCall = () => useContext(ActiveCallContext);
