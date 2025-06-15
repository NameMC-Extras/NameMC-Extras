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

    async fetchUserName() {
        return await waitForSelector('#header > nav > ul.navbar-nav.ms-auto > li.nav-item.dropdown > a > span', (userName) => {
            return userName.textContent;
        });
    }

    /**
     * Parse the HTML of a profile and return a UserEntity object
     * @param {string} html - The profile HTML
     * @param {string} username - The username
     * @returns {UserEntity} The parsed profile data
     */
    parseUserProfile(html, username) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // UUID
        const uuidSelect = doc.querySelector('#uuid-select option[value="standard"]');
        const uuid = uuidSelect ? uuidSelect.textContent.trim() : null;

        // Views
        let views = null;
        const rows = doc.querySelectorAll('.card-body .row');
        for (const row of rows) {
            const strongElement = row.querySelector('strong');
            if (strongElement && strongElement.textContent.trim() === 'Views') {
                const viewsElement = row.querySelector('.col-auto');
                if (viewsElement && viewsElement.textContent.includes('/ month')) {
                    views = viewsElement.textContent.trim();
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
     * @param {string} username - The username
     * @returns {Promise<UserEntity>} The parsed profile data
     */
    async fetchUserProfile(username) {
        // Check cache first
        if (this.cache.has(username)) {
            console.log(`Profile for ${username} found in cache`);
            return this.cache.get(username);
        }

        try {
            const url = `${this.domain}/profile/${username}`;
            
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'default',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'max-age=0',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'same-origin',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1',
                    'User-Agent': navigator.userAgent,
                    'Referer': this.domain + '/',
                    'DNT': '1',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();
            const userEntity = this.parseUserProfile(html, username);
            
            // Cache the result
            this.cache.set(username, userEntity);
            console.log(`Profile for ${username} cached`);
            
            return userEntity;
        } catch (error) {
            console.error(`Error fetching profile for ${username}:`, error);
            throw error;
        }
    }

    async launch() {
        const userName = await userDataUtils.fetchUserName();
        const userProfile = await userDataUtils.fetchUserProfile(userName);
        console.log('User profile:', userProfile);
        console.log('Test Zenection : ', await userDataUtils.fetchUserProfile("Zenection"))
    }

}

const waitForSelector = function (selector, callback) {
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

// Create global instance
const userDataUtils = new UserDataUtils();

// Auto-run test when on main page
if (window.location.pathname === '/' || window.location.pathname === '') {
    userDataUtils.launch();

}

window.userDataUtils = userDataUtils; 