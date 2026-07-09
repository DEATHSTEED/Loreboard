'use strict';
// LOREBOARD - Board tweaks: per-board visual adjustments, presets and premium unlock

// ---------------------------------------------------------------------------
// BOARD TWEAKS — per-board visual adjustments + global presets
// ---------------------------------------------------------------------------

function lbDefaultBoardTweaks() {
    return {
        themeColour: '',
        sat: 100, cont: 100, bright: 100, vignette: 35, hue: 0,
        tintColor: '#ff0000', tintOpacity: 0,
        filterMode: 'original',
        sinCityHue: 'red',
        applyToAll: false,
        soundFxVolume: 100
    };
}
function lbNormalizeBoardTweaks(raw) {
    let d = Object.assign(lbDefaultBoardTweaks(), raw || {});
    if (d.themeColour && !/^#[0-9a-fA-F]{6}$/.test(String(d.themeColour))) d.themeColour = '';
    d.sat = Math.max(0, Math.min(200, parseInt(d.sat, 10) || 100));
    d.cont = Math.max(0, Math.min(200, parseInt(d.cont, 10) || 100));
    d.bright = Math.max(0, Math.min(200, parseInt(d.bright, 10) || 100));
    d.vignette = Math.max(0, Math.min(200, parseInt(d.vignette, 10) || 0));
    d.hue = Math.max(-180, Math.min(180, parseInt(d.hue, 10) || 0));
    d.tintOpacity = Math.max(0, Math.min(100, parseInt(d.tintOpacity, 10) || 0));
    d.soundFxVolume = Math.max(0, Math.min(100, parseInt(d.soundFxVolume, 10) ?? 100));
    if (!d.sinCityHue) d.sinCityHue = 'red';
    if (d.filterMode === 'sincity') d.filterMode = 'original';
    return d;
}
function lbBuildTweakFilterString(tweaks) {
    tweaks = lbNormalizeBoardTweaks(tweaks);
    let p = [`brightness(${tweaks.bright}%)`, `contrast(${tweaks.cont}%)`, `saturate(${tweaks.sat}%)`];
    if (tweaks.hue) p.push(`hue-rotate(${tweaks.hue}deg)`);
    if (tweaks.filterMode === 'grayscale') p.push('grayscale(100%)');
    else if (tweaks.filterMode === 'sepia') p.push('sepia(85%)');
    else if (tweaks.filterMode === 'inverted') p.push('invert(100%)');
    else if (tweaks.filterMode === 'sincity') p.push(`url(#lb-sincity-${tweaks.sinCityHue || 'red'})`);
    return p.join(' ');
}
function lbSinCityFilterDefsSVG() {
    let hues = {
        red:    '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0',
        green:  '0 0 0 0 0  1 0 0 0 0  0 0 0 0 0',
        blue:   '0 0 0 0 0  0 0 0 0 0  1 0 0 0 0',
        yellow: '1 0 0 0 0  1 0 0 0 0  0 0 0 0 0',
        cyan:   '0 0 0 0 0  1 0 0 0 0  1 0 0 0 0',
        magenta:'1 0 0 0 0  0 0 0 0 0  1 0 0 0 0'
    };
    return Object.keys(hues).map(h =>
        `<filter id="lb-sincity-${h}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
            <feColorMatrix type="saturate" values="0"/>
            <feColorMatrix type="matrix" values="${hues[h]} 0 0 0 1 0"/>
        </filter>`
    ).join('');
}
function lbSyncBoardFullscreenLayers(root) {
    let rootEl = root && root.jquery ? root[0] : root;
    if (!rootEl) rootEl = document.getElementById('lb-app-root');
    if (!rootEl) return;
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    let fill = (el) => {
        if (!el) return;
        el.style.width = vw + 'px';
        el.style.height = vh + 'px';
        el.style.minWidth = vw + 'px';
        el.style.minHeight = vh + 'px';
        el.style.maxWidth = vw + 'px';
        el.style.maxHeight = vh + 'px';
    };
    fill(rootEl);
    [
        '#lb-scroll-area', '#lb-transform-layer', '#lb-fixed-bg', '#lb-galactic-back-layer',
        '#lb-bg-layer', '#lb-fg-layer', '#lb-files-layer', '#lb-light-layer', '#lb-canvas',
        '#lb-vignette-fx', '#lb-tweak-tint-bg', '#lb-tweak-tint-all', '#lb-weather-layer', '#lb-slums-drop-layer',
        '#lb-theme-mood-ambient', '#lb-theme-mood-layer'
    ].forEach(sel => fill(rootEl.querySelector(sel)));
    ['#lb-weather-layer', '#lb-slums-drop-layer', '#lb-draw-bake'].forEach(sel => {
        let c = rootEl.querySelector(sel);
        if (!c) return;
        c.width = vw;
        c.height = vh;
        c.style.width = vw + 'px';
        c.style.height = vh + 'px';
    });
    let fixedBg = rootEl.querySelector('#lb-fixed-bg');
    if (fixedBg) {
        fixedBg.style.position = 'fixed';
        fixedBg.style.top = '0';
        fixedBg.style.left = '0';
    }
    if (typeof lbRenderThemeMoodLighting === 'function') {
        let layer = rootEl.querySelector('#lb-theme-mood-layer');
        let tid = (layer && layer.dataset.theme) || (window.lbCurrentStore && window.lbCurrentStore.theme);
        if (tid) lbRenderThemeMoodLighting(rootEl, tid);
    }
}
window.lbSyncBoardFullscreenLayers = lbSyncBoardFullscreenLayers;

function lbGetThemeAccentColor(themeId) {
    let map = { noir: '#d4af37', modern: '#4a90e2', slums: '#a8e6cf', shadowpunk: '#ff00ff', cosytavern: '#e0822e', galactic: '#4ea8ff' };
    let t = LB_THEMES.find(x => x.id === themeId);
    return (t && t.accent) ? t.accent : (map[themeId] || '#d4af37');
}

function lbWriteLiveBoardAccentStyles(accent, hover, rgb) {
    let el = document.getElementById('lb-live-board-accent-css');
    if (!el) {
        el = document.createElement('style');
        el.id = 'lb-live-board-accent-css';
        document.head.appendChild(el);
    }
    let a = accent || '#d4af37';
    let h = hover || a;
    let r = rgb || lbJukeboxHexToRgb(a);
    el.textContent = `
    #lb-app-root, body.lb-board-open, #lb-eye-assistant, #lb-menu-tooltip-layer {
        --board-primary-color: ${a} !important;
        --board-hover-color: ${h} !important;
        --board-primary-rgb: ${r} !important;
        --lb-accent: ${a} !important;
        --lb-accent-rgb: ${r} !important;
    }
    #lb-app-root .lb-header-tool:hover { color: ${h} !important; box-shadow: 0 8px 24px rgba(0,0,0,0.42), 0 0 18px rgba(${r},0.32) !important; }
    #lb-app-root .lb-header-tool.active { background: ${a} !important; box-shadow: 0 4px 18px rgba(${r},0.45) !important; }
    #lb-app-root .lb-circle-btn:hover { background: ${h} !important; box-shadow: 0 8px 22px rgba(${r},0.42) !important; }
    #lb-app-root .lb-circle-btn.active { background: ${a} !important; box-shadow: 0 4px 16px rgba(${r},0.55) !important; }
    #lb-app-root .lb-expand-tab, #lb-app-root .lb-slide-tab { color: ${a} !important; }
    #lb-app-root .lb-expand-tab:hover, #lb-app-root .lb-slide-tab:hover { color: ${h} !important; }
    #lb-app-root .lb-tool-icon:hover { color: ${h} !important; }
    #lb-app-root .lb-tool-icon.active { color: ${a} !important; filter: drop-shadow(0 0 8px ${a}) !important; }
    #lb-app-root .lb-top-btn:hover { color: ${h} !important; filter: drop-shadow(0 0 10px rgba(${r},0.6)) !important; }
    #lb-app-root .lb-btn-tooltip, #lb-menu-tooltip-layer .lb-menu-floating-tip { color: ${a} !important; }
    #lb-app-root .theme-heading, .lb-board-tweaks-dialog .theme-heading { color: ${a} !important; }
    #lb-app-root .lb-drag-down-hint { color: ${a} !important; }
    #lb-app-root #lb-myfiles-tab { color: ${a} !important; }
    #lb-app-root #lb-myfiles-tab:hover { border-color: rgba(${r},0.4) !important; box-shadow: 0 -8px 24px rgba(${r},0.2) !important; }
    #lb-app-root #lb-jukebox-trigger-tab { color: ${a} !important; }
    #lb-app-root #lb-archive-drop { border-color: rgba(${r},0.85) !important; color: ${a} !important; }
    #lb-app-root .lb-modern-dialog .dialog-buttons button { border-color: ${a} !important; color: ${a} !important; box-shadow: 0 4px 10px rgba(0,0,0,0.35), 0 0 14px rgba(${r},0.28) !important; }
    #lb-app-root .lb-modern-dialog .dialog-buttons button:hover { border-color: ${a} !important; color: ${h} !important; background: linear-gradient(135deg, rgba(${r},0.24), rgba(16,16,18,0.99)) !important; box-shadow: 0 0 20px rgba(${r},0.5), inset 0 0 10px rgba(${r},0.18) !important; }
    #lb-app-root .lb-flip-corner-hit:hover { filter: drop-shadow(0 0 16px rgba(${r},0.75)); }
    #lb-app-root .lb-pin-wrap:hover, #lb-app-root .lb-tape-wrap:hover, #lb-app-root .lb-tape-hit:hover { filter: drop-shadow(0 0 8px ${a}) drop-shadow(0 0 14px rgba(${r},0.55)) !important; }
    #lb-app-root .lb-mf-folder-cell:hover { background: rgba(${r},0.14) !important; border-color: rgba(${r},0.45) !important; }
    #lb-app-root .lb-mf-toolbar-btn:hover { background: rgba(${r},0.18) !important; border-color: rgba(${r},0.4) !important; }
    #lb-app-root .lb-grid-cell:hover { border-color: ${a} !important; box-shadow: inset 0 2px 8px rgba(0,0,0,0.3), 0 0 10px rgba(${r},0.2) !important; }
  #lb-jukebox-overlay { --board-primary-color: ${a} !important; --board-hover-color: ${h} !important; --board-primary-rgb: ${r} !important; --lb-juke-accent: ${a} !important; --lb-juke-accent-rgb: ${r} !important; }
    #lb-jukebox-overlay .lb-jukebox-tab:hover, #lb-jukebox-overlay .lb-jukebox-era-btn:hover, #lb-jukebox-overlay .lb-jukebox-ctrl:hover,
    #lb-jukebox-overlay .lb-jukebox-upload-btn:hover, #lb-jukebox-overlay .lb-jukebox-carousel-arrow:hover,
    #lb-jukebox-overlay .lb-jukebox-radio-station:hover { color: ${h} !important; }
    #lb-jukebox-overlay .lb-jukebox-upload-btn:hover { background: ${h} !important; }
    #lb-investigation-cursor, #lb-inv-radial-overlay, #lb-cd-overlay, #lb-cf-overlay, .lb-radial-cursor-tip, #lb-eye-assistant {
        --lb-accent: ${a} !important; --lb-accent-rgb: ${r} !important; --board-hover-color: ${h} !important;
        --board-primary-color: ${a} !important; --board-primary-rgb: ${r} !important;
    }
    .lb-radial-eye-iris { background: radial-gradient(circle at 38% 32%, ${h}, rgba(${r},0.5) 58%, #120e08 100%) !important; }
    #lb-eye-assistant .lb-radial-eye-iris { background: radial-gradient(circle at 38% 32%, ${h}, rgba(${r},0.5) 58%, #120e08 100%) !important; }
    #lb-cd-overlay .lb-cd-node-icon, #lb-cf-overlay .lb-cd-node-icon, #lb-inv-radial-overlay .lb-cd-node-icon,
    #lb-cd-overlay .lb-cd-node-icon i, #lb-cf-overlay .lb-cd-node-icon i, #lb-inv-radial-overlay .lb-cd-node-icon i,
    #lb-cd-overlay .lb-cd-node-initials, #lb-cf-overlay .lb-cd-node-initials {
        color: ${h} !important;
        text-shadow: 0 0 14px rgba(${r},0.45) !important;
    }
    #lb-cd-overlay .lb-cd-blueprint-node .lb-cd-node-icon, #lb-cf-overlay .lb-cd-blueprint-node .lb-cd-node-icon,
    #lb-cd-overlay .lb-cd-print-mode-node .lb-cd-node-icon, #lb-cf-overlay .lb-cd-print-mode-node .lb-cd-node-icon {
        color: ${h} !important;
    }
    #lb-cd-overlay .lb-cd-node.lb-radial-focused .lb-cd-node-icon,
    #lb-cf-overlay .lb-cd-node.lb-radial-focused .lb-cd-node-icon,
    #lb-inv-radial-overlay .lb-cd-node.lb-radial-focused .lb-cd-node-icon,
    #lb-cd-overlay .lb-cd-node.lb-radial-chain-linked .lb-cd-node-icon,
    #lb-cf-overlay .lb-cd-node.lb-radial-chain-linked .lb-cd-node-icon,
    #lb-inv-radial-overlay .lb-cd-node.lb-radial-chain-linked .lb-cd-node-icon,
    #lb-cd-overlay .lb-cd-node.lb-radial-focused .lb-cd-node-icon i,
    #lb-cf-overlay .lb-cd-node.lb-radial-focused .lb-cd-node-icon i,
    #lb-inv-radial-overlay .lb-cd-node.lb-radial-focused .lb-cd-node-icon i {
        color: ${h} !important;
        text-shadow: 0 0 calc(18px + var(--lb-chain-depth,0) * 10px) rgba(${r},1), 0 0 calc(36px + var(--lb-chain-depth,0) * 14px) rgba(${r},0.55) !important;
    }
    .lb-radial-eye-iris { box-shadow: 0 0 18px rgba(${r},0.7), inset 0 2px 7px rgba(255,255,255,0.28) !important; }
    .lb-radial-eye.lb-radial-eye-engaged .lb-radial-eye-pupil { box-shadow: inset 0 0 6px #000, 0 0 calc(14px + var(--lb-chain-depth,0) * 6px) rgba(${r},0.85), 0 0 calc(28px + var(--lb-chain-depth,0) * 10px) rgba(${r},0.45) !important; }
    .lb-radial-eye-socket { border-color: rgba(${r},0.38) !important; box-shadow: inset 0 -10px 20px rgba(0,0,0,0.7), 0 10px 30px rgba(0,0,0,0.55), 0 0 calc(36px + var(--lb-chain-depth,0) * 14px) rgba(${r},calc(0.2 + var(--lb-chain-depth,0) * 0.12)) !important; }
    .lb-radial-eye-socket.lb-radial-eye-engaged::after { background: radial-gradient(circle, rgba(${r},0.32) 0%, rgba(${r},calc(0.22 + var(--lb-chain-depth,0) * 0.14)) 35%, transparent 72%) !important; }
    .lb-radial-eye.lb-radial-eye-engaged .lb-radial-eye-pupil::after { background: radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(${r},0.65) 28%, transparent 68%) !important; }
    #lb-inv-radial-overlay .lb-radial-eye-iris,
    #lb-cd-overlay .lb-radial-eye-iris,
    #lb-cf-overlay .lb-radial-eye-iris { background: radial-gradient(circle at 38% 32%, ${h}, rgba(${r},0.5) 58%, #120e08 100%) !important; box-shadow: 0 0 18px rgba(${r},0.7), inset 0 2px 7px rgba(255,255,255,0.28) !important; }
    #lb-cd-overlay .lb-cd-node:hover, #lb-cf-overlay .lb-cd-node:hover, #lb-inv-radial-overlay .lb-cd-node:hover,
    #lb-af-overlay .lb-af-node:hover {
        border-color: rgba(${r},0.35) !important;
        box-shadow: 0 18px 42px rgba(0,0,0,0.62), 0 0 28px rgba(${r},0.18), inset 0 1px 0 rgba(255,255,255,0.14) !important;
    }
    #lb-cd-overlay .lb-cd-node:hover .lb-cd-node-glow, #lb-cf-overlay .lb-cd-node:hover .lb-cd-node-glow, #lb-inv-radial-overlay .lb-cd-node:hover .lb-cd-node-glow, #lb-af-overlay .lb-af-node:hover .lb-af-node-glow { opacity: 0.85 !important; background: radial-gradient(circle, rgba(${r},0.38) 0%, transparent 70%) !important; }
    #lb-cd-overlay .lb-cd-node:hover .lb-cd-node-icon, #lb-cf-overlay .lb-cd-node:hover .lb-cd-node-icon,
    #lb-inv-radial-overlay .lb-cd-node:hover .lb-cd-node-icon, #lb-af-overlay .lb-af-node:hover .lb-af-node-icon,
    #lb-cd-overlay .lb-cd-node:hover .lb-cd-node-icon i, #lb-cf-overlay .lb-cd-node:hover .lb-cd-node-icon i,
    #lb-inv-radial-overlay .lb-cd-node:hover .lb-cd-node-icon i, #lb-af-overlay .lb-af-node:hover .lb-af-node-icon i {
        color: ${h} !important;
        filter: drop-shadow(0 0 10px rgba(${r},0.65)) !important;
    }
    #lb-cd-overlay .lb-cd-node.lb-radial-focused, #lb-cf-overlay .lb-cd-node.lb-radial-focused, #lb-inv-radial-overlay .lb-cd-node.lb-radial-focused, #lb-af-overlay .lb-af-node.lb-radial-focused,
    #lb-cd-overlay .lb-cd-node.lb-radial-chain-linked, #lb-cf-overlay .lb-cd-node.lb-radial-chain-linked, #lb-inv-radial-overlay .lb-cd-node.lb-radial-chain-linked {
        border-color: rgba(${r},0.85) !important;
    }
    #lb-cd-overlay .lb-cd-node.lb-radial-focused::before, #lb-cf-overlay .lb-cd-node.lb-radial-focused::before, #lb-inv-radial-overlay .lb-cd-node.lb-radial-focused::before,
    #lb-cd-overlay .lb-cd-node.lb-radial-chain-linked::before, #lb-cf-overlay .lb-cd-node.lb-radial-chain-linked::before, #lb-inv-radial-overlay .lb-cd-node.lb-radial-chain-linked::before {
        background: radial-gradient(circle, rgba(${r},0.55) 0%, rgba(${r},calc(0.35 + var(--lb-chain-depth,0) * 0.1)) 18%, rgba(${r},calc(0.28 + var(--lb-chain-depth,0) * 0.12)) 45%, transparent 72%) !important;
    }
    #lb-cd-overlay .lb-cd-node.lb-radial-focused::after, #lb-cf-overlay .lb-cd-node.lb-radial-focused::after, #lb-inv-radial-overlay .lb-cd-node.lb-radial-focused::after,
    #lb-cd-overlay .lb-cd-node.lb-radial-chain-linked::after, #lb-cf-overlay .lb-cd-node.lb-radial-chain-linked::after, #lb-inv-radial-overlay .lb-cd-node.lb-radial-chain-linked::after {
        border-color: rgba(${r},calc(0.35 + var(--lb-chain-depth,0) * 0.12)) !important;
        box-shadow: 0 0 calc(22px + var(--lb-chain-depth,0) * 12px) rgba(${r},0.45), inset 0 0 18px rgba(${r},0.25) !important;
    }
    `;
}

function lbGetLiveBoardThemeColors(fallbackAccent, fallbackRgb) {
    let app = document.getElementById('lb-app-root');
    if (app) {
        let cs = getComputedStyle(app);
        let accent = cs.getPropertyValue('--board-primary-color').trim();
        let hover = cs.getPropertyValue('--board-hover-color').trim();
        let rgb = cs.getPropertyValue('--board-primary-rgb').trim();
        if (accent) {
            return {
                accent,
                hover: hover || lbThemeHoverColor(accent, 0.35),
                rgb: rgb || lbJukeboxHexToRgb(accent)
            };
        }
    }
    return {
        accent: fallbackAccent,
        hover: lbThemeHoverColor(fallbackAccent, 0.35),
        rgb: fallbackRgb
    };
}
window.lbGetLiveBoardThemeColors = lbGetLiveBoardThemeColors;

function lbApplyBoardThemeVars(rootEl, themeId, tweaks) {
    tweaks = lbNormalizeBoardTweaks(tweaks || {});
    let accent = lbGetThemeAccentColor(themeId);
    let hoverAmount = themeId === 'shadowpunk' ? 0.28 : 0.35;
    if (tweaks.themeColour) accent = tweaks.themeColour;
    let hover = lbThemeHoverColor(accent, hoverAmount);
    let rgb = lbJukeboxHexToRgb(accent);
    let appRoot = document.getElementById('lb-app-root');
    if (!appRoot && rootEl) {
        if (rootEl.id === 'lb-app-root') appRoot = rootEl;
        else if (rootEl.querySelector) appRoot = rootEl.querySelector('#lb-app-root');
    }
    if (!appRoot) return;
    appRoot.style.setProperty('--board-primary-color', accent);
    appRoot.style.setProperty('--board-hover-color', hover);
    appRoot.style.setProperty('--board-primary-rgb', rgb);
    document.body.style.setProperty('--board-primary-color', accent);
    document.body.style.setProperty('--board-hover-color', hover);
    document.body.style.setProperty('--board-primary-rgb', rgb);
    let jukeOverlay = appRoot.querySelector('#lb-jukebox-overlay');
    if (jukeOverlay) {
        jukeOverlay.style.setProperty('--board-primary-color', accent);
        jukeOverlay.style.setProperty('--board-hover-color', hover);
        jukeOverlay.style.setProperty('--board-primary-rgb', rgb);
        jukeOverlay.style.setProperty('--lb-juke-accent', accent);
        jukeOverlay.style.setProperty('--lb-juke-accent-rgb', rgb);
    }
    let jukeTab = appRoot.querySelector('#lb-jukebox-trigger-tab');
    if (jukeTab) jukeTab.style.color = accent;
    let eyeWrap = document.getElementById('lb-eye-assistant');
    if (eyeWrap) {
        eyeWrap.style.setProperty('--lb-accent', accent);
        eyeWrap.style.setProperty('--lb-accent-rgb', rgb);
        eyeWrap.style.setProperty('--board-hover-color', hover);
    }
    if (window.lbEyeAssistant && window.lbEyeAssistant.setAccentRgb) {
        window.lbEyeAssistant.setAccentRgb(rgb, accent);
    }
    if (window.lbMenuTooltips && window.lbMenuTooltips.setAccent) {
        window.lbMenuTooltips.setAccent(accent, rgb);
    }
    let invCursor = document.getElementById('lb-investigation-cursor');
    if (invCursor) {
        invCursor.style.setProperty('--lb-accent-rgb', rgb);
    }
    let invRadial = document.getElementById('lb-inv-radial-overlay');
    if (invRadial) {
        invRadial.style.setProperty('--lb-accent', accent);
        invRadial.style.setProperty('--lb-accent-rgb', rgb);
        invRadial.style.setProperty('--board-hover-color', hover);
        invRadial.style.setProperty('--board-primary-color', accent);
        invRadial.style.setProperty('--board-primary-rgb', rgb);
    }
    document.querySelectorAll('#lb-cd-overlay, #lb-cf-overlay, #lb-af-overlay, #lb-inv-radial-overlay, .lb-radial-cursor-tip').forEach(el => {
        el.style.setProperty('--lb-accent', accent);
        el.style.setProperty('--lb-accent-rgb', rgb);
        el.style.setProperty('--board-hover-color', hover);
        el.style.setProperty('--board-primary-color', accent);
        el.style.setProperty('--board-primary-rgb', rgb);
    });
    lbWriteLiveBoardAccentStyles(accent, hover, rgb);
}

function lbApplyBoardTweaksToDOM(root, tweaks, themeId) {
    tweaks = lbNormalizeBoardTweaks(tweaks);
    let rootEl = root && root.jquery ? root[0] : root;
    if (!rootEl) return;
    let filter = lbBuildTweakFilterString(tweaks);
    let transform = rootEl.querySelector('#lb-transform-layer');
    let canvas = rootEl.querySelector('#lb-canvas');
    let bgEls = rootEl.querySelectorAll('#lb-fixed-bg, #lb-galactic-back-layer, #lb-bg-layer, #lb-fg-layer, #lb-files-layer, #lb-weather-layer, #lb-steam');
    if (transform) transform.style.filter = '';
    bgEls.forEach(el => { el.style.filter = ''; });
    if (canvas) canvas.style.filter = '';
    if (tweaks.applyToAll) {
        if (transform) transform.style.filter = filter;
    } else {
        bgEls.forEach(el => { el.style.filter = filter; });
    }
    // Apply visual tweaks to BOTH back layer AND front layer simultaneously (all boards).
    rootEl.querySelectorAll('#lb-galactic-back-layer, #lb-bg-layer, #lb-fg-layer').forEach(el => { el.style.filter = filter; });
    let tintBg = rootEl.querySelector('#lb-tweak-tint-bg');
    let tintAll = rootEl.querySelector('#lb-tweak-tint-all');
    let tintOp = tweaks.tintOpacity / 100;
    let showTint = tintOp > 0;
    if (tintBg) {
        tintBg.style.backgroundColor = tweaks.tintColor || '#000000';
        tintBg.style.opacity = showTint && !tweaks.applyToAll ? String(tintOp) : '0';
        tintBg.style.display = showTint && !tweaks.applyToAll ? 'block' : 'none';
    }
    if (tintAll) {
        tintAll.style.backgroundColor = tweaks.tintColor || '#000000';
        tintAll.style.opacity = showTint && tweaks.applyToAll ? String(tintOp) : '0';
        tintAll.style.display = showTint && tweaks.applyToAll ? 'block' : 'none';
    }
    let vignetteEl = rootEl.querySelector('#lb-vignette-fx');
    if (vignetteEl) {
        let vig = Math.max(0, Math.min(200, parseInt(tweaks.vignette, 10) || 0));
        if (vig > 0) {
            let spread = Math.round(120 + vig * 2.2);
            let alpha = Math.min(0.98, 0.35 + (vig / 200) * 0.63);
            vignetteEl.style.display = 'block';
            vignetteEl.style.boxShadow = `inset 0 0 ${spread}px rgba(0,0,0,${alpha.toFixed(3)})`;
            vignetteEl.style.opacity = '1';
        } else {
            vignetteEl.style.boxShadow = 'none';
            vignetteEl.style.display = 'none';
        }
    }
    if (!themeId && typeof store !== 'undefined' && store && store.theme) themeId = store.theme;
    if (themeId) lbApplyBoardThemeVars(rootEl, themeId, tweaks);
    window.lbSoundFxVolume = (tweaks.soundFxVolume != null ? tweaks.soundFxVolume : 100) / 100;
}
function lbTweakSliderHTML(id, label, min, max, val, step) {
    return `<div class="lb-tweak-row"><label class="theme-heading" style="font-size:11px;">${label}: <span id="${id}-val">${val}</span></label>
        <input type="range" id="${id}" min="${min}" max="${max}" step="${step || 1}" value="${val}" style="width:100%;"></div>`;
}
async function lbOpenBoardTweaksDialog(opts) {
    opts = opts || {};
    let liveTweaks = lbNormalizeBoardTweaks(opts.initialTweaks || lbDefaultBoardTweaks());
    let tweakThemeId = opts.themeId || 'noir';
    let defaultThemeAccent = lbGetThemeAccentColor(tweakThemeId);
    let cfg = await lbReadConfig();
    cfg.tweakPresets = cfg.tweakPresets || [];
    let presetOpts = cfg.tweakPresets.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    let filterOpts = [
        ['original', 'Original'], ['grayscale', 'Grayscale'], ['sepia', 'Sepia'],
        ['inverted', 'Inverted']
    ].map(([v, l]) => `<option value="${v}" ${liveTweaks.filterMode === v ? 'selected' : ''}>${l}</option>`).join('');
    let content = `<div class="lb-board-tweaks-panel" style="display:flex; flex-direction:column; gap:8px; padding:4px 2px; max-height:72vh; overflow-y:auto;">
        <div class="lb-tweak-row"><label class="theme-heading" style="font-size:11px;">Theme Colour</label>
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="color" id="bt-theme-colour" value="${liveTweaks.themeColour || defaultThemeAccent}" style="width:52px; height:34px; border:none; padding:0; flex-shrink:0;">
                <button type="button" id="bt-theme-colour-reset" class="lb-ed-btn" style="flex:1; min-height:30px; font-size:11px;">Use Board Default</button>
            </div>
            <p class="lb-settings-note" style="margin:2px 0 0 0;">Sets the accent colour for icons and interactive UI on this board. Hover states update automatically.</p>
        </div>
        <hr style="border:none; border-top:1px solid rgba(255,255,255,0.1); margin:6px 0;">
        ${lbTweakSliderHTML('bt-sat', 'Saturation', 0, 200, liveTweaks.sat)}
        ${lbTweakSliderHTML('bt-cont', 'Contrast', 0, 200, liveTweaks.cont)}
        ${lbTweakSliderHTML('bt-bright', 'Brightness', 0, 200, liveTweaks.bright)}
        ${lbTweakSliderHTML('bt-vig', 'Vignette', 0, 200, liveTweaks.vignette)}
        ${lbTweakSliderHTML('bt-hue', 'Hue Rotate', -180, 180, liveTweaks.hue)}
        <div class="lb-tweak-row"><label class="theme-heading" style="font-size:11px;">Tint Color</label>
            <input type="color" id="bt-tint-color" value="${liveTweaks.tintColor}" style="width:100%; height:32px; border:none; padding:0;"></div>
        ${lbTweakSliderHTML('bt-tint-op', 'Tint Opacity', 0, 100, liveTweaks.tintOpacity)}
        ${lbTweakSliderHTML('bt-sfx-vol', 'Sound Effects Volume', 0, 100, liveTweaks.soundFxVolume != null ? liveTweaks.soundFxVolume : 100)}
        <div class="lb-tweak-row"><label class="theme-heading" style="font-size:11px;">Filter</label>
            <select id="bt-filter" style="width:100%; height:30px;">${filterOpts}</select></div>
        <label style="display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:11px; color:#e9e9ec; margin-top:4px;">
            <span>Apply to entire board (incl. items)</span>
            <input type="checkbox" id="bt-apply-all" ${liveTweaks.applyToAll ? 'checked' : ''} style="width:auto; transform:scale(1.15);">
        </label>
        <p class="lb-settings-note" style="margin:4px 0 0 0;">Off = background/theme layers only. UI stays untouched.</p>
        <hr style="border:none; border-top:1px solid rgba(255,255,255,0.1); margin:10px 0;">
        <div class="lb-tweak-row"><label class="theme-heading" style="font-size:11px;">Preset Name</label>
            <input type="text" id="bt-preset-name" placeholder="My look…" style="width:100%; height:30px;"></div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button type="button" id="bt-save-preset" class="lb-ed-btn" style="flex:1; min-width:120px;"><i class="fas fa-save"></i> Save Preset</button>
            <select id="bt-load-preset" style="flex:1; min-width:120px; height:30px;"><option value="">Load Preset…</option>${presetOpts}</select>
        </div>
    </div>`;
    let themeColourIsDefault = !liveTweaks.themeColour;
    let readFromDialog = (dHtml) => {
        liveTweaks = lbNormalizeBoardTweaks({
            themeColour: themeColourIsDefault ? '' : dHtml.find('#bt-theme-colour').val(),
            sat: dHtml.find('#bt-sat').val(),
            cont: dHtml.find('#bt-cont').val(),
            bright: dHtml.find('#bt-bright').val(),
            vignette: dHtml.find('#bt-vig').val(),
            hue: dHtml.find('#bt-hue').val(),
            tintColor: dHtml.find('#bt-tint-color').val(),
            tintOpacity: dHtml.find('#bt-tint-op').val(),
            soundFxVolume: dHtml.find('#bt-sfx-vol').val(),
            filterMode: dHtml.find('#bt-filter').val(),
            applyToAll: dHtml.find('#bt-apply-all').is(':checked')
        });
        return liveTweaks;
    };
    let applyLive = () => {
        if (opts.onLive) opts.onLive(liveTweaks);
    };
    let closeAndRestore = () => {
        if (opts.onClose) opts.onClose();
    };
    new Dialog({
        title: 'Board Tweaks',
        content: content,
        buttons: {
            apply: {
                icon: '<i class="fas fa-sliders-h"></i>',
                label: 'Tweak Board',
                callback: (dHtml) => {
                    let t = readFromDialog(dHtml);
                    if (opts.onApply) opts.onApply(t);
                    closeAndRestore();
                }
            },
            close: {
                label: 'Close',
                callback: () => { closeAndRestore(); }
            }
        },
        render: (dHtml) => {
            let bindSlider = (id, key) => {
                dHtml.find('#' + id).on('input', function() {
                    dHtml.find('#' + id + '-val').text(this.value);
                    readFromDialog(dHtml);
                    applyLive();
                });
            };
            ['bt-sat', 'bt-cont', 'bt-bright', 'bt-vig', 'bt-hue', 'bt-tint-op', 'bt-sfx-vol'].forEach(id => bindSlider(id, id));
            dHtml.find('#bt-theme-colour').on('input change', function() {
                themeColourIsDefault = false;
                let picked = dHtml.find('#bt-theme-colour').val();
                readFromDialog(dHtml);
                let tid = opts.themeId || (typeof store !== 'undefined' && store && store.theme) || 'noir';
                lbApplyBoardThemeVars(document.getElementById('lb-app-root'), tid, liveTweaks);
                applyLive();
            });
            dHtml.find('#bt-theme-colour-reset').on('click', function() {
                themeColourIsDefault = true;
                let tid = opts.themeId || 'noir';
                dHtml.find('#bt-theme-colour').val(lbGetThemeAccentColor(tid));
                readFromDialog(dHtml);
                lbApplyBoardThemeVars(document.getElementById('lb-app-root'), tid, liveTweaks);
                applyLive();
            });
            dHtml.find('#bt-tint-color, #bt-filter, #bt-apply-all').on('input change', function() {
                readFromDialog(dHtml);
                applyLive();
            });
            dHtml.find('#bt-save-preset').on('click', async () => {
                let name = (dHtml.find('#bt-preset-name').val() || '').trim();
                if (!name) return;
                let t = readFromDialog(dHtml);
                let c = await lbReadConfig();
                c.tweakPresets = c.tweakPresets || [];
                let existing = c.tweakPresets.find(p => p.name === name);
                if (existing) {
                    existing.tweaks = t;
                } else {
                    c.tweakPresets.push({ id: foundry.utils.randomID(), name: name, tweaks: t });
                }
                await lbWriteConfig(c);
                let optsHtml = '<option value="">Load Preset…</option>' + c.tweakPresets.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
                dHtml.find('#bt-load-preset').html(optsHtml);
                dHtml.find('#bt-preset-name').val('');
            });
            dHtml.find('#bt-load-preset').on('change', async function() {
                let id = $(this).val();
                if (!id) return;
                let c = await lbReadConfig();
                let preset = (c.tweakPresets || []).find(p => p.id === id);
                if (!preset) return;
                liveTweaks = lbNormalizeBoardTweaks(preset.tweaks);
                dHtml.find('#bt-sat').val(liveTweaks.sat); dHtml.find('#bt-sat-val').text(liveTweaks.sat);
                dHtml.find('#bt-cont').val(liveTweaks.cont); dHtml.find('#bt-cont-val').text(liveTweaks.cont);
                dHtml.find('#bt-bright').val(liveTweaks.bright); dHtml.find('#bt-bright-val').text(liveTweaks.bright);
                dHtml.find('#bt-vig').val(liveTweaks.vignette); dHtml.find('#bt-vig-val').text(liveTweaks.vignette);
                dHtml.find('#bt-hue').val(liveTweaks.hue); dHtml.find('#bt-hue-val').text(liveTweaks.hue);
                dHtml.find('#bt-tint-color').val(liveTweaks.tintColor);
                dHtml.find('#bt-theme-colour').val(liveTweaks.themeColour || defaultThemeAccent);
                themeColourIsDefault = !liveTweaks.themeColour;
                dHtml.find('#bt-tint-op').val(liveTweaks.tintOpacity); dHtml.find('#bt-tint-op-val').text(liveTweaks.tintOpacity);
                dHtml.find('#bt-filter').val(liveTweaks.filterMode === 'sincity' ? 'original' : liveTweaks.filterMode);
                dHtml.find('#bt-apply-all').prop('checked', !!liveTweaks.applyToAll);
                applyLive();
            });
            let app = dHtml.closest('.app')[0];
            if (app) {
                app.classList.add('lb-board-tweaks-dialog');
                app.style.position = 'fixed';
                app.style.right = '14px';
                app.style.top = '72px';
                app.style.left = 'auto';
                app.style.width = '292px';
                app.style.maxHeight = '88vh';
            }
        },
        close: () => { closeAndRestore(); }
    }, { classes: ['dialog', 'lb-modern-dialog', 'lb-board-tweaks-dialog'], width: 300, height: 'auto', zIndex: 100010 }).render(true);
}
window.lbApplyBoardTweaksToDOM = lbApplyBoardTweaksToDOM;
window.lbDefaultBoardTweaks = lbDefaultBoardTweaks;
window.lbOpenBoardTweaksDialog = lbOpenBoardTweaksDialog;

// ---------------------------------------------------------------------------
// GOLD MEMBERSHIP UNLOCK — replaceable validation codes for custom board uploads
// ---------------------------------------------------------------------------
const LB_GOLD_UNLOCK_CODES = ['2GBN-12DF-XZU7'];
function lbNormalizeUnlockCode(code) {
    return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
}
function lbValidateGoldUnlockCode(code) {
    let norm = lbNormalizeUnlockCode(code);
    return LB_GOLD_UNLOCK_CODES.some(c => lbNormalizeUnlockCode(c) === norm);
}
function lbOpenGoldUnlockDialog(onUnlocked) {
    new Dialog({
        title: 'Unlock Premium Wallpapers',
        content: `<div class="lb-ed" style="--lb-accent:#e7c54a; padding:8px 4px;">
            <p style="text-align:center; color:#e9e9ec; font-size:13px; line-height:1.55; margin:0 0 16px 0;">
                Enter the exclusive unlock code that was sent to you as a GOLD Member on Patreon and unlock the ability to upload your own wallpapers on two independent background layers.
            </p>
            <div style="display:flex; justify-content:center;">
                <input type="text" id="lb-gold-unlock-code" placeholder="Enter Unlock Code"
                    style="width:min(100%,320px); background:#fff !important; color:#111 !important; border:1px solid #ccc; border-radius:8px; padding:12px 14px; font-size:15px; text-align:center; letter-spacing:1px;">
            </div>
            <p id="lb-gold-unlock-err" style="display:none; text-align:center; color:#e9776f; font-size:11px; margin:10px 0 0 0;"></p>
        </div>`,
        buttons: {
            unlock: { icon: '<i class="fas fa-unlock"></i>', label: 'Unlock', callback: (dHtml) => {
                let code = dHtml.find('#lb-gold-unlock-code').val();
                if (!lbValidateGoldUnlockCode(code)) {
                    dHtml.find('#lb-gold-unlock-err').text('Invalid unlock code. Please check your Patreon message.').show();
                    return false;
                }
                if (onUnlocked) onUnlocked();
            }}
        },
        default: 'unlock',
        render: (dHtml) => {
            dHtml.find('#lb-gold-unlock-code').on('keydown', function(e) {
                if (e.key === 'Enter') { e.preventDefault(); dHtml.find('.dialog-button.unlock').click(); }
            });
        }
    }, { classes: ['dialog', 'lb-modern-dialog'], width: 480, zIndex: 100005 }).render(true);
}
