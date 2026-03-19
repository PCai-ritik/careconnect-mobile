/**
 * CareConnect Animation Presets
 *
 * Role-specific react-native-reanimated configs.
 * Components import these presets — they NEVER define raw spring/timing configs inline.
 *
 * Patient UI: Gentle, fluid springs — organic and unhurried.
 * Doctor UI:  Snappy, utilitarian transitions — instantaneous and precise.
 */

import { type WithSpringConfig, type WithTimingConfig, Easing } from 'react-native-reanimated';

// ─── Patient Animations — Gentle, Fluid Springs ────────────────────────────
// The patient experience should feel organic and unhurried. Animations breathe.

export const patientAnimations = {
    // Primary spring — screen transitions, card appearances
    spring: {
        damping: 20,
        stiffness: 90,
        mass: 1,
        overshootClamping: false,
    } satisfies WithSpringConfig,

    // Gentle fade+rise for list items, staggered entrances
    fadeIn: {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    } satisfies WithTimingConfig,

    // Slow dissolve for overlays, modals
    dissolve: {
        duration: 300,
        easing: Easing.out(Easing.cubic),
    } satisfies WithTimingConfig,

    // Stagger delay between list items (ms)
    staggerDelay: 80,
};

// ─── Doctor Animations — Snappy, Utilitarian Transitions ────────────────────
// The doctor experience should feel instantaneous and precise.
// Animations are functional, not decorative.

export const doctorAnimations = {
    // Crisp spring — minimal overshoot, fast settle
    spring: {
        damping: 28,
        stiffness: 250,
        mass: 0.8,
        overshootClamping: true,
    } satisfies WithSpringConfig,

    // Quick snap for tab switches, card flips
    snapIn: {
        duration: 180,
        easing: Easing.bezier(0.0, 0.0, 0.2, 1),
    } satisfies WithTimingConfig,

    // Instant feedback for toggles, button presses
    microInteraction: {
        duration: 100,
        easing: Easing.linear,
    } satisfies WithTimingConfig,

    // Stagger delay between list items (ms) — fast
    staggerDelay: 40,
};
