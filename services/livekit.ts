/**
 * CareConnect — LiveKit Setup
 *
 * Must be imported BEFORE any Room or LiveKit component usage.
 * Registers WebRTC globals required by @livekit/react-native.
 *
 * In Expo Go the native WebRTC modules are missing, so we wrap in
 * try-catch to avoid crashing the entire app. Consultation screens
 * check LIVEKIT_AVAILABLE before attempting to connect.
 */

let available = false;

try {
    const { registerGlobals } = require('@livekit/react-native');
    registerGlobals();
    available = true;
} catch (e) {
    console.warn('[LiveKit] Native WebRTC modules not available — run a dev build for video calls.', e);
}

/** Whether the native WebRTC modules loaded successfully */
export const LIVEKIT_AVAILABLE = available;

/** LiveKit cloud server URL from environment */
export const LIVEKIT_URL = process.env.EXPO_PUBLIC_LIVEKIT_URL ?? '';
