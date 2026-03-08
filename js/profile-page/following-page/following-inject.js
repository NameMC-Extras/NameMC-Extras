const waitForSelector = (
    selector,
    callback,
    {root = document, timeout = 10000, once = true} = {}
) => {
    return new Promise((resolve, reject) => {
        const existing = root.querySelector(selector);
        if (existing) {
            callback?.(existing);
            return resolve(existing);
        }

        const timer = timeout && setTimeout(() => {
            observer.disconnect();
            reject(new Error(`waitForSelector timeout: ${selector}`));
        }, timeout);

        const observer = new MutationObserver(mutations => {
            for (let i = 0; i < mutations.length; i++) {
                const nodes = mutations[i].addedNodes;
                for (let j = 0; j < nodes.length; j++) {
                    const node = nodes[j];
                    if (node.nodeType !== 1) continue;

                    if (node.matches(selector)) {
                        if (once) observer.disconnect();
                        clearTimeout(timer);
                        callback?.(node);
                        return resolve(node);
                    }

                    const found = node.querySelector(selector);
                    if (found) {
                        if (once) observer.disconnect();
                        clearTimeout(timer);
                        callback?.(found);
                        return resolve(found);
                    }
                }
            }
        });

        observer.observe(root.documentElement || root, {childList: true, subtree: true});
    });
};

waitForSelector("body", (body) => {
    body.insertAdjacentHTML("afterbegin", `
    <div class="modal fade" id="unfollow-non-followers-modal" tabindex="-1" aria-labelledby="unfollow-non-followers-label" style="display: none;" aria-hidden="true">
        <div class="modal-dialog modal-dialog-scrollable" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="unfollow-non-followers-label">Unfollow Non-Followers</h5>
                    <button type="button" class="close" data-bs-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">×</span>
                    </button>
                </div>
                <div class="modal-body" id="unfollow-non-followers-body">
                    <div id="unfollow-init-view">
                        <div id="unfollow-init-default">
                            <p>Scan your following and followers lists to find people who don't follow you back.</p>
                            <p class="mb-0 text-muted">This action is irreversible!</p>
                        </div>
                        <div id="unfollow-init-finished" class="d-none">
                            <p class="mb-0" id="unfollow-finished-message"></p>
                        </div>
                    </div>
                    <div id="unfollow-progress-view" class="d-none">
                        <div class="text-center mb-3">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>
                        <p class="text-center mb-2" id="unfollow-progress-text">Scanning following...</p>
                        <div class="progress">
                            <div class="progress-bar progress-bar-striped progress-bar-animated" id="unfollow-progress-bar" role="progressbar" style="width: 0%">0%</div>
                        </div>
                    </div>
                    <div id="unfollow-results-view" class="d-none">
                        <p id="unfollow-results-summary" class="mb-3"></p>
                        <div id="unfollow-results-list" class="mb-3" style="max-height: 300px; overflow-y: auto;"></div>
                    </div>
                    <div id="unfollow-executing-view" class="d-none">
                        <div class="text-center mb-3">
                            <div class="spinner-border text-danger" role="status">
                                <span class="visually-hidden">Unfollowing...</span>
                            </div>
                        </div>
                        <p class="text-center mb-2" id="unfollow-executing-text">Unfollowing 0 of 0...</p>
                        <div class="progress">
                            <div class="progress-bar bg-danger" id="unfollow-executing-bar" role="progressbar" style="width: 0%">0%</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" id="unfollow-non-followers-footer">
                    <button type="button" class="btn btn-secondary" id="unfollow-close-btn" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-warning" id="unfollow-scan-btn">Scan</button>
                    <button type="button" class="btn btn-danger d-none" id="unfollow-confirm-btn">Confirm unfollows</button>
                </div>
            </div>
        </div>
    </div>`);
});

waitForSelector("body > main > div.text-center.mb-3", (btnContainer) => {
    btnContainer.insertAdjacentHTML(
        "beforeend",
        `<button type="button" class="btn btn-warning" id="unfollow-non-followers-trigger"
                data-bs-toggle="modal" data-bs-target="#unfollow-non-followers-modal">Unfollow Non-Followers</button>`
    );
});

async function fetchPage(url) {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) {
        throw new Error(`fetch failed: ${res.status} ${res.statusText} for ${url}`);
    }
    const text = await res.text();
    return new DOMParser().parseFromString(text, "text/html");
}

function extractPlayerEntries(doc) {
    const entries = [];
    const inputs = doc.querySelectorAll('input[name="profile"]');
    for (const input of inputs) {
        const uuid = (input.getAttribute("value") || input.value || "").trim();
        const tr = input.nextElementSibling;
        if (!tr || !tr.matches("tr")) continue;
        const link = tr.querySelector('td.player-cell a[href*="/profile/"]');
        if (!link) continue;
        const skinImg = tr.querySelector('img.skin-2d');
        const skinFaceUrl = skinImg ? (skinImg.getAttribute("src") || "").trim() : null;
        const href = link.getAttribute("href") || "";
        const m = href.match(/\/profile\/([^/]+)/);
        const slug = m ? m[1] : "";
        const name = (link.childNodes[0]?.textContent ?? link.textContent ?? "").trim() || (link.getAttribute("title") || "").trim() || slug.split(".")[0] || slug;
        if (slug) entries.push({ name, slug, uuid: uuid || null, skinFaceUrl: skinFaceUrl || null });
    }
    if (entries.length > 0) return entries;

    const links = doc.querySelectorAll('td.player-cell a[href*="/profile/"]');
    return [...links]
        .map(a => {
            const href = a.getAttribute("href") || "";
            const m = href.match(/\/profile\/([^/]+)/);
            const slug = m ? m[1] : "";
            const name = (a.childNodes[0]?.textContent ?? a.textContent ?? "").trim() || (a.getAttribute("title") || "").trim() || slug.split(".")[0] || slug;
            const row = a.closest("tr");
            const skinImg = row ? row.querySelector('img.skin-2d') : null;
            const skinFaceUrl = skinImg ? (skinImg.getAttribute("src") || "").trim() : null;
            return slug ? { name, slug, uuid: null, skinFaceUrl: skinFaceUrl || null } : null;
        })
        .filter(Boolean);
}

function extractPlayerNames(doc) {
    return extractPlayerEntries(doc).map(e => e.name);
}

function getQueryParams(doc) {
    const link = doc.querySelector('.pagination a[href*="page="]') || doc.querySelector('a[href*="page="]');
    if (!link) return "&sort=date:desc";
    try {
        const url = new URL(link.href, window.location.origin);
        const params = new URLSearchParams(url.searchParams);
        params.delete("page");
        const qs = params.toString();
        return qs ? "&" + qs : "&sort=date:desc";
    } catch (_) {
        return "&sort=date:desc";
    }
}

function getLastPage(doc) {
    const last = doc.querySelector('a[rel="last"]');
    if (last) {
        const url = new URL(last.href, window.location.origin);
        const page = parseInt(url.searchParams.get("page"), 10);
        if (!isNaN(page) && page >= 1) return page;
    }

    const pageLinks = doc.querySelectorAll('.pagination a[href*="page="]');
    let maxPage = 1;
    for (const link of pageLinks) {
        try {
            const url = new URL(link.href, window.location.origin);
            const page = parseInt(url.searchParams.get("page"), 10);
            if (!isNaN(page) && page > maxPage) maxPage = page;
        } catch (_) {}
    }
    return maxPage;
}

function getProfileBasePath(pathname) {
    return pathname.replace(/\/following\/?$|\/followers\/?$/, "");
}

function getFollowingUrl(pathname) {
    return getProfileBasePath(pathname) + "/following";
}

function getFollowersUrl(pathname) {
    return getProfileBasePath(pathname) + "/followers";
}

async function fetchAllPlayers(baseUrl, label, onProgress) {
    const entries = [];
    const fullUrl = baseUrl.startsWith("/") ? window.location.origin + baseUrl : baseUrl;

    const firstPageUrl = fullUrl + (fullUrl.includes("?") ? "&" : "?") + "sort=date:desc";
    const firstDoc = await fetchPage(firstPageUrl);
    const firstBatch = extractPlayerEntries(firstDoc);
    entries.push(...firstBatch);

    const lastPage = getLastPage(firstDoc);
    let queryParams = getQueryParams(firstDoc);
    if (!queryParams) queryParams = "&sort=date:desc";

    onProgress?.(label, 1, Math.max(1, lastPage));

    const sep = fullUrl.includes("?") ? "&" : "?";
    for (let i = 2; i <= lastPage; i++) {
        const url = `${fullUrl}${sep}page=${i}${queryParams}`;
        const doc = await fetchPage(url);
        entries.push(...extractPlayerEntries(doc));
        onProgress?.(label, i, lastPage);
    }

    let page = lastPage + 1;
    while (true) {
        const pageUrl = `${fullUrl}${sep}page=${page}${queryParams}`;
        const doc = await fetchPage(pageUrl);
        const batch = extractPlayerEntries(doc);
        if (batch.length === 0) break;
        entries.push(...batch);
        onProgress?.(label, page, page);
        page++;
    }

    return entries;
}

function showView(viewId) {
    ["unfollow-init-view", "unfollow-progress-view", "unfollow-results-view", "unfollow-executing-view"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("d-none", id !== viewId);
    });
}

function resetScanner() {
    showView("unfollow-init-view");
    const initView = document.getElementById("unfollow-init-view");
    if (initView) {
        initView.innerHTML = `<p>Scan your following and followers lists to find people who don't follow you back.</p>
            <p class="mb-0 text-muted">This action is irreversible!</p>`;
    }
    const progressBar = document.getElementById("unfollow-progress-bar");
    if (progressBar) {
        progressBar.style.width = "0%";
        progressBar.textContent = "0%";
    }
    const execBar = document.getElementById("unfollow-executing-bar");
    if (execBar) {
        execBar.style.width = "0%";
        execBar.textContent = "0%";
    }
    const summary = document.getElementById("unfollow-results-summary");
    if (summary) summary.textContent = "";
    const listEl = document.getElementById("unfollow-results-list");
    if (listEl) listEl.innerHTML = "";
    const scanBtn = document.getElementById("unfollow-scan-btn");
    if (scanBtn) {
        scanBtn.classList.remove("d-none");
        scanBtn.disabled = false;
    }
    const confirmBtn = document.getElementById("unfollow-confirm-btn");
    if (confirmBtn) {
        confirmBtn.classList.add("d-none");
        confirmBtn.disabled = false;
        delete confirmBtn.dataset.nonFollowers;
        delete confirmBtn.dataset.followingUrl;
    }
    const cancelBtn = document.querySelector("#unfollow-non-followers-footer .btn-secondary");
    if (cancelBtn) cancelBtn.textContent = "Cancel";
}

function showFinishedState(doneCount) {
    showView("unfollow-init-view");
    const initView = document.getElementById("unfollow-init-view");
    if (initView) {
        initView.innerHTML = `<p class="mb-0">Unfollowed ${doneCount} user(s). You may need to refresh the page to see the update.</p>`;
    }
    document.getElementById("unfollow-scan-btn")?.classList.add("d-none");
    document.getElementById("unfollow-confirm-btn")?.classList.add("d-none");
    const cancelBtn = document.querySelector("#unfollow-non-followers-footer .btn-secondary");
    if (cancelBtn) cancelBtn.textContent = "Close";
}

function setProgress(phase, current, total) {
    const text = document.getElementById("unfollow-progress-text");
    const bar = document.getElementById("unfollow-progress-bar");
    if (text) text.textContent = `${phase}: page ${current} of ${total}`;
    if (bar) {
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        bar.style.width = pct + "%";
        bar.textContent = pct + "%";
    }
}

async function unfollowProfile(uuid, followingPageUrl) {
    const url = followingPageUrl.startsWith("/") ? window.location.origin + followingPageUrl : followingPageUrl;
    const formData = new URLSearchParams();
    formData.append("profile", uuid);
    formData.append("task", "unfollow");
    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
    });
    return res.ok;
}

waitForSelector("#unfollow-scan-btn", (scanBtn) => {
    scanBtn.addEventListener("click", async () => {
        const pathname = window.location.pathname;
        const followingUrl = getFollowingUrl(pathname);
        const followersUrl = getFollowersUrl(pathname);

        const modal = document.getElementById("unfollow-non-followers-modal");
        const footer = document.getElementById("unfollow-non-followers-footer");
        const confirmBtn = document.getElementById("unfollow-confirm-btn");

        showView("unfollow-progress-view");
        scanBtn.disabled = true;

        const totalSteps = 2;
        let currentPhase = 0;
        let followingTotal = 1;
        let followingCurrent = 0;

        const onProgress = (label, current, total) => {
            followingCurrent = current;
            followingTotal = total;
            const phaseNum = label === "following" ? 1 : 2;
            const overall = (phaseNum - 1) * 50 + (phaseNum === 1 ? (total > 0 ? (current / total) * 50 : 0) : (total > 0 ? (current / total) * 50 : 50));
            setProgress(label, current, total);
            const bar = document.getElementById("unfollow-progress-bar");
            if (bar) {
                const pct = Math.min(100, Math.round(overall));
                bar.style.width = pct + "%";
                bar.textContent = pct + "%";
            }
        };

        try {
            const following = await fetchAllPlayers(followingUrl, "following", onProgress);
            const followers = await fetchAllPlayers(followersUrl, "followers", onProgress);

            const followerSet = new Set(followers.map(e => e.name));
            const nonFollowers = following.filter(e => !followerSet.has(e.name) && e.uuid);

            showView("unfollow-results-view");
            scanBtn.disabled = false;

            const summary = document.getElementById("unfollow-results-summary");
            const listEl = document.getElementById("unfollow-results-list");

            if (summary) {
                summary.textContent = nonFollowers.length === 0
                    ? "No non-followers found. Everyone you follow follows you back!"
                    : `Found ${nonFollowers.length} non-follower(s) who you can unfollow:`;
            }

            if (listEl) {
                listEl.innerHTML = nonFollowers.length === 0
                    ? ""
                    : "<ul class=\"list-group list-group-flush\">" + nonFollowers.map(u => {
                        const face = u.skinFaceUrl
                            ? `<img class="skin-2d me-2" src="${u.skinFaceUrl.replace(/"/g, "&quot;")}" width="24" height="24" alt="">`
                            : "";
                        const safeName = (u.name || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
                        const safeSlug = (u.slug || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
                        return `<li class="list-group-item d-flex align-items-center">
                            ${face}<a href="/profile/${safeSlug}" target="_blank" rel="noopener">${safeName}</a>
                        </li>`;
                    }).join("") + "</ul>";
            }

            if (confirmBtn) {
                confirmBtn.classList.toggle("d-none", nonFollowers.length === 0);
                confirmBtn.dataset.nonFollowers = JSON.stringify(nonFollowers);
                confirmBtn.dataset.followingUrl = followingUrl;
            }
        } catch (err) {
            showView("unfollow-init-view");
            scanBtn.disabled = false;
            alert("Scan failed: " + (err.message || err));
        }
    });
});

waitForSelector("#unfollow-confirm-btn", (confirmBtn) => {
    confirmBtn.addEventListener("click", async () => {
        const data = confirmBtn.dataset.nonFollowers;
        if (!data) return;

        let nonFollowers;
        let followingUrl;
        try {
            nonFollowers = JSON.parse(data);
            followingUrl = confirmBtn.dataset.followingUrl || getFollowingUrl(window.location.pathname);
        } catch (_) {
            return;
        }

        if (nonFollowers.length === 0) return;

        showView("unfollow-executing-view");
        confirmBtn.disabled = true;

        const textEl = document.getElementById("unfollow-executing-text");
        const barEl = document.getElementById("unfollow-executing-bar");
        const total = nonFollowers.length;
        let done = 0;

        for (let i = 0; i < nonFollowers.length; i++) {
            const u = nonFollowers[i];
            if (textEl) textEl.textContent = `Unfollowing ${i + 1} of ${total}: ${u.name}`;
            if (u.uuid) await unfollowProfile(u.uuid, followingUrl);
            done++;
            if (barEl) {
                const pct = Math.round((done / total) * 100);
                barEl.style.width = pct + "%";
                barEl.textContent = pct + "%";
            }
            await new Promise(r => setTimeout(r, 300));
        }

        const initView = document.getElementById("unfollow-init-view");
        if (initView) {
            initView.innerHTML = `<p class="mb-0">Unfollowed ${done} user(s). You may need to refresh the page to see the update.</p>`;
        }
        showView("unfollow-init-view");
        document.getElementById("unfollow-scan-btn").classList.add("d-none");
        confirmBtn.classList.add("d-none");
        const cancelBtn = document.querySelector("#unfollow-non-followers-footer .btn-secondary");
        if (cancelBtn) cancelBtn.textContent = "Close";
    });
});

function resetScanner() {
    const initView = document.getElementById("unfollow-init-view");
    if (initView) {
        initView.innerHTML = `<p>Scan your following and followers lists to find people who don't follow you back.</p>
                        <p class="mb-0 text-muted">This action is irreversible!</p>`;
    }
    showView("unfollow-init-view");
    const progressBar = document.getElementById("unfollow-progress-bar");
    if (progressBar) {
        progressBar.style.width = "0%";
        progressBar.textContent = "0%";
    }
    const execBar = document.getElementById("unfollow-executing-bar");
    if (execBar) {
        execBar.style.width = "0%";
        execBar.textContent = "0%";
    }
    document.getElementById("unfollow-results-summary").textContent = "";
    document.getElementById("unfollow-results-list").innerHTML = "";
    document.getElementById("unfollow-scan-btn").classList.remove("d-none");
    document.getElementById("unfollow-scan-btn").disabled = false;
    const confirmBtn = document.getElementById("unfollow-confirm-btn");
    if (confirmBtn) {
        confirmBtn.classList.add("d-none");
        confirmBtn.disabled = false;
        delete confirmBtn.dataset.nonFollowers;
        delete confirmBtn.dataset.followingUrl;
    }
    const cancelBtn = document.querySelector("#unfollow-non-followers-footer .btn-secondary");
    if (cancelBtn) cancelBtn.textContent = "Cancel";
}

waitForSelector("#unfollow-non-followers-modal", (modal) => {
    modal.addEventListener("shown.bs.modal", resetScanner);
});
