/**
 * Elderos — Homepage Dynamic Content
 * Fetches news preview and live stats from the Hub API.
 */
(function () {
    'use strict';

    const API_BASE = (() => {
        const h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1' || h === '' || window.location.protocol === 'file:')
            return 'http://localhost:8084';
        return 'https://api.elderos.io';
    })();

    const CATEGORY_COLORS = {
        ANNOUNCEMENT: 'announcement',
        UPDATE: 'update',
        EVENT: 'event',
        PATCH: 'patch',
    };

    function formatDate(dateStr) {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
            .replace(/\n{2,}/g, ' ')
            .replace(/\n/g, ' ')
            .trim();
    }

    // === News Preview ===

    async function loadNewsPreview() {
        const section = document.getElementById('news-preview');
        const grid = document.getElementById('news-preview-grid');
        if (!section || !grid) return;

        try {
            const res = await fetch(`${API_BASE}/api/news?limit=3`);
            if (!res.ok) return;

            const data = await res.json();
            const posts = data.posts || data.news || [];

            if (posts.length === 0) return;

            grid.innerHTML = '';

            for (const post of posts) {
                const card = document.createElement('a');
                card.className = 'news-card reveal';
                card.href = `https://news.elderos.io/?post=${post.id}`;

                const category = (post.category || 'update').toUpperCase();
                const badgeClass = CATEGORY_COLORS[category] || 'update';
                const excerpt = stripMarkdown(post.content || post.body || '');

                card.innerHTML = `
                    <span class="news-card-badge ${badgeClass}">${escapeHtml((post.category || 'Update').toLowerCase())}</span>
                    <div class="news-card-title">${escapeHtml(post.title)}</div>
                    <div class="news-card-excerpt">${escapeHtml(excerpt)}</div>
                    <div class="news-card-date">${formatDate(post.createdAt || post.publishedAt)}</div>
                `;

                grid.appendChild(card);
            }

            section.style.display = '';

            // Observe new reveal elements
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry, i) => {
                    if (entry.isIntersecting) {
                        const siblings = entry.target.parentElement.querySelectorAll('.reveal');
                        const index = Array.from(siblings).indexOf(entry.target);
                        setTimeout(() => entry.target.classList.add('visible'), index * 80);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

            grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));
            section.querySelectorAll('.section-header .reveal').forEach(el => observer.observe(el));

        } catch (e) {
            // Silent fail — section stays hidden
        }
    }

    // === Live Stats ===

    async function loadLiveStats() {
        try {
            const res = await fetch(`${API_BASE}/api/stats/public`);
            if (!res.ok) return;

            const data = await res.json();

            const setStatValue = (id, value) => {
                const el = document.getElementById(id);
                if (el && value != null) el.textContent = value.toLocaleString();
            };

            setStatValue('stat-players-online', data.playersOnline);
            setStatValue('stat-total-accounts', data.totalAccounts);
            setStatValue('stat-worlds-online', data.worldsOnline);

        } catch (e) {
            // Silent fail — stats keep default "—" values
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // === Init ===

    function init() {
        loadNewsPreview();
        loadLiveStats();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
