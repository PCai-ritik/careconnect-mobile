/**
 * CareConnect — Hospital Affiliation Modal (Doctor)
 *
 * 85%-height Bottom Sheet for searching, selecting, and requesting
 * affiliation to a target hospital/clinic.
 * Uses doctorColors + StyleSheet.create().
 */

import { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    TextInput,
    StyleSheet,
    Dimensions,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useSwipeDown from '@/hooks/useSwipeDown';
import { Feather } from '@expo/vector-icons';
import {
    spacing,
    doctorColors,
    typography,
    shadows,
    radii,
} from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { requestAffiliation } from '@/services/auth';
import type { MeResponse, HospitalListItem } from '@/services/types';
import ThemedAlert from '@/components/doctor/ThemedAlert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_HOSPITAL_ID = "00000000-0000-4000-8000-000000000001";

interface HospitalAffiliationModalProps {
    visible: boolean;
    onClose: () => void;
    me?: MeResponse | null;
    hospitals: HospitalListItem[];
    onSaved?: () => void;
}

export default function HospitalAffiliationModal({
    visible,
    onClose,
    me,
    hospitals,
    onSaved,
}: HospitalAffiliationModalProps) {
    const insets = useSafeAreaInsets();
    const { panHandlers, animatedStyle } = useSwipeDown(onClose);
    const { token } = useAuth();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Pre-fill selected hospital from profile when modal opens
    useEffect(() => {
        if (visible && me) {
            setSelectedId(me.hospital_id || '');
            setErrorMessage(null);
            setSearchQuery('');
        }
    }, [visible, me]);

    const handleRequest = async () => {
        if (!token || !selectedId || selectedId === me?.hospital_id) return;
        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            await requestAffiliation(token, selectedId);
            setShowSuccess(true);
            onSaved?.();
        } catch (err: any) {
            console.error('Failed to request affiliation:', err);
            setErrorMessage(err.message || 'Failed to submit request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filtered list of hospitals
    const filteredHospitals = hospitals.filter((h) =>
        h.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const currentHospital = hospitals.find((h) => h.id === me?.hospital_id);

    return (
        <>
            <Modal
                animationType="slide"
                transparent
                visible={visible}
                onRequestClose={onClose}
            >
                {/* Backdrop */}
                <Pressable style={s.backdrop} onPress={onClose} />

                {/* Sheet */}
                <Animated.View style={[s.sheet, animatedStyle, { paddingBottom: insets.bottom }]}>
                    {/* Handle */}
                    <View style={s.handleRow} {...panHandlers}>
                        <View style={s.handle} />
                    </View>

                    {/* Header */}
                    <View style={s.header}>
                        <Text style={s.headerTitle}>Hospital Affiliation</Text>
                    </View>

                    {/* Content */}
                    <View style={s.content}>
                        {/* Status Card */}
                        {me && (
                            <View style={s.statusCard}>
                                <Text style={s.sectionTitle}>Current Status</Text>
                                {me.affiliation_status === 'PENDING' ? (
                                    <View style={[s.statusBox, s.statusBoxPending]}>
                                        <Feather name="clock" size={18} color="#D97706" />
                                        <View style={s.statusInfo}>
                                            <Text style={[s.statusText, { color: '#D97706' }]}>Pending Approval</Text>
                                            <Text style={s.statusDetails}>
                                                Awaiting approval from {currentHospital?.name || 'selected hospital'}. Access is currently sandboxed to the default workspace.
                                            </Text>
                                        </View>
                                    </View>
                                ) : me.affiliation_status === 'REJECTED' ? (
                                    <View style={[s.statusBox, s.statusBoxRejected]}>
                                        <Feather name="alert-triangle" size={18} color="#DC2626" />
                                        <View style={s.statusInfo}>
                                            <Text style={[s.statusText, { color: '#DC2626' }]}>Request Rejected</Text>
                                            <Text style={s.statusDetails}>
                                                Your affiliation request was rejected. You can select another hospital below to request affiliation.
                                            </Text>
                                        </View>
                                    </View>
                                ) : me.hospital_id === DEFAULT_HOSPITAL_ID ? (
                                    <View style={[s.statusBox, s.statusBoxDefault]}>
                                        <Feather name="info" size={18} color="#2563EB" />
                                        <View style={s.statusInfo}>
                                            <Text style={[s.statusText, { color: '#2563EB' }]}>Default Workspace</Text>
                                            <Text style={s.statusDetails}>
                                                You are currently using the default global CareConnect workspace. Request affiliation below to connect to your hospital.
                                            </Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={[s.statusBox, s.statusBoxApproved]}>
                                        <Feather name="check-circle" size={18} color="#16A34A" />
                                        <View style={s.statusInfo}>
                                            <Text style={[s.statusText, { color: '#16A34A' }]}>Affiliated & Approved</Text>
                                            <Text style={s.statusDetails}>
                                                Connected to {currentHospital?.name || 'your hospital'}.
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {errorMessage && (
                            <View style={s.errorBox}>
                                <Feather name="alert-circle" size={16} color="#DC2626" />
                                <Text style={s.errorText}>{errorMessage}</Text>
                            </View>
                        )}

                        {/* Search & List */}
                        {me?.affiliation_status !== 'PENDING' && (
                            <View style={s.searchSection}>
                                <Text style={s.sectionTitle}>Request New Affiliation</Text>
                                <View style={s.searchBar}>
                                    <Feather name="search" size={18} color={doctorColors.textMuted} style={s.searchIcon} />
                                    <TextInput
                                        style={s.searchInput}
                                        placeholder="Search hospitals..."
                                        placeholderTextColor={doctorColors.textMuted}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                </View>

                                <ScrollView
                                    style={s.listArea}
                                    showsVerticalScrollIndicator={false}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {filteredHospitals.map((h) => {
                                        const isSelected = selectedId === h.id;
                                        const isCurrent = me?.hospital_id === h.id;
                                        return (
                                            <Pressable
                                                key={h.id}
                                                style={[
                                                    s.hospitalRow,
                                                    isSelected && s.hospitalRowSelected,
                                                    isCurrent && s.hospitalRowDisabled,
                                                ]}
                                                onPress={() => !isCurrent && setSelectedId(h.id)}
                                            >
                                                <View style={s.hospitalRowContent}>
                                                    <Feather
                                                        name="home"
                                                        size={16}
                                                        color={isSelected ? doctorColors.primary : doctorColors.textSecondary}
                                                    />
                                                    <Text style={[
                                                        s.hospitalName,
                                                        isSelected && s.hospitalNameSelected,
                                                        isCurrent && s.hospitalNameCurrent,
                                                    ]}>
                                                        {h.name} {h.id === DEFAULT_HOSPITAL_ID ? "(Default)" : ""}
                                                    </Text>
                                                </View>
                                                {isCurrent ? (
                                                    <Text style={s.currentLabel}>Current</Text>
                                                ) : isSelected ? (
                                                    <Feather name="check" size={18} color={doctorColors.primary} />
                                                ) : null}
                                            </Pressable>
                                        );
                                    })}
                                    {filteredHospitals.length === 0 && (
                                        <Text style={s.noResults}>No hospitals match your search</Text>
                                    )}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* Footer */}
                    {me?.affiliation_status !== 'PENDING' && (
                        <View style={s.footer}>
                            <Pressable
                                onPress={handleRequest}
                                disabled={isSubmitting || !selectedId || selectedId === me?.hospital_id}
                                style={({ pressed }) => [
                                    s.submitBtn,
                                    (isSubmitting || !selectedId || selectedId === me?.hospital_id) && { opacity: 0.5 },
                                    pressed && { backgroundColor: doctorColors.primaryDark },
                                ]}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Feather name="send" size={16} color="#fff" />
                                        <Text style={s.submitBtnText}>Request Affiliation</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    )}
                </Animated.View>
            </Modal>

            <ThemedAlert
                visible={showSuccess}
                variant="success"
                icon="check-circle"
                title="Request Submitted"
                message="Your affiliation request was sent. An administrator will review your credentials shortly."
                confirmLabel="Done"
                onConfirm={() => {
                    setShowSuccess(false);
                    onClose();
                }}
            />
        </>
    );
}

const s = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT * 0.85,
        backgroundColor: doctorColors.surface,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        ...shadows.elevated,
    },
    handleRow: {
        alignItems: 'center',
        paddingTop: spacing.md,
        paddingBottom: spacing.xs,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: doctorColors.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    headerTitle: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.xl,
        color: doctorColors.textPrimary,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
    },
    sectionTitle: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.sm,
        color: doctorColors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.sm,
    },
    statusCard: {
        marginBottom: spacing.xl,
    },
    statusBox: {
        flexDirection: 'row',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
    },
    statusBoxPending: {
        backgroundColor: '#FEF3C7',
        borderColor: '#FDE68A',
    },
    statusBoxRejected: {
        backgroundColor: '#FEE2E2',
        borderColor: '#FCA5A5',
    },
    statusBoxDefault: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
    },
    statusBoxApproved: {
        backgroundColor: '#DCFCE7',
        borderColor: '#BBF7D0',
    },
    statusInfo: {
        flex: 1,
    },
    statusText: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.sm,
    },
    statusDetails: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textSecondary,
        marginTop: 2,
        lineHeight: 16,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: '#FEE2E2',
        borderRadius: radii.md,
        marginBottom: spacing.lg,
    },
    errorText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.xs,
        color: '#DC2626',
        flex: 1,
    },
    searchSection: {
        flex: 1,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: radii.md,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
    },
    listArea: {
        flex: 1,
        marginBottom: spacing.md,
    },
    hospitalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: 'transparent',
        backgroundColor: '#F8FAFC',
        marginBottom: spacing.xs,
    },
    hospitalRowSelected: {
        backgroundColor: '#EEF2FF',
        borderColor: '#C7D2FE',
    },
    hospitalRowDisabled: {
        opacity: 0.6,
        backgroundColor: '#F1F5F9',
    },
    hospitalRowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flex: 1,
    },
    hospitalName: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
        flex: 1,
    },
    hospitalNameSelected: {
        color: doctorColors.primary,
        fontFamily: typography.fontFamily.bold,
    },
    hospitalNameCurrent: {
        color: doctorColors.textMuted,
    },
    currentLabel: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.xs,
        color: doctorColors.textMuted,
    },
    noResults: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        textAlign: 'center',
        marginTop: spacing.xl,
    },
    footer: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: doctorColors.borderLight,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: radii.md,
        backgroundColor: doctorColors.primary,
    },
    submitBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#FFFFFF',
    },
});
