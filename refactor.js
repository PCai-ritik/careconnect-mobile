const fs = require('fs');

function refactorFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Add imports
    if (!content.includes("import { ThemedView, ThemedText }")) {
        content = content.replace(/(import .*? from 'react-native';)/, "$1\nimport { ThemedView, ThemedText } from '@/components/shared/Themed';");
    }

    // Replace <View> with <ThemedView>
    content = content.replace(/<View/g, '<ThemedView');
    content = content.replace(/<\/View>/g, '</ThemedView>');

    // Replace <Text> with <ThemedText>
    content = content.replace(/<Text/g, '<ThemedText');
    content = content.replace(/<\/Text>/g, '</ThemedText>');

    // Also replace react-native imports of View and Text
    content = content.replace(/import\s+{([^}]*)}\s+from\s+'react-native';/g, (match, p1) => {
        let imports = p1.split(',').map(s => s.trim());
        imports = imports.filter(i => i !== 'View' && i !== 'Text' && i !== '');
        if (imports.length === 0) return '';
        return `import {\n    ${imports.join(',\n    ')}\n} from 'react-native';`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Refactored tags in ${filePath}`);
}

const files = [
    'app/(caregiver)/index.tsx',
    'app/(caregiver)/profile.tsx',
    'app/(caregiver)/post-call-summary.tsx',
    'app/(caregiver)/records.tsx',
    'app/(caregiver)/consultation/[id].tsx',
    'components/patient/HospitalAffiliationModal.tsx'
];

files.forEach(f => refactorFile(f));
