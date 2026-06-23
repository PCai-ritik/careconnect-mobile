import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { typography, shadows } from '@/constants/theme';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

interface CaregiverActionPopoverProps {
    visible: boolean;
    onClose: () => void;
    onBookAppointment: () => void;
    onAddPatient: () => void;
}

export default function CaregiverActionPopover({ visible, onClose, onBookAppointment, onAddPatient }: CaregiverActionPopoverProps) {
    const { colors } = useTheme();

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
            {/* Backdrop - tapping anywhere outside the menu closes it */}
            <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={onClose} />

            {/* Menu - positioned above the backdrop via later rendering order */}
            <View style={styles.container} pointerEvents="box-none">
                <Animated.View
                    entering={ZoomIn.duration(200)}
                    exiting={ZoomOut.duration(200)}
                    style={styles.bubbleContainer}
                >
                    <View style={[styles.menu, { backgroundColor: colors.surface }]}>
                        <TouchableOpacity 
                            style={[styles.item, { borderBottomColor: colors.borderLight, borderBottomWidth: 1 }]} 
                            onPress={onBookAppointment}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                                <Feather name="calendar" size={20} color={colors.primary} />
                            </View>
                            <View style={styles.itemTextContainer}>
                                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>Book Appointment</Text>
                                <Text style={[styles.itemSubtitle, { color: colors.textMuted }]}>Schedule a new visit</Text>
                            </View>
                            <Feather name="chevron-right" size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.item} 
                            onPress={onAddPatient}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                                <Feather name="user-plus" size={20} color={colors.primary} />
                            </View>
                            <View style={styles.itemTextContainer}>
                                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>Add Patient</Text>
                                <Text style={[styles.itemSubtitle, { color: colors.textMuted }]}>Add a new family member</Text>
                            </View>
                            <Feather name="chevron-right" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.triangle, { borderTopColor: colors.surface }]} />
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 90, // position above the center button
    },
    bubbleContainer: {
        width: '100%',
        alignItems: 'center',
        transformOrigin: 'bottom',
    },
    menu: {
        width: '100%',
        borderRadius: 20,
        padding: 8,
        ...shadows.elevated,
    },
    triangle: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderTopWidth: 10,
        borderBottomWidth: 0,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -1, // overlap slightly to prevent gap
        // drop shadow doesn't work well on border triangles in RN, so we just let the surface color match
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    itemTextContainer: {
        flex: 1,
    },
    itemTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: 15,
        marginBottom: 2,
    },
    itemSubtitle: {
        fontFamily: typography.fontFamily.regular,
        fontSize: 13,
    },
});
