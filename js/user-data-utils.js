(async () => {
    if (!document.contentType.startsWith('text/html')) return;

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
            this.cache = new Map(); // Cache for profiles
        }

        /**
         * Retrieves Supabase data from localStorage
         * @returns {Object} The Supabase data
         */
        getSupabaseData() {
            try {
                const supabaseData = localStorage.getItem('supabase_data');
                return supabaseData ? JSON.parse(supabaseData) : {};
            } catch (error) {
                console.error('Error retrieving Supabase data:', error);
                return {};
            }
        }

        /**
         * Retrieves custom badges for a user
         * @param {string} userUuid - The user's UUID
         * @returns {Array} The user's badges
         */
        getUserCustomBadges(userUuid) {
            if (!userUuid) return [];

            const supabaseData = this.getSupabaseData();
            const allBadges = supabaseData.badges || [];
            const userBadges = supabaseData.user_badges || [];

            // Filter badges for this user
            const userBadgeIds = userBadges
                .filter(ub => ub.user === userUuid)
                .map(ub => ub.badge);

            // Return complete badge data
            return allBadges.filter(badge => userBadgeIds.includes(badge.id));
        }

        /**
         * Retrieves custom capes for a user
         * @param {string} userUuid - The user's UUID
         * @returns {Object} The user's capes {capes: Array, equippedCape: Object|null}
         */
        getUserCustomCapes(userUuid) {
            if (!userUuid) return { capes: [], equippedCape: null };

            const supabaseData = this.getSupabaseData();
            const allCapes = supabaseData.capes || [];
            const userCapes = supabaseData.user_capes || [];

            // Filter capes for this user
            const userCapeAssignments = userCapes.filter(uc => uc.user === userUuid);
            const userCapeIds = userCapeAssignments.map(uc => uc.cape);

            // Retrieve complete cape data
            const userCustomCapes = allCapes
                .filter(cape => userCapeIds.includes(cape.id))
                .map(cape => {
                    const assignment = userCapeAssignments.find(uc => uc.cape === cape.id);
                    return {
                        id: cape.id,
                        name: cape.name,
                        description: cape.description,
                        imageUrl: cape.image_src,
                        renderUrl: cape.image_render,
                        category: cape.category,
                        isCustom: true, // Mark as custom cape
                        equipped: assignment ? assignment.equipped : false,
                        note: assignment ? assignment.note : null
                    };
                });

            // Find the equipped cape
            const equippedCape = userCustomCapes.find(cape => cape.equipped) || null;

            return { capes: userCustomCapes, equippedCape };
        }

        async fetchUUID() {
            return await waitForProfileSelector('[value=standard]', (uuid) => {
                return uuid.value.trim();
            });
        }

        /**
         * Parse the HTML of a profile and return a UserEntity object
         * @param {string} html - The profile HTML
         * @param {string} uuid - The uuid
         * @returns {UserEntity} The parsed profile data
         */
        parseUserProfile(html, uuid) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // UUID
            const username = doc.querySelector('h1').innerText;

            // Views
            let views = null;
            const rows = doc.querySelectorAll('.card-body .row');
            for (const row of rows) {
                const strongElement = row.querySelector('strong');
                if (strongElement && strongElement.textContent.trim() === 'Views') {
                    const viewsElement = row.querySelector('.col-auto');
                    if (viewsElement && viewsElement.textContent.includes('/ month')) {
                        // Extract all numbers from the string and convert to integer
                        const numbersOnly = viewsElement.textContent.replace(/[^\d]/g, '');
                        views = numbersOnly ? parseInt(numbersOnly, 10) : null;
                        break;
                    }
                }
            }

            // Bio
            let bio = null;
            for (const row of rows) {
                const strongElement = row.querySelector('strong');
                if (strongElement && strongElement.textContent.trim() === 'Bio') {
                    const bioElement = row.querySelector('.col-12.order-lg-2.col-lg');
                    if (bioElement) {
                        bio = bioElement.textContent.trim();
                        break;
                    }
                }
            }

            // Rank
            let rank = null;
            for (const row of rows) {
                const strongElement = row.querySelector('strong');
                if (strongElement && strongElement.textContent.trim() === 'Rank') {
                    const rankElement = row.querySelector('.namemc-rank');
                    if (rankElement) {
                        rank = rankElement.textContent.trim();
                        break;
                    }
                }
            }

            // Information (social networks, country, etc.)
            const information = {};
            const infoLinks = doc.querySelectorAll('.card-body .row .col .d-inline-block');

            infoLinks.forEach(link => {
                const popoverContent = link.getAttribute('data-bs-content');
                const href = link.getAttribute('href');
                const imgSrc = link.querySelector('img')?.getAttribute('src');

                if (!imgSrc) return;

                // Country detection via emoji
                if (imgSrc.includes('/emoji/twitter/') && popoverContent && popoverContent.match(/^[A-Za-z\s]+$/) && (!href || href === 'javascript:void(0)')) {
                    information.country = popoverContent.trim();
                    return;
                }

                // Automatic service detection via image URL
                if (imgSrc.includes('/service/')) {
                    // Extract service name from image URL
                    const serviceMatch = imgSrc.match(/\/service\/([^\.]+)\.svg/);
                    if (serviceMatch) {
                        const serviceName = serviceMatch[1];

                        // If there's a valid href link, use it
                        if (href && href !== 'javascript:void(0)') {
                            information[serviceName] = href;
                        }
                        // Otherwise, use popover content if available
                        else if (popoverContent && popoverContent.trim()) {
                            information[serviceName] = popoverContent.trim();
                        }
                        // Otherwise, just indicate the service is present
                        else {
                            information[serviceName] = true;
                        }
                    }
                }
            });

            // Following/followers counts from tabs
            const followingTabButton = doc.querySelector('#following-tab');
            const followersTabButton = doc.querySelector('#followers-tab');

            const followingCount = followingTabButton ?
                parseInt((followingTabButton.textContent.match(/\(([0-9,]+)\)/)?.[1] || '0').replace(/,/g, '')) : 0;
            const followersCount = followersTabButton ?
                parseInt((followersTabButton.textContent.match(/\(([0-9,]+)\)/)?.[1] || '0').replace(/,/g, '')) : 0;



            // Collect skins data
            const skins = [];
            let currentSkin = null;
            const skinElements = doc.querySelectorAll('a[href*="/skin/"] canvas.skin-2d');
            skinElements.forEach(skinCanvas => {
                const link = skinCanvas.closest('a');
                const skinId = skinCanvas.getAttribute('data-id');
                const skinUrl = link ? link.getAttribute('href') : null;
                const isSelected = skinCanvas.classList.contains('skin-button-selected');

                const skinData = {
                    id: skinId,
                    url: skinUrl,
                    imageUrl: skinId ? `https://s.namemc.com/i/${skinId}.png` : null,
                    faceUrl: skinId ? `https://s.namemc.com/2d/skin/face.png?id=${skinId}&scale=8` : null
                };

                skins.push(skinData);
                if (isSelected) {
                    currentSkin = skinData;
                }
            });

            // Collect capes data (normal)
            const capes = [];
            let currentCape = null;
            const capeElements = doc.querySelectorAll('a[href*="/cape/"] canvas, a[href*="/cape/"] img');
            capeElements.forEach(capeElement => {
                const link = capeElement.closest('a');
                const capeUrl = link ? link.getAttribute('href') : null;
                const isSelected = capeElement.classList.toString().includes('-selected');

                // Extract cape ID from URL
                let capeId = null;
                if (capeUrl) {
                    const capeIdMatch = capeUrl.match(/\/cape\/([^\/]+)/);
                    capeId = capeIdMatch ? capeIdMatch[1] : null;
                }

                const capeData = {
                    id: capeId,
                    url: capeUrl,
                    imageUrl: capeId ? `https://s.namemc.com/i/${capeId}.png` : null,
                    isCustom: false // Mark as normal cape
                };
                capes.push(capeData);
                if (isSelected) {
                    currentCape = capeData;
                }
            });

            // Retrieve and add custom capes
            const customCapesData = this.getUserCustomCapes(uuid);
            capes.push(...customCapesData.capes);

            // If no normal cape is equipped, check custom capes
            if (!currentCape && customCapesData.equippedCape) {
                currentCape = customCapesData.equippedCape;
            }

            return new UserEntity({
                username,
                uuid,
                views,
                bio,
                rank,
                information,
                followingCount,
                followersCount,
                skins,
                capes,
                currentSkin,
                currentCape,
                badges: this.getUserCustomBadges(uuid)
            });
        }

        /**
         * Fetch user profile page and return a parsed UserEntity object
         * @param {string} uuid - The uuid
         * @returns {Promise<UserEntity>} The parsed profile data
         */
        async fetchUserProfile(uuid) {
            // Check cache first
            if (this.cache.has(uuid)) {
                console.log(`Profile for ${uuid} found in cache`);
                return this.cache.get(uuid);
            }

            try {
                const response = await fetch(`/profile/${uuid}/followers?sort=date:desc`);

                if (!window.top.document.querySelector('#captchaIf2')) {
                    const iframeHTML = `<iframe src="/profile/${uuid}" id="captchaIf2" style="display:none"></iframe>`;

                    window.top.document.documentElement.insertAdjacentHTML('beforeend', iframeHTML);
                }

                if (response.status === 403) {
                    window.top.document.querySelector('#captchaIf2').style.display = 'block';
                    window.top.postMessage('reload');
                    return;
                } else if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const html = await response.text();
                const userEntity = this.parseUserProfile(html, uuid);

                // Cache the result
                this.cache.set(uuid, userEntity);
                console.log(`Profile for ${uuid} cached`);

                return userEntity;
            } catch (error) {
                console.error(`Error fetching profile for ${uuid}:`, error);
                throw error;
            }
        }

        async launch() {
            const uuid = await userDataUtils.fetchUUID();
            const userProfile = await userDataUtils.fetchUserProfile(uuid);
            console.log('User profile:', userProfile);
        }

        // Pinning system methods
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
            const pinnedUsers = this.getPinnedUsers();
            return pinnedUsers.some(user => user.uuid === uuid);
        }

        async pinUser(uuid) {
            try {
                const userProfile = await this.fetchUserProfile(uuid);
                const pinnedUsers = this.getPinnedUsers();

                if (!this.isPinned(uuid)) {
                    pinnedUsers.push({
                        username: userProfile.username,
                        uuid: userProfile.uuid,
                        pinnedAt: Date.now()
                    });
                    localStorage.setItem('namemc_pinned_users', JSON.stringify(pinnedUsers));
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
                const pinnedUsers = this.getPinnedUsers();
                const filteredUsers = pinnedUsers.filter(user => user.uuid !== uuid);
                localStorage.setItem('namemc_pinned_users', JSON.stringify(filteredUsers));
                return true;
            } catch (error) {
                console.error('Error unpinning user:', error);
                return false;
            }
        }

        async getPinnedUserProfiles() {
            const pinnedUsers = this.getPinnedUsers();
            const profiles = [];

            for (const pinnedUser of pinnedUsers) {
                try {
                    const profile = await this.fetchUserProfile(pinnedUser.uuid);
                    profiles.push(profile);
                } catch (error) {
                    console.error(`Error fetching profile for ${pinnedUser.uuid}:`, error);
                }
            }

            return profiles;
        }

    }

    const waitForProfileSelector = function (selector, callback) {
        return new Promise((resolve, reject) => {
            const checkElement = () => {
                let query = document.querySelector(selector);
                if (query) {
                    resolve(callback(query));
                } else {
                    setTimeout(checkElement, 100);
                }
            };
            checkElement();
        });
    };

    // Export class globally
    window.UserDataUtils = UserDataUtils;

    // Create global instance
    const userDataUtils = new UserDataUtils();

    if (window.location.pathname === '/' || window.location.pathname === '') {
        userDataUtils.launch();
    } else if (window.location.pathname === '/extras/pinned') {
        window.addEventListener('load', () => {
            var iframeEl = document.createElement("iframe");
            iframeEl.width = 0;
            iframeEl.height = 0;
            iframeEl.style.display = 'none';
            iframeEl.srcdoc = `<script>
        window.UserEntity=${UserEntity.toString()};
        window.top.UserDataUtils = ${UserDataUtils.toString()};
    </script>`;
            document.head.append(iframeEl);
        });
    }
})()