// SEO Analyzer Pro - Popup Interface (No JSX version)
const { useState, useEffect } = React;
const { createElement: h } = React;

const SEOAnalyzer = () => {
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
        chrome.storage.local.get(['seoSettings'], (result) => {
            if (result.seoSettings) {
                setSettings(result.seoSettings);
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

        return enabledSections > 0 ? Math.round(totalScore / enabledSections) : 0;
    };

    const runAnalysis = async () => {
        setLoading(true);
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: analyzePage,
                args: [settings]
            });

            if (results && results[0] && results[0].result) {
                setSeoData(results[0].result);
                setActiveTab('dashboard');
            }
        } catch (error) {
            console.error('Analysis failed:', error);
            setSeoData({
                onPage: { errors: [{ message: 'Failed to analyze page', tip: 'Please refresh and try again' }], warnings: [], good: [] },
                technical: { errors: [], warnings: [], good: [] },
                content: { errors: [], warnings: [], good: [] },
                offPage: { errors: [], warnings: [], good: [] }
            });
        }
        setLoading(false);
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const exportToPDF = () => {
        if (!seoData) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('SEO Analysis Report', 20, 30);
        
        const score = calculateOverallScore(seoData);
        doc.setFontSize(16);
        doc.text(`Overall SEO Score: ${score}/100`, 20, 50);
        
        doc.save('seo-analysis-report.pdf');
    };

    const saveSettings = () => {
        chrome.storage.local.set({ seoSettings: settings });
        alert('Settings saved successfully!');
    };

    const renderIssueCard = (item, type) => {
        const typeStyles = {
            good: 'border-green-200 bg-green-50',
            warnings: 'border-yellow-200 bg-yellow-50',
            errors: 'border-red-200 bg-red-50'
        };

        const iconStyles = {
            good: 'text-green-600',
            warnings: 'text-yellow-600',
            errors: 'text-red-600'
        };

        const icons = {
            good: '✓',
            warnings: '⚠',
            errors: '✗'
        };

        return h('div', {
            key: item.message,
            className: `p-3 border rounded-lg ${typeStyles[type]} mb-2`
        }, [
            h('div', { className: 'flex items-start gap-2' }, [
                h('span', {
                    className: `font-bold ${iconStyles[type]} mt-0.5`
                }, icons[type]),
                h('div', { className: 'flex-1' }, [
                    h('p', { className: 'text-sm font-medium text-gray-800' }, item.message),
                    item.tip && h('p', { className: 'text-xs text-gray-600 mt-1' }, [
                        h('strong', {}, 'Tip: '),
                        item.tip
                    ])
                ])
            ])
        ]);
    };

    const renderSection = (title, sectionKey, data) => {
        const isExpanded = expandedSections[sectionKey];
        const totalIssues = (data.errors?.length || 0) + (data.warnings?.length || 0);
        const goodPractices = data.good?.length || 0;

        return h('div', { className: 'border rounded-lg mb-4 overflow-hidden' }, [
            h('button', {
                onClick: () => toggleSection(sectionKey),
                className: 'w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between'
            }, [
                h('div', { className: 'flex items-center gap-3' }, [
                    h('h3', { className: 'font-semibold text-gray-800' }, title),
                    h('div', { className: 'flex gap-2' }, [
                        goodPractices > 0 && h('span', {
                            className: 'px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full'
                        }, `${goodPractices} good`),
                        totalIssues > 0 && h('span', {
                            className: 'px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full'
                        }, `${totalIssues} issues`)
                    ])
                ]),
                h('span', {
                    className: `transform transition-transform ${isExpanded ? 'rotate-180' : ''}`
                }, '▼')
            ]),
            isExpanded && h('div', { className: 'p-4 space-y-2' }, [
                ...(data.good?.map(item => renderIssueCard(item, 'good')) || []),
                ...(data.warnings?.map(item => renderIssueCard(item, 'warnings')) || []),
                ...(data.errors?.map(item => renderIssueCard(item, 'errors')) || []),
                (!data.good?.length && !data.warnings?.length && !data.errors?.length) &&
                    h('p', { className: 'text-gray-500 text-center py-4' }, 'No issues found in this category')
            ])
        ]);
    };

    const renderDashboard = () => {
        if (!seoData) {
            return h('div', { className: 'text-center py-12' }, [
                h('div', { className: 'text-6xl mb-4' }, '🔍'),
                h('h2', { className: 'text-xl font-semibold text-gray-800 mb-2' }, 'Ready to Analyze'),
                h('p', { className: 'text-gray-600 mb-6' }, 'Click the button below to start analyzing this page\'s SEO')
            ]);
        }

        const score = calculateOverallScore(seoData);
        const scoreColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';

        return h('div', {}, [
            h('div', { className: 'text-center mb-6' }, [
                h('div', { className: `text-4xl font-bold ${scoreColor} mb-2` }, `${score}/100`),
                h('p', { className: 'text-gray-600' }, 'Overall SEO Score')
            ]),
            h('div', { className: 'space-y-4' }, [
                settings.checkOnPage && renderSection('On-Page SEO', 'onPage', seoData.onPage || {}),
                settings.checkTechnical && renderSection('Technical SEO', 'technical', seoData.technical || {}),
                settings.checkContent && renderSection('Content Analysis', 'content', seoData.content || {}),
                settings.checkOffPage && renderSection('Off-Page SEO', 'offPage', seoData.offPage || {})
            ])
        ]);
    };

    const renderSettings = () => h('div', { className: 'space-y-6' }, [
        h('h2', { className: 'text-xl font-semibold text-gray-800 mb-4' }, 'Analysis Settings'),
        h('div', { className: 'space-y-4' }, [
            h('label', { className: 'flex items-center gap-3' }, [
                h('input', {
                    type: 'checkbox',
                    checked: settings.checkOnPage,
                    onChange: (e) => setSettings(prev => ({ ...prev, checkOnPage: e.target.checked })),
                    className: 'w-4 h-4 text-blue-600 rounded'
                }),
                h('span', { className: 'text-gray-700' }, 'On-Page SEO Analysis')
            ]),
            h('label', { className: 'flex items-center gap-3' }, [
                h('input', {
                    type: 'checkbox',
                    checked: settings.checkTechnical,
                    onChange: (e) => setSettings(prev => ({ ...prev, checkTechnical: e.target.checked })),
                    className: 'w-4 h-4 text-blue-600 rounded'
                }),
                h('span', { className: 'text-gray-700' }, 'Technical SEO Analysis')
            ]),
            h('label', { className: 'flex items-center gap-3' }, [
                h('input', {
                    type: 'checkbox',
                    checked: settings.checkContent,
                    onChange: (e) => setSettings(prev => ({ ...prev, checkContent: e.target.checked })),
                    className: 'w-4 h-4 text-blue-600 rounded'
                }),
                h('span', { className: 'text-gray-700' }, 'Content Analysis')
            ]),
            h('label', { className: 'flex items-center gap-3' }, [
                h('input', {
                    type: 'checkbox',
                    checked: settings.checkOffPage,
                    onChange: (e) => setSettings(prev => ({ ...prev, checkOffPage: e.target.checked })),
                    className: 'w-4 h-4 text-blue-600 rounded'
                }),
                h('span', { className: 'text-gray-700' }, 'Off-Page SEO Analysis')
            ])
        ]),
        h('button', {
            onClick: saveSettings,
            className: 'w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
        }, 'Save Settings')
    ]);

    return h('div', { className: 'w-full h-full bg-white' }, [
        h('div', { className: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4' }, [
            h('h1', { className: 'text-lg font-bold' }, 'SEO Analyzer Pro')
        ]),
        h('div', { className: 'flex border-b' }, [
            h('button', {
                onClick: () => setActiveTab('dashboard'),
                className: `flex-1 py-3 px-4 text-sm font-medium ${
                    activeTab === 'dashboard' 
                        ? 'border-b-2 border-blue-600 text-blue-600' 
                        : 'text-gray-600 hover:text-gray-800'
                }`
            }, 'Dashboard'),
            h('button', {
                onClick: () => setActiveTab('settings'),
                className: `flex-1 py-3 px-4 text-sm font-medium ${
                    activeTab === 'settings' 
                        ? 'border-b-2 border-blue-600 text-blue-600' 
                        : 'text-gray-600 hover:text-gray-800'
                }`
            }, 'Settings')
        ]),
        h('div', { className: 'p-4 border-b' }, [
            h('div', { className: 'flex gap-2' }, [
                h('button', {
                    onClick: runAnalysis,
                    disabled: loading,
                    className: 'flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                }, loading ? 'Analyzing...' : 'Analyze Page'),
                seoData && h('button', {
                    onClick: exportToPDF,
                    className: 'py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors',
                    title: 'Export Report as PDF'
                }, '📄')
            ])
        ]),
        h('div', { 
            className: 'flex-1 overflow-y-auto scrollbar-thin p-4',
            style: { height: 'calc(600px - 200px)' }
        }, [
            activeTab === 'dashboard' ? renderDashboard() : renderSettings()
        ])
    ]);
};

// Analysis function that will be injected into the page
function analyzePage(settings) {
    const results = {
        onPage: { good: [], warnings: [], errors: [] },
        technical: { good: [], warnings: [], errors: [] },
        content: { good: [], warnings: [], errors: [] },
        offPage: { good: [], warnings: [], errors: [] }
    };

    if (settings.checkOnPage) {
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
    }

    if (settings.checkTechnical) {
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

        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport && viewport.content.includes('width=device-width')) {
            results.technical.good.push({
                message: 'Mobile viewport meta tag present'
            });
        } else {
            results.technical.warnings.push({
                message: 'Mobile viewport meta tag missing or incorrect',
                tip: 'Add meta viewport tag for mobile optimization'
            });
        }
    }

    if (settings.checkContent) {
        const bodyText = document.body.innerText || '';
        const wordCount = bodyText.trim().split(/\s+/).filter(word => word.length > 0).length;

        if (wordCount < 300) {
            results.content.warnings.push({
                message: `Low content length (${wordCount} words)`,
                tip: 'Aim for at least 300 words for better SEO performance'
            });
        } else {
            results.content.good.push({
                message: `Good content length (${wordCount} words)`
            });
        }
    }

    if (settings.checkOffPage) {
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
    }

    return results;
}

// Render the app
ReactDOM.render(React.createElement(SEOAnalyzer), document.getElementById('root'));

    const runAnalysis = async () => {
        setLoading(true);
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Inject and execute content script
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: analyzePage,
                args: [settings]
            });

            if (results && results[0] && results[0].result) {
                setSeoData(results[0].result);
                setActiveTab('dashboard');
            }
        } catch (error) {
            console.error('Analysis failed:', error);
            setSeoData({
                onPage: { errors: [{ message: 'Failed to analyze page', tip: 'Please refresh and try again' }], warnings: [], good: [] },
                technical: { errors: [], warnings: [], good: [] },
                content: { errors: [], warnings: [], good: [] },
                offPage: { errors: [], warnings: [], good: [] }
            });
        }
        setLoading(false);
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const exportToPDF = () => {
        if (!seoData) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(20);
        doc.text('SEO Analysis Report', 20, 30);
        
        // Overall Score
        const score = calculateOverallScore(seoData);
        doc.setFontSize(16);
        doc.text(`Overall SEO Score: ${score}/100`, 20, 50);
        
        let yPosition = 70;
        
        const sections = [
            { key: 'onPage', title: 'On-Page SEO' },
            { key: 'technical', title: 'Technical SEO' },
            { key: 'content', title: 'Content Analysis' },
            { key: 'offPage', title: 'Off-Page SEO' }
        ];

        sections.forEach(section => {
            if (seoData[section.key]) {
                doc.setFontSize(14);
                doc.text(section.title, 20, yPosition);
                yPosition += 10;

                const data = seoData[section.key];
                
                // Good practices
                if (data.good && data.good.length > 0) {
                    doc.setFontSize(12);
                    doc.setTextColor(0, 128, 0);
                    doc.text('✓ Good Practices:', 25, yPosition);
                    yPosition += 7;
                    data.good.forEach(item => {
                        const lines = doc.splitTextToSize(item.message, 160);
                        lines.forEach(line => {
                            doc.text(line, 30, yPosition);
                            yPosition += 5;
                        });
                    });
                }

                // Warnings
                if (data.warnings && data.warnings.length > 0) {
                    doc.setTextColor(255, 165, 0);
                    doc.text('⚠ Warnings:', 25, yPosition);
                    yPosition += 7;
                    data.warnings.forEach(item => {
                        const lines = doc.splitTextToSize(item.message, 160);
                        lines.forEach(line => {
                            doc.text(line, 30, yPosition);
                            yPosition += 5;
                        });
                    });
                }

                // Errors
                if (data.errors && data.errors.length > 0) {
                    doc.setTextColor(255, 0, 0);
                    doc.text('✗ Issues:', 25, yPosition);
                    yPosition += 7;
                    data.errors.forEach(item => {
                        const lines = doc.splitTextToSize(item.message, 160);
                        lines.forEach(line => {
                            doc.text(line, 30, yPosition);
                            yPosition += 5;
                        });
                    });
                }

                doc.setTextColor(0, 0, 0);
                yPosition += 10;

                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                }
            }
        });

        doc.save('seo-analysis-report.pdf');
    };

    const saveSettings = () => {
        chrome.storage.local.set({ seoSettings: settings });
        alert('Settings saved successfully!');
    };

    const renderIssueCard = (item, type) => {
        const typeStyles = {
            good: 'border-green-200 bg-green-50',
            warnings: 'border-yellow-200 bg-yellow-50',
            errors: 'border-red-200 bg-red-50'
        };

        const iconStyles = {
            good: 'text-green-600',
            warnings: 'text-yellow-600',
            errors: 'text-red-600'
        };

        const icons = {
            good: '✓',
            warnings: '⚠',
            errors: '✗'
        };

        return (
            <div key={item.message} className={`p-3 border rounded-lg ${typeStyles[type]} mb-2`}>
                <div className="flex items-start gap-2">
                    <span className={`font-bold ${iconStyles[type]} mt-0.5`}>
                        {icons[type]}
                    </span>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{item.message}</p>
                        {item.tip && (
                            <p className="text-xs text-gray-600 mt-1">
                                <strong>Tip:</strong> {item.tip}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderSection = (title, sectionKey, data) => {
        const isExpanded = expandedSections[sectionKey];
        const totalIssues = (data.errors?.length || 0) + (data.warnings?.length || 0);
        const goodPractices = data.good?.length || 0;

        return (
            <div className="border rounded-lg mb-4 overflow-hidden">
                <button
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-800">{title}</h3>
                        <div className="flex gap-2">
                            {goodPractices > 0 && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    {goodPractices} good
                                </span>
                            )}
                            {totalIssues > 0 && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                    {totalIssues} issues
                                </span>
                            )}
                        </div>
                    </div>
                    <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        ▼
                    </span>
                </button>
                {isExpanded && (
                    <div className="p-4 space-y-2">
                        {data.good?.map(item => renderIssueCard(item, 'good'))}
                        {data.warnings?.map(item => renderIssueCard(item, 'warnings'))}
                        {data.errors?.map(item => renderIssueCard(item, 'errors'))}
                        {!data.good?.length && !data.warnings?.length && !data.errors?.length && (
                            <p className="text-gray-500 text-center py-4">No issues found in this category</p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderDashboard = () => {
        if (!seoData) {
            return (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Ready to Analyze</h2>
                    <p className="text-gray-600 mb-6">Click the button below to start analyzing this page's SEO</p>
                </div>
            );
        }

        const score = calculateOverallScore(seoData);
        const scoreColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';

        return (
            <div>
                {/* Score Circle */}
                <div className="text-center mb-6">
                    <div className={`text-4xl font-bold ${scoreColor} mb-2`}>
                        {score}/100
                    </div>
                    <p className="text-gray-600">Overall SEO Score</p>
                </div>

                {/* Sections */}
                <div className="space-y-4">
                    {settings.checkOnPage && renderSection('On-Page SEO', 'onPage', seoData.onPage || {})}
                    {settings.checkTechnical && renderSection('Technical SEO', 'technical', seoData.technical || {})}
                    {settings.checkContent && renderSection('Content Analysis', 'content', seoData.content || {})}
                    {settings.checkOffPage && renderSection('Off-Page SEO', 'offPage', seoData.offPage || {})}
                </div>
            </div>
        );
    };

    const renderSettings = () => (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Analysis Settings</h2>
            
            <div className="space-y-4">
                <label className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={settings.checkOnPage}
                        onChange={(e) => setSettings(prev => ({ ...prev, checkOnPage: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-gray-700">On-Page SEO Analysis</span>
                </label>

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
ReactDOM.render(<SEOAnalyzer />, document.getElementById('root'));