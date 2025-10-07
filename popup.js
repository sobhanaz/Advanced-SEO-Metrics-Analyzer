// TECSO SEO Analyzer - GitHub-themed UI
const { useState, useEffect } = React;
const { createElement: h } = React;

const TECSOAnalyzer = () => {
    const [seoData, setSeoData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [expandedSections, setExpandedSections] = useState({});
    const [settings, setSettings] = useState({
        checkOnPage: true,
        checkTechnical: true,
        checkContent: true,
        checkOffPage: true
    });

    useEffect(() => {
        chrome.storage.local.get(['tecsoSeoSettings'], (result) => {
            if (result.tecsoSeoSettings) {
                setSettings(result.tecsoSeoSettings);
            }
        });
    }, []);

    const calculateOverallScore = (data) => {
        if (!data) return 0;
        
        const sections = ['onPage', 'technical', 'content', 'offPage'];
        let totalScore = 0;
        let enabledSections = 0;

        sections.forEach(section => {
            const settingKey = `check${section.charAt(0).toUpperCase() + section.slice(1)}`;
            if (settings[settingKey] && data[section]) {
                const sectionData = data[section];
                const good = sectionData.good?.length || 0;
                const warnings = sectionData.warnings?.length || 0;
                const errors = sectionData.errors?.length || 0;
                const total = good + warnings + errors;
                
                if (total > 0) {
                    const sectionScore = ((good * 3 + warnings * 1.5) / (total * 3)) * 100;
                    totalScore += sectionScore;
                    enabledSections++;
                }
            }
        });
// ...existing code...
                <label className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={settings.checkTechnical}
                        onChange={(e) => setSettings(prev => ({ ...prev, checkTechnical: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-gray-700">Technical SEO Analysis</span>
                </label>

                <label className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={settings.checkContent}
                        onChange={(e) => setSettings(prev => ({ ...prev, checkContent: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-gray-700">Content Analysis</span>
                </label>

                <label className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={settings.checkOffPage}
                        onChange={(e) => setSettings(prev => ({ ...prev, checkOffPage: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-gray-700">Off-Page SEO Analysis</span>
                </label>
            </div>

            <button
                onClick={saveSettings}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
                Save Settings
            </button>
        </div>
    );

    return (
        <div className="w-full h-full bg-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
                <h1 className="text-lg font-bold">SEO Analyzer Pro</h1>
            </div>

            {/* Navigation */}
            <div className="flex border-b">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex-1 py-3 px-4 text-sm font-medium ${
                        activeTab === 'dashboard' 
                            ? 'border-b-2 border-blue-600 text-blue-600' 
                            : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                    Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 py-3 px-4 text-sm font-medium ${
                        activeTab === 'settings' 
                            ? 'border-b-2 border-blue-600 text-blue-600' 
                            : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                    Settings
                </button>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-b">
                <div className="flex gap-2">
                    <button
                        onClick={runAnalysis}
                        disabled={loading}
                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Analyzing...
                            </div>
                        ) : (
                            'Analyze Page'
                        )}
                    </button>
                    {seoData && (
                        <button
                            onClick={exportToPDF}
                            className="py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            title="Export Report as PDF"
                        >
                            📄
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4" style={{ height: 'calc(600px - 200px)' }}>
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'settings' && renderSettings()}
            </div>
        </div>
    );
};

// Analysis function that will be injected into the page
function analyzePage(settings) {
    const results = {
        onPage: { good: [], warnings: [], errors: [] },
        technical: { good: [], warnings: [], errors: [] },
        content: { good: [], warnings: [], errors: [] },
        offPage: { good: [], warnings: [], errors: [] }
    };

    // On-Page SEO Analysis
    if (settings.checkOnPage) {
        // Title analysis
        const title = document.querySelector('title');
        if (!title || !title.textContent.trim()) {
            results.onPage.errors.push({
                message: 'Missing page title',
                tip: 'Add a descriptive title tag between 50-60 characters'
            });
        } else {
            const titleLength = title.textContent.trim().length;
            if (titleLength < 30) {
                results.onPage.warnings.push({
                    message: `Title too short (${titleLength} characters)`,
                    tip: 'Aim for 50-60 characters for optimal display in search results'
                });
            } else if (titleLength > 60) {
                results.onPage.warnings.push({
                    message: `Title too long (${titleLength} characters)`,
                    tip: 'Keep titles under 60 characters to avoid truncation'
                });
            } else {
                results.onPage.good.push({
                    message: `Title length is optimal (${titleLength} characters)`
                });
            }
        }

        // Meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc || !metaDesc.content.trim()) {
            results.onPage.errors.push({
                message: 'Missing meta description',
                tip: 'Add a meta description between 150-160 characters'
            });
        } else {
            const descLength = metaDesc.content.trim().length;
            if (descLength < 120) {
                results.onPage.warnings.push({
                    message: `Meta description too short (${descLength} characters)`,
                    tip: 'Aim for 150-160 characters for better search result display'
                });
            } else if (descLength > 160) {
                results.onPage.warnings.push({
                    message: `Meta description too long (${descLength} characters)`,
                    tip: 'Keep meta descriptions under 160 characters'
                });
            } else {
                results.onPage.good.push({
                    message: `Meta description length is optimal (${descLength} characters)`
                });
            }
        }

        // Header structure
        const h1s = document.querySelectorAll('h1');
        if (h1s.length === 0) {
            results.onPage.errors.push({
                message: 'No H1 tag found',
                tip: 'Add exactly one H1 tag that describes the main topic'
            });
        } else if (h1s.length > 1) {
            results.onPage.warnings.push({
                message: `Multiple H1 tags found (${h1s.length})`,
                tip: 'Use only one H1 tag per page'
            });
        } else {
            results.onPage.good.push({
                message: 'Single H1 tag found'
            });
        }

        // Alt text for images
        const images = document.querySelectorAll('img');
        let imagesWithoutAlt = 0;
        images.forEach(img => {
            if (!img.alt || img.alt.trim() === '') {
                imagesWithoutAlt++;
            }
        });

        if (images.length > 0) {
            if (imagesWithoutAlt === 0) {
                results.onPage.good.push({
                    message: `All ${images.length} images have alt text`
                });
            } else {
                results.onPage.warnings.push({
                    message: `${imagesWithoutAlt} of ${images.length} images missing alt text`,
                    tip: 'Add descriptive alt text to all images for accessibility and SEO'
                });
            }
        }

        // Internal and external links
        const links = document.querySelectorAll('a[href]');
        let internalLinks = 0;
        let externalLinks = 0;
        let brokenLinks = 0;

        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href.startsWith('http') && !href.includes(window.location.hostname)) {
                externalLinks++;
            } else if (href.startsWith('/') || href.includes(window.location.hostname)) {
                internalLinks++;
            }
        });

        if (internalLinks > 0) {
            results.onPage.good.push({
                message: `${internalLinks} internal links found`
            });
        }

        if (externalLinks > 0) {
            results.onPage.good.push({
                message: `${externalLinks} external links found`
            });
        }
    }

    // Technical SEO Analysis
    if (settings.checkTechnical) {
        // HTTPS check
        if (window.location.protocol === 'https:') {
            results.technical.good.push({
                message: 'Site uses HTTPS'
            });
        } else {
            results.technical.errors.push({
                message: 'Site not using HTTPS',
                tip: 'Implement SSL certificate for security and SEO benefits'
            });
        }

        // Mobile-friendly check
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport && viewport.content.includes('width=device-width')) {
            results.technical.good.push({
                message: 'Mobile viewport meta tag present'
            });
        } else {
            results.technical.warnings.push({
                message: 'Mobile viewport meta tag missing or incorrect',
                tip: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">'
            });
        }

        // Canonical URL
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
            results.technical.good.push({
                message: 'Canonical URL specified'
            });
        } else {
            results.technical.warnings.push({
                message: 'No canonical URL specified',
                tip: 'Add a canonical link to prevent duplicate content issues'
            });
        }

        // Robots meta
        const robots = document.querySelector('meta[name="robots"]');
        if (robots) {
            if (robots.content.includes('noindex')) {
                results.technical.warnings.push({
                    message: 'Page set to noindex',
                    tip: 'Remove noindex if you want this page to be indexed'
                });
            } else {
                results.technical.good.push({
                    message: 'Robots meta tag configured properly'
                });
            }
        }

        // Page load speed (simplified check)
        if (window.performance && window.performance.timing) {
            const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
            if (loadTime < 3000) {
                results.technical.good.push({
                    message: `Fast page load time (${Math.round(loadTime/1000)}s)`
                });
            } else if (loadTime < 5000) {
                results.technical.warnings.push({
                    message: `Moderate page load time (${Math.round(loadTime/1000)}s)`,
                    tip: 'Optimize images and reduce HTTP requests to improve load time'
                });
            } else {
                results.technical.errors.push({
                    message: `Slow page load time (${Math.round(loadTime/1000)}s)`,
                    tip: 'Significant performance optimization needed'
                });
            }
        }
    }

    // Content Analysis
    if (settings.checkContent) {
        const bodyText = document.body.innerText || '';
        const wordCount = bodyText.trim().split(/\s+/).length;

        // Content length
        if (wordCount < 300) {
            results.content.warnings.push({
                message: `Low content length (${wordCount} words)`,
                tip: 'Aim for at least 300 words for better SEO performance'
            });
        } else if (wordCount > 2000) {
            results.content.good.push({
                message: `Comprehensive content (${wordCount} words)`
            });
        } else {
            results.content.good.push({
                message: `Good content length (${wordCount} words)`
            });
        }

        // Readability (simplified)
        const sentences = bodyText.split(/[.!?]+/).length;
        const avgWordsPerSentence = wordCount / sentences;
        if (avgWordsPerSentence > 20) {
            results.content.warnings.push({
                message: 'Long sentences detected',
                tip: 'Break up long sentences for better readability'
            });
        } else {
            results.content.good.push({
                message: 'Good sentence length for readability'
            });
        }

        // Check for duplicate content (simplified)
        const paragraphs = document.querySelectorAll('p');
        const textBlocks = Array.from(paragraphs).map(p => p.textContent.trim()).filter(text => text.length > 50);
        const uniqueBlocks = new Set(textBlocks);
        if (textBlocks.length > uniqueBlocks.size) {
            results.content.warnings.push({
                message: 'Potential duplicate content detected',
                tip: 'Review content for repetitive sections'
            });
        }
    }

    // Off-Page SEO Analysis (Limited to what we can detect)
    if (settings.checkOffPage) {
        // Social media tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDesc = document.querySelector('meta[property="og:description"]');
        const ogImage = document.querySelector('meta[property="og:image"]');

        if (ogTitle && ogDesc && ogImage) {
            results.offPage.good.push({
                message: 'Complete Open Graph tags present'
            });
        } else {
            results.offPage.warnings.push({
                message: 'Incomplete Open Graph tags',
                tip: 'Add og:title, og:description, and og:image for better social sharing'
            });
        }

        // Twitter cards
        const twitterCard = document.querySelector('meta[name="twitter:card"]');
        if (twitterCard) {
            results.offPage.good.push({
                message: 'Twitter Card tags present'
            });
        } else {
            results.offPage.warnings.push({
                message: 'Twitter Card tags missing',
                tip: 'Add Twitter Card meta tags for better Twitter sharing'
            });
        }

        // Structured data (JSON-LD)
        const jsonLd = document.querySelector('script[type="application/ld+json"]');
        if (jsonLd) {
            results.offPage.good.push({
                message: 'Structured data (JSON-LD) found'
            });
        } else {
            results.offPage.warnings.push({
                message: 'No structured data found',
                tip: 'Add JSON-LD structured data for rich snippets'
            });
        }
    }

    return results;
}

// Render the app
ReactDOM.render(React.createElement(TECSOAnalyzer), document.getElementById('root'));