# SEO Analyzer Pro - Chrome Extension

A comprehensive SEO analysis tool that provides detailed insights into your website's search engine optimization performance.

## Features

### 🔍 **Comprehensive SEO Analysis**
- **On-Page SEO**: Title tags, meta descriptions, headers, alt text, keyword density, internal/external links
- **Technical SEO**: HTTPS, mobile-friendliness, canonical tags, robots.txt, sitemap, page load speed
- **Content Analysis**: Word count, readability, text-to-HTML ratio, duplicate content detection
- **Off-Page SEO**: Social media tags (Open Graph, Twitter Cards), structured data, backlink analysis

### 🎨 **Modern User Interface**
- React-based popup interface with Tailwind CSS
- Responsive design with intuitive navigation
- Color-coded results (Green = Good, Yellow = Warning, Red = Error)
- Collapsible sections for organized viewing
- Real-time analysis with loading indicators

### 📊 **Advanced Features**
- Overall SEO score calculation
- PDF report generation with jsPDF
- Customizable analysis settings
- Performance tracking and metrics
- Context menu integration
- Badge indicators for quick status

### ⚙️ **Smart Analysis**
- Real-time DOM analysis
- Performance API integration for load speed
- Structured data validation
- Social media optimization checks
- Mobile-first analysis approach

## Installation

### Method 1: Load Unpacked Extension (Development)

1. **Download/Clone the Extension**
   ```bash
   git clone [repository-url]
   cd seo-checker
   ```

2. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the `seo-checker` folder
   - The extension should now appear in your extensions list

4. **Pin the Extension** (Optional)
   - Click the puzzle piece icon in the Chrome toolbar
   - Find "SEO Analyzer Pro" and click the pin icon

### Method 2: Package and Install

1. **Package the Extension**
   - Go to `chrome://extensions/`
   - Click "Pack extension"
   - Select the `seo-checker` folder
   - This creates a `.crx` file

2. **Install the Package**
   - Drag the `.crx` file to the Chrome extensions page
   - Click "Add extension" when prompted

## Usage

### Basic Analysis

1. **Navigate to Any Website**
   - Open any webpage you want to analyze

2. **Open the Extension**
   - Click the SEO Analyzer Pro icon in the toolbar
   - Or right-click on the page and select "Analyze SEO"

3. **Run Analysis**
   - Click the "Analyze Page" button
   - Wait for the analysis to complete (usually 2-5 seconds)

4. **Review Results**
   - View your overall SEO score (0-100)
   - Expand sections to see detailed findings
   - Read tips and recommendations for improvements

### Advanced Features

#### Customizing Analysis
1. Click the "Settings" tab
2. Toggle specific analysis categories on/off:
   - On-Page SEO Analysis
   - Technical SEO Analysis  
   - Content Analysis
   - Off-Page SEO Analysis
3. Click "Save Settings"

#### Generating Reports
1. After running an analysis
2. Click the 📄 (PDF) button next to "Analyze Page"
3. A comprehensive PDF report will be downloaded

#### Understanding Results

**Color Coding:**
- 🟢 **Green (Good)**: Best practices being followed
- 🟡 **Yellow (Warning)**: Areas that could be improved
- 🔴 **Red (Error)**: Critical issues that need attention

**Score Calculation:**
- 80-100: Excellent SEO optimization
- 60-79: Good optimization with room for improvement
- 40-59: Moderate optimization, several issues to address
- 0-39: Poor optimization, significant work needed

## Analysis Categories

### 1. On-Page SEO
- **Title Tag**: Length, presence, optimization
- **Meta Description**: Length, presence, compelling content
- **Header Structure**: H1 usage, hierarchy, distribution
- **Image Optimization**: Alt text presence, optimization
- **Link Analysis**: Internal/external link distribution
- **Keyword Analysis**: Density, distribution, over-optimization

### 2. Technical SEO
- **Security**: HTTPS implementation
- **Mobile-Friendliness**: Viewport configuration, responsive design
- **Crawlability**: Robots.txt, canonical tags, meta robots
- **Performance**: Page load speed, resource optimization
- **Indexability**: Language declaration, favicon presence
- **Code Quality**: Minification, compression

### 3. Content Analysis
- **Content Length**: Word count optimization
- **Readability**: Sentence structure, complexity
- **Quality Metrics**: Text-to-HTML ratio, content depth
- **Uniqueness**: Duplicate content detection
- **Media Integration**: Image usage, multimedia content

### 4. Off-Page SEO
- **Social Media**: Open Graph tags, Twitter Cards
- **Structured Data**: JSON-LD, Schema.org microdata
- **Link Building**: External link quality, rel attributes
- **Social Presence**: Social media link integration
- **Authority Signals**: Backlink analysis (mock data)

## File Structure

```
seo-checker/
├── manifest.json          # Extension configuration
├── popup.html             # Main popup interface
├── popup.js              # React application logic
├── content.js            # DOM analysis script
├── background.js         # Background service worker
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This file
```

## Technical Details

### Dependencies
- **React 18**: UI framework (CDN)
- **Tailwind CSS**: Styling framework (CDN)
- **Babel Standalone**: JSX compilation (CDN)
- **jsPDF**: PDF generation (CDN)

### Permissions
- `activeTab`: Access to analyze current webpage
- `scripting`: Inject analysis scripts
- `storage`: Save user preferences
- `webNavigation`: Track page changes
- `<all_urls>`: Analyze any website

### Browser Compatibility
- **Chrome**: Version 88+ (Manifest V3)
- **Edge**: Version 88+ (Chromium-based)
- **Opera**: Version 74+ (Chromium-based)

### Security Features
- Content Security Policy (CSP) compliant
- No external API dependencies for core functionality
- Local storage for user preferences
- Sandboxed execution environment

## Development

### Prerequisites
- Google Chrome (latest version)
- Basic understanding of HTML, CSS, JavaScript
- React knowledge for UI modifications

### Making Changes

1. **UI Modifications**
   - Edit `popup.js` for React components
   - Modify `popup.html` for structure changes
   - Update Tailwind classes for styling

2. **Analysis Logic**
   - Modify `content.js` for DOM analysis improvements
   - Update `background.js` for background tasks
   - Add new analysis categories as needed

3. **Testing**
   - Reload the extension in `chrome://extensions/`
   - Test on various websites
   - Check console for errors

### Adding New Analysis Features

1. **Add Analysis Logic** (content.js)
   ```javascript
   function analyzeNewFeature(results) {
       // Your analysis logic here
       results.good.push({
           message: 'New feature working correctly',
           tip: 'Keep doing what you\'re doing'
       });
   }
   ```

2. **Update UI** (popup.js)
   ```javascript
   // Add new section to renderDashboard function
   {settings.checkNewFeature && renderSection('New Feature', 'newFeature', seoData.newFeature || {})}
   ```

3. **Add Settings Toggle** (popup.js)
   ```javascript
   // Add to renderSettings function
   <label className="flex items-center gap-3">
       <input
           type="checkbox"
           checked={settings.checkNewFeature}
           onChange={(e) => setSettings(prev => ({ ...prev, checkNewFeature: e.target.checked }))}
       />
       <span>New Feature Analysis</span>
   </label>
   ```

## Troubleshooting

### Common Issues

**Extension Not Loading**
- Ensure all files are in the correct directory
- Check that manifest.json is valid JSON
- Verify permissions in manifest.json

**Analysis Not Working**
- Check browser console for JavaScript errors
- Ensure content script is loading on the target page
- Verify the page allows content script injection

**PDF Export Not Working**
- Ensure jsPDF library is loading correctly
- Check for popup blockers
- Verify file download permissions

**Settings Not Saving**
- Check chrome.storage permissions
- Verify storage API usage
- Clear extension data and retry

### Debug Mode

1. Open Chrome DevTools (F12)
2. Go to the "Sources" tab
3. Find your extension files under "Content scripts" or "Extensions"
4. Set breakpoints and inspect variables

### Performance Issues

If the extension is running slowly:
- Reduce analysis complexity in content.js
- Implement debouncing for rapid analysis requests
- Optimize DOM queries and selections
- Consider async/await for heavy operations

## API Integration

### Adding Real Backlink Data

To integrate with real SEO APIs (Moz, Ahrefs, SEMrush):

1. **Get API Keys**
   ```javascript
   // In background.js
   const MOZ_API_KEY = 'your-moz-api-key';
   const AHREFS_API_KEY = 'your-ahrefs-api-key';
   ```

2. **Replace Mock Function**
   ```javascript
   async function realBacklinkCheck(url) {
       const response = await fetch(`https://api.moz.com/v1/url-metrics/${encodeURIComponent(url)}`, {
           headers: {
               'Authorization': `Bearer ${MOZ_API_KEY}`
           }
       });
       return await response.json();
   }
   ```

### External Tool Integration

The extension can be extended to work with:
- Google PageSpeed Insights API
- Google Search Console API
- Screaming Frog SEO Spider
- Custom analytics platforms

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use ES6+ JavaScript features
- Follow React best practices
- Maintain consistent indentation (2 spaces)
- Comment complex logic
- Use descriptive variable names

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, feature requests, or bug reports:
- Create an issue on GitHub
- Include browser version and error details
- Provide steps to reproduce issues

## Changelog

### Version 1.0.0
- Initial release
- Complete SEO analysis suite
- React-based UI with Tailwind CSS
- PDF report generation
- Customizable analysis settings
- Performance tracking
- Context menu integration

---

**Made with ❤️ for the SEO community**