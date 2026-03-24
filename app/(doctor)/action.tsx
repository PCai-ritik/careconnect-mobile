/**
 * Dummy route for the center action button.
 * This screen is never shown — the tab press is intercepted
 * in _layout.tsx to open the action popover instead.
 */

import { View } from 'react-native';

export default function ActionStub() {
    return <View />;
}
