/**
 * Elderos — News Page
 * List view with category filters + single post view with markdown rendering.
 * Includes like system (1 per user, requires auth).
 */
(function () {
    'use strict';

    const API_BASE = (() => {
        const h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1' || h === '' || window.location.protocol === 'file:')
            return 'http://localhost:8084';
        return 'https://api.elderos.io';
    })();

    const POSTS_PER_PAGE = 10;

    const CATEGORY_BADGE = {
        ANNOUNCEMENT: 'announcement',
        UPDATE: 'update',
        EVENT: 'event',
        PATCH: 'patch',
    };

    // State
    let currentCategory = '';
    let currentPage = 0;
    let totalPosts = 0;
    let loadedPosts = [];

    // === Utilities ===

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatDate(timestamp) {
        if (!timestamp) return '';
        try {
            const d = new Date(timestamp);
            return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } catch {
            return '';
        }
    }

    function stripMarkdown(text) {
        if (!text) return '';
        return text
            .replace(/#{1,6}\s/g, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
            .replace(/`{1,3}[^`]*`{1,3}/g, '')
            .replace(/>\s/g, '')
            .replace(/[-*+]\s/g, '')
            .replace(/!\[\d+\](?:\([^)]*\))?/g, '')
            .replace(/\n{2,}/g, ' ')
            .replace(/\n/g, ' ')
            .trim();
    }

    function getBadgeClass(category) {
        return CATEGORY_BADGE[(category || 'UPDATE').toUpperCase()] || 'update';
    }

    function formatLikeCount(count) {
        if (!count || count <= 0) return '';
        if (count >= 1000) return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return String(count);
    }

    /** Build fetch headers, including auth token if available. */
    function buildHeaders(json) {
        const headers = {};
        if (typeof Auth !== 'undefined' && Auth.getToken()) {
            headers['Authorization'] = 'Bearer ' + Auth.getToken();
        }
        if (json) headers['Content-Type'] = 'application/json';
        return headers;
    }

    // === Like API ===

    async function toggleLike(postId, currentlyLiked) {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            // Trigger login modal via navbar
            if (typeof Navbar !== 'undefined' && Navbar.openLoginModal) {
                Navbar.openLoginModal();
            } else {
                // Fallback: click the navbar login button
                const loginBtn = document.querySelector('.nav-auth-login');
                if (loginBtn) loginBtn.click();
            }
            return null;
        }

        try {
            const method = currentlyLiked ? 'DELETE' : 'POST';
            const res = await fetch(`${API_BASE}/api/news/${encodeURIComponent(postId)}/like`, {
                method,
                headers: buildHeaders(false),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error('Like error:', err.message || res.status);
                return null;
            }

            return await res.json();
        } catch (e) {
            console.error('Like request failed:', e);
            return null;
        }
    }

    // === List View ===

    async function loadPosts(category, page, append) {
        const grid = document.getElementById('news-grid');
        const loading = document.getElementById('news-loading');
        const empty = document.getElementById('news-empty');
        const loadMore = document.getElementById('news-load-more');

        if (!append) {
            grid.innerHTML = '';
            loading.style.display = '';
            empty.style.display = 'none';
            loadMore.style.display = 'none';
        }

        try {
            let url = `${API_BASE}/api/news?limit=${POSTS_PER_PAGE}&page=${page}`;
            if (category) url += `&category=${category}`;

            const res = await fetch(url, { headers: buildHeaders(false) });
            if (!res.ok) throw new Error('Failed to fetch');

            const data = await res.json();
            const posts = data.posts || [];
            totalPosts = data.total || 0;

            loading.style.display = 'none';

            if (!append) {
                loadedPosts = posts;
            } else {
                loadedPosts = loadedPosts.concat(posts);
            }

            if (loadedPosts.length === 0) {
                empty.style.display = '';
                return;
            }

            for (const post of posts) {
                grid.appendChild(createPostCard(post));
            }

            // Show "Load More" if there are more posts
            if (loadedPosts.length < totalPosts) {
                loadMore.style.display = '';
            } else {
                loadMore.style.display = 'none';
            }

        } catch (e) {
            loading.style.display = 'none';
            if (loadedPosts.length === 0) {
                empty.textContent = 'Failed to load news. Please try again later.';
                empty.style.display = '';
            }
        }
    }

    function createPostCard(post) {
        const card = document.createElement('div');
        card.className = 'news-post-card';

        const category = (post.category || 'UPDATE').toUpperCase();
        const badgeClass = getBadgeClass(category);
        const badgeLabel = (post.categoryName || post.category || 'Update').toLowerCase();
        const excerpt = stripMarkdown(post.content || '');
        const dateStr = formatDate(post.publishedAt || post.createdAt);

        let pinnedHTML = '';
        if (post.pinned) {
            pinnedHTML = `<span class="news-post-card-pinned">&#9733; Pinned</span>`;
        }

        const likeCount = post.likeCount || 0;
        const userLiked = post.userLiked || false;
        const countStr = formatLikeCount(likeCount);

        card.innerHTML = `
            <div class="news-post-card-top">
                <span class="news-badge ${badgeClass}">${escapeHtml(badgeLabel)}</span>
                ${pinnedHTML}
                <span class="news-post-card-date">${dateStr}</span>
            </div>
            <div class="news-post-card-title">${escapeHtml(post.title)}</div>
            <div class="news-post-card-excerpt">${escapeHtml(excerpt)}</div>
            <div class="news-post-card-bottom">
                <span class="news-post-card-author">By ${escapeHtml(post.authorUsername || 'Staff')}</span>
                <button class="news-like-btn-inline${userLiked ? ' liked' : ''}" data-post-id="${escapeHtml(post.id)}" data-liked="${userLiked}" data-count="${likeCount}">
                    <svg class="news-like-icon" viewBox="0 0 24 24" fill="${userLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    <span class="news-like-count">${countStr}</span>
                </button>
            </div>
        `;

        // Card click navigates to post — but not if clicking the like button
        card.addEventListener('click', (e) => {
            if (e.target.closest('.news-like-btn-inline')) return;
            history.pushState({ postId: post.id }, '', '/?post=' + post.id);
            showPostView(post.id);
        });

        // Like button click
        const likeBtn = card.querySelector('.news-like-btn-inline');
        likeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const isLiked = likeBtn.dataset.liked === 'true';
            // Optimistic update
            const newLiked = !isLiked;
            const newCount = parseInt(likeBtn.dataset.count || '0') + (newLiked ? 1 : -1);
            updateInlineLikeBtn(likeBtn, newLiked, Math.max(0, newCount));

            const result = await toggleLike(post.id, isLiked);
            if (result && result.success) {
                updateInlineLikeBtn(likeBtn, result.liked, result.likeCount);
            } else if (result === null && (typeof Auth === 'undefined' || !Auth.isLoggedIn())) {
                // Reverted — user wasn't logged in
                updateInlineLikeBtn(likeBtn, isLiked, parseInt(likeBtn.dataset.count || '0'));
            }
        });

        return card;
    }

    function updateInlineLikeBtn(btn, liked, count) {
        btn.dataset.liked = String(liked);
        btn.dataset.count = String(count);
        btn.classList.toggle('liked', liked);
        const icon = btn.querySelector('.news-like-icon');
        if (icon) icon.setAttribute('fill', liked ? 'currentColor' : 'none');
        const countEl = btn.querySelector('.news-like-count');
        if (countEl) countEl.textContent = formatLikeCount(count);
    }

    // === Post View ===

    async function showPostView(postId) {
        const listView = document.getElementById('news-list-view');
        const postView = document.getElementById('news-post-view');

        listView.style.display = 'none';
        postView.style.display = '';

        // Update page title
        document.title = 'Loading... — Elderos News';

        // Reset
        document.getElementById('news-article-meta').innerHTML = '';
        document.getElementById('news-article-title').textContent = '';
        document.getElementById('news-article-content').innerHTML = '<div class="news-loading">Loading article...</div>';
        document.getElementById('news-article-actions').innerHTML = '';

        try {
            const res = await fetch(`${API_BASE}/api/news/${encodeURIComponent(postId)}`, {
                headers: buildHeaders(false),
            });
            if (!res.ok) throw new Error('Post not found');

            const data = await res.json();
            if (!data.success || !data.post) throw new Error('Invalid response');

            renderPost(data.post);
        } catch (e) {
            document.getElementById('news-article-content').innerHTML =
                '<div class="news-empty">Post not found or failed to load.</div>';
            document.title = 'Not Found — Elderos News';
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderPost(post) {
        const category = (post.category || 'UPDATE').toUpperCase();
        const badgeClass = getBadgeClass(category);
        const badgeLabel = (post.categoryName || post.category || 'Update').toLowerCase();
        const dateStr = formatDate(post.publishedAt || post.createdAt);

        // Meta
        let metaHTML = `<span class="news-badge ${badgeClass}">${escapeHtml(badgeLabel)}</span>`;
        metaHTML += `<span class="news-article-meta-separator"></span>`;
        metaHTML += `<span class="news-article-meta-date">${dateStr}</span>`;
        if (post.authorUsername) {
            metaHTML += `<span class="news-article-meta-separator"></span>`;
            metaHTML += `<span class="news-article-meta-author">By ${escapeHtml(post.authorUsername)}</span>`;
        }

        document.getElementById('news-article-meta').innerHTML = metaHTML;
        document.getElementById('news-article-title').textContent = post.title;
        document.title = `${post.title} — Elderos News`;

        // Render markdown content
        let content = post.content || '';

        // Replace image references ![N] with actual image URLs from post.images
        if (post.images && post.images.length > 0) {
            content = content.replace(/!\[(\d+)\](?:\(([^)]*)\))?/g, (match, idxStr, caption) => {
                const idx = parseInt(idxStr);
                const img = post.images.find(i => i.id === idx) || post.images[idx];
                if (img && img.url) {
                    const alt = caption || img.filename || 'image';
                    return `![${alt}](${img.url})`;
                }
                return match;
            });
        }

        // Configure marked
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                gfm: true,
            });

            let rendered = marked.parse(content);

            // Sanitize with DOMPurify
            if (typeof DOMPurify !== 'undefined') {
                rendered = DOMPurify.sanitize(rendered, {
                    ADD_TAGS: ['img'],
                    ADD_ATTR: ['src', 'alt', 'title', 'href', 'target'],
                });
            }

            document.getElementById('news-article-content').innerHTML = rendered;
        } else {
            // Fallback: basic whitespace preservation
            document.getElementById('news-article-content').innerHTML =
                `<p>${escapeHtml(content).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
        }

        // Like button below article
        renderArticleLikeButton(post);
    }

    function renderArticleLikeButton(post) {
        const container = document.getElementById('news-article-actions');
        if (!container) return;

        const likeCount = post.likeCount || 0;
        const userLiked = post.userLiked || false;
        const countStr = formatLikeCount(likeCount);

        container.innerHTML = `
            <div class="news-article-like-section">
                <button class="news-like-btn${userLiked ? ' liked' : ''}" id="article-like-btn"
                        data-post-id="${escapeHtml(post.id)}" data-liked="${userLiked}" data-count="${likeCount}">
                    <svg class="news-like-icon" viewBox="0 0 24 24" fill="${userLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    <span class="news-like-label">${userLiked ? 'Liked' : 'Like'}</span>
                    <span class="news-like-count">${countStr}</span>
                </button>
            </div>
        `;

        const btn = document.getElementById('article-like-btn');
        btn.addEventListener('click', async () => {
            const isLiked = btn.dataset.liked === 'true';
            const newLiked = !isLiked;
            const newCount = parseInt(btn.dataset.count || '0') + (newLiked ? 1 : -1);
            updateArticleLikeBtn(btn, newLiked, Math.max(0, newCount));

            const result = await toggleLike(post.id, isLiked);
            if (result && result.success) {
                updateArticleLikeBtn(btn, result.liked, result.likeCount);
            } else if (result === null && (typeof Auth === 'undefined' || !Auth.isLoggedIn())) {
                updateArticleLikeBtn(btn, isLiked, parseInt(btn.dataset.count || '0'));
            }
        });
    }

    function updateArticleLikeBtn(btn, liked, count) {
        btn.dataset.liked = String(liked);
        btn.dataset.count = String(count);
        btn.classList.toggle('liked', liked);
        const icon = btn.querySelector('.news-like-icon');
        if (icon) icon.setAttribute('fill', liked ? 'currentColor' : 'none');
        const label = btn.querySelector('.news-like-label');
        if (label) label.textContent = liked ? 'Liked' : 'Like';
        const countEl = btn.querySelector('.news-like-count');
        if (countEl) countEl.textContent = formatLikeCount(count);
    }

    function showListView() {
        const listView = document.getElementById('news-list-view');
        const postView = document.getElementById('news-post-view');

        postView.style.display = 'none';
        listView.style.display = '';
        document.title = 'News — Elderos';
    }

    // === Filter Handling ===

    function initFilters() {
        const filters = document.getElementById('news-filters');
        if (!filters) return;

        filters.addEventListener('click', (e) => {
            const btn = e.target.closest('.news-filter');
            if (!btn) return;

            // Update active state
            filters.querySelectorAll('.news-filter').forEach(f => f.classList.remove('active'));
            btn.classList.add('active');

            // Load filtered posts
            currentCategory = btn.dataset.category || '';
            currentPage = 0;
            loadPosts(currentCategory, 0, false);
        });
    }

    // === Load More ===

    function initLoadMore() {
        const btn = document.getElementById('news-load-more-btn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            currentPage++;
            loadPosts(currentCategory, currentPage, true);
        });
    }

    // === Navigation ===

    function initNavigation() {
        // Back link
        const backLink = document.getElementById('news-back-link');
        if (backLink) {
            backLink.addEventListener('click', (e) => {
                e.preventDefault();
                history.pushState({}, '', '/');
                showListView();
            });
        }

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            const postId = new URLSearchParams(window.location.search).get('post');
            if (postId) {
                showPostView(postId);
            } else {
                showListView();
            }
        });
    }

    // === Init ===

    function init() {
        initFilters();
        initLoadMore();
        initNavigation();

        const postId = new URLSearchParams(window.location.search).get('post');
        if (postId) {
            showPostView(postId);
        } else {
            loadPosts('', 0, false);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
