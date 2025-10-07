// Background script for SEO Analyzer
chrome.runtime.onInstalled.addListener(() => {
    console.log('SEO Analyzer Pro installed');
    
    // Set default settings
    chrome.storage.local.get(['seoSettings'], (result) => {
        if (!result.seoSettings) {
            chrome.storage.local.set({
                seoSettings: {
                    checkOnPage: true,
                    checkTechnical: true,
                    checkContent: true,
                    checkOffPage: true,
                    checkUX: true,
                    checkLocal: false,
                    checkPerformance: true,
                    checkAnalytics: true,
                    checkAdvanced: true
                }
            });
        }
    });
});

// Listen for tab updates to potentially refresh analysis
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
        // Page loaded, could trigger auto-analysis if enabled
        console.log('Page loaded:', tab.url);
    }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzePageBackground') {
        // Handle background analysis tasks
        performBackgroundAnalysis(request.url, request.settings)
            .then(results => {
                sendResponse({ success: true, data: results });
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep message channel open
    }
    
    if (request.action === 'checkRobotsTxt') {
        checkRobotsTxt(request.url)
            .then(result => {
                sendResponse(result);
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }
    
    if (request.action === 'checkSitemap') {
        checkSitemap(request.url)
            .then(result => {
                sendResponse(result);
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }
});

async function performBackgroundAnalysis(url, settings) {
    const results = {
        robotsTxt: null,
        sitemap: null,
        backlinks: null,
        pageSpeed: null
    };

    try {
        // Check robots.txt
        if (settings.checkTechnical) {
            results.robotsTxt = await checkRobotsTxt(url);
        }

        // Check sitemap
        if (settings.checkTechnical) {
            results.sitemap = await checkSitemap(url);
        }

        // Mock backlink check (would require actual API in production)
        if (settings.checkOffPage) {
            results.backlinks = await mockBacklinkCheck(url);
        }

        return results;
    } catch (error) {
        console.error('Background analysis error:', error);
        throw error;
    }
}

async function checkRobotsTxt(url) {
    try {
        const baseUrl = new URL(url).origin;
        const robotsUrl = `${baseUrl}/robots.txt`;
        
        const response = await fetch(robotsUrl, { 
            method: 'GET',
            mode: 'no-cors' // Handle CORS issues
        });
        
        if (response.ok) {
            const text = await response.text();
            return {
                exists: true,
                content: text,
                url: robotsUrl
            };
        } else {
            return {
                exists: false,
                url: robotsUrl
            };
        }
    } catch (error) {
        return {
            exists: false,
            error: error.message,
            url: `${new URL(url).origin}/robots.txt`
        };
    }
}

async function checkSitemap(url) {
    try {
        const baseUrl = new URL(url).origin;
        const commonSitemapUrls = [
            `${baseUrl}/sitemap.xml`,
            `${baseUrl}/sitemap_index.xml`,
            `${baseUrl}/sitemaps.xml`,
            `${baseUrl}/sitemap1.xml`
        ];

        for (const sitemapUrl of commonSitemapUrls) {
            try {
                const response = await fetch(sitemapUrl, { 
                    method: 'HEAD',
                    mode: 'no-cors'
                });
                
                if (response.ok) {
                    return {
                        exists: true,
                        url: sitemapUrl
                    };
                }
            } catch (e) {
                // Continue to next URL
                continue;
            }
        }

        return {
            exists: false,
            checkedUrls: commonSitemapUrls
        };
    } catch (error) {
        return {
            exists: false,
            error: error.message
        };
    }
}

async function mockBacklinkCheck(url) {
    // This is a mock function. In a real implementation, you would:
    // 1. Use APIs like Moz, Ahrefs, or SEMrush
    // 2. Or implement a web scraping solution
    // 3. Or use Google Search Console API
    
    return new Promise((resolve) => {
        setTimeout(() => {
            const domain = new URL(url).hostname;
            const mockData = {
                totalBacklinks: Math.floor(Math.random() * 1000) + 50,
                referringDomains: Math.floor(Math.random() * 100) + 10,
                domainAuthority: Math.floor(Math.random() * 40) + 30,
                note: 'This is mock data. Integrate with real SEO APIs for actual backlink data.'
            };
            resolve(mockData);
        }, 1000);
    });
}

// Context menu integration (optional) - guard for safety
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === 'analyzePage') {
            // Open popup or trigger analysis
            chrome.action.openPopup();
        }
    });
}

// Create context menu
chrome.runtime.onInstalled.addListener(() => {
    if (chrome.contextMenus && chrome.contextMenus.create) {
        try {
            chrome.contextMenus.create({
                id: 'analyzePage',
                title: 'Analyze SEO',
                contexts: ['page']
            });
        } catch (e) {
            // ignore if already exists or permission missing
            console.warn('Context menu creation skipped:', e?.message || e);
        }
    }
});

// Storage management
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.seoSettings) {
        console.log('SEO settings updated:', changes.seoSettings.newValue);
    }
});

// Badge text update based on analysis results
function updateBadge(tabId, score) {
    if (score >= 80) {
        chrome.action.setBadgeBackgroundColor({ color: '#10B981', tabId });
        chrome.action.setBadgeText({ text: '✓', tabId });
    } else if (score >= 60) {
        chrome.action.setBadgeBackgroundColor({ color: '#F59E0B', tabId });
        chrome.action.setBadgeText({ text: '!', tabId });
    } else {
        chrome.action.setBadgeBackgroundColor({ color: '#EF4444', tabId });
        chrome.action.setBadgeText({ text: '✗', tabId });
    }
}

// Clear badge when tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.action.setBadgeText({ text: '', tabId: activeInfo.tabId });
});

// Performance monitoring
let performanceMetrics = {
    analysisCount: 0,
    lastAnalysis: null,
    averageAnalysisTime: 0
};

function trackAnalysisPerformance(startTime, endTime) {
    const duration = endTime - startTime;
    performanceMetrics.analysisCount++;
    performanceMetrics.lastAnalysis = new Date().toISOString();
    
    if (performanceMetrics.averageAnalysisTime === 0) {
        performanceMetrics.averageAnalysisTime = duration;
    } else {
        performanceMetrics.averageAnalysisTime = 
            (performanceMetrics.averageAnalysisTime + duration) / 2;
    }
    
    // Store metrics
    chrome.storage.local.set({ performanceMetrics });
}

// Export performance data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPerformanceMetrics') {
        chrome.storage.local.get(['performanceMetrics'], (result) => {
            sendResponse(result.performanceMetrics || performanceMetrics);
        });
        return true;
    }
});

console.log('SEO Analyzer Pro background script loaded');