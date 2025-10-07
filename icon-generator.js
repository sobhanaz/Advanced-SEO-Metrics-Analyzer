// Simple icon generator for Chrome extension
// This creates base64 encoded PNG icons programmatically

function generateIconDataURL(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Background gradient (Blue to Purple)
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#3B82F6');
    gradient.addColorStop(1, '#8B5CF6');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // White SEO text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(size * 0.25)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SEO', size / 2, size / 2 - size * 0.05);
    
    // Magnifying glass
    const centerX = size / 2;
    const centerY = size * 0.75;
    const radius = size * 0.08;
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1, size * 0.03);
    ctx.beginPath();
    ctx.arc(centerX - size * 0.02, centerY - size * 0.02, radius, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Handle
    ctx.beginPath();
    ctx.moveTo(centerX + radius * 0.7, centerY + radius * 0.7);
    ctx.lineTo(centerX + radius * 1.2, centerY + radius * 1.2);
    ctx.stroke();
    
    return canvas.toDataURL('image/png');
}

// Generate all required icon sizes
const iconSizes = [16, 32, 48, 128];
const iconData = {};

iconSizes.forEach(size => {
    iconData[`icon${size}`] = generateIconDataURL(size);
});

console.log('Generated icon data URLs:', iconData);

// To use these in your extension:
// 1. Run this code in browser console
// 2. Copy the base64 data URLs
// 3. Create PNG files or use data URLs directly

// For Chrome extension, you can also create the icons like this:
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateIconDataURL, iconData };
}