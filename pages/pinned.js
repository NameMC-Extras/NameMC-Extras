(async () => {
    await superStorage._ready;

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

<div class="modal fade" style="overflow: hidden;" id="badgesModal" tabindex="-1" aria-labelledby="badgesModalLabel" aria-hidden="true">
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
            const cache = superStorage.getItem(CACHE_KEY);
            if (!cache) return null;

            const cacheData = JSON.parse(cache);
            const userCache = cacheData[uuid];

            if (!userCache) return null;

            // Check if cache is still valid (within 10 minutes)
            const now = Date.now();
            if (now - userCache.timestamp > CACHE_DURATION) {
                // Cache expired, remove it
                delete cacheData[uuid];
                superStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
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
            const cache = superStorage.getItem(CACHE_KEY);
            const cacheData = cache ? JSON.parse(cache) : {};

            cacheData[uuid] = {
                profile: profile,
                timestamp: Date.now()
            };

            superStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error writing profile cache:', error);
        }
    };

    const cleanExpiredCache = () => {
        try {
            const cache = superStorage.getItem(CACHE_KEY);
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
                superStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            }
        } catch (error) {
            console.error('Error cleaning expired cache:', error);
        }
    };

    // Cache utility functions
    const getCacheStats = () => {
        try {
            const cache = superStorage.getItem(CACHE_KEY);
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
            superStorage.removeItem(CACHE_KEY);
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
        // Keep full bio without truncation
        const fullBio = userProfile.bio;

        // Limit number of badges displayed
        const maxBadges = 4;
        const displayBadges = userProfile.badges.slice(0, maxBadges);
        const remainingBadges = userProfile.badges.length - maxBadges;

        return `
    <div class="col-lg-4 col-md-6 d-flex">
        <div class="card h-100 w-100 position-relative overflow-hidden" style="min-height: 480px;">
            <!-- Header with username and unpin button -->
            <div class="card-header d-flex justify-content-between align-items-center py-2 px-3 border-0" style="background: linear-gradient(135deg, rgba(var(--ne-btn-rgb, 13, 110, 253), 0.1), rgba(var(--ne-btn-rgb, 13, 110, 253), 0.05));">
                <h6 class="mb-0 text-truncate me-2">
                    <a href="/profile/${userProfile.username}" class="text-decoration-none fw-bold">
                        ${userProfile.username}
                    </a>
                </h6>
                ${userProfile.rank ? `
                <span class="badge" style="background-color: ${userProfile.rank.toLowerCase() === 'emerald' ? '#0A0' : '#F00'}!important; font-size: 0.65rem;">${userProfile.rank}</span>
                ` : ''}
                <button class="unpin-btn btn ms-auto" 
                        data-uuid="${userProfile.uuid}" 
                        title="Remove from pinned users" 
                        style="background-color: transparent;outline: none;border: none;color: var(--bs-secondary-color) !important;opacity: 0.7;
">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="card-body d-flex flex-column p-0">
                <!-- Enhanced 3D Skin Section (Primary Focus) -->
                <div class="position-relative" style="background: linear-gradient(45deg, rgba(var(--ne-btn-rgb, 13, 110, 253), 0.05), transparent);">
                    <div class="skin-viewer-container checkered mx-auto" style="width: 100%; height: 250px; position: relative;">
                        <canvas id="skin-viewer-${userProfile.uuid}" style="touch-action: none; width: 100%; height: 100%; display: block;" class="drop-shadow"></canvas>
                        <div class="skin-loading" id="loading-${userProfile.uuid}" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                            <div class="spinner-border spinner-border-sm" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Statistics Section (Separate from skin) -->
                <div class="px-3 py-2" style="background: linear-gradient(135deg, rgba(var(--ne-btn-rgb, 13, 110, 253), 0.08), rgba(var(--ne-btn-rgb, 13, 110, 253), 0.02)); border-top: 1px solid rgba(var(--ne-btn-rgb, 13, 110, 253), 0.15);">
                    <div class="row text-center small">
                        <div class="col-4">
                            <div class="fw-bold">${userProfile.views ? userProfile.views.toLocaleString() : '0'}</div>
                            <div class="text-muted" style="font-size: 0.75rem;">Views</div>
                        </div>
                        <div class="col-4 border-start border-end" style="border-color: rgba(var(--ne-btn-rgb, 13, 110, 253), 0.2) !important;">
                            <div class="fw-bold">${userProfile.followersCount.toLocaleString() || '0'}</div>
                            <div class="text-muted" style="font-size: 0.75rem;">Followers</div>
                        </div>
                        <div class="col-4">
                            <div class="fw-bold">${userProfile.followingCount.toLocaleString() || '0'}</div>
                            <div class="text-muted" style="font-size: 0.75rem;">Following</div>
                        </div>
                    </div>
                </div>

                <!-- Content Section -->
                <div class="flex-grow-1 d-flex flex-column p-3">
                    <!-- Bio Section -->
                    ${fullBio ? `
                    <div class="text-center mb-3">
                        <p class="text-muted small mb-0 fst-italic" style="line-height: 1.4; border-left: 3px solid rgba(var(--ne-btn-rgb, 13, 110, 253), 0.3); padding-left: 8px; text-align: left !important;">
                            "${fullBio}"
                        </p>
                    </div>
                    ` : ''}
                    
                    <!-- Badges Section -->
                    ${displayBadges.length > 0 ? `
                    <div class="text-center mb-3">
                        <div class="d-flex justify-content-center align-items-center flex-wrap gap-1">
                            ${displayBadges.map(badge => `<img src="${badge.image}" alt="${badge.name}" title="${badge.name}" width="24" height="24" class="border rounded" style="image-rendering: pixelated; background: rgba(var(--ne-btn-rgb, 13, 110, 253), 0.1); padding: 2px;">`).join('')}
                            ${remainingBadges > 0 ? `<span class="badge text-bg-primary show-all-badges" style="font-size: 0.7rem; cursor: pointer;" data-user-uuid="${userProfile.uuid}" title="Click to see all badges">+${remainingBadges}</span>` : ''}
                        </div>
                    </div>
                    ` : ''}


                    
                    <!-- UUID Section (Bottom) -->
                    <div class="mt-auto pt-2 border-top">
                        <div class="text-center">
                            <small class="text-muted d-block mb-1">UUID</small>
                            <code class="small uuid-copy d-block" 
                                  data-uuid="${userProfile.uuid}"
                                  title="Click to copy UUID"
                                  style="color: rgba(var(--bs-link-color-rgb)); font-size: 0.65rem; word-break: break-all; cursor: pointer; padding: 4px 6px; border-radius: 4px; transition: all 0.2s; background: rgba(var(--ne-btn-rgb, 13, 110, 253), 0.1); border: 1px solid rgba(var(--ne-btn-rgb, 13, 110, 253), 0.2);"
                                  onmouseover="this.style.backgroundColor='rgba(var(--ne-btn-rgb, 13, 110, 253), 0.2)'"
                                  onmouseout="this.style.backgroundColor='rgba(var(--ne-btn-rgb, 13, 110, 253), 0.1)'">${userProfile.uuid}</code>
                        </div>
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
            currentPageProfiles = await getPaginatedUserProfiles(currentPage);

            // Use a DocumentFragment for faster DOM insertion
            const cardsRow = document.createElement('div');
            cardsRow.className = 'row g-3';
            cardsRow.id = 'pinned-cards-row';

            const fragment = document.createDocumentFragment();
            currentPageProfiles.forEach(userProfile => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = createPinnedUserCard(userProfile);
                fragment.appendChild(tempDiv.firstElementChild);
            });
            cardsRow.appendChild(fragment);
            container.innerHTML = '';
            container.appendChild(cardsRow);

            updatePaginationControls();

            // Initialize skin viewers in parallel (with Promise.all) to speed up
            await Promise.all(currentPageProfiles.map(userProfile => initSkinViewer(userProfile)));

            // Event handlers
            const unpinBtns = container.querySelectorAll('.unpin-btn');
            unpinBtns.forEach(btn => btn.onclick = async () => {
                const uuid = btn.dataset.uuid;
                if (window.pinnedUserDataUtils.unpinUser(uuid)) {
                    allPinnedUsers = allPinnedUsers.filter(user => user.uuid !== uuid);
                    totalUsersCount = allPinnedUsers.length;
                    totalPages = Math.ceil(allPinnedUsers.length / USERS_PER_PAGE);
                    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
                    if (!allPinnedUsers.length) {
                        showEmptyState();
                        updateUrlWithPage(1, true);
                    } else {
                        displayCurrentPage();
                    }
                    updatePaginationControls();
                }
            });

            const uuidElements = container.querySelectorAll('.uuid-copy');
            uuidElements.forEach(el => el.onclick = async (e) => {
                const uuid = e.target.dataset.uuid;
                try {
                    await navigator.clipboard.writeText(uuid);
                } catch {
                    const ta = document.createElement('textarea');
                    ta.value = uuid;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
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
            });

            const badgeElements = container.querySelectorAll('.show-all-badges');
            badgeElements.forEach(el => el.onclick = (e) => {
                const userUuid = e.target.dataset.userUuid;
                const userProfile = currentPageProfiles.find(p => p.uuid === userUuid);
                if (userProfile?.badges) showAllBadgesModal(userProfile);
            });

            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (updateUrl) updateUrlWithPage(currentPage);
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

    const getPaginatedUserProfiles = async (page, pageSize = USERS_PER_PAGE) => {
        cleanExpiredCache();
        const startIndex = (page - 1) * pageSize;
        const usersForPage = allPinnedUsers.slice(startIndex, startIndex + pageSize);

        // Map over users and fetch profiles concurrently
        const profiles = await Promise.all(usersForPage.map(async (user, index) => {
            let profile = getCachedProfile(user.uuid);
            if (!profile) {
                try {
                    profile = await window.pinnedUserDataUtils.fetchUserProfile(user.uuid);
                    setCachedProfile(user.uuid, profile);
                } catch (err) {
                    console.error(`Error fetching profile for ${user.uuid}`, err);
                }
            }
            return profile;
        }));

        return profiles.filter(Boolean);
    };

    const updatePaginationControls = () => {
        const paginationControls = document.getElementById('pagination-controls');
        const pageInfo = document.getElementById('page-info');
        const prevPage = document.getElementById('prev-page');
        const nextPage = document.getElementById('next-page');

        if (totalPages <= 1) {
            paginationControls.classList.add('d-none');
            pageInfo.classList.add('d-none');
            return;
        }
        paginationControls.classList.remove('d-none');
        pageInfo.classList.remove('d-none');

        document.getElementById('current-page-text').textContent = currentPage;
        document.getElementById('total-pages-text').textContent = totalPages;
        document.getElementById('users-count-text').textContent = totalUsersCount;

        prevPage.classList.toggle('disabled', currentPage === 1);
        nextPage.classList.toggle('disabled', currentPage === totalPages);

        // Remove old page numbers once
        document.querySelectorAll('[data-page]').forEach(el => el.parentElement.remove());

        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        if (endPage - startPage < maxVisiblePages - 1) startPage = Math.max(1, endPage - maxVisiblePages + 1);

        const fragment = document.createDocumentFragment();
        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = `page-item${i === currentPage ? ' active' : ''}`;
            li.innerHTML = `<button class="page-link" data-page="${i}">${i}</button>`;
            li.querySelector('.page-link').onclick = () => {
                currentPage = i;
                displayCurrentPage();
            };
            fragment.appendChild(li);
        }
        nextPage.before(fragment);
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

    const urlParams = new URLSearchParams(window.location.search);
    const tierlist = urlParams.get('tierlist') === 'true';

    const loadTierList = async () => {
        document.querySelector('h1').innerHTML = 'Tier List';
        allPinnedUsers = window.pinnedUserDataUtils.getPinnedUsers();
        const profiles = await getPaginatedUserProfiles(1, 1000);

        const container = document.getElementById('pinned-users-container');
        container.innerHTML = `<style>
  .tier {
    display: flex;
    align-items: center;
    margin: 10px 0;
  }

  .tier-label {
    width: 80px;
    height: 80px;
    padding: 10px;
    font-weight: bold;
    display: flex;
    justify-content: center;
    align-items: center;
    color: black;
    pointer-events: none;
    user-select: none;
  }

  .tier-items {
    flex: 1;
    min-height: 80px;
    background: #222;
    display: flex;
    flex-wrap: wrap;
    padding: 4px;
    gap: 5px;
    border-radius: 6px;
  }

  .item {
    width: 72px;
    height: 72px;
    background: #444;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    border-radius: 6px;
    position: relative;
    touch-action: none;
    user-select: none;
  }

  .item * {
    pointer-events: none;
    touch-action: none;
    user-select: none;
  }

  .overlay-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-weight: bold;
    text-shadow: 2px 2px #000000aa;
    pointer-events: none;

    font-size: clamp(10px, 14px, 16px); /* min 10px, preferred 14px, max 16px */
    white-space: wrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  #syncButton {
    font-size: 18px;
  }
</style>
<div class="tier">
  <div class="tier-label" style="background:#FD8082;">S</div>
  <div class="tier-items" ondrop="drop(event)" ondragover="allowDrop(event)"></div>
</div>
<div class="tier">
  <div class="tier-label" style="background:#FEBF84;">A</div>
  <div class="tier-items" ondrop="drop(event)" ondragover="allowDrop(event)"></div>
</div>
<div class="tier">
  <div class="tier-label" style="background:#FEDE86;">B</div>
  <div class="tier-items" ondrop="drop(event)" ondragover="allowDrop(event)"></div>
</div>
<div class="tier">
  <div class="tier-label" style="background:#FFFE87;">C</div>
  <div class="tier-items" ondrop="drop(event)" ondragover="allowDrop(event)"></div>
</div>
<div class="tier">
  <div class="tier-label" style="background:#C1FD86;">D</div>
  <div class="tier-items" ondrop="drop(event)" ondragover="allowDrop(event)"></div>
</div>
<hr>
<h3>Profiles <a href="javascript:loadTierList()" id="syncButton" class="color-inherit"><i class="fas fa-sync"></i></a></h3>
<div class="tier-items" ondrop="drop(event)" ondragover="allowDrop(event)" id="profilesContainer">
</div>`;

        window.top.allowDrop = function (ev) {
            ev.preventDefault();
        }

        window.top.drag = function (ev) {
            ev.dataTransfer.setData("text", ev.target.closest('.item').id);
        }

        window.top.drop = function (ev) {
            ev.preventDefault();

            const data = ev.dataTransfer.getData("text");
            const item = document.getElementById(data);
            if (!item) return;

            const dropZone = ev.target.closest('.tier-items');
            if (dropZone) {
                dropZone.appendChild(item);
                saveTierListState();
            }
        };

        profiles.forEach(user => {
            const div = document.createElement('div');
            div.className = 'item';
            div.draggable = true;
            div.id = 'profile-' + user.uuid;
            div.ondragstart = window.top.drag;
            div.innerHTML = `<img draggable="false" src="https://nmsr.nickac.dev/bust/${user.uuid}" width="68" height="68" alt="${user.username}">
                     <div class="overlay-text">${user.username}</div>`;
            document.querySelector('#profilesContainer').appendChild(div);
        });

        let touchItem = null;

        document.addEventListener('touchstart', function (e) {
            const item = e.target.closest('.item');
            if (!item) return;

            touchItem = item;
            item.style.opacity = '0.6';
        });

        document.addEventListener('touchmove', function (e) {
            if (!touchItem) return;

            const touch = e.touches[0];
            const dropZone = document.elementFromPoint(touch.clientX, touch.clientY)
                ?.closest('.tier-items');

            if (dropZone) {
                dropZone.appendChild(touchItem);
            }

            e.preventDefault(); // prevents scrolling while dragging
        }, { passive: false });

        document.addEventListener('touchend', function () {
            if (touchItem) {
                touchItem.style.opacity = '';
                saveTierListState();
            }
            touchItem = null;
        });

        function fitText(element, maxFont = 16, minFont = 8) {
            let fontSize = maxFont;
            element.style.fontSize = fontSize + 'px';

            while (element.scrollWidth > element.parentElement.clientWidth && fontSize > minFont) {
                fontSize -= 1;
                element.style.fontSize = fontSize + 'px';
            }
        }

        // Apply to all overlay-text items
        document.querySelectorAll('.overlay-text').forEach(el => fitText(el));

        function saveTierListState() {
            const tiers = {};
            document.querySelectorAll('.tier-items').forEach((tierContainer, index) => {
                const tierLabel = tierContainer.previousElementSibling?.textContent || `tier${index}`;
                const items = [...tierContainer.querySelectorAll('.item')].map(i => i.id); // now uses uuid-based IDs
                tiers[tierLabel] = items;
            });

            superStorage.setItem('tierListState', JSON.stringify(tiers));
        }

        function loadTierListState() {
            const saved = superStorage.getItem('tierListState');
            if (!saved) return;

            const tiers = JSON.parse(saved);

            Object.entries(tiers).forEach(([label, itemIds]) => {
                const tierContainer = [...document.querySelectorAll('.tier-items')]
                    .find(c => c.previousElementSibling?.textContent === label);
                if (!tierContainer) return;

                itemIds.forEach(id => {
                    const item = document.getElementById(id);
                    if (item) tierContainer.appendChild(item);
                });
            });
        }

        loadTierListState();
    }

    // Initialize the page
    waitForSelector('main', (main) => {
        main.innerHTML = pinnedPageContent;
        // Wait for UserDataUtils class to be available, then create instance and load pinned users
        waitForUserDataUtils(async () => {
            const userDataUtils = new UserDataUtils();
            window.pinnedUserDataUtils = userDataUtils; // Make it globally accessible for this page

            // Clean expired cache on page load
            cleanExpiredCache();

            if (tierlist) {
                loadTierList();
            } else {
                loadPinnedUsers();
            }
        });
    });
})();