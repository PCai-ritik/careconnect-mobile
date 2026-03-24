/**
 * CareConnect — Animated Splash Screen (Patient App)
 *
 * All content renders as plain Views on the very first frame — no
 * Animated wrappers around the content that could cause a 1-frame
 * paint delay. Only the outer container uses Animated for the fade-out.
 */

import { useRef, useEffect } from 'react';
import { Animated, StyleSheet, Image, Text, View } from 'react-native';

interface PatientSplashScreenProps {
    onAnimationComplete: () => void;
}

export default function PatientSplashScreen({ onAnimationComplete }: PatientSplashScreenProps) {
    const fadeOut = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Hold the brand on screen, then fade out
        Animated.sequence([
            Animated.delay(1200),
            Animated.timing(fadeOut, {
                toValue: 0,
                duration: 350,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onAnimationComplete();
        });
    }, []);

    return (
        <Animated.View style={[s.container, { opacity: fadeOut }]}>
            {/* Plain View — renders instantly, no animated transform delay */}
            <View style={s.content}>
                <Image
                    source={require('@/assets/images/stethescope.png')}
                    style={s.logo}
                />
                <Text style={s.brandName}>CareConnect</Text>
                <Text style={s.tagline}>Care For Loved Ones, Anywhere</Text>
            </View>
        </Animated.View>
    );
}

const s = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FDFCFA',
    },
    content: {
        alignItems: 'center',
        gap: 12,
    },
    logo: {
        width: 88,
        height: 88,
        resizeMode: 'contain',
    },
    brandName: {
        fontFamily: 'Inter_700Bold',
        fontSize: 32,
        letterSpacing: -0.5,
        marginTop: 4,
        color: '#0F172A',
    },
    tagline: {
        fontFamily: 'Inter_400Regular',
        fontSize: 15,
        opacity: 0.5,
        marginTop: -4,
        color: '#0F172A',
    },
});
