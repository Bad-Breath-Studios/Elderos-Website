/* ============================================================
   ELDEROS STAFF PANEL - NEWS MODULE
   ============================================================ */

const News = {
    // State
    posts: [],
    allPosts: [],
    currentPage: 1,
    totalPages: 1,
    total: 0,
    isLoading: false,

    // Filter state
    filters: {
        category: 'all',
        status: 'all',
        search: ''
    },

    // Editor state
    editor: {
        active: false,
        postId: null,
        images: [],
        heroImageId: null,
        unsaved: false
    },

    // Elements
    elements: {},

    /**
     * Initialize news module
     */
    init() {
        this.cacheElements();
        this.setupEventListeners();
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            list: document.getElementById('newsList'),
            createBtn: document.getElementById('createNewsBtn')
        };
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.elements.createBtn?.addEventListener('click', () => {
            this.openEditor();
        });
    },

    /**
     * Called when news page is loaded
     */
    async onPageLoad() {
        if (this.editor.active) return;
        await this.loadPosts();
    },

    /**
     * Load news posts
     */
    async loadPosts() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();

        try {
            const response = await API.news.getAll(this.currentPage, 50);
            this.allPosts = response.posts || [];
            this.total = response.total || this.allPosts.length;
            this.applyFilters();
        } catch (error) {
            Toast.error(error.message || 'Failed to load news');
            this.showError();
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Apply client-side filters
     */
    applyFilters() {
        let filtered = [...this.allPosts];

        // Category filter
        if (this.filters.category !== 'all') {
            filtered = filtered.filter(p =>
                (p.category || '').toLowerCase() === this.filters.category.toLowerCase()
            );
        }

        // Status filter
        if (this.filters.status !== 'all') {
            filtered = filtered.filter(p =>
                (p.status || '').toLowerCase() === this.filters.status.toLowerCase()
            );
        }

        // Search filter
        if (this.filters.search) {
            const q = this.filters.search.toLowerCase();
            filtered = filtered.filter(p =>
                (p.title || '').toLowerCase().includes(q) ||
                (p.content || '').toLowerCase().includes(q)
            );
        }

        this.posts = filtered;
        this.renderPage();
    },

    /**
     * Render the full page (filters + list + pagination)
     */
    renderPage() {
        if (!this.elements.list) return;

        const filterHtml = this.renderFilterBar();
        const postsHtml = this.posts.length === 0
            ? this.renderEmptyState()
            : this.posts.map(post => this.renderPostCard(post)).join('');
        const paginationHtml = this.totalPages > 1 ? this.renderPagination() : '';

        this.elements.list.innerHTML = filterHtml + postsHtml + paginationHtml;

        // Attach filter listeners
        this._attachFilterListeners();
    },

    /**
     * Render filter bar
     */
    renderFilterBar() {
        const categories = [
            { value: 'all', label: 'All' },
            { value: 'UPDATE', label: 'Update' },
            { value: 'ANNOUNCEMENT', label: 'Announcement' },
            { value: 'EVENT', label: 'Event' },
            { value: 'MAINTENANCE', label: 'Maintenance' }
        ];

        const statuses = [
            { value: 'all', label: 'All' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'DRAFT', label: 'Drafts' }
        ];

        return `
            <div class="news-filter-bar">
                <div class="news-filter-group">
                    <label class="news-filter-label">Category</label>
                    <div class="news-filter-pills">
                        ${categories.map(c => `
                            <button class="news-filter-pill ${this.filters.category === c.value ? 'active' : ''}"
                                data-filter="category" data-value="${c.value}">${c.label}</button>
                        `).join('')}
                    </div>
                </div>
                <div class="news-filter-group">
                    <label class="news-filter-label">Status</label>
                    <div class="news-filter-pills">
                        ${statuses.map(s => `
                            <button class="news-filter-pill ${this.filters.status === s.value ? 'active' : ''}"
                                data-filter="status" data-value="${s.value}">${s.label}</button>
                        `).join('')}
                    </div>
                </div>
                <div class="news-filter-group news-filter-search">
                    <input type="text" class="editor-input" id="newsSearchInput"
                        placeholder="Search by title..." value="${this._escapeHtml(this.filters.search)}">
                </div>
            </div>
        `;
    },

    /**
     * Attach filter event listeners
     */
    _attachFilterListeners() {
        document.querySelectorAll('.news-filter-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                const value = btn.dataset.value;
                this.filters[filter] = value;
                this.applyFilters();
            });
        });

        const searchInput = document.getElementById('newsSearchInput');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.filters.search = searchInput.value;
                    this.applyFilters();
                }, 300);
            });
        }
    },

    /**
     * Render empty state
     */
    renderEmptyState() {
        return `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/>
                </svg>
                <div class="empty-state-title">No news posts found</div>
                <div class="empty-state-text">
                    ${this.filters.category !== 'all' || this.filters.status !== 'all' || this.filters.search
                        ? 'Try adjusting your filters'
                        : 'Create your first news post to get started'}
                </div>
            </div>
        `;
    },

    /**
     * Render pagination
     */
    renderPagination() {
        return `
            <div class="news-pagination">
                <button class="btn btn-secondary btn-sm" ${this.currentPage <= 1 ? 'disabled' : ''}
                    onclick="News.changePage(${this.currentPage - 1})">Previous</button>
                <span class="news-pagination-info">Page ${this.currentPage} of ${this.totalPages}</span>
                <button class="btn btn-secondary btn-sm" ${this.currentPage >= this.totalPages ? 'disabled' : ''}
                    onclick="News.changePage(${this.currentPage + 1})">Next</button>
            </div>
        `;
    },

    changePage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.loadPosts();
    },

    /**
     * Show loading state
     */
    showLoading() {
        if (this.elements.list) {
            this.elements.list.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; padding: 48px;">
                    <div class="spinner spinner-lg"></div>
                </div>
            `;
        }
    },

    /**
     * Show error state
     */
    showError() {
        if (this.elements.list) {
            this.elements.list.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <div class="empty-state-title">Failed to load news</div>
                    <div class="empty-state-text">
                        <button class="btn btn-secondary" onclick="News.loadPosts()">Try Again</button>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Render a single post card
     */
    renderPostCard(post) {
        const canEdit = Auth.hasPermission(CONFIG.PERMISSIONS.NEWS_CREATE);
        const canManage = Auth.hasPermission(CONFIG.PERMISSIONS.NEWS_MANAGE);

        const categoryBadge = this.getCategoryBadge(post.category);
        const statusBadge = post.status === 'DRAFT'
            ? '<span class="news-status-badge draft">Draft</span>'
            : '<span class="news-status-badge published">Published</span>';

        // Resolve hero image URL
        let heroImgHtml = '';
        if (post.heroImageId && post.images && post.images.length) {
            const heroImg = post.images.find(i => i.id === post.heroImageId);
            if (heroImg) {
                heroImgHtml = `<img src="${heroImg.url}" alt="${this._escapeHtml(post.title)}" onerror="this.parentElement.innerHTML=News._imagePlaceholderSvg()">`;
            }
        }
        if (!heroImgHtml) {
            heroImgHtml = `<div class="news-card-image-placeholder">${News._imagePlaceholderSvg()}</div>`;
        }

        // Display date: publishedAt for published, updatedAt for drafts
        const displayDate = post.status === 'PUBLISHED' && post.publishedAt
            ? post.publishedAt
            : post.updatedAt || post.createdAt;

        // Quick actions
        let quickActions = '';
        if (post.status === 'DRAFT' && canManage) {
            quickActions += `<button class="btn btn-success btn-sm" onclick="News.publishPost('${post.id}')" title="Publish">Publish</button>`;
        }
        if (post.status === 'PUBLISHED' && canManage) {
            quickActions += `<button class="btn btn-secondary btn-sm" onclick="News.unpublishPost('${post.id}')" title="Unpublish">Unpublish</button>`;
        }
        if (canManage) {
            quickActions += `<button class="btn btn-secondary btn-sm" onclick="News.togglePin('${post.id}')" title="${post.pinned ? 'Unpin' : 'Pin'}">${post.pinned ? 'Unpin' : 'Pin'}</button>`;
        }

        return `
            <div class="news-card" data-post-id="${post.id}">
                <div class="news-card-image">
                    ${heroImgHtml}
                </div>
                <div class="news-card-content">
                    <div class="news-card-header">
                        <div class="news-card-badges">
                            ${categoryBadge}
                            ${statusBadge}
                            ${post.pinned ? '<span class="badge badge-accent">Pinned</span>' : ''}
                            ${post.discordSync ? '<span class="news-status-badge discord">Discord</span>' : ''}
                        </div>
                        <div class="news-card-actions">
                            ${quickActions}
                            ${canEdit ? `
                            <button class="btn btn-secondary btn-sm" onclick="News.openEditor('${post.id}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                                Edit
                            </button>
                            ` : ''}
                            ${canManage ? `
                            <button class="btn btn-secondary btn-sm" onclick="News.deletePost('${post.id}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                            ` : ''}
                        </div>
                    </div>
                    <h3 class="news-card-title">${this._escapeHtml(post.title)}</h3>
                    <p class="news-card-excerpt">${this._escapeHtml(this._getExcerpt(post.content))}</p>
                    <div class="news-card-meta">
                        <div class="news-card-author">
                            <div class="news-card-author-avatar">
                                ${post.authorAvatarUrl
                                    ? `<img src="${post.authorAvatarUrl}" alt="${this._escapeHtml(post.authorUsername)}">`
                                    : ''
                                }
                            </div>
                            <span>${this._escapeHtml(post.authorUsername || 'Unknown')}</span>
                        </div>
                        <div class="news-card-date">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            ${Utils.formatRelativeTime(displayDate)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Get category badge HTML
     */
    getCategoryBadge(category) {
        const categories = {
            UPDATE: { class: 'update', label: 'Update' },
            ANNOUNCEMENT: { class: 'announcement', label: 'Announcement' },
            EVENT: { class: 'event', label: 'Event' },
            MAINTENANCE: { class: 'maintenance', label: 'Maintenance' }
        };

        const cat = categories[(category || '').toUpperCase()] || { class: 'update', label: category || 'Update' };
        return `<span class="news-badge ${cat.class}">${cat.label}</span>`;
    },

    // ==================== QUICK ACTIONS ====================

    async publishPost(postId) {
        try {
            await API.news.publish(postId);
            Toast.success('Post published');
            await this.loadPosts();
        } catch (error) {
            Toast.error(error.message || 'Failed to publish');
        }
    },

    async unpublishPost(postId) {
        try {
            await API.news.unpublish(postId);
            Toast.success('Post unpublished');
            await this.loadPosts();
        } catch (error) {
            Toast.error(error.message || 'Failed to unpublish');
        }
    },

    async togglePin(postId) {
        try {
            await API.news.pin(postId);
            Toast.success('Pin toggled');
            await this.loadPosts();
        } catch (error) {
            Toast.error(error.message || 'Failed to toggle pin');
        }
    },

    /**
     * Delete a post
     */
    async deletePost(postId) {
        if (!Auth.hasPermission(CONFIG.PERMISSIONS.NEWS_MANAGE)) {
            Toast.error('You do not have permission to delete news posts');
            return;
        }

        if (!confirm('Are you sure you want to delete this news post? This action cannot be undone.')) {
            return;
        }

        try {
            await API.news.delete(postId);
            Toast.success('News post deleted');
            this.allPosts = this.allPosts.filter(p => p.id !== postId);
            this.applyFilters();
        } catch (error) {
            Toast.error(error.message || 'Failed to delete news post');
        }
    },

    // ==================== EDITOR ====================

    /**
     * Open news editor
     */
    async openEditor(postId = null) {
        this.editor = {
            active: true,
            postId: postId,
            images: [],
            heroImageId: null,
            unsaved: false
        };

        // Register draft with SessionManager
        const draftKey = postId ? 'news_edit_' + postId : 'news_create';
        SessionManager.registerDraft(draftKey, () => {
            if (!this.editor.unsaved) return null;
            return {
                title: document.getElementById('editorTitle')?.value,
                content: document.getElementById('editorContent')?.value,
                category: this.editor.category,
                discordSync: document.getElementById('editorDiscordSync')?.checked
            };
        });

        // If editing, load post data
        let post = null;
        if (postId) {
            try {
                const response = await API.news.get(postId);
                post = response.news;
            } catch (error) {
                Toast.error('Failed to load post');
                this.editor.active = false;
                return;
            }
        }

        // Check for saved draft in session storage
        const savedDraft = sessionStorage.getItem(`draft_${draftKey}`);
        let draftData = null;
        if (savedDraft && !post) {
            try {
                draftData = JSON.parse(savedDraft);
            } catch (e) { /* ignore */ }
        }

        this._renderEditor(post, draftData);
    },

    /**
     * Close editor
     */
    closeEditor() {
        if (this.editor.unsaved) {
            if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
                return;
            }
        }

        const draftKey = this.editor.postId ? 'news_edit_' + this.editor.postId : 'news_create';
        SessionManager.clearDraft(draftKey);
        sessionStorage.removeItem(`draft_${draftKey}`);

        this.editor.active = false;

        // Remove overlay
        const overlay = document.getElementById('newsEditorOverlay');
        if (overlay) overlay.remove();

        // Reload posts
        this.loadPosts();
    },

    /**
     * Render the full editor overlay
     */
    _renderEditor(post, draftData) {
        const title = post?.title || draftData?.title || '';
        const content = post?.content || draftData?.content || '';
        const category = post?.category || draftData?.category || 'UPDATE';
        const discordSync = post?.discordSync ?? draftData?.discordSync ?? true;
        const status = post?.status || 'DRAFT';
        const images = post?.images || [];
        const heroImageId = post?.heroImageId || null;

        this.editor.images = [...images];
        this.editor.heroImageId = heroImageId;
        this.editor.category = category;

        const isPublished = status === 'PUBLISHED';
        const categories = ['UPDATE', 'ANNOUNCEMENT', 'EVENT', 'MAINTENANCE'];

        const overlay = document.createElement('div');
        overlay.id = 'newsEditorOverlay';
        overlay.className = 'news-editor-overlay';

        overlay.innerHTML = `
            <div class="news-editor-header">
                <div class="news-editor-header-left">
                    <button class="btn btn-secondary" id="editorBackBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <line x1="19" y1="12" x2="5" y2="12"/>
                            <polyline points="12 19 5 12 12 5"/>
                        </svg>
                        Back
                    </button>
                    <h2 class="news-editor-title">${post ? 'Edit Post' : 'New Post'}</h2>
                    ${isPublished ? '<span class="news-status-badge published">Published</span>' : '<span class="news-status-badge draft">Draft</span>'}
                </div>
                <div class="news-editor-header-right">
                    ${isPublished && Auth.hasPermission(CONFIG.PERMISSIONS.NEWS_MANAGE)
                        ? '<button class="btn btn-secondary" id="editorUnpublishBtn">Unpublish</button>' : ''}
                    <button class="btn btn-secondary" id="editorSaveDraftBtn">${post ? 'Save' : 'Save Draft'}</button>
                    ${!isPublished && Auth.hasPermission(CONFIG.PERMISSIONS.NEWS_MANAGE)
                        ? '<button class="btn btn-primary" id="editorPublishBtn">Publish</button>' : ''}
                </div>
            </div>
            <div class="news-editor-body">
                <div class="news-editor-panel news-editor-left">
                    <div class="editor-field">
                        <label class="editor-label">Title <span class="required">*</span></label>
                        <input type="text" class="editor-input title-input" id="editorTitle"
                            placeholder="Enter post title..." maxlength="200" value="${this._escapeAttr(title)}">
                        <span class="editor-hint"><span id="editorTitleCount">${title.length}</span>/200</span>
                    </div>

                    <div class="editor-field">
                        <label class="editor-label">Category</label>
                        <div class="category-selector" id="editorCategorySelector">
                            ${categories.map(c => `
                                <button class="category-option ${c === category ? 'selected' : ''}"
                                    data-category="${c}">${c.charAt(0) + c.slice(1).toLowerCase()}</button>
                            `).join('')}
                        </div>
                    </div>

                    <div class="editor-field">
                        <label class="editor-checkbox-label">
                            <input type="checkbox" id="editorDiscordSync" ${discordSync ? 'checked' : ''}>
                            <span>Post to Discord on publish</span>
                        </label>
                    </div>

                    <div class="editor-field">
                        <label class="editor-label">Content <span class="required">*</span></label>
                        <div class="markdown-toolbar" id="editorToolbar">
                            <button class="markdown-toolbar-btn" data-action="bold" title="Bold (Ctrl+B)"><strong>B</strong></button>
                            <button class="markdown-toolbar-btn" data-action="italic" title="Italic (Ctrl+I)"><em>I</em></button>
                            <span class="markdown-toolbar-sep"></span>
                            <button class="markdown-toolbar-btn" data-action="h2" title="Heading 2">H2</button>
                            <button class="markdown-toolbar-btn" data-action="h3" title="Heading 3">H3</button>
                            <span class="markdown-toolbar-sep"></span>
                            <button class="markdown-toolbar-btn" data-action="ul" title="Bullet List">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                            </button>
                            <button class="markdown-toolbar-btn" data-action="ol" title="Numbered List">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="3" y="7" fill="currentColor" font-size="8" stroke="none">1</text><text x="3" y="13" fill="currentColor" font-size="8" stroke="none">2</text><text x="3" y="19" fill="currentColor" font-size="8" stroke="none">3</text></svg>
                            </button>
                            <span class="markdown-toolbar-sep"></span>
                            <button class="markdown-toolbar-btn" data-action="link" title="Insert Link">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            </button>
                            <button class="markdown-toolbar-btn" data-action="quote" title="Blockquote">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3"/></svg>
                            </button>
                            <button class="markdown-toolbar-btn" data-action="code" title="Inline Code">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                            </button>
                            <button class="markdown-toolbar-btn" data-action="hr" title="Horizontal Rule">---</button>
                        </div>
                        <textarea class="editor-input editor-textarea" id="editorContent"
                            placeholder="Write your post content in Markdown...">${this._escapeHtml(content)}</textarea>
                    </div>

                    <div class="editor-field">
                        <label class="editor-label">Images</label>
                        <div class="image-upload-area" id="editorImageUpload">
                            <svg class="image-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                            </svg>
                            <div class="image-upload-text">Click or drag images here to upload</div>
                            <div class="image-upload-hint">PNG, JPG, GIF up to 5MB</div>
                        </div>
                        <input type="file" id="editorImageInput" accept="image/*" multiple style="display:none">
                        <div class="image-gallery" id="editorImageGallery"></div>
                    </div>
                </div>
                <div class="news-editor-panel news-editor-right">
                    <div class="news-editor-preview-header">
                        <span class="editor-label">Live Preview</span>
                    </div>
                    <div class="news-preview" id="editorPreview">
                        <div class="news-preview-header">
                            <div class="news-preview-badge" id="previewBadge"></div>
                            <h1 class="news-preview-title" id="previewTitle">Post Title</h1>
                        </div>
                        <div class="news-preview-content" id="previewContent">
                            <p style="color: var(--text-muted)">Start typing to see a preview...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this._attachEditorListeners();
        this._renderImageGallery();
        this._updatePreview();
    },

    /**
     * Attach editor event listeners
     */
    _attachEditorListeners() {
        // Back button
        document.getElementById('editorBackBtn')?.addEventListener('click', () => this.closeEditor());

        // Save draft
        document.getElementById('editorSaveDraftBtn')?.addEventListener('click', () => this._savePost(false));

        // Publish
        document.getElementById('editorPublishBtn')?.addEventListener('click', () => this._savePost(true));

        // Unpublish
        document.getElementById('editorUnpublishBtn')?.addEventListener('click', async () => {
            try {
                await API.news.unpublish(this.editor.postId);
                Toast.success('Post unpublished');
                this.closeEditor();
            } catch (error) {
                Toast.error(error.message || 'Failed to unpublish');
            }
        });

        // Title input
        const titleInput = document.getElementById('editorTitle');
        titleInput?.addEventListener('input', () => {
            this.editor.unsaved = true;
            document.getElementById('editorTitleCount').textContent = titleInput.value.length;
            this._updatePreview();
        });

        // Content textarea
        const contentTextarea = document.getElementById('editorContent');
        contentTextarea?.addEventListener('input', () => {
            this.editor.unsaved = true;
            this._updatePreview();
        });

        // Tab key in textarea
        contentTextarea?.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = contentTextarea.selectionStart;
                const end = contentTextarea.selectionEnd;
                contentTextarea.value = contentTextarea.value.substring(0, start) + '    ' + contentTextarea.value.substring(end);
                contentTextarea.selectionStart = contentTextarea.selectionEnd = start + 4;
                this.editor.unsaved = true;
                this._updatePreview();
            }
        });

        // Keyboard shortcuts in textarea
        contentTextarea?.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'b') { e.preventDefault(); this._toolbarAction('bold'); }
                if (e.key === 'i') { e.preventDefault(); this._toolbarAction('italic'); }
                if (e.key === 's') { e.preventDefault(); this._savePost(false); }
            }
        });

        // Category selector
        document.querySelectorAll('#editorCategorySelector .category-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#editorCategorySelector .category-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.editor.category = btn.dataset.category;
                this.editor.unsaved = true;
                this._updatePreview();
            });
        });

        // Discord sync
        document.getElementById('editorDiscordSync')?.addEventListener('change', () => {
            this.editor.unsaved = true;
        });

        // Toolbar
        document.querySelectorAll('#editorToolbar .markdown-toolbar-btn').forEach(btn => {
            btn.addEventListener('click', () => this._toolbarAction(btn.dataset.action));
        });

        // Image upload area
        const uploadArea = document.getElementById('editorImageUpload');
        const fileInput = document.getElementById('editorImageInput');

        uploadArea?.addEventListener('click', () => fileInput?.click());
        uploadArea?.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                this._uploadImages(e.dataTransfer.files);
            }
        });

        fileInput?.addEventListener('change', () => {
            if (fileInput.files.length) {
                this._uploadImages(fileInput.files);
                fileInput.value = '';
            }
        });
    },

    /**
     * Toolbar action handler
     */
    _toolbarAction(action) {
        const textarea = document.getElementById('editorContent');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end);
        let replacement = '';
        let cursorOffset = 0;

        switch (action) {
            case 'bold':
                replacement = `**${selected || 'bold text'}**`;
                cursorOffset = selected ? replacement.length : 2;
                break;
            case 'italic':
                replacement = `*${selected || 'italic text'}*`;
                cursorOffset = selected ? replacement.length : 1;
                break;
            case 'h2':
                replacement = `\n## ${selected || 'Heading'}`;
                cursorOffset = replacement.length;
                break;
            case 'h3':
                replacement = `\n### ${selected || 'Heading'}`;
                cursorOffset = replacement.length;
                break;
            case 'ul':
                replacement = `\n- ${selected || 'List item'}`;
                cursorOffset = replacement.length;
                break;
            case 'ol':
                replacement = `\n1. ${selected || 'List item'}`;
                cursorOffset = replacement.length;
                break;
            case 'link':
                replacement = `[${selected || 'link text'}](url)`;
                cursorOffset = selected ? replacement.length - 1 : 1;
                break;
            case 'quote':
                replacement = `\n> ${selected || 'Quote'}`;
                cursorOffset = replacement.length;
                break;
            case 'code':
                replacement = `\`${selected || 'code'}\``;
                cursorOffset = selected ? replacement.length : 1;
                break;
            case 'hr':
                replacement = '\n\n---\n\n';
                cursorOffset = replacement.length;
                break;
        }

        textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + cursorOffset;
        textarea.focus();
        this.editor.unsaved = true;
        this._updatePreview();
    },

    /**
     * Upload images
     */
    async _uploadImages(files) {
        try {
            const response = await API.news.uploadImages(files);
            if (response.images) {
                this.editor.images.push(...response.images);
                this.editor.unsaved = true;
                this._renderImageGallery();
                Toast.success(`${response.images.length} image(s) uploaded`);
            }
        } catch (error) {
            Toast.error(error.message || 'Failed to upload images');
        }
    },

    /**
     * Render image gallery
     */
    _renderImageGallery() {
        const gallery = document.getElementById('editorImageGallery');
        if (!gallery) return;

        if (this.editor.images.length === 0) {
            gallery.innerHTML = '';
            return;
        }

        gallery.innerHTML = this.editor.images.map(img => `
            <div class="image-gallery-item ${this.editor.heroImageId === img.id ? 'is-hero' : ''}" data-image-id="${img.id}">
                <img src="${img.url}" alt="${this._escapeHtml(img.filename)}">
                <div class="image-gallery-actions">
                    <button class="image-gallery-btn" onclick="News._setHeroImage(${img.id})" title="${this.editor.heroImageId === img.id ? 'Remove Hero' : 'Set as Hero'}">
                        ${this.editor.heroImageId === img.id ? 'Hero' : 'Set Hero'}
                    </button>
                    <button class="image-gallery-btn" onclick="News._insertImageRef(${img.id})" title="Insert reference">Insert</button>
                    <button class="image-gallery-btn image-gallery-btn-danger" onclick="News._deleteImage(${img.id})" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
                ${this.editor.heroImageId === img.id ? '<div class="image-gallery-hero-badge">HERO</div>' : ''}
            </div>
        `).join('');
    },

    _setHeroImage(imageId) {
        this.editor.heroImageId = this.editor.heroImageId === imageId ? null : imageId;
        this.editor.unsaved = true;
        this._renderImageGallery();
        this._updatePreview();
    },

    _insertImageRef(imageId) {
        const textarea = document.getElementById('editorContent');
        if (!textarea) return;

        const ref = `![${imageId}]`;
        const pos = textarea.selectionStart;
        textarea.value = textarea.value.substring(0, pos) + ref + textarea.value.substring(textarea.selectionEnd);
        textarea.selectionStart = textarea.selectionEnd = pos + ref.length;
        textarea.focus();
        this.editor.unsaved = true;
        this._updatePreview();
    },

    async _deleteImage(imageId) {
        if (!confirm('Delete this image?')) return;

        try {
            await API.news.deleteImage(imageId);
            this.editor.images = this.editor.images.filter(i => i.id !== imageId);
            if (this.editor.heroImageId === imageId) this.editor.heroImageId = null;
            this.editor.unsaved = true;
            this._renderImageGallery();
            this._updatePreview();
            Toast.success('Image deleted');
        } catch (error) {
            Toast.error(error.message || 'Failed to delete image');
        }
    },

    /**
     * Save post (draft or publish)
     */
    async _savePost(publish) {
        const title = document.getElementById('editorTitle')?.value?.trim();
        const content = document.getElementById('editorContent')?.value?.trim();
        const discordSync = document.getElementById('editorDiscordSync')?.checked ?? false;
        const category = this.editor.category || 'UPDATE';

        if (!title) {
            Toast.error('Title is required');
            return;
        }
        if (!content) {
            Toast.error('Content is required');
            return;
        }

        const data = {
            title,
            content,
            category,
            discordSync,
            pinned: false,
            heroImageId: this.editor.heroImageId,
            imageIds: this.editor.images.map(i => i.id)
        };

        try {
            let response;
            if (this.editor.postId) {
                response = await API.news.update(this.editor.postId, data);
            } else {
                response = await API.news.create(data);
                if (response.news) {
                    this.editor.postId = response.news.id;
                }
            }

            if (publish && this.editor.postId) {
                await API.news.publish(this.editor.postId);
                Toast.success('Post published!');
            } else {
                Toast.success('Post saved');
            }

            this.editor.unsaved = false;

            // Clear draft
            const draftKey = this.editor.postId ? 'news_edit_' + this.editor.postId : 'news_create';
            SessionManager.clearDraft(draftKey);
            sessionStorage.removeItem(`draft_${draftKey}`);

            this.closeEditor();
        } catch (error) {
            Toast.error(error.message || 'Failed to save post');
        }
    },

    /**
     * Update live preview
     */
    _updatePreview() {
        const title = document.getElementById('editorTitle')?.value || '';
        const content = document.getElementById('editorContent')?.value || '';
        const category = this.editor.category || 'UPDATE';

        const titleEl = document.getElementById('previewTitle');
        const badgeEl = document.getElementById('previewBadge');
        const contentEl = document.getElementById('previewContent');

        if (titleEl) titleEl.textContent = title || 'Post Title';
        if (badgeEl) badgeEl.innerHTML = this.getCategoryBadge(category);

        if (contentEl) {
            if (content) {
                contentEl.innerHTML = this._renderMarkdown(content);
            } else {
                contentEl.innerHTML = '<p style="color: var(--text-muted)">Start typing to see a preview...</p>';
            }
        }
    },

    /**
     * Simple markdown to HTML renderer
     */
    _renderMarkdown(text) {
        if (!text) return '';

        // Escape HTML first
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Code blocks (``` ... ```)
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Image references ![id]
        html = html.replace(/!\[(\d+)\]/g, (match, id) => {
            const img = this.editor.images.find(i => i.id === parseInt(id));
            if (img) {
                return `<img src="${img.url}" alt="${this._escapeHtml(img.filename)}" style="max-width:100%;border-radius:8px;margin:8px 0">`;
            }
            return match;
        });

        // Headings
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');

        // Horizontal rules
        html = html.replace(/^---$/gm, '<hr>');

        // Blockquotes
        html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

        // Bold + italic
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Links [text](url)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

        // Unordered lists
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

        // Ordered lists
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

        // Paragraphs - split by double newlines
        html = html.split(/\n\n+/).map(block => {
            block = block.trim();
            if (!block) return '';
            if (block.startsWith('<h') || block.startsWith('<ul') || block.startsWith('<ol') ||
                block.startsWith('<pre') || block.startsWith('<blockquote') || block.startsWith('<hr') ||
                block.startsWith('<img')) {
                return block;
            }
            return `<p>${block.replace(/\n/g, '<br>')}</p>`;
        }).join('\n');

        return html;
    },

    // ==================== UTILITY ====================

    _escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _escapeAttr(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    _getExcerpt(content, maxLen = 150) {
        if (!content) return '';
        // Strip markdown syntax
        let text = content
            .replace(/#{1,3}\s*/g, '')
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/!\[\d+\]/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/^>\s*/gm, '')
            .replace(/^-\s*/gm, '')
            .replace(/---/g, '')
            .trim();
        if (text.length > maxLen) {
            text = text.substring(0, maxLen).trim() + '...';
        }
        return text;
    },

    _imagePlaceholderSvg() {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = News;
}
