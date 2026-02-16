(async () => {
    if (!document.contentType.startsWith('text/html')) return;
    if (window.location.hostname === 'store.namemc.com') return;

    class UserEntity {
        constructor(data = {}) {
            this.username = data.username || null;
            this.uuid = data.uuid || null;
            this.views = data.views || null;
            this.bio = data.bio || null;
            this.rank = data.rank || null;
            this.information = data.information || {};
            this.followingCount = data.followingCount || 0;
            this.followersCount = data.followersCount || 0;
            this.skins = data.skins || [];
            this.capes = data.capes || [];
            this.currentSkin = data.currentSkin || null;
            this.currentCape = data.currentCape || null;
            this.badges = data.badges || [];
        }
    }

    class UserDataUtils {
        constructor() {
            this.domain = window.location.origin;
            this.cache = new Map();
        }

        getSupabaseData() {
            try {
                const supabaseData = localStorage.getItem('supabase_data');
                return supabaseData ? JSON.parse(supabaseData) : {};
            } catch (error) {
                console.error('Error retrieving Supabase data:', error);
                return {};
            }
        }

        getUserCustomBadges(userUuid) {
            if (!userUuid) return [];
            const { badges: allBadges = [], user_badges: userBadges = [] } = this.getSupabaseData();
            const userBadgeIds = new Set(userBadges.filter(ub => ub.user === userUuid).map(ub => ub.badge));
            return allBadges.filter(badge => userBadgeIds.has(badge.id));
        }

        getUserCustomCapes(userUuid) {
            if (!userUuid) return { capes: [], equippedCape: null };
            const { capes: allCapes = [], user_capes: userCapes = [] } = this.getSupabaseData();

            const userCapeAssignments = userCapes.filter(uc => uc.user === userUuid);
            const userCapeIds = new Set(userCapeAssignments.map(uc => uc.cape));

            const assignmentMap = new Map(userCapeAssignments.map(uc => [uc.cape, uc]));
            const userCustomCapes = [];

            for (const cape of allCapes) {
                if (!userCapeIds.has(cape.id)) continue;
                const assignment = assignmentMap.get(cape.id);
                userCustomCapes.push({
                    id: cape.id,
                    name: cape.name,
                    description: cape.description,
                    imageUrl: cape.image_src,
                    renderUrl: cape.image_render,
                    category: cape.category,
                    isCustom: true,
                    equipped: assignment?.equipped || false,
                    note: assignment?.note || null
                });
            }

            const equippedCape = userCustomCapes.find(c => c.equipped) || null;
            return { capes: userCustomCapes, equippedCape };
        }

        async fetchUUID() {
            return await waitForProfileSelector('[value=standard]', uuid => uuid.value.trim());
        }

        parseUserProfile(html, uuid) {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const username = doc.querySelector('h1')?.innerText || '';

            const rows = doc.querySelectorAll('.card-body .row');
            let views = null, bio = null, rank = null;
            for (const row of rows) {
                const strongText = row.querySelector('strong')?.textContent.trim();
                if (!strongText) continue;

                if (strongText === 'Views') {
                    const el = row.querySelector('.col-auto');
                    if (el && el.textContent.includes('/ month')) {
                        const numbers = el.textContent.replace(/[^\d]/g, '');
                        views = numbers ? parseInt(numbers, 10) : null;
                    }
                } else if (strongText === 'Bio') {
                    bio = row.querySelector('.col-12.order-lg-2.col-lg')?.textContent.trim() || null;
                } else if (strongText === 'Rank') {
                    rank = row.querySelector('.namemc-rank')?.textContent.trim() || null;
                }
            }

            const information = {};
            for (const link of doc.querySelectorAll('.card-body .row .col .d-inline-block')) {
                const popover = link.getAttribute('data-bs-content');
                const href = link.getAttribute('href');
                const imgSrc = link.querySelector('img')?.getAttribute('src');
                if (!imgSrc) continue;

                if (imgSrc.includes('/emoji/twitter/') && popover?.match(/^[A-Za-z\s]+$/) && (!href || href === 'javascript:void(0)')) {
                    information.country = popover.trim();
                    continue;
                }

                if (imgSrc.includes('/service/')) {
                    const match = imgSrc.match(/\/service\/([^\.]+)\.svg/);
                    if (match) {
                        const serviceName = match[1];
                        information[serviceName] = (href && href !== 'javascript:void(0)') ? href : (popover?.trim() || true);
                    }
                }
            }

            const parseCount = el => parseInt((el?.textContent.match(/\(([0-9,]+)\)/)?.[1] || '0').replace(/,/g, ''), 10);
            const followingCount = parseCount(doc.querySelector('#following-tab'));
            const followersCount = parseCount(doc.querySelector('#followers-tab'));

            const skins = [];
            let currentSkin = null;
            for (const canvas of doc.querySelectorAll('a[href*="/skin/"] canvas.skin-2d')) {
                const link = canvas.closest('a');
                const skinId = canvas.getAttribute('data-id');
                const skinData = {
                    id: skinId,
                    url: link?.getAttribute('href') || null,
                    imageUrl: skinId ? `https://s.namemc.com/i/${skinId}.png` : null,
                    faceUrl: skinId ? `https://s.namemc.com/2d/skin/face.png?id=${skinId}&scale=8` : null
                };
                skins.push(skinData);
                if (canvas.classList.contains('skin-button-selected')) currentSkin = skinData;
            }

            const capes = [];
            let currentCape = null;
            for (const el of doc.querySelectorAll('a[href*="/cape/"] canvas, a[href*="/cape/"] img')) {
                const link = el.closest('a');
                const capeUrl = link?.getAttribute('href') || null;
                const capeId = capeUrl?.match(/\/cape\/([^\/]+)/)?.[1] || null;
                const isSelected = [...el.classList].some(c => c.includes('-selected'));

                const capeData = { id: capeId, url: capeUrl, imageUrl: capeId ? `https://s.namemc.com/i/${capeId}.png` : null, isCustom: false };
                capes.push(capeData);
                if (isSelected) currentCape = capeData;
            }

            const customCapes = this.getUserCustomCapes(uuid);
            capes.push(...customCapes.capes);
            if (!currentCape && customCapes.equippedCape) currentCape = customCapes.equippedCape;

            return new UserEntity({
                username, uuid, views, bio, rank, information, followingCount, followersCount,
                skins, capes, currentSkin, currentCape, badges: this.getUserCustomBadges(uuid)
            });
        }

        async fetchUserProfile(uuid) {
            if (this.cache.has(uuid)) return this.cache.get(uuid);
            try {
                const response = await fetch(`/profile/${uuid}`);
                if (!document.querySelector('#captchaIf2')) {
                    document.documentElement.insertAdjacentHTML('beforeend', `<iframe src="/profile/${uuid}" id="captchaIf2" style="display:none"></iframe>`);
                }

                if (response.status === 403) {
                    const iframe = document.querySelector('#captchaIf2');
                    iframe.style.display = 'block';
                    setTimeout(() => iframe.contentWindow.addEventListener('visibilitychange', () => location.reload()), 1000);
                    return;
                }
                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

                const html = await response.text();
                const userEntity = this.parseUserProfile(html, uuid);
                this.cache.set(uuid, userEntity);
                return userEntity;
            } catch (error) {
                console.error(`Error fetching profile for ${uuid}:`, error);
                throw error;
            }
        }

        getPinnedUsers() {
            try {
                const pinnedData = localStorage.getItem('namemc_pinned_users');
                return pinnedData ? JSON.parse(pinnedData) : [];
            } catch (error) {
                console.error('Error retrieving pinned users:', error);
                return [];
            }
        }

        isPinned(uuid) {
            const pinned = this.getPinnedUsers();
            return pinned.some(u => u.uuid === uuid);
        }

        async pinUser(uuid) {
            try {
                const userProfile = await this.fetchUserProfile(uuid);
                const pinned = this.getPinnedUsers();
                if (!this.isPinned(uuid)) {
                    pinned.push({ uuid: userProfile.uuid, pinnedAt: Date.now() });
                    localStorage.setItem('namemc_pinned_users', JSON.stringify(pinned));
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Error pinning user:', error);
                return false;
            }
        }

        unpinUser(uuid) {
            try {
                const filtered = this.getPinnedUsers().filter(u => u.uuid !== uuid);
                localStorage.setItem('namemc_pinned_users', JSON.stringify(filtered));
                return true;
            } catch (error) {
                console.error('Error unpinning user:', error);
                return false;
            }
        }

        async getPinnedUserProfiles() {
            const profiles = [];
            for (const u of this.getPinnedUsers()) {
                try {
                    profiles.push(await this.fetchUserProfile(u.uuid));
                } catch (e) {
                    console.error(`Error fetching profile for ${u.uuid}:`, e);
                }
            }
            return profiles;
        }
    }

    const waitForProfileSelector = (selector, callback) => new Promise(resolve => {
        const check = () => {
            const el = document.querySelector(selector);
            el ? resolve(callback(el)) : setTimeout(check, 100);
        };
        check();
    });

    window.UserDataUtils = UserDataUtils;
})();