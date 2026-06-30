const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '..', 'backend', 'models');
const files = fs.readdirSync(modelsDir);

files.forEach(file => {
    if (!file.endsWith('.js')) return;
    const fullPath = path.join(modelsDir, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    // 1. Inject isDeleted: { type: Boolean, default: false }
    const schemaStartIndex = content.indexOf('new mongoose.Schema({');
    if (schemaStartIndex !== -1 && !content.includes('isDeleted: {')) {
        let braceCount = 0;
        let schemaEndIndex = -1;
        let started = false;
        for (let i = schemaStartIndex; i < content.length; i++) {
            if (content[i] === '{') {
                braceCount++;
                started = true;
            } else if (content[i] === '}') {
                braceCount--;
            }
            if (started && braceCount === 0) {
                schemaEndIndex = i;
                break;
            }
        }

        if (schemaEndIndex !== -1) {
            const insertIsDeleted = `,\n    isDeleted: {\n        type: Boolean,\n        default: false\n    }\n`;
            content = content.slice(0, schemaEndIndex) + insertIsDeleted + content.slice(schemaEndIndex);
        }
    }
    
    // 2. Inject { timestamps: true }
    // Now we look for the new bounds of new mongoose.Schema( ... )
    const newSchemaStartIndex = content.indexOf('new mongoose.Schema({');
    if (newSchemaStartIndex !== -1 && !content.includes('timestamps: true')) {
        let parenCount = 0;
        let parenEndIndex = -1;
        let parenStarted = false;
        for (let i = newSchemaStartIndex; i < content.length; i++) {
            if (content[i] === '(') {
                parenCount++;
                parenStarted = true;
            } else if (content[i] === ')') {
                parenCount--;
            }
            if (parenStarted && parenCount === 0) {
                parenEndIndex = i;
                break;
            }
        }

        if (parenEndIndex !== -1) {
            // Find the last '}' before the closing ')'
            let lastBraceBeforeParen = -1;
            for (let i = parenEndIndex - 1; i >= newSchemaStartIndex; i--) {
                if (content[i] === '}') {
                    lastBraceBeforeParen = i;
                    break;
                }
            }

            if (lastBraceBeforeParen !== -1) {
                // Check if there is a second object (options)
                const textBetween = content.slice(lastBraceBeforeParen + 1, parenEndIndex);
                if (textBetween.includes('{')) {
                    // There are already options. Insert timestamps: true inside them.
                    content = content.slice(0, parenEndIndex - 1) + ', timestamps: true ' + content.slice(parenEndIndex - 1);
                } else {
                    // No options object.
                    content = content.slice(0, lastBraceBeforeParen + 1) + ', { timestamps: true }' + content.slice(parenEndIndex);
                }
            }
        }
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated schema safely: ${file}`);
});
