const pinnedPageContent = `
<h1 class="text-center">Pinned Users</h1>
<hr class="mt-0">
<div id="pinned-users-container">
    <div class="text-center">
        <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Loading pinned users...</p>
    </div>
</div>
<div id="pagination-controls" class="d-flex justify-content-center mt-4 d-none">
    <nav aria-label="Page navigation">
        <ul class="pagination">
            <li class="page-item" id="prev-page">
                <button class="page-link" aria-label="Previous page">
                    <span aria-hidden="true">&laquo;</span>
                </button>
            </li>
            <li class="page-item" id="next-page">
                <button class="page-link" aria-label="Next page">
                    <span aria-hidden="true">&raquo;</span>
                </button>
            </li>
        </ul>
    </nav>
</div>
<div class="text-center mt-2 d-none" id="page-info">
    <small class="text-muted">Page <span id="current-page-text">1</span> of <span id="total-pages-text">1</span> - <span id="users-count-text">0</span> users total</small>
</div>
<div class="mb-2"></div>

<div class="modal fade" id="badgesModal" tabindex="-1" aria-labelledby="badgesModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="badgesModalLabel">All Badges</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="badgesModalBody">
            </div>
        </div>
    </div>
</div>`;

// Pagination configuration
const USERS_PER_PAGE = 9; // 3x3 grid
let currentPage = 1;
let totalPages = 1;
let allPinnedUsers = []; // Store just the UUID/pinnedAt data
let currentPageProfiles = []; // Store detailed profiles for current page only
let totalUsersCount = 0;

// Cache management for user profiles
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const CACHE_KEY = 'namemc_pinned_profiles_cache';

const getCachedProfile = (uuid) => {
    try {
        const cache = localStorage.getItem(CACHE_KEY);
        if (!cache) return null;

        const cacheData = JSON.parse(cache);
        const userCache = cacheData[uuid];

        if (!userCache) return null;

        // Check if cache is still valid (within 10 minutes)
        const now = Date.now();
        if (now - userCache.timestamp > CACHE_DURATION) {
            // Cache expired, remove it
            delete cacheData[uuid];
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            return null;
        }

        return userCache.profile;
    } catch (error) {
        console.error('Error reading profile cache:', error);
        return null;
    }
};

const setCachedProfile = (uuid, profile) => {
    try {
        const cache = localStorage.getItem(CACHE_KEY);
        const cacheData = cache ? JSON.parse(cache) : {};

        cacheData[uuid] = {
            profile: profile,
            timestamp: Date.now()
        };

        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error writing profile cache:', error);
    }
};

const cleanExpiredCache = () => {
    try {
        const cache = localStorage.getItem(CACHE_KEY);
        if (!cache) return;

        const cacheData = JSON.parse(cache);
        const now = Date.now();
        let hasExpired = false;

        // Remove expired entries
        for (const uuid in cacheData) {
            if (now - cacheData[uuid].timestamp > CACHE_DURATION) {
                delete cacheData[uuid];
                hasExpired = true;
            }
        }

        // Update cache if we removed any expired entries
        if (hasExpired) {
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        }
    } catch (error) {
        console.error('Error cleaning expired cache:', error);
    }
};

// Cache utility functions
const getCacheStats = () => {
    try {
        const cache = localStorage.getItem(CACHE_KEY);
        if (!cache) return { total: 0, expired: 0, valid: 0 };

        const cacheData = JSON.parse(cache);
        const now = Date.now();
        let expired = 0;
        let valid = 0;

        for (const uuid in cacheData) {
            if (now - cacheData[uuid].timestamp > CACHE_DURATION) {
                expired++;
            } else {
                valid++;
            }
        }

        return {
            total: expired + valid,
            expired: expired,
            valid: valid
        };
    } catch (error) {
        console.error('Error getting cache stats:', error);
        return { total: 0, expired: 0, valid: 0 };
    }
};

const clearAllCache = () => {
    try {
        localStorage.removeItem(CACHE_KEY);
        console.log('Profile cache cleared');
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
};

// Make cache functions available globally for debugging
window.pinnedCacheUtils = {
    getCacheStats,
    clearAllCache,
    cleanExpiredCache
};

// Function to show all badges in a modal
const showAllBadgesModal = (userProfile) => {
    const modalTitle = document.getElementById('badgesModalLabel');
    const modalBody = document.getElementById('badgesModalBody');

    // Set modal title
    modalTitle.textContent = `${userProfile.username}'s Badges (${userProfile.badges.length})`;

    // Create badges grid
    const badgesGrid = userProfile.badges.map(badge => `
        <div class="col-6 col-md-4 col-lg-3 mb-3">
            <div class="text-center p-2 border rounded bg-body-tertiary">
                <img src="${badge.image}" alt="${badge.name}" width="32" height="32" class="mb-2" style="image-rendering: pixelated;">
                <div class="small fw-bold text-truncate" title="${badge.name}">${badge.name}</div>
            </div>
        </div>
    `).join('');

    modalBody.innerHTML = `
        <div class="row g-2">
            ${badgesGrid}
        </div>
    `;

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('badgesModal'));
    modal.show();
};

// Paginated data fetching
const getPaginatedUserProfiles = async (page, pageSize = USERS_PER_PAGE) => {
    // Clean expired cache before starting
    cleanExpiredCache();

    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, allPinnedUsers.length);
    const usersForPage = allPinnedUsers.slice(startIndex, endIndex);

    const profiles = [];
    const totalUsers = usersForPage.length;

    for (let i = 0; i < usersForPage.length; i++) {
        const pinnedUser = usersForPage[i];
        let profile = null;

        try {
            // Try to get from cache first
            profile = getCachedProfile(pinnedUser.uuid);

            if (profile) {
                // Profile found in cache and still valid
                profiles.push(profile);

                // Update progress bar
                const progressBar = document.getElementById('loading-progress-bar');
                const progressText = document.getElementById('loading-progress-text');
                if (progressBar && progressText) {
                    const progress = ((i + 1) / totalUsers) * 100;
                    progressBar.style.width = `${progress}%`;
                    progressBar.setAttribute('aria-valuenow', progress);
                    progressText.textContent = `Loading ${i + 1} of ${totalUsers} users... (cached)`;
                }
            } else {
                // Not in cache or expired, fetch from API
                profile = await window.pinnedUserDataUtils.fetchUserProfile(pinnedUser.uuid);
                profiles.push(profile);

                // Store in cache
                setCachedProfile(pinnedUser.uuid, profile);

                // Update progress bar
                const progressBar = document.getElementById('loading-progress-bar');
                const progressText = document.getElementById('loading-progress-text');
                if (progressBar && progressText) {
                    const progress = ((i + 1) / totalUsers) * 100;
                    progressBar.style.width = `${progress}%`;
                    progressBar.setAttribute('aria-valuenow', progress);
                    progressText.textContent = `Loading ${i + 1} of ${totalUsers} users...`;
                }
            }
        } catch (error) {
            console.error(`Error fetching profile for ${pinnedUser.uuid}:`, error);

            // Still update progress bar even on error
            const progressBar = document.getElementById('loading-progress-bar');
            const progressText = document.getElementById('loading-progress-text');
            if (progressBar && progressText) {
                const progress = ((i + 1) / totalUsers) * 100;
                progressBar.style.width = `${progress}%`;
                progressBar.setAttribute('aria-valuenow', progress);
                progressText.textContent = `Loading ${i + 1} of ${totalUsers} users... (error)`;
            }
        }
    }

    return profiles;
};

// URL parameter management
const getPageFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    if (pageParam) {
        const page = parseInt(pageParam);
        if (page > 0) {
            return page;
        }
    }
    return 1;
};

const updateUrlWithPage = (page, replace = false) => {
    const url = new URL(window.location);
    if (page === 1) {
        url.searchParams.delete('page');
    } else {
        url.searchParams.set('page', page.toString());
    }

    if (replace) {
        window.history.replaceState({}, '', url);
    } else {
        window.history.pushState({}, '', url);
    }
};

const setupPopstateHandler = () => {
    window.addEventListener('popstate', () => {
        const newPage = getPageFromUrl();
        if (newPage !== currentPage && newPage <= totalPages) {
            currentPage = newPage;
            displayCurrentPage(false); // Don't update URL since we're responding to URL change
        }
    });
};

// Function to get skin texture from UUID
const getSkinFromId = async (uuid) => {
    try {
        const sessionAPI = await fetch("https://api.gapple.pw/cors/sessionserver/" + encodeURIComponent(uuid));
        if (sessionAPI.status == 200) {
            const sessionJSON = await sessionAPI.json();
            const sessionData = JSON.parse(atob(sessionJSON.properties[0].value));
            const skinTextureURL = sessionData.textures.SKIN?.url;
            return skinTextureURL?.replace('http:', 'https:');
        }
    } catch (error) {
        console.error('Error fetching skin from UUID:', error);
        return null;
    }
};

// Function to wait for skinview3d to be available
const waitForSkinview3d = function (callback) {
    if (window.skinview3d) {
        setTimeout(() => {
            callback(window.skinview3d);
        });
    } else {
        setTimeout(() => {
            waitForSkinview3d(callback);
        }, 100);
    }
};

const createPinnedUserCard = (userProfile) => {
    // Truncate bio if too long
    const truncatedBio = userProfile.bio && userProfile.bio.length > 80
        ? userProfile.bio.substring(0, 80) + '...'
        : userProfile.bio;

    // Limit number of badges displayed
    const maxBadges = 3;
    const displayBadges = userProfile.badges.slice(0, maxBadges);
    const remainingBadges = userProfile.badges.length - maxBadges;

    return `
    <div class="col-lg-4 col-md-6 d-flex">
        <div class="card h-100 w-100 position-relative" style="height: 420px;">
            <button class="btn btn-outline-danger btn-sm unpin-btn position-absolute" 
                    data-uuid="${userProfile.uuid}" 
                    title="Remove from pinned users" 
                    style="top: 6px; right: 6px; z-index: 2; border-radius: 50%; width: 24px; height: 24px; padding: 0; font-size: 10px; border-width: 1px;">
                <i class="fas fa-times"></i>
            </button>
            <div class="card-body d-flex flex-column p-3">
                <!-- Name and skin section -->
                <div class="text-center mb-3">
                    <h5 class="mb-2 text-truncate">
                        <a href="/profile/${userProfile.username}" class="text-decoration-none fw-bold">
                            ${userProfile.username}
                        </a>
                    </h5>
                    <div class="skin-viewer-container checkered mx-auto" style="width: 120px; height: 150px; position: relative; border-radius: 8px; overflow: hidden;">
                        <canvas id="skin-viewer-${userProfile.uuid}" style="touch-action: none; width: 100%; height: 100%; display: block;" class="drop-shadow"></canvas>
                        <div class="skin-loading" id="loading-${userProfile.uuid}" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                            <div class="spinner-border spinner-border-sm" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Statistics section -->
                <div class="row text-center mb-3 small border rounded p-2 bg-body-tertiary">
                    <div class="col-4">
                        <div class="fw-bold" style="color: rgba(var(--ne-btn-rgb, 13, 110, 253), 0.8);">${userProfile.views ? userProfile.views.toLocaleString() : '0'}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">Views</div>
                    </div>
                    <div class="col-4 border-start border-end">
                        <div class="fw-bold" style="color: rgba(25, 135, 84, 0.8);">${userProfile.followersCount || '0'}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">Followers</div>
                    </div>
                    <div class="col-4">
                        <div class="fw-bold" style="color: rgba(13, 202, 240, 0.8);">${userProfile.followingCount || '0'}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">Following</div>
                    </div>
                </div>
                
                <!-- Information section -->
                <div class="flex-grow-1 d-flex flex-column">
                    ${userProfile.rank ? `
                    <div class="mb-2 text-center">
                        <span class="badge ${userProfile.rank.toLowerCase() === 'emerald' ? 'text-white fw-bold' : 'bg-warning text-dark fw-bold'}" ${userProfile.rank.toLowerCase() === 'emerald' ? 'style="background-color: #0A0 !important;"' : ''}>${userProfile.rank}</span>
                    </div>
                    ` : ''}
                    
                    ${truncatedBio ? `
                    <div class="text-center mb-2">
                        <p class="text-muted small mb-0" style="font-style: italic; line-height: 1.3;">
                            "${truncatedBio}"
                        </p>
                    </div>
                    ` : ''}
                    
                    <!-- UUID at bottom (w copy event) -->
                    <div>
                        <div class="text-center mb-2">
                            <small class="text-muted">UUID</small><br>
                            <code class="small text-break uuid-copy" 
                                  data-uuid="${userProfile.uuid}"
                                  title="Click to copy UUID"
                                  style="font-size: 0.7rem; word-break: break-all; cursor: pointer; padding: 2px 4px; border-radius: 3px; transition: background-color 0.2s;"
                                  onmouseover="this.style.backgroundColor='var(--bs-secondary-bg, rgba(108, 117, 125, 0.1))'"
                                  onmouseout="this.style.backgroundColor='transparent'">${userProfile.uuid}</code>
                        </div>
                        
                        <!-- Badges at bottom -->
                        ${displayBadges.length > 0 ? `
                        <div class="text-center">
                            ${displayBadges.map(badge => `<img src="${badge.image}" alt="${badge.name}" title="${badge.name}" width="20" height="20" class="me-1" style="image-rendering: pixelated;">`).join('')}
                            ${remainingBadges > 0 ? `<span class="badge text-bg-light text-dark ms-1 show-all-badges" style="font-size: 0.65rem; cursor: pointer;" data-user-uuid="${userProfile.uuid}" title="Click to see all badges">+${remainingBadges}</span>` : ''}
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    </div>`;
};

const initSkinViewer = async (userProfile) => {
    const canvas = document.getElementById(`skin-viewer-${userProfile.uuid}`);
    const loadingElement = document.getElementById(`loading-${userProfile.uuid}`);

    if (!canvas) return;

    try {
        // Wait for skinview3d to be available
        await new Promise((resolve) => {
            waitForSkinview3d(resolve);
        });

        // Get skin URL
        let skinUrl = null;
        if (userProfile.currentSkin && userProfile.currentSkin.imageUrl) {
            skinUrl = userProfile.currentSkin.imageUrl;
        } else {
            // Try to fetch skin from UUID
            skinUrl = await getSkinFromId(userProfile.uuid);
        }

        // Create skin viewer
        const skinViewer = new window.skinview3d.SkinViewer({
            canvas: canvas,
            width: canvas.clientWidth,
            height: canvas.clientHeight,
            skin: skinUrl?.replace('.png', '')?.replace('https://s.namemc.com/i/', 'https://cors.faav.top/namemc/texture/'),
            cape: userProfile.currentCape ? userProfile.currentCape.imageUrl?.replace('.png', '')?.replace('https://s.namemc.com/i/', 'https://cors.faav.top/namemc/texture/') : null,
            model: 'auto-detect'
        });

        // Configure viewer controls
        skinViewer.controls.enableRotate = true;
        skinViewer.controls.enableZoom = false;
        skinViewer.controls.enablePan = false;

        // Setup animation
        skinViewer.animation = new window.skinview3d.WalkingAnimation();
        skinViewer.animation.speed = 0.5;
        skinViewer.animation.headBobbing = false;

        // Configure camera and lighting (similar to skin-cape-test.js)
        skinViewer.fov = 40;
        skinViewer.camera.position.y = 22 * Math.cos(.01);
        skinViewer.playerWrapper.rotation.y = .53;
        skinViewer.globalLight.intensity = .65;
        skinViewer.cameraLight.intensity = .38;
        skinViewer.cameraLight.position.set(12, 25, 0);
        skinViewer.zoom = 0.86;

        canvas.addEventListener(
            "contextmenu",
            (event) => event.stopImmediatePropagation(),
            true
        );

        // Hide loading indicator
        if (loadingElement) {
            loadingElement.classList.add('d-none');
        }

        return skinViewer;
    } catch (error) {
        console.error('Error initializing skin viewer for', userProfile.username, ':', error);

        // Show error message
        if (loadingElement) {
            loadingElement.innerHTML = `
                <i class="fas fa-exclamation-triangle text-warning"></i>
                <br>
                <small class="text-muted">Unable to load skin</small>
            `;
        }

        return null;
    }
};

// Pagination functions
const updatePaginationControls = () => {
    const paginationControls = document.getElementById('pagination-controls');
    const pageInfo = document.getElementById('page-info');
    const prevPage = document.getElementById('prev-page');
    const nextPage = document.getElementById('next-page');
    const currentPageText = document.getElementById('current-page-text');
    const totalPagesText = document.getElementById('total-pages-text');
    const usersCountText = document.getElementById('users-count-text');

    if (totalPages <= 1) {
        paginationControls.classList.add('d-none');
        pageInfo.classList.add('d-none');
        return;
    }

    paginationControls.classList.remove('d-none');
    pageInfo.classList.remove('d-none');

    // Update page information
    currentPageText.textContent = currentPage;
    totalPagesText.textContent = totalPages;
    usersCountText.textContent = totalUsersCount;

    // Previous button
    prevPage.classList.toggle('disabled', currentPage === 1);

    // Next button
    nextPage.classList.toggle('disabled', currentPage === totalPages);

    // Generate page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    document.querySelectorAll('[data-page]').forEach(el=>el.parentElement.remove());
    for (let i = startPage; i <= endPage; i++) {
        const pageItem = document.createElement('li');
        pageItem.className = `page-item${i === currentPage ? ' active' : ''}`;
        pageItem.innerHTML = `<button class="page-link" data-page="${i}">${i}</button>`;
        nextPage.before(pageItem);

        pageItem.addEventListener('click', () => {
            currentPage = i;
            displayCurrentPage();
        });
    }
};

const setupPaginationEvents = () => {
    const prevPage = document.getElementById('prev-page');
    const nextPage = document.getElementById('next-page');

    // Previous button
    prevPage.querySelector('.page-link').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayCurrentPage();
        }
    });

    // Next button
    nextPage.querySelector('.page-link').addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayCurrentPage();
        }
    });

    // Setup browser back/forward navigation
    setupPopstateHandler();
};

const displayCurrentPage = async (updateUrl = true) => {
    const container = document.getElementById('pinned-users-container');

    // Show loading state
    container.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border mb-3" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <h5 class="mb-3">Loading page ${currentPage}</h5>
            <div class="progress mx-auto mb-3" style="max-width: 400px; height: 8px;">
                <div id="loading-progress-bar" class="progress-bar progress-bar-striped progress-bar-animated" 
                     role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                </div>
            </div>
            <p id="loading-progress-text" class="text-muted small">Preparing to load users...</p>
        </div>`;

    try {
        // Fetch profiles for current page only
        currentPageProfiles = await getPaginatedUserProfiles(currentPage);

        // Display cards
        container.innerHTML = `<div class="row g-3" id="pinned-cards-row"></div>`;
        const cardsRow = document.getElementById('pinned-cards-row');

        currentPageProfiles.forEach(userProfile => {
            cardsRow.innerHTML += createPinnedUserCard(userProfile);
        });

        // Update pagination controls
        updatePaginationControls();

        // Initialize skin viewers after DOM is updated
        setTimeout(async () => {
            for (const userProfile of currentPageProfiles) {
                await initSkinViewer(userProfile);
                // Small pause between each initialization to avoid overload
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }, 200);

        // Add event handlers for unpin buttons
        document.querySelectorAll('.unpin-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const uuid = btn.dataset.uuid;
                if (window.pinnedUserDataUtils.unpinUser(uuid)) {
                    // Remove user from global list
                    allPinnedUsers = allPinnedUsers.filter(user => user.uuid !== uuid);
                    totalUsersCount = allPinnedUsers.length;

                    // Recalculate pagination
                    totalPages = Math.ceil(allPinnedUsers.length / USERS_PER_PAGE);

                    // Adjust current page if necessary
                    if (currentPage > totalPages && totalPages > 0) {
                        currentPage = totalPages;
                    }

                    // Reload current page or show empty state
                    if (allPinnedUsers.length === 0) {
                        showEmptyState();
                        // Clear page parameter from URL when no users left
                        updateUrlWithPage(1, true);
                    } else {
                        displayCurrentPage();
                    }

                    updatePaginationControls();
                }
            });
        });

        // Add event handlers for UUID copy functionality
        document.querySelectorAll('.uuid-copy').forEach(uuidElement => {
            uuidElement.addEventListener('click', async (e) => {
                const uuid = e.target.dataset.uuid;
                try {
                    await navigator.clipboard.writeText(uuid);

                    // Visual feedback
                    const originalText = e.target.textContent;
                    const originalTitle = e.target.title;
                    e.target.textContent = 'Copied!';
                    e.target.title = 'UUID copied to clipboard';
                    e.target.style.backgroundColor = 'rgba(25, 135, 84, 0.2)';

                    // Reset after 2 seconds
                    setTimeout(() => {
                        e.target.textContent = originalText;
                        e.target.title = originalTitle;
                        e.target.style.backgroundColor = 'transparent';
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy UUID:', err);
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = uuid;
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                        document.execCommand('copy');
                        // Visual feedback for fallback
                        const originalText = e.target.textContent;
                        const originalTitle = e.target.title;
                        e.target.textContent = 'Copied!';
                        e.target.title = 'UUID copied to clipboard';
                        e.target.style.backgroundColor = 'rgba(25, 135, 84, 0.2)';

                        setTimeout(() => {
                            e.target.textContent = originalText;
                            e.target.title = originalTitle;
                            e.target.style.backgroundColor = 'transparent';
                        }, 2000);
                    } catch (fallbackErr) {
                        console.error('Fallback copy failed:', fallbackErr);
                    }
                    document.body.removeChild(textArea);
                }
            });
        });

        // Add event handlers for showing all badges
        document.querySelectorAll('.show-all-badges').forEach(badgeElement => {
            badgeElement.addEventListener('click', (e) => {
                const userUuid = e.target.dataset.userUuid;
                const userProfile = currentPageProfiles.find(profile => profile.uuid === userUuid);

                if (userProfile && userProfile.badges) {
                    showAllBadgesModal(userProfile);
                }
            });
        });

        // Scroll to top after page change
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (updateUrl) {
            updateUrlWithPage(currentPage);
        }

    } catch (error) {
        console.error('Error loading page:', error);
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle fa-4x text-warning mb-4"></i>
                <h3 class="text-warning">Error Loading Page</h3>
                <p class="text-muted">There was an error loading this page. Please try again.</p>
                <button class="btn btn-outline-primary mt-2" onclick="displayCurrentPage()" title="Retry loading page">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>`;
    }
};

const showEmptyState = () => {
    const container = document.getElementById('pinned-users-container');
    const paginationControls = document.getElementById('pagination-controls');
    const pageInfo = document.getElementById('page-info');

    container.innerHTML = `
        <div class="text-center py-5">
            <i class="fas fa-thumbtack fa-4x text-muted mb-4"></i>
            <h3 class="text-muted">No Pinned Users</h3>
            <p class="text-muted">Visit user profiles and click the "Pin" button to add them here.</p>
            <p class="text-muted small">Pinned users will appear here for quick access.</p>
        </div>`;

    paginationControls.classList.add('d-none');
    pageInfo.classList.add('d-none');
};

const loadPinnedUsers = async () => {
    const container = document.getElementById('pinned-users-container');

    try {
        // Get list of pinned users (UUIDs only, fast operation)
        allPinnedUsers = window.pinnedUserDataUtils.getPinnedUsers();
        totalUsersCount = allPinnedUsers.length;

        if (allPinnedUsers.length === 0) {
            showEmptyState();
            return;
        }

        // Calculate pagination
        totalPages = Math.ceil(allPinnedUsers.length / USERS_PER_PAGE);

        // Get initial page from URL or default to 1
        const urlPage = getPageFromUrl();
        currentPage = (urlPage <= totalPages) ? urlPage : 1;

        // Update URL if page was adjusted
        if (urlPage > totalPages && totalPages > 0) {
            updateUrlWithPage(currentPage, true); // Replace state to avoid broken history
        }

        // Setup pagination events
        setupPaginationEvents();

        // Display current page (this will fetch the profiles for current page)
        displayCurrentPage(false); // Don't update URL since we're initializing from URL

    } catch (error) {
        console.error('Error loading pinned users:', error);
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle fa-4x text-warning mb-4"></i>
                <h3 class="text-warning">Error Loading Pinned Users</h3>
                <p class="text-muted">There was an error loading your pinned users. Please try refreshing the page.</p>
                <button class="btn btn-outline-primary mt-2" onclick="location.reload()" title="Refresh page">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>`;
    }
};

// Selector waiting function
const waitForSelector = function (selector, callback) {
    let query = document.querySelector(selector);
    if (query) {
        setTimeout((query) => {
            callback(query);
        }, null, query);
    } else {
        setTimeout(() => {
            waitForSelector(selector, callback);
        });
    }
};

// Function to wait for UserDataUtils class to be available, shitty for now
const waitForUserDataUtils = function (callback) {
    if (window.UserDataUtils) {
        setTimeout(() => {
            callback();
        });
    } else {
        setTimeout(() => {
            waitForUserDataUtils(callback);
        }, 100);
    }
};

// Initialize the page
waitForSelector('main', (main) => {
    main.innerHTML = pinnedPageContent;
    // Wait for UserDataUtils class to be available, then create instance and load pinned users
    waitForUserDataUtils(() => {
        const userDataUtils = new UserDataUtils();
        window.pinnedUserDataUtils = userDataUtils; // Make it globally accessible for this page

        // Clean expired cache on page load
        cleanExpiredCache();

        loadPinnedUsers();
    });
});