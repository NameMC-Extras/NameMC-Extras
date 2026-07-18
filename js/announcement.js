class AnnouncementManager {
    constructor() {
        this.storageKey = 'namemc_extras_dismissed_announcements';
        this.announcementContainer = null;
        this.currentAnnouncement = null;
        this.dismissedCache = null; // cache dismissed IDs
    }

    initialize() {
        if (!document.contentType.startsWith('text/html')) return;
        if (window.location.hostname === 'store.namemc.com') return;

        const load = (raw) => {
            if (!raw) return false;
            try {
                const latestAnnouncement = JSON.parse(raw).announcements?.[0];
                if (latestAnnouncement && !this.isDismissed(latestAnnouncement.id)) {
                    this.currentAnnouncement = latestAnnouncement;
                    this.createAnnouncementBanner();
                }
            } catch (error) {
                console.error('[Announcements] Failed to load announcements:', error);
            }
            return true;
        };

        if (load(superStorage.getItem('supabase_data'))) return;
        const onStorageSync = (event) => {
            if (event.detail?.key !== 'supabase_data') return;
            if (load(event.detail.value)) window.removeEventListener('superstorage-sync', onStorageSync);
        };
        window.addEventListener('superstorage-sync', onStorageSync);
    }

    isDismissed(id) {
        if (!this.dismissedCache) {
            const dismissed = superStorage.getItem(this.storageKey);
            this.dismissedCache = dismissed ? JSON.parse(dismissed) : [];
        }
        return this.dismissedCache.includes(id);
    }

    saveDismissedAnnouncement(id) {
        if (!this.dismissedCache) this.dismissedCache = this.getDismissedAnnouncements();
        this.dismissedCache.push(id);
        superStorage.setItem(this.storageKey, JSON.stringify(this.dismissedCache));
    }

    dismissAnnouncement() {
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
        if (!this.dismissedCache) {
            const dismissed = superStorage.getItem(this.storageKey);
            this.dismissedCache = dismissed ? JSON.parse(dismissed) : [];
        }
        return this.dismissedCache;
    }

    parseMarkdownLinks(text) {
        return text.replace(/\[(.*?)\]\((.*?)\)/g, (_, linkText, url) => {
            const aTag = document.createElement("a");
            aTag.href = url.startsWith('http') ? url : `https://${url}`;
            aTag.textContent = linkText;
            aTag.target = '_blank';
            aTag.className = 'announcement-link';
            return aTag.outerHTML;
        });
    }

    createAnnouncementBanner() {
        if (!this.currentAnnouncement) return;

        const banner = document.createElement('div');
        banner.className = 'announcement-banner';

        banner.innerHTML = `
            <div class="message">${this.parseMarkdownLinks(this.currentAnnouncement.message)}</div>
            <button class="close-button" aria-label="Dismiss announcement">×</button>
        `;

        banner.querySelector('.close-button').addEventListener('click', () => {
            this.dismissAnnouncement(this.currentAnnouncement.id);
        });

        document.body.insertBefore(banner, document.body.firstChild);

        setTimeout(() => {
            banner.classList.add('visible');
            this.saveDismissedAnnouncement(this.currentAnnouncement.id);
            document.body.classList.add('has-announcement');
        }, 100);

        this.announcementContainer = banner;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await superStorage._ready;
    new AnnouncementManager().initialize();
});
