import React, { useState, useEffect } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { doctorColors, typography, radii, spacing, patientColors } from '@/constants/theme';

interface SmartJoinButtonProps {
    scheduledTime: string;
    durationMinutes: number;
    appointmentStatus?: string;
    role: 'doctor' | 'caregiver';
    size?: 'sm' | 'md';
    onPress: () => void;
    style?: ViewStyle | ViewStyle[];
}

type ButtonState = 'future' | 'imminent' | 'in-progress' | 'overdue';

export default function SmartJoinButton({
    scheduledTime,
    durationMinutes,
    appointmentStatus,
    role,
    size = 'md',
    onPress,
    style,
}: SmartJoinButtonProps) {
    const [status, setStatus] = useState<ButtonState>('future');
    const [timeRemaining, setTimeRemaining] = useState<string>('');

    useEffect(() => {
        const updateStatus = () => {
            // If the backend says the call is already in progress
            // (e.g. doctor started early), skip time-based logic.
            if (appointmentStatus === 'IN_PROGRESS') {
                setStatus('in-progress');
                return;
            }

            const now = new Date();
            const scheduled = new Date(scheduledTime);
            const endTime = new Date(scheduled.getTime() + durationMinutes * 60000);
            
            const diffMs = scheduled.getTime() - now.getTime();
            const diffMins = Math.floor(diffMs / 60000);

            if (now > endTime) {
                setStatus('overdue');
            } else if (now >= scheduled && now <= endTime) {
                setStatus('in-progress');
            } else if (diffMins <= 15) {
                setStatus('imminent');
            } else {
                setStatus('future');
                
                // Format time remaining
                if (diffMins < 60) {
                    setTimeRemaining(`in ${diffMins} min`);
                } else {
                    const hours = Math.floor(diffMins / 60);
                    const mins = diffMins % 60;
                    setTimeRemaining(`in ${hours}h ${mins}m`);
                }
            }
        };

        updateStatus();
        const interval = setInterval(updateStatus, 60000); // update every minute

        return () => clearInterval(interval);
    }, [scheduledTime, durationMinutes, appointmentStatus]);

    const isCaregiver = role === 'caregiver';
    const primaryColor = isCaregiver ? patientColors.primary : doctorColors.primary;

    const getBtnStyle = () => {
        const baseStyle = size === 'sm' ? styles.btnSm : styles.btn;
        switch (status) {
            case 'future':
                return [baseStyle, styles.btnFuture, style];
            case 'imminent':
                return [baseStyle, { backgroundColor: primaryColor }, style];
            case 'in-progress':
                return [baseStyle, { backgroundColor: primaryColor }, styles.btnInProgress, style];
            case 'overdue':
                return [baseStyle, styles.btnOverdue, style];
        }
    };

    const getIcon = (): keyof typeof Feather.glyphMap => {
        if (status === 'future') return 'clock';
        if (status === 'overdue') return 'alert-triangle';
        return 'video';
    };

    const getLabel = () => {
        switch (status) {
            case 'future':
                return `Starts ${timeRemaining}`;
            case 'imminent':
                return isCaregiver ? 'Join Video Call' : 'Start Call';
            case 'in-progress':
                return isCaregiver ? 'Join Now' : 'Start Now';
            case 'overdue':
                return 'Overdue';
        }
    };

    const isDisabled = status === 'future';

    return (
        <Pressable
            style={({ pressed }) => [
                getBtnStyle(),
                pressed && !isDisabled && { opacity: 0.85 }
            ]}
            onPress={onPress}
            disabled={isDisabled}
        >
            <Feather name={getIcon()} size={size === 'sm' ? 14 : 16} color={status === 'future' ? doctorColors.textSecondary : '#FFFFFF'} />
            <Text style={[
                size === 'sm' ? styles.textSm : styles.text,
                status === 'future' && { color: doctorColors.textSecondary }
            ]}>
                {getLabel()}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
    },
    btnSm: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: 6,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.sm,
    },
    btnFuture: {
        backgroundColor: '#F3F4F6', // gray-100
        borderWidth: 1,
        borderColor: '#E5E7EB', // gray-200
    },
    btnInProgress: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    btnOverdue: {
        backgroundColor: '#EF4444', // Red-500
    },
    text: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: '#FFFFFF',
    },
    textSm: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.xs,
        color: '#FFFFFF',
    },
});
