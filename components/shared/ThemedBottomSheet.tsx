import React, { useEffect, useRef, useState } from 'react';
import { 
    Modal, 
    View, 
    Pressable, 
    StyleSheet, 
    KeyboardAvoidingView, 
    Platform,
    Animated,
    PanResponder,
    Dimensions
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadows } from '@/constants/theme';

export interface ThemedBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    snapPoints?: (string | number)[];
    children: React.ReactNode;
    enablePanDownToClose?: boolean;
    useScrollView?: boolean;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function ThemedBottomSheet({ 
    visible, 
    onClose, 
    snapPoints,
    children, 
    enablePanDownToClose = true,
}: ThemedBottomSheetProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    
    // Parse snapPoints[0] to determine height, fallback to 90%
    const defaultHeight = '90%';
    const heightValue = snapPoints?.[0] || defaultHeight;
    const heightStyle = typeof heightValue === 'string' ? { height: heightValue as any } : { height: heightValue };

    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const [modalVisible, setModalVisible] = useState(visible);

    const animateIn = () => {
        setModalVisible(true);
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 14,
        }).start();
    };

    const animateOut = () => {
        Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setModalVisible(false);
            onClose();
        });
    };

    useEffect(() => {
        if (visible) {
            animateIn();
        } else if (modalVisible) {
            animateOut();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => enablePanDownToClose,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only capture if user is swiping downwards
                return enablePanDownToClose && gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > SCREEN_HEIGHT * 0.15 || gestureState.vy > 1.0) {
                    // Swiped down far enough or fast enough -> close
                    animateOut();
                } else {
                    // Snap back up
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 0,
                        speed: 14,
                    }).start();
                }
            },
        })
    ).current;

    // We don't render anything if it's completely hidden and closed
    if (!visible && !modalVisible) return null;

    return (
        <Modal animationType="none" transparent visible={modalVisible} onRequestClose={animateOut}>
            {/* Backdrop with animated fade */}
            <Pressable style={styles.backdrop} onPress={animateOut}>
                <Animated.View style={[
                    StyleSheet.absoluteFill, 
                    { 
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        opacity: translateY.interpolate({
                            inputRange: [0, SCREEN_HEIGHT],
                            outputRange: [1, 0],
                            extrapolate: 'clamp'
                        })
                    }
                ]} />
            </Pressable>
            
            {/* The actual sliding sheet with pan responder attached */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[styles.container, heightStyle]}
            >
                <Animated.View
                    style={[
                        styles.sheet, 
                        { backgroundColor: colors.surface, paddingBottom: insets.bottom },
                        { transform: [{ translateY }] }
                    ]}
                >
                    {/* The drag handle area — only this zone triggers swipe-to-close */}
                    <View {...panResponder.panHandlers} style={styles.handleContainer}>
                        <View style={[styles.handleBar, { backgroundColor: colors.borderLight || '#E9ECEF' }]} />
                    </View>
                    
                    {children}
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { 
        flex: 1, 
    },
    container: {
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0,
    },
    sheet: {
        flex: 1,
        borderTopLeftRadius: 24, 
        borderTopRightRadius: 24,
        ...shadows.elevated,
    },
    handleContainer: {
        width: '100%',
        paddingVertical: 12,
        alignItems: 'center',
    },
    handleBar: {
        width: 40, 
        height: 4, 
        borderRadius: 2,
    },
});
