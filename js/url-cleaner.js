(function() {
    if (!document.contentType.startsWith('text/html')) return;
    if (window.location.hostname === 'store.namemc.com') return;

    // Function to clean URL by removing #google_vignette fragment
    const cleanGoogleVignette = () => {
        if (location.hash === '#google_vignette') {
            history.replaceState(null, '', location.href.replace('#google_vignette', ''));
        }
    };

    // Clean URL on initial load
    cleanGoogleVignette();

    // Listen for hash changes or navigation (back/forward)
    window.addEventListener('hashchange', cleanGoogleVignette);
    window.addEventListener('popstate', cleanGoogleVignette);

    // hashchange covers fragment updates and popstate covers history traversal.
})();
