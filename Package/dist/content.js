// Content script for SEO analysis
(function() {
    'use strict';

    // Buffered Web Vitals metrics captured via PerformanceObserver to avoid deprecated APIs
    const uxMetrics = {
        lcp: null, // ms
        cls: 0,    // unitless
        inp: null  // ms
    };

    // Setup PerformanceObservers with buffered entries
    try {
        if ('PerformanceObserver' in window) {
            // LCP
            try {
                const poLCP = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        const t = entry.renderTime || entry.loadTime || entry.startTime || 0;
                        if (!uxMetrics.lcp || t > uxMetrics.lcp) uxMetrics.lcp = t;
                    }
                });
                poLCP.observe({ type: 'largest-contentful-paint', buffered: true });
            } catch (_) {}

            // CLS
            try {
                const poCLS = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) uxMetrics.cls += (entry.value || 0);
                    }
                });
                poCLS.observe({ type: 'layout-shift', buffered: true });
            } catch (_) {}

            // INP (approximation using event timings)
            try {
                const poINP = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        // Consider relevant interaction events
                        const et = entry.name || '';
                        if (/click|keydown|pointerdown|pointerup|mousedown|mouseup|touchstart|touchend/i.test(et)) {
                            const duration = entry.duration || 0;
                            if (!uxMetrics.inp || duration > uxMetrics.inp) uxMetrics.inp = duration;
                        }
                    }
                });
                poINP.observe({ type: 'event', buffered: true, durationThreshold: 0 });
            } catch (_) {}
        }
    } catch (_) {}

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'analyzePage') {
            try {
                const results = performSEOAnalysis(request.settings);
                sendResponse({ success: true, data: results });
            } catch (error) {
                console.error('SEO Analysis error:', error);
                sendResponse({ success: false, error: error.message });
            }
        }
        return true; // Keep message channel open for async response
    });

    function performSEOAnalysis(settings) {
        const results = {
            onPage: { good: [], warnings: [], errors: [] },
            technical: { good: [], warnings: [], errors: [] },
            content: { good: [], warnings: [], errors: [] },
            offPage: { good: [], warnings: [], errors: [] },
            userExperience: { good: [], warnings: [], errors: [] },
            local: { good: [], warnings: [], errors: [] },
            performance: { good: [], warnings: [], errors: [] },
            analytics: { good: [], warnings: [], errors: [] },
            advanced: { good: [], warnings: [], errors: [] }
        };

        // On-Page SEO Analysis
        if (settings.checkOnPage) {
            analyzeOnPageSEO(results.onPage);
        }

        // Technical SEO Analysis
        if (settings.checkTechnical) {
            analyzeTechnicalSEO(results.technical);
        }

        // Content Analysis
        if (settings.checkContent) {
            analyzeContent(results.content);
        }

        // Off-Page SEO Analysis
        if (settings.checkOffPage) {
            analyzeOffPageSEO(results.offPage);
        }

        // User Experience (UX) and Core Web Vitals
        if (settings.checkUX) {
            analyzeUX(results.userExperience);
        }

        // Local SEO
        if (settings.checkLocal) {
            analyzeLocalSEO(results.local);
        }

        // Performance & Speed
        if (settings.checkPerformance) {
            analyzePerformance(results.performance);
        }

        // Analytics & Monitoring
        if (settings.checkAnalytics) {
            analyzeAnalytics(results.analytics);
        }

        // Advanced SEO
        if (settings.checkAdvanced) {
            analyzeAdvanced(results.advanced);
        }

        return results;
    }

    function analyzeOnPageSEO(results) {
        // Title analysis
        const title = document.querySelector('title');
        if (!title || !title.textContent.trim()) {
            results.errors.push({
                message: 'Missing page title',
                tip: 'Add a descriptive title tag between 50-60 characters'
            });
        } else {
            const titleLength = title.textContent.trim().length;
            if (titleLength < 30) {
                results.warnings.push({
                    message: `Title too short (${titleLength} characters)`,
                    tip: 'Aim for 50-60 characters for optimal display in search results'
                });
            } else if (titleLength > 60) {
                results.warnings.push({
                    message: `Title too long (${titleLength} characters)`,
                    tip: 'Keep titles under 60 characters to avoid truncation'
                });
            } else {
                results.good.push({
                    message: `Title length is optimal (${titleLength} characters)`
                });
            }
        }

        // Meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc || !metaDesc.content.trim()) {
            results.errors.push({
                message: 'Missing meta description',
                tip: 'Add a meta description between 150-160 characters'
            });
        } else {
            const descLength = metaDesc.content.trim().length;
            if (descLength < 120) {
                results.warnings.push({
                    message: `Meta description too short (${descLength} characters)`,
                    tip: 'Aim for 150-160 characters for better search result display'
                });
            } else if (descLength > 160) {
                results.warnings.push({
                    message: `Meta description too long (${descLength} characters)`,
                    tip: 'Keep meta descriptions under 160 characters'
                });
            } else {
                results.good.push({
                    message: `Meta description length is optimal (${descLength} characters)`
                });
            }
        }

        // Header structure
        const h1s = document.querySelectorAll('h1');
        if (h1s.length === 0) {
            results.errors.push({
                message: 'No H1 tag found',
                tip: 'Add exactly one H1 tag that describes the main topic'
            });
        } else if (h1s.length > 1) {
            results.warnings.push({
                message: `Multiple H1 tags found (${h1s.length})`,
                tip: 'Use only one H1 tag per page'
            });
        } else {
            results.good.push({
                message: 'Single H1 tag found'
            });
        }

        // Check heading hierarchy
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length > 1) {
            results.good.push({
                message: `${headings.length} headings found - good for structure`
            });
        } else if (headings.length === 1) {
            results.warnings.push({
                message: 'Only one heading found',
                tip: 'Add more headings (H2, H3) to improve content structure'
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
                results.good.push({
                    message: `All ${images.length} images have alt text`
                });
            } else {
                results.warnings.push({
                    message: `${imagesWithoutAlt} of ${images.length} images missing alt text`,
                    tip: 'Add descriptive alt text to all images for accessibility and SEO'
                });
            }
        }

    // Internal and external links
        const links = document.querySelectorAll('a[href]');
        let internalLinks = 0;
        let externalLinks = 0;

        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href.startsWith('http') && !href.includes(window.location.hostname)) {
                externalLinks++;
            } else if (href.startsWith('/') || href.includes(window.location.hostname)) {
                internalLinks++;
            }
        });

        if (internalLinks > 0) {
            results.good.push({
                message: `${internalLinks} internal links found`
            });
        } else {
            results.warnings.push({
                message: 'No internal links found',
                tip: 'Add internal links to improve site navigation and SEO'
            });
        }

        if (externalLinks > 0) {
            results.good.push({
                message: `${externalLinks} external links found`
            });
        }

        // URL SEO-friendly checks
        try {
            const url = window.location.href;
            const hasUpper = /[A-Z]/.test(url);
            const hasUnderscore = /_/.test(new URL(url).pathname);
            const hasManyParams = (new URL(url).searchParams?.toString() || '').split('&').filter(Boolean).length > 2;
            if (url.length > 115) {
                results.warnings.push({ message: `Long URL (${url.length} chars)`, tip: 'Keep URLs concise (<115 characters) and human-readable' });
            }
            if (hasUpper) {
                results.warnings.push({ message: 'URL contains uppercase letters', tip: 'Use lowercase for consistency and to avoid duplicates' });
            }
            if (hasUnderscore) {
                results.warnings.push({ message: 'URL contains underscores', tip: 'Prefer hyphens (-) in URLs' });
            }
            if (hasManyParams) {
                results.warnings.push({ message: 'URL has many query parameters', tip: 'Avoid long query strings on indexable pages' });
            }
        } catch (_) {}

        // Multimedia presence
        const videos = document.querySelectorAll('video, iframe[src*="youtube.com"], iframe[src*="vimeo.com"]');
        if (videos.length > 0) {
            results.good.push({ message: 'Multimedia detected (video/iframe)' });
        }

        // Keyword density analysis (basic)
        const bodyText = document.body.innerText.toLowerCase();
        const words = bodyText.split(/\s+/);
        const wordCount = {};
        
        words.forEach(word => {
            if (word.length > 3) {
                wordCount[word] = (wordCount[word] || 0) + 1;
            }
        });

        const topWords = Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);

        if (topWords.length > 0) {
            const topWord = topWords[0];
            const density = (topWord[1] / words.length) * 100;
            
            if (density > 3) {
                results.warnings.push({
                    message: `High keyword density for "${topWord[0]}" (${density.toFixed(1)}%)`,
                    tip: 'Reduce keyword repetition to avoid over-optimization'
                });
            } else {
                results.good.push({
                    message: `Good keyword distribution detected`
                });
            }
        }
    }

    function analyzeTechnicalSEO(results) {
        // HTTPS check
        if (window.location.protocol === 'https:') {
            results.good.push({
                message: 'Site uses HTTPS'
            });
        } else {
            results.errors.push({
                message: 'Site not using HTTPS',
                tip: 'Implement SSL certificate for security and SEO benefits'
            });
        }

        // Mobile-friendly check
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport && viewport.content.includes('width=device-width')) {
            results.good.push({
                message: 'Mobile viewport meta tag present'
            });
        } else {
            results.warnings.push({
                message: 'Mobile viewport meta tag missing or incorrect',
                tip: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">'
            });
        }

        // Canonical URL
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
            results.good.push({
                message: 'Canonical URL specified'
            });
        } else {
            results.warnings.push({
                message: 'No canonical URL specified',
                tip: 'Add a canonical link to prevent duplicate content issues'
            });
        }

        // Pagination rel next/prev
        const relNext = document.querySelector('link[rel="next"]');
        const relPrev = document.querySelector('link[rel="prev"]');
        if (relNext || relPrev) {
            results.good.push({ message: 'Pagination rel next/prev present' });
        }

        // Robots meta
        const robots = document.querySelector('meta[name="robots"]');
        if (robots) {
            if (robots.content.includes('noindex')) {
                results.warnings.push({
                    message: 'Page set to noindex',
                    tip: 'Remove noindex if you want this page to be indexed'
                });
            } else {
                results.good.push({
                    message: 'Robots meta tag configured properly'
                });
            }
        }

        // Language declaration
        const htmlLang = document.documentElement.lang;
        if (htmlLang) {
            results.good.push({
                message: `Language declared (${htmlLang})`
            });
        } else {
            results.warnings.push({
                message: 'No language declaration found',
                tip: 'Add lang attribute to html tag (e.g., <html lang="en">)'
            });
        }

        // hreflang alternates
        const hrefLangs = document.querySelectorAll('link[rel="alternate"][hreflang]');
        if (hrefLangs.length > 0) {
            results.good.push({ message: `${hrefLangs.length} hreflang alternates found` });
        }

        // Favicon
        const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
        if (favicon) {
            results.good.push({
                message: 'Favicon present'
            });
        } else {
            results.warnings.push({
                message: 'No favicon found',
                tip: 'Add a favicon for better user experience'
            });
        }

        // Basic load time using Performance Navigation Timing
        try {
            const nav = performance.getEntriesByType && performance.getEntriesByType('navigation');
            if (nav && nav.length) {
                const loadTime = nav[0].loadEventEnd; // ms from navigation start
                if (loadTime > 0) {
                    if (loadTime < 2000) {
                        results.good.push({ message: `Excellent page load time (${Math.round(loadTime/1000)}s)` });
                    } else if (loadTime < 3000) {
                        results.good.push({ message: `Good page load time (${Math.round(loadTime/1000)}s)` });
                    } else if (loadTime < 5000) {
                        results.warnings.push({ message: `Moderate page load time (${Math.round(loadTime/1000)}s)`, tip: 'Optimize images and reduce HTTP requests to improve load time' });
                    } else {
                        results.errors.push({ message: `Slow page load time (${Math.round(loadTime/1000)}s)`, tip: 'Significant performance optimization needed' });
                    }
                }
            }
        } catch(_) {}

        // Check for minified CSS/JS
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
        const scripts = document.querySelectorAll('script[src]');
        
        let minifiedCSS = 0;
        let minifiedJS = 0;

        stylesheets.forEach(link => {
            if (link.href.includes('.min.')) minifiedCSS++;
        });

        scripts.forEach(script => {
            if (script.src.includes('.min.')) minifiedJS++;
        });

        if (stylesheets.length > 0 && minifiedCSS === stylesheets.length) {
            results.good.push({
                message: 'All CSS files are minified'
            });
        } else if (minifiedCSS > 0) {
            results.warnings.push({
                message: 'Some CSS files are not minified',
                tip: 'Minify all CSS files to improve load times'
            });
        }

        if (scripts.length > 0 && minifiedJS === scripts.length) {
            results.good.push({
                message: 'All JavaScript files are minified'
            });
        } else if (minifiedJS > 0) {
            results.warnings.push({
                message: 'Some JavaScript files are not minified',
                tip: 'Minify all JavaScript files to improve load times'
            });
        }

        // AMP presence
        const amp = document.querySelector('link[rel="amphtml"]');
        if (amp) {
            results.good.push({ message: 'AMP version linked' });
        }
    }

    function analyzeContent(results) {
        const bodyText = document.body.innerText || '';
        const wordCount = bodyText.trim().split(/\s+/).filter(word => word.length > 0).length;

        // Content length
        if (wordCount < 300) {
            results.warnings.push({
                message: `Low content length (${wordCount} words)`,
                tip: 'Aim for at least 300 words for better SEO performance'
            });
        } else if (wordCount > 2000) {
            results.good.push({
                message: `Comprehensive content (${wordCount} words)`
            });
        } else {
            results.good.push({
                message: `Good content length (${wordCount} words)`
            });
        }

        // Readability analysis (simplified)
        const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        if (sentences > 0) {
            const avgWordsPerSentence = wordCount / sentences;
            if (avgWordsPerSentence > 25) {
                results.warnings.push({
                    message: 'Long sentences detected',
                    tip: 'Break up long sentences for better readability'
                });
            } else if (avgWordsPerSentence < 10) {
                results.warnings.push({
                    message: 'Very short sentences detected',
                    tip: 'Consider combining some short sentences for better flow'
                });
            } else {
                results.good.push({
                    message: 'Good sentence length for readability'
                });
            }
        }

        // Check for text-to-HTML ratio
        const htmlContent = document.documentElement.outerHTML;
        const textToHtmlRatio = (bodyText.length / htmlContent.length) * 100;
        
        if (textToHtmlRatio > 25) {
            results.good.push({
                message: `Good text-to-HTML ratio (${textToHtmlRatio.toFixed(1)}%)`
            });
        } else if (textToHtmlRatio > 15) {
            results.warnings.push({
                message: `Moderate text-to-HTML ratio (${textToHtmlRatio.toFixed(1)}%)`,
                tip: 'Consider adding more text content or reducing HTML markup'
            });
        } else {
            results.warnings.push({
                message: `Low text-to-HTML ratio (${textToHtmlRatio.toFixed(1)}%)`,
                tip: 'Add more text content to improve content quality'
            });
        }

        // Check for duplicate content (simplified)
        const paragraphs = document.querySelectorAll('p');
        const textBlocks = Array.from(paragraphs)
            .map(p => p.textContent.trim())
            .filter(text => text.length > 50);
        
        const uniqueBlocks = new Set(textBlocks);
        if (textBlocks.length > uniqueBlocks.size) {
            results.warnings.push({
                message: 'Potential duplicate content detected',
                tip: 'Review content for repetitive sections'
            });
        } else if (textBlocks.length > 0) {
            results.good.push({
                message: 'No duplicate content detected'
            });
        }

        // Check for images in content
        const contentImages = document.querySelectorAll('main img, article img, .content img, #content img');
        if (contentImages.length > 0) {
            results.good.push({
                message: `${contentImages.length} images found in content`
            });
        } else {
            results.warnings.push({
                message: 'No images found in main content',
                tip: 'Consider adding relevant images to improve user engagement'
            });
        }

        // Content freshness: check meta or JSON-LD dates
        let publishedDate = null;
        const metaPub = document.querySelector('meta[property="article:published_time"], meta[name="date"]');
        if (metaPub && metaPub.content) publishedDate = new Date(metaPub.content);
        try {
            const ldTypes = parseJsonLdTypes();
            if (ldTypes.meta.datePublished) {
                publishedDate = new Date(ldTypes.meta.datePublished);
            }
        } catch(_) {}
        if (publishedDate && !isNaN(publishedDate.getTime())) {
            const days = Math.floor((Date.now() - publishedDate.getTime()) / (1000*60*60*24));
            if (days < 365) {
                results.good.push({ message: `Content recently published/updated (${days} days ago)` });
            } else {
                results.warnings.push({ message: 'Content may be outdated', tip: 'Refresh content periodically to maintain rankings' });
            }
        }
    }

    function analyzeOffPageSEO(results) {
        // Social media tags (Open Graph)
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDesc = document.querySelector('meta[property="og:description"]');
        const ogImage = document.querySelector('meta[property="og:image"]');
        const ogUrl = document.querySelector('meta[property="og:url"]');

        let ogCount = 0;
        if (ogTitle) ogCount++;
        if (ogDesc) ogCount++;
        if (ogImage) ogCount++;
        if (ogUrl) ogCount++;

        if (ogCount === 4) {
            results.good.push({
                message: 'Complete Open Graph tags present'
            });
        } else if (ogCount > 0) {
            results.warnings.push({
                message: `Incomplete Open Graph tags (${ogCount}/4)`,
                tip: 'Add missing og:title, og:description, og:image, and og:url tags'
            });
        } else {
            results.warnings.push({
                message: 'No Open Graph tags found',
                tip: 'Add Open Graph meta tags for better social media sharing'
            });
        }

        // Twitter Cards
        const twitterCard = document.querySelector('meta[name="twitter:card"]');
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        const twitterDesc = document.querySelector('meta[name="twitter:description"]');
        const twitterImage = document.querySelector('meta[name="twitter:image"]');

        if (twitterCard && twitterTitle && twitterDesc) {
            results.good.push({
                message: 'Twitter Card tags present'
            });
        } else if (twitterCard) {
            results.warnings.push({
                message: 'Incomplete Twitter Card tags',
                tip: 'Add twitter:title and twitter:description for complete Twitter Cards'
            });
        } else {
            results.warnings.push({
                message: 'Twitter Card tags missing',
                tip: 'Add Twitter Card meta tags for better Twitter sharing'
            });
        }

        // Structured data (JSON-LD)
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        if (jsonLdScripts.length > 0) {
            results.good.push({ message: `Structured data found (${jsonLdScripts.length} JSON-LD blocks)` });
            // Try to validate JSON-LD
            let validJsonLd = 0;
            jsonLdScripts.forEach(script => {
                try {
                    const data = JSON.parse(script.textContent);
                    if (data['@context'] || data['@type']) { validJsonLd++; }
                } catch (_) {}
            });
            if (validJsonLd !== jsonLdScripts.length) {
                results.warnings.push({ message: 'Some JSON-LD blocks may be invalid', tip: 'Validate your structured data using Google\'s Rich Results Test' });
            }
        } else {
            results.warnings.push({ message: 'No structured data found', tip: 'Add JSON-LD structured data for rich snippets' });
        }

        // Check for social media links
        const socialLinks = document.querySelectorAll('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="linkedin.com"], a[href*="instagram.com"], a[href*="youtube.com"]');
        if (socialLinks.length > 0) {
            results.good.push({
                message: `${socialLinks.length} social media links found`
            });
        } else {
            results.warnings.push({
                message: 'No social media links found',
                tip: 'Consider adding links to your social media profiles'
            });
        }

        // Check for schema.org microdata
        const microdataElements = document.querySelectorAll('[itemscope], [itemtype], [itemprop]');
        if (microdataElements.length > 0) {
            results.good.push({
                message: 'Schema.org microdata found'
            });
        }

        // Check for rel="nofollow" on external links
        const externalLinks = document.querySelectorAll('a[href^="http"]:not([href*="' + window.location.hostname + '"])');
        let nofollowCount = 0;
        
        externalLinks.forEach(link => {
            if (link.rel && link.rel.includes('nofollow')) {
                nofollowCount++;
            }
        });

        if (externalLinks.length > 0) {
            if (nofollowCount === externalLinks.length) {
                results.warnings.push({
                    message: 'All external links are nofollow',
                    tip: 'Consider making some external links dofollow if they add value'
                });
            } else if (nofollowCount > 0) {
                results.good.push({
                    message: `Good mix of follow/nofollow external links`
                });
            } else {
                results.warnings.push({
                    message: 'No nofollow attributes on external links',
                    tip: 'Consider adding rel="nofollow" to untrusted external links'
                });
            }
        }
    }

    // New categories implementations
    function analyzeUX(results) {
        // Core Web Vitals (LCP & CLS) from buffered observers
        if (typeof uxMetrics.lcp === 'number') {
            const lcp = uxMetrics.lcp;
            if (lcp <= 2500) {
                results.good.push({ message: `LCP good (${(lcp/1000).toFixed(2)}s)` });
            } else if (lcp <= 4000) {
                results.warnings.push({ message: `LCP needs improvement (${(lcp/1000).toFixed(2)}s)`, tip: 'Optimize images and critical rendering path' });
            } else {
                results.errors.push({ message: `LCP poor (${(lcp/1000).toFixed(2)}s)`, tip: 'Compress images, reduce render-blocking resources' });
            }
        } else {
            results.warnings.push({ message: 'LCP not available', tip: 'Run PageSpeed Insights for lab/field data' });
        }

        const cls = uxMetrics.cls || 0;
        if (cls > 0) {
            if (cls <= 0.1) {
                results.good.push({ message: `CLS good (${cls.toFixed(3)})` });
            } else if (cls <= 0.25) {
                results.warnings.push({ message: `CLS needs improvement (${cls.toFixed(3)})`, tip: 'Set width/height on images; avoid layout shifts' });
            } else {
                results.errors.push({ message: `CLS poor (${cls.toFixed(3)})`, tip: 'Reserve space for media; avoid inserting above content' });
            }
        }

        // INP (approx) from buffered event timings
        if (typeof uxMetrics.inp === 'number') {
            const inp = uxMetrics.inp;
            if (inp < 200) {
                results.good.push({ message: `INP good (${Math.round(inp)} ms)` });
            } else if (inp < 500) {
                results.warnings.push({ message: `INP moderate (${Math.round(inp)} ms)`, tip: 'Reduce JS main-thread work and long tasks' });
            } else {
                results.errors.push({ message: `INP poor (${Math.round(inp)} ms)`, tip: 'Defer non-critical JS and optimize interactions' });
            }
        } else {
            results.warnings.push({ message: 'INP not measured', tip: 'Requires user interaction or lab testing' });
        }

        // Navigation and breadcrumbs
        const nav = document.querySelector('nav');
        if (nav) results.good.push({ message: 'Navigation landmark present' });
        const breadcrumbsSchema = document.querySelector('[itemtype*="BreadcrumbList"], script[type="application/ld+json"]');
        const breadcrumbUI = document.querySelector('nav[aria-label*="breadcrumb" i], .breadcrumb, ol.breadcrumb');
        if (breadcrumbsSchema || breadcrumbUI) {
            results.good.push({ message: 'Breadcrumbs detected' });
        }

        // Accessibility basics
        const imgsNoAlt = Array.from(document.querySelectorAll('img')).filter(img => !img.alt || img.alt.trim() === '').length;
        if (imgsNoAlt > 0) {
            results.warnings.push({ message: `${imgsNoAlt} images missing alt`, tip: 'Add descriptive alt attributes' });
        }
        const labels = document.querySelectorAll('label[for]');
        const inputs = document.querySelectorAll('input:not([type=hidden]):not([aria-hidden])');
        if (inputs.length > 0 && labels.length < inputs.length * 0.5) {
            results.warnings.push({ message: 'Many inputs lack associated labels', tip: 'Link labels to inputs via for/id or use aria-label' });
        }
    }

    function analyzeLocalSEO(results) {
        // LocalBusiness schema
        try {
            const { types, meta } = parseJsonLdTypes();
            if (types.some(t => /LocalBusiness|Organization|Restaurant|Store|Medical/.test(t))) {
                results.good.push({ message: 'LocalBusiness/Organization schema present' });
            } else {
                results.warnings.push({ message: 'No LocalBusiness schema', tip: 'Add LocalBusiness schema with address and phone' });
            }
            if (meta.address) {
                results.good.push({ message: 'Business address structured data found' });
            }
            if (meta.telephone) {
                results.good.push({ message: 'Business phone in structured data' });
            }
            if (meta.aggregateRating) {
                results.good.push({ message: 'AggregateRating schema found (reviews)' });
            }
        } catch(_) {}

        // NAP presence heuristics
        const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
        if (phoneLinks.length > 0) results.good.push({ message: 'Clickable phone number (tel:) found' });
        const mapIframes = document.querySelectorAll('iframe[src*="google.com/maps"], iframe[src*="maps.apple.com"]');
        if (mapIframes.length > 0) results.good.push({ message: 'Map embed detected' });
    }

    function analyzePerformance(results) {
        try {
            const nav = performance.getEntriesByType && performance.getEntriesByType('navigation');
            if (nav && nav.length) {
                const n = nav[0];
                const ttfb = n.responseStart; // ms since start
                if (ttfb > 0) {
                    if (ttfb < 200) results.good.push({ message: `TTFB good (${Math.round(ttfb)} ms)` });
                    else if (ttfb < 500) results.warnings.push({ message: `TTFB moderate (${Math.round(ttfb)} ms)`, tip: 'Consider CDN and server optimizations' });
                    else results.errors.push({ message: `TTFB high (${Math.round(ttfb)} ms)`, tip: 'Use caching, optimize server, leverage CDN' });
                }
            }
        } catch(_) {}

        // Image optimization & lazy loading
        const imgs = Array.from(document.querySelectorAll('img[src]'));
        if (imgs.length > 0) {
            const webp = imgs.filter(i => /\.webp($|\?)/i.test(i.currentSrc || i.src)).length;
            const avif = imgs.filter(i => /\.avif($|\?)/i.test(i.currentSrc || i.src)).length;
            const lazy = imgs.filter(i => (i.loading || '').toLowerCase() === 'lazy').length;
            const dimMissing = imgs.filter(i => !(i.getAttribute('width') && i.getAttribute('height'))).length;
            if (webp + avif > 0) results.good.push({ message: `Modern image formats used (${webp + avif}/${imgs.length})` });
            else results.warnings.push({ message: 'No modern image formats detected', tip: 'Use WebP or AVIF for better compression' });
            if (lazy / imgs.length >= 0.5) results.good.push({ message: `Lazy loading on ${Math.round((lazy/imgs.length)*100)}% images` });
            else results.warnings.push({ message: 'Low lazy-loading usage on images', tip: 'Add loading="lazy" to below-the-fold images' });
            if (dimMissing > 0) results.warnings.push({ message: `${dimMissing} images missing width/height`, tip: 'Set dimensions to reduce CLS' });
        }

        // Prefer INP over deprecated FID; INP is surfaced in analyzeUX
        if (typeof uxMetrics.inp === 'number') {
            const inp = uxMetrics.inp;
            if (inp < 200) results.good.push({ message: `INP good (${Math.round(inp)} ms)` });
            else if (inp < 500) results.warnings.push({ message: `INP moderate (${Math.round(inp)} ms)` });
            else results.errors.push({ message: `INP poor (${Math.round(inp)} ms)` });
        } else {
            results.warnings.push({ message: 'INP not measured', tip: 'Requires interaction or lab testing' });
        }
    }

    function analyzeAnalytics(results) {
        const scripts = Array.from(document.scripts);
        const srcs = scripts.map(s => s.src || '').filter(Boolean);
        const hasGA4 = srcs.some(s => s.includes('www.googletagmanager.com/gtag/js'));
        const hasGTM = srcs.some(s => s.includes('www.googletagmanager.com'));
        const hasPlausible = srcs.some(s => s.includes('plausible.io/js'));
        const hasMatomo = srcs.some(s => s.includes('matomo') || s.includes('piwik'));
        const hasClarity = srcs.some(s => s.includes('clarity.ms'));
        const hasAnalyticsJs = srcs.some(s => s.includes('analytics.js'));
        if (hasGA4 || hasGTM || hasPlausible || hasMatomo || hasClarity || hasAnalyticsJs) {
            const tools = [hasGA4 && 'GA4', hasGTM && 'GTM', hasPlausible && 'Plausible', hasMatomo && 'Matomo', hasClarity && 'Clarity', hasAnalyticsJs && 'UA'].filter(Boolean).join(', ');
            results.good.push({ message: `Analytics detected (${tools})` });
        } else {
            results.warnings.push({ message: 'No analytics scripts detected', tip: 'Install GA4, Plausible, or Matomo to track performance' });
        }
    }

    function analyzeAdvanced(results) {
        // Entity & schema coverage
        try {
            const { types } = parseJsonLdTypes();
            if (types.length > 0) {
                results.good.push({ message: `Schema types: ${Array.from(new Set(types)).slice(0,6).join(', ')}` });
            }
            if (types.some(t => /FAQPage/i.test(t))) {
                results.good.push({ message: 'FAQ schema found' });
            }
            if (types.some(t => /HowTo/i.test(t))) {
                results.good.push({ message: 'HowTo schema found' });
            }
            if (types.some(t => /VideoObject/i.test(t))) {
                results.good.push({ message: 'VideoObject schema found' });
            }
            if (!types.length) {
                results.warnings.push({ message: 'No advanced schema types detected', tip: 'Consider adding FAQ, HowTo, or VideoObject where relevant' });
            }
        } catch(_) {}

        // E-A-T signals
        const authorMeta = document.querySelector('meta[name="author"], meta[property="article:author"]');
        const authorByline = document.querySelector('[rel="author"], .author, .byline');
        if (authorMeta || authorByline) {
            results.good.push({ message: 'Author attribution present' });
        } else {
            results.warnings.push({ message: 'No clear author attribution', tip: 'Add author bio and expertise signals (E-E-A-T)' });
        }
    }

    // Helpers
    function parseJsonLdTypes() {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const types = [];
        const meta = { datePublished: null, address: null, telephone: null, aggregateRating: null };
        scripts.forEach(s => {
            try {
                const json = JSON.parse(s.textContent);
                const collect = (obj) => {
                    if (!obj || typeof obj !== 'object') return;
                    const t = obj['@type'];
                    if (t) {
                        if (Array.isArray(t)) t.forEach(x => types.push(String(x)));
                        else types.push(String(t));
                    }
                    if (obj.datePublished && !meta.datePublished) meta.datePublished = obj.datePublished;
                    if (obj.address && !meta.address) meta.address = obj.address;
                    if (obj.telephone && !meta.telephone) meta.telephone = obj.telephone;
                    if (obj.aggregateRating && !meta.aggregateRating) meta.aggregateRating = obj.aggregateRating;
                    Object.values(obj).forEach(collect);
                };
                if (Array.isArray(json)) json.forEach(collect); else collect(json);
            } catch(_) {}
        });
        return { types, meta };
    }

    // Initialize content script
    console.log('SEO Analyzer content script loaded');
})();