/**
 * CareConnect — Floating Call Bar
 *
 * Shown across the entire app when a consultation is minimized (user pressed back
 * during an active call). Tapping the bar returns to the full consultation screen.
 * Shows patient/doctor name, running duration, mute toggle, and end-call button.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useActiveCall } from '@/providers/ActiveCallProvider';
import { useAuth } from '@/hooks/useAuth';
import { endVideoSession } from '@/services/doctor';
import { typography, spacing } from '@/constants/theme';

const VC = {
    bg: 'rgba(15, 23, 42, 0.97)',
    border: 'rgba(255,255,255,0.08)',
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    green: '#22C55E',
    red: '#EF4444',
    controlBg: 'rgba(255,255,255,0.12)',
    controlOff: 'rgba(239, 68, 68, 0.25)',
};

function formatTime(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export default function FloatingCallBar() {
    const { activeCall, toggleMic, clearCall } = useActiveCall();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { token } = useAuth();

    if (!activeCall) return null;

    const handleReturnToCall = () => {
        const path =
            activeCall.role === 'doctor'
                ? `/(doctor)/consultation/${activeCall.appointmentId}`
                : `/(caregiver)/consultation/${activeCall.appointmentId}`;
        router.push(path as any);
    };

    const handleEndCall = () => {
        // Capture before clearCall wipes the context
        const role = activeCall.role;
        const appointmentId = activeCall.appointmentId;

        clearCall();

        if (role === 'caregiver') {
            router.push({
                pathname: '/(caregiver)/post-call-summary',
                params: { appointmentId },
            } as any);
        }

        // Doctor tears down the server room in the background.
        // The consultation screen's LiveKitRoom is already unmounted (minimized),
        // so we can safely delete the room without risking the Closing error.
        if (role === 'doctor' && token) {
            setTimeout(async () => {
                try { await endVideoSession(token, appointmentId); } catch { /* ignore */ }
            }, 0);
        }
    };

    return (
        <Pressable
            style={[styles.bar, { paddingTop: Math.max(insets.top, 10) }]}
            onPress={handleReturnToCall}
            android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
        >
            {/* Live indicator + name + duration */}
            <View style={styles.left}>
                <View style={styles.pulseDot} />
                <View style={styles.textGroup}>
                    <Text style={styles.name} numberOfLines={1}>{activeCall.name}</Text>
                    <Text style={styles.duration}>{formatTime(activeCall.elapsed)}</Text>
                </View>
            </View>

            {/* Tap hint */}
            <Text style={styles.tapHint}>Tap to return</Text>

            {/* Controls */}
            <View style={styles.controls}>
                <Pressable
                    style={[styles.btn, !activeCall.isMicOn && styles.btnOff]}
                    onPress={(e) => { e.stopPropagation(); toggleMic(); }}
                    hitSlop={8}
                >
                    <Feather
                        name={activeCall.isMicOn ? 'mic' : 'mic-off'}
                        size={15}
                        color={activeCall.isMicOn ? VC.text : VC.red}
                    />
                </Pressable>
                <Pressable
                    style={[styles.btn, styles.endBtn]}
                    onPress={(e) => { e.stopPropagation(); handleEndCall(); }}
                    hitSlop={8}
                >
                    <Feather name="phone-off" size={15} color="#FFFFFF" />
                </Pressable>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    bar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: VC.bg,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm + 2,
        borderBottomWidth: 1,
        borderBottomColor: VC.border,
        zIndex: 9999,
        elevation: 20,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: VC.green,
    },
    textGroup: {
        gap: 1,
    },
    name: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: 13,
        color: VC.text,
    },
    duration: {
        fontFamily: typography.fontFamily.regular,
        fontSize: 11,
        color: VC.textMuted,
        fontVariant: ['tabular-nums'],
    },
    tapHint: {
        fontFamily: typography.fontFamily.regular,
        fontSize: 11,
        color: VC.textMuted,
        marginHorizontal: spacing.md,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    btn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: VC.controlBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnOff: {
        backgroundColor: VC.controlOff,
    },
    endBtn: {
        backgroundColor: VC.red,
    },
});
