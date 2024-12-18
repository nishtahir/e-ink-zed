const fs = require('fs');
const path = require('path');

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// Read the style.json file
const styleFilePath = path.join(__dirname, 'style.json');
const styleData = JSON.parse(fs.readFileSync(styleFilePath, 'utf8'));

// Clone the style object
const invertedStyle = JSON.parse(JSON.stringify(styleData));

// Helper function to invert a color
function invertColor(color) {
    // Handle hex colors
    if (color.startsWith('#')) {
        color = color.substring(1);
        const num = parseInt(color, 16);
        const inverted = (0xFFFFFF - num).toString(16).padStart(6, '0');
        return '#' + inverted;
    }
    // Handle rgb/rgba colors
    if (color.startsWith('rgb')) {
        const values = color.match(/\d+/g);
        if (values.length >= 3) {
            const r = 255 - parseInt(values[0]);
            const g = 255 - parseInt(values[1]);
            const b = 255 - parseInt(values[2]);
            return values.length === 4 
                ? `rgba(${r}, ${g}, ${b}, ${values[3]})` 
                : `rgb(${r}, ${g}, ${b})`;
        }
    }
    return color; // Return original if format not recognized
}

// Add ignore patterns for colors that shouldn't be inverted
const ignorePatterns = [
    'error',
    'warning'
];

// Modify the invertColorsInObject function to check for ignored keys
function invertColorsInObject(obj) {
    for (let key in obj) {
        // Check if the key should be ignored
        const shouldIgnore = ignorePatterns.some(pattern => 
            key.toLowerCase().startsWith(pattern.toLowerCase())
        );

        if (shouldIgnore) {
            continue; // Skip this key
        }

        if (typeof obj[key] === 'object' && obj[key] !== null) {
            invertColorsInObject(obj[key]);
        } else if (typeof obj[key] === 'string' && 
                  (obj[key].startsWith('#') || obj[key].startsWith('rgb'))) {
            obj[key] = invertColor(obj[key]);
        }
    }
    return obj;
}

// Invert all colors in the cloned object
invertColorsInObject(invertedStyle);

// Create the theme variants
const lightTheme = {
    name: "e-ink light",
    appearance: "light",
    style: styleData
};

const darkTheme = {
    name: "e-ink dark",
    appearance: "dark",
    style: invertedStyle
};

// Create the final theme object
const themePackage = {
    "$schema": "https://zed.dev/schema/themes/v0.2.0.json",
    "name": "e-ink",
    "author": "Nish Tahir",
    "themes": [lightTheme, darkTheme]
};

// Write the theme package to dist/theme.json
const outputPath = path.join(distDir, 'e-ink.json');
fs.writeFileSync(outputPath, JSON.stringify(themePackage, null, 2));

console.log('Theme file has been created at:', outputPath);
