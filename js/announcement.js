class AnnouncementManager {
    constructor() {
        this.storageKey = 'namemc_extras_dismissed_announcements';
        this.announcementContainer = null;
        this.currentAnnouncement = null;
        console.debug('[Announcements] Manager initialized');
    }

    initialize() {
        try {
            const supabaseData = JSON.parse(localStorage.getItem('supabase_data') || '{}');
            const announcements = supabaseData.announcements || [];
            console.debug('[Announcements] Loaded announcements:', announcements);
            
            // Only consider the first announcement
            const latestAnnouncement = announcements[0];
            console.debug('[Announcements] Latest announcement:', latestAnnouncement);
            
            if (latestAnnouncement && !this.isDismissed(latestAnnouncement.id)) {
                console.debug('[Announcements] Showing announcement:', latestAnnouncement.id);
                this.currentAnnouncement = latestAnnouncement;
                this.createAnnouncementBanner();
            } else {
                console.debug('[Announcements] No announcement to show.',
                    latestAnnouncement ? 'Latest announcement was dismissed.' : 'No announcements available.');
            }
        } catch (error) {
            console.error('[Announcements] Failed to load announcements:', error);
        }
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
        var hasMdLink = /^(?=.*\[)(?=.*\])(?=.*\()(?=.*\)).*$/.test(text);
        
        if (!hasMdLink) {
            return text;
        }

        var textAreaTag = document.createElement("textarea");
        textAreaTag.textContent = text;
        text = textAreaTag.innerHTML.replace(/(?:\r\n|\r|\n)/g, '<br>');

        var elements = text.match(/\[.*?\)/g);
        if (elements && elements.length > 0) {
            for (let el of elements) {
                let text = el.match(/\[(.*?)\]/)[1];
                let url = el.match(/\((.*?)\)/)[1];
                let aTag = document.createElement("a");
                let urlHref = new URL(url);
                urlHref.protocol = "https:";
                aTag.href = urlHref;
                aTag.textContent = text;
                aTag.target = '_blank';
                text = text.replace(el, aTag.outerHTML);
            }
        }
        return text;
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

        // Insert as the first element in the body, with a delay to allow the page to load
        setTimeout(() => {
            document.body.insertBefore(banner, document.body.firstChild);
            // Add delay before showing the banner
            setTimeout(() => {
                banner.classList.add('visible');
                this.saveDismissedAnnouncement(this.currentAnnouncement.id);
                document.body.classList.add('has-announcement');
            }, 100);
        }, 200);
        

        this.announcementContainer = banner;
    }
}

// Initialize the announcement system
document.addEventListener('DOMContentLoaded', () => {
    const announcementManager = new AnnouncementManager();
    announcementManager.initialize();
}); 