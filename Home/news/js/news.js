/**
 * Elderos — News Page
 * List view with category filters + single post view with markdown rendering.
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

            const res = await fetch(url);
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
        card.addEventListener('click', () => {
            history.pushState({ postId: post.id }, '', `/news/?post=${post.id}`);
            showPostView(post.id);
        });

        const category = (post.category || 'UPDATE').toUpperCase();
        const badgeClass = getBadgeClass(category);
        const badgeLabel = (post.categoryName || post.category || 'Update').toLowerCase();
        const excerpt = stripMarkdown(post.content || '');
        const dateStr = formatDate(post.publishedAt || post.createdAt);

        let pinnedHTML = '';
        if (post.pinned) {
            pinnedHTML = `<span class="news-post-card-pinned">&#9733; Pinned</span>`;
        }

        card.innerHTML = `
            <div class="news-post-card-top">
                <span class="news-badge ${badgeClass}">${escapeHtml(badgeLabel)}</span>
                ${pinnedHTML}
                <span class="news-post-card-date">${dateStr}</span>
            </div>
            <div class="news-post-card-title">${escapeHtml(post.title)}</div>
            <div class="news-post-card-excerpt">${escapeHtml(excerpt)}</div>
            <div class="news-post-card-author">By ${escapeHtml(post.authorUsername || 'Staff')}</div>
        `;

        return card;
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

        try {
            const res = await fetch(`${API_BASE}/api/news/${encodeURIComponent(postId)}`);
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
                history.pushState({}, '', '/news/');
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
