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
    name: "E-Ink Light",
    appearance: "light",
    style: styleData
};

const darkTheme = {
    name: "E-Ink Dark",
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

function getLuminance(r, g, b) {
    // Convert to sRGB first
    r /= 255;
    g /= 255;
    b /= 255;

    // Convert to linear RGB
    r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    // Calculate luminance
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(color1, color2) {
    // Parse colors to RGB
    function parseColor(color) {
        if (color.startsWith('#')) {
            const hex = color.substring(1);
            return {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16)
            };
        } else if (color.startsWith('rgb')) {
            const matches = color.match(/\d+/g);
            return {
                r: parseInt(matches[0]),
                g: parseInt(matches[1]),
                b: parseInt(matches[2])
            };
        }
        return null;
    }

    const rgb1 = parseColor(color1);
    const rgb2 = parseColor(color2);

    if (!rgb1 || !rgb2) return null;

    const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
}

function analyzeThemeContrast(theme, name) {
    console.log(`\nAnalyzing contrast ratios for ${name}:`);
    console.log('----------------------------------------');

    const style = theme.style;
    const backgroundColor = style.background;
    if (!backgroundColor) {
        console.log('Warning: No background color found');
        return;
    }

    function checkContrast(color, description) {
        if (!color) return;
        const ratio = getContrastRatio(backgroundColor, color);
        if (ratio) {
            const rating = ratio >= 7 ? 'AAA' :
                          ratio >= 4.5 ? 'AA' :
                          ratio >= 3 ? 'AA Large' : 'Fail';
            console.log(`${description.padEnd(30)} ${ratio.toFixed(2)}:1 (${rating})`);
        }
    }

    // Check important UI colors
    const uiElements = {
        'Text': style.text,
        'Border': style.border,
        'Element': style.element,
        'Line Numbers': style['editor.line_number'],
        'Editor Foreground': style['editor.foreground'],
        'Error': style.error,
        'Warning': style.warning,
        'Info': style.info,
        'Modified': style.modified,
        'Link Hover': style['link_text.hover'],
        'Element Selected': style['element.selected'],
        'Element Hover': style['element.hover']
    };

    // Check UI colors
    for (const [description, color] of Object.entries(uiElements)) {
        if (color) {
            checkContrast(color, description);
        }
    }

    // Check syntax colors
    console.log('\nSyntax Colors:');
    console.log('----------------------------------------');
    const syntax = style.syntax || {};
    for (const [key, value] of Object.entries(syntax)) {
        if (value?.color) {
            checkContrast(value.color, `syntax.${key}`);
        }
    }
}

console.log('\nContrast Analysis Report');
console.log('=======================');
analyzeThemeContrast(lightTheme, 'Light Theme');
analyzeThemeContrast(darkTheme, 'Dark Theme');
