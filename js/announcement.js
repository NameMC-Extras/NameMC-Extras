class AnnouncementManager {
    constructor() {
        this.storageKey = 'namemc_extras_dismissed_announcements';
        this.announcementContainer = null;
        this.currentAnnouncement = null;
    }

    initialize() {
        // Skip announcements only on store subdomain
        if (window.location.hostname === 'store.namemc.com') {
            return;
        }

        const waitForSupabase = (callback) => {
            const supabaseData = localStorage.getItem('supabase_data');
            if (supabaseData && supabaseData.length > 0) {
                setTimeout(() => {
                    callback(JSON.parse(supabaseData));
                });
            } else {
                setTimeout(() => {
                    waitForSupabase(callback);
                });
            }
        };

        waitForSupabase((supabaseData) => {
            try {
                const announcements = supabaseData.announcements || [];
                
                // Only consider the first announcement
                const latestAnnouncement = announcements[0];
                
                if (latestAnnouncement && !this.isDismissed(latestAnnouncement.id)) {
                    this.currentAnnouncement = latestAnnouncement;
                    this.createAnnouncementBanner();
                }
            } catch (error) {
                console.error('[Announcements] Failed to load announcements:', error);
            }
        });
    }

    isDismissed(id) {
        const dismissed = localStorage.getItem(this.storageKey);
        const isDismissed = dismissed ? JSON.parse(dismissed).includes(id) : false;
        return isDismissed;
    }

    saveDismissedAnnouncement(id) {
        const dismissed = this.getDismissedAnnouncements();
        dismissed.push(id);
        localStorage.setItem(this.storageKey, JSON.stringify(dismissed));
    }


    dismissAnnouncement(id) {
        if (this.announcementContainer) {
            this.announcementContainer.classList.add('hidden');
            document.body.classList.remove('has-announcement');
            setTimeout(() => {
                this.announcementContainer.remove();
                this.announcementContainer = null;
            }, 300);
        }
    }

    getDismissedAnnouncements() {
        const dismissed = localStorage.getItem(this.storageKey);
        const dismissedList = dismissed ? JSON.parse(dismissed) : [];
        return dismissedList;
    }

    parseMarkdownLinks(text) {
        // Check if text contains markdown-style links
        const regex = /\[(.*?)\]\((.*?)\)/g;
        let result = text;
        
        // Replace each markdown link with an HTML link
        let match;
        while ((match = regex.exec(text)) !== null) {
            const [fullMatch, linkText, url] = match;
            const aTag = document.createElement("a");
            aTag.href = url.startsWith('http') ? url : `https://${url}`;
            aTag.textContent = linkText;
            aTag.target = '_blank';
            aTag.className = 'announcement-link';
            result = result.replace(fullMatch, aTag.outerHTML);
        }
        
        return result;
    }

    createAnnouncementBanner() {
        if (!this.currentAnnouncement) {
            return;
        }
        const banner = document.createElement('div');
        banner.className = 'announcement-banner';
        
        const message = this.parseMarkdownLinks(this.currentAnnouncement.message);
        banner.innerHTML = `
            <div class="message">${message}</div>
            <button class="close-button" aria-label="Dismiss announcement">×</button>
        `;

        banner.querySelector('.close-button').addEventListener('click', () => {
            this.dismissAnnouncement(this.currentAnnouncement.id);
        });
        document.body.insertBefore(banner, document.body.firstChild);
        // Add delay before showing the banner
        setTimeout(() => {
            banner.classList.add('visible');
            this.saveDismissedAnnouncement(this.currentAnnouncement.id);
            document.body.classList.add('has-announcement');
        }, 100);
        this.announcementContainer = banner;
    }
}

// Initialize the announcement system
document.addEventListener('DOMContentLoaded', () => {
    const announcementManager = new AnnouncementManager();
    announcementManager.initialize();
}); 