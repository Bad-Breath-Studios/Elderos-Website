# Elderos-Website Security Protocols

Mandatory rules for all website code. Every new page, feature, or JS change MUST follow these.

---

## 1. No Inline Scripts

All JavaScript MUST be in external `.js` files. Never use `<script>` blocks with inline code in HTML files.

- Enables strict CSP (`script-src 'self'`) without `'unsafe-inline'`
- Use `?v=N` cache busting on script tags

**Where scripts live:**
| Page | Scripts |
|------|---------|
| Home | `js/home.js`, `js/scroll.js` |
| Play | `js/modal.js` |
| Staff | `js/login.js`, `js/*.js` (dashboard modules) |
| Hiscores | `js/hiscores.js` |
| Vote | `js/vote.js` |
| Shared | `/shared/auth.js`, `/shared/navbar.js`, `/shared/footer.js` |

---

## 2. Content Security Policy (CSP)

Every subdomain has CSP via `.htaccess`. The standard policy:

```
default-src 'self';
script-src 'self';                              # No 'unsafe-inline' ever
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;  # inline styles for navbar toggle
font-src 'self' https://fonts.gstatic.com;
img-src 'self' https://cdn.discordapp.com data:;
connect-src 'self' https://api.elderos.io;      # No localhost in production
frame-ancestors 'none';
```

**Staff exception:** `script-src 'self' https://cdnjs.cloudflare.com;` (CodeMirror CDN)

**Rules:**
- NEVER add `'unsafe-inline'` to `script-src`
- NEVER add `'unsafe-eval'` to any directive
- NEVER add `http://localhost:*` to production CSPs — JS hostname checks handle dev/prod switching
- When adding a new CDN resource, add it to the CSP AND add SRI (see below)

---

## 3. Security Headers (all pages)

Every `.htaccess` MUST include:

```apache
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "DENY"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
```

**Do NOT use:** `X-XSS-Protection` (deprecated and removed)

---

## 4. Subresource Integrity (SRI)

All CDN `<script>` and `<link>` tags MUST have `integrity`, `crossorigin="anonymous"`, and `referrerpolicy="no-referrer"` attributes.

```html
<script src="https://cdnjs.cloudflare.com/..."
        integrity="sha512-..."
        crossorigin="anonymous"
        referrerpolicy="no-referrer"></script>
```

Get hashes from the cdnjs library page for the pinned version.

---

## 5. HTML Escaping (XSS Prevention)

**Rule: NEVER insert user-controlled data into HTML via string interpolation without escaping.**

Use the appropriate `escapeHtml()` function:
- `shared/navbar.js` — local `escapeHtml()` inside the IIFE
- `Staff/js/utils.js` — `Utils.escapeHtml(str)`
- `Staff/js/news.js` — `this._escapeHtml(str)`
- `Staff/js/chat-logs.js` — `this._escapeHtml(str)`
- `Home/js/home.js` — local `escapeHtml()` inside the IIFE

**What to escape:**
- Usernames, display names, player names
- API response fields used in HTML (titles, categories, messages, etc.)
- Any string used in `innerHTML`, template literals, or HTML attributes
- Discord avatar URLs — validate discordId (`/^\d{17,20}$/`) and avatarHash (`/^(a_)?[0-9a-f]{32}$/`) before building CDN URLs

**URL attributes:** Escape `"` as `&quot;` in `href`/`src` attributes. For user-provided URLs, whitelist `https?://` protocol.

**`Utils.createElement`:** The `innerHTML` key was renamed to `dangerousInnerHTML` to prevent accidental misuse. Prefer `textContent` for user data.

---

## 6. Link Security

All `target="_blank"` links MUST include `rel="noopener noreferrer"`.

Applies to: nav Wiki link, nav Discord link, Home Discord links, Play Discord link, markdown-rendered links in Staff news.

---

## 7. Regex Safety (ReDoS Protection)

When accepting user-provided regex (e.g., Staff chat log search):

1. Check with `_isUnsafeRegex(pattern)` before `new RegExp()`
2. Reject patterns over 100 chars
3. Reject nested quantifiers: `)+`, `)*`, `]{`, `+*`, `++`
4. Always wrap `new RegExp()` in try/catch
5. Use split-escape-wrap for highlighting (escape each segment individually, never run regex on pre-escaped HTML)

---

## 8. URL Validation

Before `window.open(url)`:
- Verify protocol: `if (url && /^https?:\/\//i.test(url))`
- Use `noopener,noreferrer` as window features: `window.open(url, '_blank', 'noopener,noreferrer')`

---

## 9. No localhost in Production CSP

The JS code uses hostname checks to switch between localhost (dev) and production API URLs. The CSP should ONLY permit the production origin (`https://api.elderos.io`). Developers working locally can use a browser extension to disable CSP.

---

## 10. Directory & File Protections

Every `.htaccess`:
- `Options -Indexes` — prevent directory listing
- Deny access to dotfiles (`<FilesMatch "^\.">`)
- Staff: also blocks `.bak`, `.config`, `.sql`, `.log`, etc.

No empty placeholder directories (like `cgi-bin/`) — delete on sight.
