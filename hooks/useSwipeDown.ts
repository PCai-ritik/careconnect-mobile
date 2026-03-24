/**
 * useSwipeDown — Swipe-down-to-dismiss gesture for bottom sheet modals.
 *
 * Attach `panHandlers` to the handle/header View and apply `animatedStyle`
 * to the sheet container. When the user drags down past the threshold,
 * onClose is called while the sheet stays at its dragged position — the
 * Modal's `animationType="slide"` carries it the rest of the way off-screen.
 * translateY resets after the exit animation so the next open starts clean.
 */

import { useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

const DISMISS_THRESHOLD = 120;

export default function useSwipeDown(onClose: () => void) {
    const translateY = useRef(new Animated.Value(0)).current;
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0) {
                    translateY.setValue(gs.dy);
                }
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > DISMISS_THRESHOLD || gs.vy > 0.5) {
                    // Keep sheet at dragged position — Modal slides it out
                    onCloseRef.current();
                    // Reset after Modal exit animation (~300ms) for next open
                    setTimeout(() => translateY.setValue(0), 400);
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 8,
                    }).start();
                }
            },
        }),
    ).current;

    return {
        panHandlers: panResponder.panHandlers,
        animatedStyle: { transform: [{ translateY }] },
    };
}
