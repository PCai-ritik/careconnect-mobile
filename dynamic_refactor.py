import re
import sys

def refactor_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # We want to replace common patterns in ThemedText and ThemedView.
    # For example: <ThemedText ... style={[..., { color: patientColors.primary }]}>
    # This is a bit too complex for simple regex.
    
    # A much simpler approach for StyleSheet:
    # We leave StyleSheet as is, but we change `patientColors` to `colors`
    # and we pass `colors` from useTheme to a dynamic style generator, OR
    # we just use a regex to strip colors from StyleSheet and add them as props.
    
    # Actually, the easiest way to make the refactoring work without changing 1200 lines manually
    # is to inject `const { colors } = useTheme();` into the component, and 
    # instead of `const styles = StyleSheet.create({...})` at the bottom,
    # we do `const useStyles = (colors: any) => StyleSheet.create({...})`
    # and inside the component: `const styles = useStyles(colors);`.
    # Let's check if we can just do that! It preserves layout and dynamically themes everything!

    # 1. Inject useTheme
    if "useTheme" not in content:
        content = content.replace("import { useAuth } from '@/hooks/useAuth';", "import { useAuth } from '@/hooks/useAuth';\nimport { useTheme } from '@/providers/ThemeProvider';")
    
    if "const { user, token, logout } = useAuth();" in content and "const { colors } = useTheme();" not in content:
        content = content.replace(
            "const { user, token, logout } = useAuth();",
            "const { user, token, logout } = useAuth();\n    const { colors } = useTheme();"
        )
        content = content.replace(
            "const insets = useSafeAreaInsets();",
            "const insets = useSafeAreaInsets();\n    const styles = useStyles(colors);"
        )

    # 2. Change StyleSheet.create to useStyles
    content = content.replace("const styles = StyleSheet.create({", "const useStyles = (colors: any) => StyleSheet.create({")
    
    # 3. Replace patientColors with colors inside the file
    content = content.replace("patientColors", "colors")

    # 4. Remove patientColors from imports
    content = content.replace("    patientColors,\n", "")

    # For ms (modal styles)
    if "const ms = StyleSheet.create({" in content:
        content = content.replace("const ms = StyleSheet.create({", "const useMs = (colors: any) => StyleSheet.create({")
        content = content.replace("const insets = useSafeAreaInsets();\n    const styles = useStyles(colors);", "const insets = useSafeAreaInsets();\n    const styles = useStyles(colors);\n    const ms = useMs(colors);")

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Refactored {filepath} using dynamic stylesheet generation")

refactor_file('/home/raizel/Work/careconnect/careconnect-mobile-app/app/(caregiver)/index.tsx')
refactor_file('/home/raizel/Work/careconnect/careconnect-mobile-app/app/(caregiver)/profile.tsx')
refactor_file('/home/raizel/Work/careconnect/careconnect-mobile-app/app/(caregiver)/post-call-summary.tsx')
refactor_file('/home/raizel/Work/careconnect/careconnect-mobile-app/app/(caregiver)/records.tsx')
refactor_file('/home/raizel/Work/careconnect/careconnect-mobile-app/app/(caregiver)/consultation/[id].tsx')
