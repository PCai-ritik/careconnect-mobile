import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
    spacing,
    doctorColors,
    typography,
    shadows,
    radii,
} from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { createDoctorNote } from '@/services/doctor';

interface LiveNotesModalProps {
    visible: boolean;
    onClose: () => void;
    appointmentId: string | null;
}

export default function LiveNotesModal({
    visible,
    onClose,
    appointmentId,
}: LiveNotesModalProps) {
    const { token } = useAuth();
    const [noteContent, setNoteContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = async () => {
        if (!noteContent.trim()) {
            Alert.alert('Empty Note', 'Please enter some notes before saving.');
            return;
        }
        if (!token || !appointmentId) {
            Alert.alert('Error', 'Missing authentication or appointment context.');
            return;
        }

        setIsSaving(true);
        try {
            await createDoctorNote(token, appointmentId, noteContent);
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                setNoteContent('');
                onClose();
            }, 1500);
        } catch (e: any) {
            console.error('Failed to save doctor note:', e);
            Alert.alert('Save Failed', e.message || 'Could not save note.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            transparent
            animationType="slide"
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                style={styles.overlay} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Pressable style={styles.backdrop} onPress={onClose} />
                
                <View style={styles.card}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                            <View style={styles.iconBox}>
                                <Feather name="file-text" size={18} color={doctorColors.primary} />
                            </View>
                            <Text style={styles.title}>Live Notes</Text>
                        </View>
                        <Pressable onPress={onClose} hitSlop={8} style={({ pressed }) => [pressed && { opacity: 0.5 }]}>
                            <Feather name="x" size={20} color={doctorColors.textMuted} />
                        </Pressable>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {showSuccess ? (
                            <View style={styles.successState}>
                                <View style={styles.successIconBox}>
                                    <Feather name="check" size={32} color="#10B981" />
                                </View>
                                <Text style={styles.successText}>Note Saved Successfully</Text>
                            </View>
                        ) : (
                            <TextInput
                                style={styles.inputArea}
                                placeholder="Write your clinical notes here... These are private and not visible to the patient."
                                placeholderTextColor={doctorColors.textMuted}
                                multiline
                                textAlignVertical="top"
                                value={noteContent}
                                onChangeText={setNoteContent}
                                autoFocus
                            />
                        )}
                    </View>

                    {/* Footer */}
                    {!showSuccess && (
                        <View style={styles.footer}>
                            <Pressable 
                                style={({ pressed }) => [
                                    styles.saveBtn,
                                    (!noteContent.trim() || isSaving) && { opacity: 0.5 },
                                    pressed && { opacity: 0.8 }
                                ]}
                                onPress={handleSave}
                                disabled={!noteContent.trim() || isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Feather name="save" size={18} color="#fff" />
                                        <Text style={styles.saveBtnText}>Save Note</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    card: {
        backgroundColor: doctorColors.background,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        height: '60%',
        ...shadows.elevated,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: doctorColors.borderLight,
        backgroundColor: doctorColors.surface,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.lg,
        color: doctorColors.textPrimary,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    inputArea: {
        flex: 1,
        backgroundColor: doctorColors.surface,
        borderWidth: 1,
        borderColor: doctorColors.borderLight,
        borderRadius: radii.lg,
        padding: spacing.md,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
    footer: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        paddingBottom: spacing.xl + 20, // safe area approx
        borderTopWidth: 1,
        borderTopColor: doctorColors.borderLight,
        backgroundColor: doctorColors.surface,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: doctorColors.primary,
        paddingVertical: spacing.md,
        borderRadius: radii.lg,
    },
    saveBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#fff',
    },
    successState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    successIconBox: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#D1FAE5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.lg,
        color: '#065F46',
    },
});
