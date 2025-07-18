// Tracking navigation clicks
function trackNavigation(linkName) {
    gtag('event', 'navigation_click', {
        'event_category': 'navigation',
        'event_label': linkName,
        'value': 1
    });
}

// Tracking post interactions
function trackPostInteraction(postTitle, action) {
    gtag('event', 'post_interaction', {
        'event_category': 'content',
        'event_label': postTitle,
        'custom_parameter': action
    });
}

// Tracking document downloads
function trackDocumentDownload(documentName) {
    gtag('event', 'file_download', {
        'event_category': 'downloads',
        'event_label': documentName,
        'value': 1
    });
}

// Tracking external link clicks
function trackExternalLink(url, linkText) {
    gtag('event', 'external_link_click', {
        'event_category': 'external_links',
        'event_label': linkText,
        'custom_parameter': url
    });
}

// Tracking scroll depth
function trackScrollDepth() {
    let maxScroll = 0;
    const scrollThresholds = [25, 50, 75, 90];
    
    window.addEventListener('scroll', () => {
        const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
        
        scrollThresholds.forEach(threshold => {
            if (scrollPercent >= threshold && maxScroll < threshold) {
                gtag('event', 'scroll_depth', {
                    'event_category': 'engagement',
                    'event_label': `${threshold}%`,
                    'value': threshold
                });
                maxScroll = threshold;
            }
        });
    });
}

// Tracking time on page
function trackTimeOnPage() {
    let startTime = Date.now();
    
    window.addEventListener('beforeunload', () => {
        const timeSpent = Math.round((Date.now() - startTime) / 1000);
        gtag('event', 'time_on_page', {
            'event_category': 'engagement',
            'event_label': window.location.pathname,
            'value': timeSpent
        });
    });
}

// Tracking form interactions for future use
function trackFormInteraction(formName, action) {
    gtag('event', 'form_interaction', {
        'event_category': 'forms',
        'event_label': formName,
        'custom_parameter': action
    });
}

// Initialising enhanced tracking
document.addEventListener('DOMContentLoaded', function() {
    // Track scroll depth
    trackScrollDepth();
    
    // Track time on page
    trackTimeOnPage();
    
    // Track navigation clicks
    const navLinks = document.querySelectorAll('#desktopnav a, #mobilenav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            const linkText = this.textContent.trim();
            trackNavigation(linkText);
        });
    });
    
    // Track external links
    const externalLinks = document.querySelectorAll('a[target="_blank"]');
    externalLinks.forEach(link => {
        link.addEventListener('click', function() {
            trackExternalLink(this.href, this.textContent.trim());
        });
    });
    
    // Track document downloads (for PDFs)
    const documentLinks = document.querySelectorAll('a[href*=".pdf"]');
    documentLinks.forEach(link => {
        link.addEventListener('click', function() {
            const fileName = this.href.split('/').pop();
            trackDocumentDownload(fileName);
        });
    });
    
    // Track post interactions (for expandable posts)
    const postTitles = document.querySelectorAll('.post-title');
    postTitles.forEach(title => {
        title.addEventListener('click', function() {
            const postName = this.textContent.trim();
            const isExpanded = this.classList.contains('collapsed') ? 'expanded' : 'collapsed';
            trackPostInteraction(postName, isExpanded);
        });
    });
});

// Tracking page views with custom dimensions
function trackPageView(pageTitle, pageCategory) {
    gtag('config', 'G-XGRVMPLY74', {
        'page_title': pageTitle,
        'page_category': pageCategory,
        'custom_map': {
            'custom_parameter_1': 'page_category'
        }
    });
}

// Track user engagement score
function trackEngagementScore() {
    let engagementScore = 0;
    let events = 0;
    
    // Increment score for various interactions
    const incrementScore = (points) => {
        engagementScore += points;
        events++;
        
        // Send engagement score every 5 events
        if (events % 5 === 0) {
            gtag('event', 'engagement_score', {
                'event_category': 'engagement',
                'event_label': 'user_engagement',
                'value': engagementScore
            });
        }
    };
    
    // Track clicks (1 point each)
    document.addEventListener('click', () => incrementScore(1));
    
    // Track scroll (2 points for deep scroll)
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
        const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
        if (scrollPercent > maxScroll && scrollPercent > 50) {
            incrementScore(2);
            maxScroll = scrollPercent;
        }
    });
    
    // Track time spent (1 point per 30 seconds)
    let timeSpent = 0;
    setInterval(() => {
        timeSpent += 30;
        if (timeSpent % 30 === 0) {
            incrementScore(1);
        }
    }, 30000);
}

// Track device and browser information
function trackUserAgent() {
    const userAgent = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const browser = getBrowserInfo(userAgent);
    
    gtag('event', 'user_agent_info', {
        'event_category': 'technical',
        'event_label': browser,
        'custom_parameter': isMobile ? 'mobile' : 'desktop'
    });
}

function getBrowserInfo(userAgent) {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
}

// Track page load performance
function trackPagePerformance() {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            gtag('event', 'page_load_time', {
                'event_category': 'performance',
                'event_label': window.location.pathname,
                'value': loadTime
            });
        }, 0);
    });
}

// Track search engine referrals
function trackSearchReferrals() {
    const referrer = document.referrer;
    if (referrer.includes('google.com') || referrer.includes('bing.com') || referrer.includes('duckduckgo.com')) {
        gtag('event', 'search_referral', {
            'event_category': 'acquisition',
            'event_label': new URL(referrer).hostname,
            'custom_parameter': referrer
        });
    }
}

// Enhanced initialization
document.addEventListener('DOMContentLoaded', function() {
    // Existing tracking
    trackScrollDepth();
    trackTimeOnPage();
    trackEngagementScore();
    trackUserAgent();
    trackPagePerformance();
    trackSearchReferrals();
    
    // Track navigation clicks
    const navLinks = document.querySelectorAll('#desktopnav a, #mobilenav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            const linkText = this.textContent.trim();
            trackNavigation(linkText);
        });
    });
    
    // Track external links
    const externalLinks = document.querySelectorAll('a[target="_blank"]');
    externalLinks.forEach(link => {
        link.addEventListener('click', function() {
            trackExternalLink(this.href, this.textContent.trim());
        });
    });
    
    // Track document downloads (for PDFs)
    const documentLinks = document.querySelectorAll('a[href*=".pdf"]');
    documentLinks.forEach(link => {
        link.addEventListener('click', function() {
            const fileName = this.href.split('/').pop();
            trackDocumentDownload(fileName);
        });
    });
    
    // Track post interactions (for expandable posts)
    const postTitles = document.querySelectorAll('.post-title');
    postTitles.forEach(title => {
        title.addEventListener('click', function() {
            const postName = this.textContent.trim();
            const isExpanded = this.classList.contains('collapsed') ? 'expanded' : 'collapsed';
            trackPostInteraction(postName, isExpanded);
        });
    });
    
    // Track section interactions (for expandable sections)
    const sectionTitles = document.querySelectorAll('.section-title');
    sectionTitles.forEach(title => {
        title.addEventListener('click', function() {
            const sectionName = this.textContent.trim();
            trackPostInteraction(sectionName, 'section_toggle');
        });
    });
}); 