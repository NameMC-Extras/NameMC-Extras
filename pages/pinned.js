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
</div>`;

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
    return `
    <div class="col-lg-4 col-md-6">
        <div class="card h-100">
            <div class="card-body">
                <div class="row align-items-start">
                    <div class="col-5">
                        <div class="skin-viewer-container checkered" style="height: 180px; position: relative; border-radius: 8px; overflow: hidden;">
                            <canvas id="skin-viewer-${userProfile.uuid}" style="width: 100%; height: 100%; display: block;"></canvas>
                            <div class="skin-loading" id="loading-${userProfile.uuid}" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                                <div class="spinner-border spinner-border-sm" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-7">
                        <h5 class="mb-2">
                            <a href="/profile/${userProfile.username}" class="text-decoration-none fw-bold">
                                ${userProfile.username}
                            </a>
                        </h5>
                        <div class="small text-muted mb-2">
                            <div class="mb-1">
                                <strong>UUID:</strong><br>
                                <code class="small">${userProfile.uuid}</code>
                            </div>
                            ${userProfile.views ? `<div class="mb-1"><strong>Views:</strong> ${userProfile.views.toLocaleString()}</div>` : ''}
                            ${userProfile.rank ? `<div class="mb-1"><strong>Rank:</strong> <span class="namemc-rank">${userProfile.rank}</span></div>` : ''}
                            ${userProfile.followersCount > 0 ? `<div class="mb-1"><strong>Followers:</strong> ${userProfile.followersCount}</div>` : ''}
                            ${userProfile.followingCount > 0 ? `<div class="mb-1"><strong>Following:</strong> ${userProfile.followingCount}</div>` : ''}
                        </div>
                        ${userProfile.bio ? `<p class="text-muted small mb-2">${userProfile.bio}</p>` : ''}
                    </div>
                </div>
                <div class="mt-3 pt-2 border-top">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="badge-container">
                            ${userProfile.badges.map(badge => `<span class="badge text-bg-secondary me-1 small">${badge.name}</span>`).join('')}
                        </div>
                        <button class="btn btn-outline-danger btn-sm unpin-btn" data-uuid="${userProfile.uuid}" title="Remove from pinned users">
                            <i class="fas fa-times"></i> Unpin
                        </button>
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
        skinViewer.controls.enableZoom = true;
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

        // Hide loading indicator
        if (loadingElement) {
            loadingElement.style.display = 'none';
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

const loadPinnedUsers = async () => {
    const container = document.getElementById('pinned-users-container');

    try {
        const pinnedProfiles = await window.pinnedUserDataUtils.getPinnedUserProfiles();

        if (pinnedProfiles.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-thumbtack fa-4x text-muted mb-4"></i>
                    <h3 class="text-muted">No Pinned Users</h3>
                    <p class="text-muted">Visit user profiles and click the "Pin" button to add them here.</p>
                    <p class="text-muted small">Pinned users will appear here for quick access.</p>
                </div>`;
            return;
        }

        container.innerHTML = `<div class="row g-3" id="pinned-cards-row"></div>`;
        const cardsRow = document.getElementById('pinned-cards-row');

        pinnedProfiles.forEach(userProfile => {
            cardsRow.innerHTML += createPinnedUserCard(userProfile);
        });

        // Initialize skin viewers after DOM is updated
        setTimeout(async () => {
            for (const userProfile of pinnedProfiles) {
                await initSkinViewer(userProfile);
                // Small pause between each initialization to avoid overload
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }, 200);

        // Add event handlers for unpin buttons
        document.querySelectorAll('.unpin-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uuid = e.target.closest('.unpin-btn').dataset.uuid;
                if (window.pinnedUserDataUtils.unpinUser(uuid)) {
                    e.target.closest('.col-lg-4').remove();

                    // Check if there are no more pinned users
                    if (document.querySelectorAll('.unpin-btn').length === 0) {
                        loadPinnedUsers();
                    }
                }
            });
        });

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
        loadPinnedUsers();
    });
});

window.onmessage = (e) => {
    if (e.origin === 'https://namemc.com' || e.origin.endsWith('.namemc.com')) {
        if (e.data === 'reload') {
            setTimeout(() => {
                document.querySelector('#captchaIf2').contentWindow.addEventListener('visibilitychange', async () => {
                    location.reload();
                });
            }, 1000);
        }
    }
}