/**
 * To fix the #google_vignette issue
 */

(function() {
    'use strict';
    
    // Function to clean URL by removing #google_vignette fragment
    const cleanGoogleVignette = () => {
        if (window.location.hash === '#google_vignette') {
            // Remove the #google_vignette fragment from URL
            const cleanUrl = window.location.href.replace('#google_vignette', '');
            window.history.replaceState(null, null, cleanUrl);
        }
    };

    // Clean URL on initial load
    cleanGoogleVignette();

    // Set up URL monitoring for changes that might add the fragment later
    let lastUrl = window.location.href;
    
    // Use MutationObserver to detect DOM changes that might indicate URL changes
    const urlObserver = new MutationObserver(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            cleanGoogleVignette();
        }
    });

    // Start observing DOM changes
    if (document.body) {
        urlObserver.observe(document.body, { subtree: true, childList: true });
    } else {
        // If body is not ready, wait for it
        document.addEventListener('DOMContentLoaded', () => {
            urlObserver.observe(document.body, { subtree: true, childList: true });
        });
    }

    // Listen for hash changes to catch #google_vignette when it appears
    window.addEventListener('hashchange', cleanGoogleVignette);

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', cleanGoogleVignette);

    // Additional check using setInterval as a fallback
    const intervalCheck = setInterval(() => {
        cleanGoogleVignette();
    }, 500); // Check every 500ms

    // Clean up interval after 5 seconds to avoid unnecessary checks
    setTimeout(() => {
        clearInterval(intervalCheck);
    }, 5000);

})(); 
