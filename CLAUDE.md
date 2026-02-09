# Elderos-Website

Centralized folder for all public-facing Elderos web pages. Each subfolder is an independently deployable site served via Apache on its own subdomain.

## Structure

```
Elderos-Website/
├── Home/           → elderos.io          — Landing page
├── Play/           → play.elderos.io     — Launcher download page
├── Hiscores/       → hiscores.elderos.io — Public hiscores leaderboard
├── Staff/          → staff.elderos.io    — Staff management portal (auth-gated)
└── Vote/           → vote.elderos.io     — Voting page (TBD)
```

## Technology

All pages are **vanilla HTML/CSS/JS** — no build step, no frameworks. Apache serves each folder with `.htaccess` for routing and caching.

- **Fonts:** Cinzel (headings), DM Sans (body on Home/Play), Outfit (body on Hiscores), JetBrains Mono (monospace data)
- **CSS Variables:** All pages share the same color palette via `:root` variables (`--bg-deep`, `--accent`, `--text`, etc.)
- **Icons:** OSRS sprite images (pixelated rendering) in `assets/` subfolders

## Shared Navigation

All public pages (Home, Play, Hiscores) use an **identical navigation bar**. When updating the nav on any page, update all three to match.

**Nav structure:**
```html
<nav>
    <a href="https://elderos.io" class="nav-logo">
        <img src="assets/logo.png" class="nav-logo-img">
        <span class="nav-logo-text">ELDEROS</span>
    </a>
    <div class="nav-links">
        <a href="..." class="nav-link">Features</a>
        <a href="..." class="nav-link">Wiki</a>
        <a href="..." class="nav-link active">Hiscores</a>
        <a href="..." class="nav-link">Discord</a>
        <a href="..." class="nav-cta">Play Now</a>
    </div>
    <div class="nav-hamburger" id="hamburger">...</div>
</nav>
<div class="mobile-menu" id="mobileMenu">...</div>
```

**Nav CSS key properties:**
- `position: fixed`, `height: 72px`, `z-index: 100`
- `background: rgba(6, 6, 10, 0.6)`, `backdrop-filter: blur(20px)`
- Logo text: gradient `linear-gradient(135deg, var(--accent), var(--gold))`
- Active link: `color: var(--accent)` (orange)
- CTA button: `box-shadow: 0 0 20px var(--accent-glow)`
- Mobile: hamburger menu at `≤768px`, nav-links hidden

**Link URLs:**
| Link | URL |
|------|-----|
| Home/Logo | `https://elderos.io` |
| Features | `https://elderos.io#features` |
| Wiki | `https://wiki.elderos.io` (target=_blank) |
| Hiscores | `https://hiscores.elderos.io` |
| Discord | `https://discord.gg/MwkvVMFmfg` (target=_blank) |
| Play Now | `https://play.elderos.io` |

Set `class="active"` on the nav-link for the current page. On the Play page, the CTA gets `active` class instead.

## Pages

### Home (`Home/`)
Landing page with hero, features grid, stats bar, footer. Single-file (all CSS inline in `<style>`). Uses scroll reveal animations. `DM Sans` body font.

### Play (`Play/`)
Download launcher page. Single card with download button that currently shows a "Coming Soon" modal directing to Discord. Footer. Single-file. `DM Sans` body font.

### Hiscores (`Hiscores/`)
Public hiscores leaderboard consuming Hub API at `/api/v1/hiscores`. Three-column grid layout (sidebar + content + right panel). Features: skill/boss/activity leaderboards, player profiles (inline), game mode + donator filtering, pagination, grade system. `Outfit` body font, `JetBrains Mono` for data.

**Files:** `index.html`, `css/hiscores.css`, `js/hiscores.js`
**API:** `https://api.elderos.io/api/v1/hiscores` (public, no auth)
**Cache busting:** Bump `?v=N` on CSS/JS references in `index.html` after every change

### Staff (`Staff/`)
Auth-gated staff portal. Three-step login (credentials + 2FA + Discord session key). Modular JS namespace pattern. Many CSS/JS files for different sections (search, bans, mutes, worlds, commands, etc.).

**Files:** `index.html` (login), `dashboard.html` (main app), `css/*.css`, `js/*.js`
**API:** `https://api.elderos.io/api/v1/staff/*` (Bearer JWT auth)

### Vote (`Vote/`)
Placeholder — voting page to be implemented.

## Deployment

Each page is zipped independently and uploaded to its subdomain via cPanel:

```powershell
# Example: Hiscores
Set-Location 'Elderos-Website/Hiscores'
Get-ChildItem -Force -Exclude '.git','*.zip' | Compress-Archive -DestinationPath '.\hiscores.zip' -Force

# Example: Staff
Set-Location 'Elderos-Website/Staff'
Get-ChildItem -Force -Exclude 'staff.zip' | Compress-Archive -DestinationPath '.\staff.zip' -Force
```

The zip root must contain the page files directly (not a nested folder).

## Assets

Common assets duplicated across pages (each page is self-contained):
- `assets/logo.png` — Elderos shield/crest logo
- `assets/favicon.ico` — Browser tab icon
- `assets/discord-icon.png` — Discord logo (Home, Play)
- `assets/staff-ranks/*.png` — Staff role icons
- `assets/donator-ranks/*.png` — Donator tier icons (10 tiers)
- `assets/game-ranks/*.png` — Game mode icons (Normal, Ironman, Hardcore, Ultimate, Group, Perma)
- `assets/skills/*.png` — Skill icons (23 skills, Hiscores only)
- `assets/bosses/*.png` — Boss icons (18 bosses, Hiscores only)
- `assets/minigames/*.png` — Minigame icons (Hiscores only)
