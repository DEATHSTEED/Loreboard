'use strict';
// LOREBOARD - Jukebox and scene controls

// =============================================================================
// JUKEBOX / MUSIC MODE — theme-gated immersive audio player (Detective's Office)
// Components: JukeboxOverlay, UploadModal, BatchUploadModal, ImageCropper, JewelCaseCarousel, AudioPlayer, PublishCategories
// =============================================================================

const LB_JUKEBOX_ERA_ASSETS = {
    '1920': 'modules/loreboard/assets/graphics/BoardNoirmusik1920.webp',
    '1960': 'modules/loreboard/assets/graphics/BoardNoirmusic1960.webp'
};
const LB_JUKEBOX_DEFAULT_ERA = '1920';

const LB_JUKEBOX_MODERN_DEVICE_ASSETS = {
    'cd': 'modules/loreboard/assets/graphics/ModernOfficeCDPlayer.webp',
    'phone': 'modules/loreboard/assets/graphics/ModernOfficeSmartphone.webp'
};
const LB_JUKEBOX_DEFAULT_MODERN_DEVICE = 'cd';

const LB_JUKEBOX_HIDEOUT_VIEW_ASSETS = {
    'device': 'modules/loreboard/assets/graphics/ShadowpunkDevice.webp',
    'holo': 'modules/loreboard/assets/graphics/ShadowpunkHolo.webp'
};
const LB_JUKEBOX_DEFAULT_HIDEOUT_VIEW = 'device';
const LB_CUSTOM_BOARD_DEFAULT_FG_VIEW = '';
const LB_CUSTOM_BOARD_DEFAULT_FG_URL = '';

const LB_JUKEBOX_SLUMS_VIEW_ASSETS = {
    'mp3': 'modules/loreboard/assets/graphics/SlumsMp3.webp',
    'phone': 'modules/loreboard/assets/graphics/ModernOfficeSmartphone.webp',
    'device': 'modules/loreboard/assets/graphics/ShadowpunkDevice.webp'
};
const LB_JUKEBOX_DEFAULT_SLUMS_VIEW = 'mp3';

const LB_JUKEBOX_GALACTIC_VIEW_ASSETS = {
    'robot': 'modules/loreboard/assets/graphics/GalaxyBackRobot.webp',
    'holo': 'modules/loreboard/assets/graphics/ShadowpunkHolo.webp'
};
const LB_JUKEBOX_DEFAULT_GALACTIC_VIEW = 'robot';

const LB_JUKEBOX_COSYTAVERN_ASSET = 'modules/loreboard/assets/graphics/CosyTavernclamp.webp';

function lbCollectBoardPreloadUrls(theme) {
    let urls = new Set();
    let add = (u) => { if (u && typeof u === 'string') urls.add(u); };
    add(theme && theme.bg);
    add(theme && theme.fg);
    add(theme && theme.files);
    add(LB_PARCHMENT_MASK);
    for (let i = 1; i <= LB_PAPER_COUNT; i++) add(LB_ASSET_BASE + '/Paper' + i + '.webp');
    add(LB_FADEN_IMG);
    LB_DRAW_MASKS.forEach(add);
    add(LB_POSTIT_DEFAULT);
    LB_POSTIT_URLS.forEach(add);
    LB_WAX_SEALS.forEach(add);
    LB_PIN_URLS.forEach(add);
    LB_MAGNET_URLS.forEach(add);
    LB_NAIL_URLS.forEach(add);
    LB_OFFICE_PIN_URLS.forEach(add);
    LB_METAL_PIN_URLS.forEach(add);
    LB_OFFICE_MAGNET_URLS.forEach(add);
    LB_HEAVY_MAGNET_URLS.forEach(add);
    Object.values(LB_TAPE_DESIGNS).forEach(d => {
        for (let n = 1; n <= 3; n++) add(LB_ASSET_BASE + '/' + d.prefix + n + '.webp');
    });
    Object.values(LB_JUKEBOX_ERA_ASSETS).forEach(add);
    Object.values(LB_JUKEBOX_MODERN_DEVICE_ASSETS).forEach(add);
    Object.values(LB_JUKEBOX_HIDEOUT_VIEW_ASSETS).forEach(add);
    Object.values(LB_JUKEBOX_SLUMS_VIEW_ASSETS).forEach(add);
    Object.values(LB_JUKEBOX_GALACTIC_VIEW_ASSETS).forEach(add);
    add(LB_JUKEBOX_COSYTAVERN_ASSET);
    let tid = theme && theme.id;
    if (tid && LB_BOARD_FASTENER_CONFIG[tid]) {
        let set = LB_FASTENER_SETS[LB_BOARD_FASTENER_CONFIG[tid].fastenerSet];
        if (set) set.forEach(add);
    }
    return Array.from(urls);
}

function lbRunAssetPreloader(urls, opts) {
    opts = opts || {};
    let overlay = document.getElementById('lb-asset-preloader');
    let bar = document.getElementById('lb-preload-bar');
    let skipBtn = document.getElementById('lb-preload-skip');
    if (!overlay || !bar) { if (opts.onComplete) opts.onComplete(); return { cancel: () => {} }; }
    let cancelled = false;
    let done = false;
    let total = urls.length || 1;
    let loaded = 0;
    let updateBar = (pct) => { bar.style.width = Math.min(100, Math.max(0, pct)) + '%'; };
    overlay.style.display = 'flex';
    updateBar(0);
    let finish = () => {
        if (done) return;
        done = true;
        overlay.style.display = 'none';
        updateBar(0);
        if (opts.onComplete) opts.onComplete();
    };
    let cancel = () => {
        if (done) return;
        cancelled = true;
        finish();
    };
    if (skipBtn) skipBtn.onclick = cancel;
    if (!urls.length) { finish(); return { cancel }; }
    urls.forEach(url => {
        let img = new Image();
        let tick = () => {
            if (cancelled || done) return;
            loaded++;
            updateBar(Math.round((loaded / total) * 100));
            if (loaded >= total) finish();
        };
        img.onload = tick;
        img.onerror = tick;
        img.src = url;
    });
    return { cancel };
}
window.lbCollectBoardPreloadUrls = lbCollectBoardPreloadUrls;
window.lbRunAssetPreloader = lbRunAssetPreloader;

/** High-quality vector music symbols for Jukebox playback FX (native SVG, scalable). */
function lbJukeboxNoteSvgHtml(type) {
    let vb = '0 0 64 64';
    let inner = '';
    if (type === 'treble') {
        vb = '0 0 48 96';
        inner = '<path fill="currentColor" d="M28 4c-8 0-14 6-14 14 0 7 4 12 10 15-6 3-10 9-10 16 0 10 8 18 18 18 3 0 6-1 8-2-1 6-1 12 1 18C33 91 26 96 18 96 8 96 0 88 0 78c0-4 1-7 3-10 2 10 10 17 20 17 12 0 22-10 22-22 0-8-4-15-10-19 6-3 10-9 10-16C45 10 37 4 28 4zm0 8c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9zm-2 38c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9z"/>';
    } else if (type === 'beamed') {
        inner = '<path fill="currentColor" d="M14 46c-3.3 0-6 2-6 4.5S10.7 55 14 55s6-2 6-4.5S17.3 46 14 46zM38 40c-3.3 0-6 2-6 4.5s2.7 4.5 6 4.5 6-2 6-4.5-2.7-4.5-6-4.5z"/><path fill="currentColor" d="M20 8v34.5c0 2.5 2.7 4.5 6 4.5V8h-6zM44 2v34.5c0 2.5 2.7 4.5 6 4.5V2h-6z"/><rect fill="currentColor" x="20" y="8" width="30" height="5" rx="1"/>';
    } else if (type === 'quarter') {
        inner = '<ellipse fill="currentColor" cx="20" cy="50" rx="7" ry="5.5"/><path fill="currentColor" d="M26 8v36.5c0 2.5 2.7 4.5 6 4.5V8h-6z"/>';
    } else {
        inner = '<ellipse fill="currentColor" cx="22" cy="48" rx="7" ry="5.5"/><path fill="currentColor" d="M28 8v32.5c0 2.5 2.7 4.5 6 4.5V8h-6z"/>';
    }
    return `<svg class="lb-juke-note-svg" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" shape-rendering="geometricPrecision">${inner}</svg>`;
}
const LB_JUKEBOX_NOTE_TYPES = ['eighth', 'beamed', 'quarter', 'treble'];
function lbJukeboxRandomNoteSvg() {
    return lbJukeboxNoteSvgHtml(LB_JUKEBOX_NOTE_TYPES[Math.floor(Math.random() * LB_JUKEBOX_NOTE_TYPES.length)]);
}
const LB_JUKEBOX_TREBLE_SVG = lbJukeboxNoteSvgHtml('treble');

/** Stream stations per board theme (custom radios are merged at runtime). */
const LB_JUKEBOX_RADIO_BY_BOARD = {
    noir: [
        { id: 'british-homefront', name: 'British Homefront Radio', url: 'https://solid2.streamupsolutions.com/proxy/rsbudoyu?mp=/;type=mp3', fallbacks: ['http://solid2.streamupsolutions.com:24929/stream', 'http://23.81.33.82:24929/stream'] },
        { id: 'radio-dismuke', name: 'Radio Dismuke', url: 'http://stream2.early1900s.org:8000/', fallbacks: ['http://stream2.early1900s.org:8000/stream', 'http://74.208.160.215:8020/;stream.mp3'] },
        { id: 'radio-nightingale', name: 'Radio Nightingale', url: 'http://streams.radioriel.org:8080/radio_dieselpunk.mp3', fallbacks: ['http://streams.radioriel.org:8080/live', 'http://streams.radioriel.org:8080/stream.mp3', 'http://streams.radioriel.org:8040/stream'] }
    ],
    modern: [
        { id: 'somafm-gsclassic', name: 'GS Classic', url: 'https://ice4.somafm.com/gsclassic-128-mp3' },
        { id: 'somafm-deepspace', name: 'Deep Space One', url: 'https://ice4.somafm.com/deepspaceone-128-mp3' },
        { id: 'somafm-secretagent', name: 'Secret Agent', url: 'https://ice4.somafm.com/secretagent-128-mp3' },
        { id: 'somafm-groovesalad', name: 'Modern Chillout', url: 'https://ice4.somafm.com/groovesalad-128-mp3' },
        { id: 'somafm-dronezone', name: 'Dark Ambient', url: 'https://ice4.somafm.com/dronezone-128-mp3' }
    ],
    shadowpunk: [
        { id: 'somafm-missioncontrol', name: 'Mission Control', url: 'https://ice4.somafm.com/missioncontrol-128-mp3' },
        { id: 'somafm-fluid', name: 'Fluid 128', url: 'https://ice4.somafm.com/fluid-128-mp3' },
        { id: 'somafm-vaporwave', name: 'Vaporwave', url: 'https://ice4.somafm.com/vaporwaves-128-mp3' },
        { id: 'somafm-defcon', name: 'DEFCON', url: 'https://ice4.somafm.com/defcon-128-mp3' }
    ],
    slums: [
        { id: 'somafm-darkzone', name: 'Darkzone', url: 'https://ice4.somafm.com/darkzone-128-mp3' }
    ],
    galactic: [
        { id: 'somafm-synphaera', name: 'Synphaera Station', url: 'https://ice4.somafm.com/synphaera-128-mp3' },
        { id: 'somafm-cryosleep', name: 'CRYO 1 IN ORBIT OF SOMA FMX-1', url: 'https://ice4.somafm.com/cryosleep-128-mp3' }
    ],
    cosytavern: [
        { id: 'rivendell-green-dragon', name: 'The Green Dragon', url: 'https://play.radiorivendell.com/radio/8000/radio.mp3' }
    ]
};

function lbJukeboxNormalizeEra(era) {
    return era === '1960' ? '1960' : '1920';
}

function lbJukeboxNormalizeDevice(device) {
    return device === 'phone' ? 'phone' : 'cd';
}

function lbJukeboxNormalizeHideoutView(view) {
    return view === 'holo' ? 'holo' : 'device';
}

function lbJukeboxNormalizeSlumsView(view) {
    return view === 'phone' ? 'phone' : (view === 'device' ? 'device' : 'mp3');
}

function lbJukeboxNormalizeGalacticView(view) {
    return view === 'holo' ? 'holo' : 'robot';
}

function lbJukeboxEnsureEra(store) {
    if (!store) return LB_JUKEBOX_DEFAULT_ERA;
    if (!store.jukeboxEra) store.jukeboxEra = LB_JUKEBOX_DEFAULT_ERA;
    store.jukeboxEra = lbJukeboxNormalizeEra(store.jukeboxEra);
    return store.jukeboxEra;
}

function lbJukeboxEnsureDevice(store) {
    if (!store) return LB_JUKEBOX_DEFAULT_MODERN_DEVICE;
    if (!store.jukeboxDevice) store.jukeboxDevice = LB_JUKEBOX_DEFAULT_MODERN_DEVICE;
    store.jukeboxDevice = lbJukeboxNormalizeDevice(store.jukeboxDevice);
    return store.jukeboxDevice;
}

function lbJukeboxEnsureHideoutView(store) {
    if (!store) return LB_JUKEBOX_DEFAULT_HIDEOUT_VIEW;
    if (!store.jukeboxHideoutView) store.jukeboxHideoutView = LB_JUKEBOX_DEFAULT_HIDEOUT_VIEW;
    store.jukeboxHideoutView = lbJukeboxNormalizeHideoutView(store.jukeboxHideoutView);
    return store.jukeboxHideoutView;
}

function lbJukeboxEnsureSlumsView(store) {
    if (!store) return LB_JUKEBOX_DEFAULT_SLUMS_VIEW;
    if (!store.jukeboxSlumsView) store.jukeboxSlumsView = LB_JUKEBOX_DEFAULT_SLUMS_VIEW;
    store.jukeboxSlumsView = lbJukeboxNormalizeSlumsView(store.jukeboxSlumsView);
    return store.jukeboxSlumsView;
}

function lbJukeboxEnsureGalacticView(store) {
    if (!store) return LB_JUKEBOX_DEFAULT_GALACTIC_VIEW;
    if (!store.jukeboxGalacticView) store.jukeboxGalacticView = LB_JUKEBOX_DEFAULT_GALACTIC_VIEW;
    store.jukeboxGalacticView = lbJukeboxNormalizeGalacticView(store.jukeboxGalacticView);
    return store.jukeboxGalacticView;
}

function lbJukeboxEraUrl(era) {
    return LB_JUKEBOX_ERA_ASSETS[lbJukeboxNormalizeEra(era)] || LB_JUKEBOX_ERA_ASSETS[LB_JUKEBOX_DEFAULT_ERA];
}

function lbJukeboxDeviceUrl(device) {
    return LB_JUKEBOX_MODERN_DEVICE_ASSETS[lbJukeboxNormalizeDevice(device)] || LB_JUKEBOX_MODERN_DEVICE_ASSETS[LB_JUKEBOX_DEFAULT_MODERN_DEVICE];
}

function lbJukeboxHideoutViewUrl(view) {
    return LB_JUKEBOX_HIDEOUT_VIEW_ASSETS[lbJukeboxNormalizeHideoutView(view)] || LB_JUKEBOX_HIDEOUT_VIEW_ASSETS[LB_JUKEBOX_DEFAULT_HIDEOUT_VIEW];
}

function lbJukeboxSlumsViewUrl(view) {
    return LB_JUKEBOX_SLUMS_VIEW_ASSETS[lbJukeboxNormalizeSlumsView(view)] || LB_JUKEBOX_SLUMS_VIEW_ASSETS[LB_JUKEBOX_DEFAULT_SLUMS_VIEW];
}

function lbJukeboxGalacticViewUrl(view) {
    return LB_JUKEBOX_GALACTIC_VIEW_ASSETS[lbJukeboxNormalizeGalacticView(view)] || LB_JUKEBOX_GALACTIC_VIEW_ASSETS[LB_JUKEBOX_DEFAULT_GALACTIC_VIEW];
}

function lbEnsureCustomBoardFgDefaults(st) {
    if (!st || !st.customBoard) return st;
    if (st.jukeboxCustomView === 'shadowpunk:holo' || st.jukeboxCustomView === LB_CUSTOM_BOARD_DEFAULT_FG_VIEW) {
        st.jukeboxCustomView = '';
    }
    if (st.classicFg === LB_JUKEBOX_HIDEOUT_VIEW_ASSETS.holo) st.classicFg = '';
    return st;
}
function lbApplyCustomBoardForeground(viewKey, root) {
    let st = window.lbCurrentStore || {};
    let url = st.customBoard ? (st.classicFg || '') : lbJukeboxCustomViewUrl(viewKey);
    let rootEl = root && root.jquery ? root[0] : (root || document.getElementById('lb-app-root'));
    if (!rootEl) return;
    let fg = rootEl.querySelector('#lb-fg-layer');
    if (!fg) return;
    if (url) {
        fg.style.backgroundImage = "url('" + url + "')";
        fg.style.display = 'block';
    } else {
        fg.style.backgroundImage = 'none';
        fg.style.display = 'none';
    }
}
window.lbApplyCustomBoardForeground = lbApplyCustomBoardForeground;
window.lbEnsureCustomBoardFgDefaults = lbEnsureCustomBoardFgDefaults;

function lbJukeboxEnsureCustomView(store) {
    if (!store) return '';
    if (store.jukeboxCustomView === undefined || store.jukeboxCustomView === null) store.jukeboxCustomView = '';
    if (store.jukeboxCustomView === 'shadowpunk:holo') store.jukeboxCustomView = '';
    return store.jukeboxCustomView;
}

function lbJukeboxCustomViewOptions() {
    let opts = [{ id: '', label: 'None', url: '' }];
    let seen = new Set(['']);
    let add = (id, label, url) => {
        if (!id || seen.has(id) || !url) return;
        seen.add(id);
        opts.push({ id, label, url });
    };
    LB_THEMES.filter(t => !t.parallax || t.fg).forEach(t => {
        if (t.fg) add(t.id + ':fg', t.name + ' (View)', t.fg);
        if (t.files) add(t.id + ':files', t.name + ' (Files)', t.files);
        if (t.bg && t.parallax) add(t.id + ':bg', t.name + ' (Backdrop)', t.bg);
    });
    Object.entries(LB_JUKEBOX_ERA_ASSETS).forEach(([k, url]) => add('noir:' + k, 'Noir ' + k, url));
    Object.entries(LB_JUKEBOX_MODERN_DEVICE_ASSETS).forEach(([k, url]) => add('modern:' + k, 'Modern ' + (k === 'cd' ? 'CD Player' : 'Smartphone'), url));
    Object.entries(LB_JUKEBOX_HIDEOUT_VIEW_ASSETS).forEach(([k, url]) => add('shadowpunk:' + k, 'Shadowpunk ' + (k === 'holo' ? 'Holo' : 'Device'), url));
    Object.entries(LB_JUKEBOX_SLUMS_VIEW_ASSETS).forEach(([k, url]) => add('slums:' + k, 'Slums ' + k.toUpperCase(), url));
    Object.entries(LB_JUKEBOX_GALACTIC_VIEW_ASSETS).forEach(([k, url]) => add('galactic:' + k, 'Galactic ' + (k === 'holo' ? 'Holo' : 'Robot'), url));
    add('cosytavern:clamp', 'Cosy Tavern', LB_JUKEBOX_COSYTAVERN_ASSET);
    return opts;
}

function lbJukeboxCustomViewUrl(viewKey) {
    if (!viewKey) return '';
    let hit = lbJukeboxCustomViewOptions().find(o => o.id === viewKey);
    return hit ? hit.url : '';
}

function lbJukeboxLayerUrl(themeId, store) {
    if (store && store.customBoard) return lbJukeboxCustomViewUrl(lbJukeboxEnsureCustomView(store));
    if (themeId === 'modern') return lbJukeboxDeviceUrl(lbJukeboxEnsureDevice(store));
    if (themeId === 'shadowpunk') return lbJukeboxHideoutViewUrl(lbJukeboxEnsureHideoutView(store));
    if (themeId === 'slums') return lbJukeboxSlumsViewUrl(lbJukeboxEnsureSlumsView(store));
    if (themeId === 'galactic') return lbJukeboxGalacticViewUrl(lbJukeboxEnsureGalacticView(store));
    if (themeId === 'cosytavern') return LB_JUKEBOX_COSYTAVERN_ASSET;
    return lbJukeboxEraUrl(lbJukeboxEnsureEra(store));
}

function lbJukeboxMergeStations() {
    let seen = new Set();
    let out = [];
    for (let i = 0; i < arguments.length; i++) {
        (arguments[i] || []).forEach(s => {
            if (!s || seen.has(s.id)) return;
            seen.add(s.id);
            out.push(s);
        });
    }
    return out;
}

function lbJukeboxGetStreamStations(themeId) {
    if (themeId === 'slums') {
        return lbJukeboxMergeStations(
            LB_JUKEBOX_RADIO_BY_BOARD.shadowpunk,
            LB_JUKEBOX_RADIO_BY_BOARD.modern,
            LB_JUKEBOX_RADIO_BY_BOARD.slums
        );
    }
    return (LB_JUKEBOX_RADIO_BY_BOARD[themeId] || []).slice();
}

function lbJukeboxGetAllStreamStations() {
    let seen = new Set();
    let out = [];
    Object.keys(LB_JUKEBOX_RADIO_BY_BOARD).forEach(k => {
        (LB_JUKEBOX_RADIO_BY_BOARD[k] || []).forEach(st => {
            if (!st || !st.id || seen.has(st.id)) return;
            seen.add(st.id);
            out.push(st);
        });
    });
    return out;
}

function lbJukeboxGetSlideDirection(themeId, viewKey) {
    if (themeId === 'modern') return viewKey === 'cd' ? 'rtl' : 'ltr';
    if (themeId === 'slums') return viewKey === 'mp3' ? 'rtl' : 'ltr';
    if (themeId === 'cosytavern') return 'rtl';
    return 'ltr';
}

function lbJukeboxGetSlideViewKey(themeId, store) {
    if (themeId === 'noir') return lbJukeboxNormalizeEra(store.jukeboxEra);
    if (themeId === 'modern') return lbJukeboxNormalizeDevice(store.jukeboxDevice);
    if (themeId === 'shadowpunk') return lbJukeboxNormalizeHideoutView(store.jukeboxHideoutView);
    if (themeId === 'slums') return lbJukeboxNormalizeSlumsView(store.jukeboxSlumsView);
    if (themeId === 'galactic') return lbJukeboxNormalizeGalacticView(store.jukeboxGalacticView);
    if (themeId === 'cosytavern') return 'tavern';
    return 'default';
}

function lbJukeboxShuffleTracks(arr) {
    let a = (arr || []).slice();
    for (let i = a.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        let t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
}

function lbJukeboxEnsureCustomRadios(store) {
    if (!store.jukeboxCustomRadios) store.jukeboxCustomRadios = [];
    store.jukeboxCustomRadios.forEach(lbJukeboxNormalizeCustomRadio);
    return store.jukeboxCustomRadios;
}

function lbJukeboxNormalizeCustomRadio(radio) {
    if (!radio) return null;
    if (!radio.id) radio.id = foundry.utils.randomID();
    if (!radio.name) radio.name = 'Custom Radio';
    if (!radio.tracks) radio.tracks = [];
    if (radio.published === undefined) radio.published = false;
    if (!radio.createdAt) radio.createdAt = Date.now();
    return radio;
}

function lbJukeboxGetPublishedCustomRadios(store) {
    return lbJukeboxEnsureCustomRadios(store).filter(r => r.published && r.tracks && r.tracks.length);
}

function lbJukeboxFindCustomRadio(store, id) {
    return lbJukeboxEnsureCustomRadios(store).find(r => r.id === id);
}

function lbJukeboxCustomRadioAsStation(radio) {
    return { id: radio.id, name: radio.name, custom: true, tracks: radio.tracks.slice() };
}

function lbJukeboxGetAllRadioStations(themeId, store) {
    let isClassic = !!(store && store.classic);
    let streams = isClassic ? lbJukeboxGetAllStreamStations() : lbJukeboxGetStreamStations(themeId);
    let custom = lbJukeboxGetPublishedCustomRadios(store).map(lbJukeboxCustomRadioAsStation);
    return streams.concat(custom);
}

function lbJukeboxFindRadioStation(themeId, store, id) {
    return lbJukeboxGetAllRadioStations(themeId, store).find(s => s.id === id) || null;
}

function lbJukeboxStationUrls(station) {
    if (!station) return [];
    return [...new Set([station.url].concat(station.fallbacks || []).filter(Boolean))];
}

async function lbJukeboxUnlockAudio() {
    try {
        if (game?.audio?.unlock) await game.audio.unlock;
        let ctx = game?.audio?.context;
        if (ctx && ctx.state === 'suspended') await ctx.resume();
    } catch (e) {}
}

async function lbJukeboxStopRadioSound(sound) {
    if (!sound) return;
    try { await sound.stop(); } catch (e) {}
    try { sound.unload(); } catch (e) {}
}

function lbJukeboxTryHtmlRadioOnce(url, el, volume, crossOriginMode) {
    return new Promise((resolve) => {
        let settled = false;
        let finish = (ok) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            el.onerror = null;
            el.onstalled = null;
            el.onplaying = null;
            el.oncanplay = null;
            el.onloadeddata = null;
            if (!ok) {
                try { el.pause(); el.removeAttribute('src'); el.load(); } catch (e) {}
            }
            resolve(!!ok);
        };
        let timer = setTimeout(() => finish(false), 32000);
        let markLive = () => {
            if (el.readyState >= 2 || !el.paused) finish(true);
        };
        el.onerror = () => finish(false);
        el.onstalled = () => finish(false);
        el.onplaying = () => finish(true);
        el.oncanplay = markLive;
        el.onloadeddata = markLive;
        el.volume = volume;
        try {
            if (crossOriginMode) el.crossOrigin = crossOriginMode;
            else el.removeAttribute('crossorigin');
            el.preload = 'auto';
            el.src = url;
            el.load();
            let p = el.play();
            if (p && p.catch) p.catch(() => {});
        } catch (e) {
            finish(false);
        }
    });
}

async function lbJukeboxTryHtmlRadio(url, el, volume) {
    if (await lbJukeboxTryHtmlRadioOnce(url, el, volume, null)) return true;
    return lbJukeboxTryHtmlRadioOnce(url, el, volume, 'anonymous');
}

async function lbJukeboxConnectRadio(station, el, volume) {
    let urls = lbJukeboxStationUrls(station);
    for (let i = 0; i < urls.length; i++) {
        if (await lbJukeboxTryHtmlRadio(urls[i], el, volume)) return true;
    }
    return false;
}

function lbJukeboxRadioIsLive(state, radioAudio, tapeAudio) {
    if (!state || !state.radioStationId) return false;
    if (state.customRadioActive) {
        tapeAudio = tapeAudio || document.getElementById('lb-jukebox-audio');
        return !!(tapeAudio && tapeAudio.src && !tapeAudio.paused);
    }
    return !!(radioAudio && radioAudio.src && !radioAudio.paused);
}

function lbJukeboxDialRotation(pct) {
    return -135 + (Math.max(0, Math.min(100, pct)) / 100) * 270;
}

function lbJukeboxIsEnabled(themeId, opts) {
    if (!lbHasFeature('jukebox')) return false;
    opts = opts || {};
    if (opts.classic) return true;
    return themeId === 'noir' || themeId === 'modern' || themeId === 'shadowpunk' || themeId === 'slums' || themeId === 'galactic' || themeId === 'cosytavern';
}

function lbJukeboxEnsureFonts() {
    if (document.getElementById('lb-jukebox-fonts')) return;
    let link = document.createElement('link');
    link.id = 'lb-jukebox-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Share+Tech+Mono&display=swap';
    document.head.appendChild(link);
}

function lbJukeboxHexToRgb(hex) {
    hex = String(hex || '#d4af37').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    let n = parseInt(hex, 16);
    return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
}

function lbThemeHoverColor(hex, amount) {
    hex = String(hex || '#d4af37').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    amount = amount == null ? 0.35 : amount;
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    r = Math.min(255, Math.round(r + (255 - r) * amount));
    g = Math.min(255, Math.round(g + (255 - g) * amount));
    b = Math.min(255, Math.round(b + (255 - b) * amount));
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function lbJukeboxApplyThemeStyles(overlay, theme) {
    let t = LB_THEMES.find(x => x.id === theme.id) || LB_THEMES.find(x => x.id === 'noir');
    let accent = (t && t.accent) ? t.accent : '#d4af37';
    let appRoot = document.getElementById('lb-app-root');
    if (appRoot) {
        let cs = getComputedStyle(appRoot);
        let boardAccent = cs.getPropertyValue('--board-primary-color').trim();
        let boardHover = cs.getPropertyValue('--board-hover-color').trim();
        let boardRgb = cs.getPropertyValue('--board-primary-rgb').trim();
        if (boardAccent) accent = boardAccent;
        let el = overlay[0] || overlay;
        if (!el || !el.style) return;
        el.dataset.theme = theme.id;
        el.style.setProperty('--lb-juke-accent', accent);
        el.style.setProperty('--lb-juke-accent-rgb', boardRgb || lbJukeboxHexToRgb(accent));
        el.style.setProperty('--board-primary-color', accent);
        el.style.setProperty('--board-hover-color', boardHover || lbThemeHoverColor(accent, theme.id === 'shadowpunk' ? 0.28 : 0.35));
        el.style.setProperty('--board-primary-rgb', boardRgb || lbJukeboxHexToRgb(accent));
        return;
    }
    let hover = lbThemeHoverColor(accent, theme.id === 'shadowpunk' ? 0.28 : 0.35);
    let el = overlay[0] || overlay;
    if (!el || !el.style) return;
    el.dataset.theme = theme.id;
    el.style.setProperty('--lb-juke-accent', accent);
    el.style.setProperty('--lb-juke-accent-rgb', lbJukeboxHexToRgb(accent));
    el.style.setProperty('--board-primary-color', accent);
    el.style.setProperty('--board-hover-color', hover);
    el.style.setProperty('--board-primary-rgb', lbJukeboxHexToRgb(accent));
}

function lbJukeboxCoverSrc(tape) {
    if (!tape) return '';
    let src = tape.coverPath || tape.coverData || '';
    // Legacy tapes saved the old placeholder (a music-note glyph) as their cover data.
    // Treat it as "no cover" so the plain-disc fallback renders instead.
    if (src && src.startsWith('data:') && src.indexOf('M22%202c') !== -1) return '';
    return src;
}

async function lbJukeboxPersistCover(dataUrl) {
    if (!dataUrl || !String(dataUrl).startsWith('data:')) return dataUrl || '';
    let folder = 'loreboard_jukebox';
    try { await FilePicker.createDirectory('data', folder); } catch (e) {}
    let blob = await fetch(dataUrl).then(r => r.blob());
    let file = new File([blob], 'tape_cover_' + foundry.utils.randomID() + '.jpg', { type: 'image/jpeg' });
    let res = await FilePicker.upload('data', folder, file);
    return res.path;
}

/** Upload a single MP3 for custom radio tracks — stored in Foundry data (same pattern as tape audio). */
async function lbJukeboxPersistAudioFile(file) {
    if (!file) return '';
    let folder = 'loreboard_jukebox/custom_radio';
    try { await FilePicker.createDirectory('data', folder); } catch (e) {}
    let safeName = String(file.name || 'track.mp3').replace(/[^\w.\-]+/g, '_');
    if (!/\.mp3$/i.test(safeName)) safeName += '.mp3';
    let uploadFile = file.name === safeName ? file : new File([file], safeName, { type: file.type || 'audio/mpeg' });
    let res = await FilePicker.upload('data', folder, uploadFile);
    return res.path;
}

const LB_JUKEBOX_JEWEL_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs><radialGradient id="disc" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#484850"/><stop offset="72%" stop-color="#222228"/><stop offset="100%" stop-color="#101014"/></radialGradient></defs><circle cx="256" cy="256" r="248" fill="url(#disc)"/><circle cx="256" cy="256" r="248" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/><circle cx="256" cy="256" r="74" fill="rgba(0,0,0,0.5)"/><circle cx="256" cy="256" r="74" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/><circle cx="256" cy="256" r="14" fill="#0c0c10"/></svg>');

function lbJukeboxCoverLabelRot(tape) {
    if (tape && tape.labelRot != null && tape.labelRot !== '') return parseFloat(tape.labelRot) || 0;
    return (Math.random() * 24 - 12).toFixed(1);
}

function lbJukeboxBuildCaseHTML(tape) {
    let name = (tape.name || 'Untitled').replace(/</g, '&lt;');
    let src = lbJukeboxCoverSrc(tape) || LB_JUKEBOX_JEWEL_PLACEHOLDER;
    let rot = lbJukeboxCoverLabelRot(tape);
    return `<div class="lb-jukebox-cover-unit">
        <img class="lb-jukebox-cover-img" src="${src}" alt="" draggable="false">
        <div class="lb-jukebox-cover-label" style="transform:rotate(${rot}deg)">${name}</div>
    </div>`;
}

function lbJukeboxUploadProgressCaption(themeId) {
    return 'Preparing Sound';
}

async function lbJukeboxPersistCoverWithProgress(dataUrl, overlayEl) {
    return lbRunJukeboxUploadProgress('Printing Cover', () => lbJukeboxPersistCover(dataUrl), overlayEl);
}

async function lbJukeboxPersistAudioFileWithProgress(file, themeId, overlayEl) {
    return lbRunJukeboxUploadProgress(lbJukeboxUploadProgressCaption(themeId), () => lbJukeboxPersistAudioFile(file), overlayEl);
}

function lbJukeboxBindCaseInteraction() {}

function lbJukeboxEnsureCSS() {
    let s = document.getElementById('lb-jukebox-css');
    if (!s) {
        s = document.createElement('style');
        s.id = 'lb-jukebox-css';
        document.head.appendChild(s);
    }
    s.textContent = `
    .lb-jukebox-tab-wrap { position:absolute; left:0; bottom:88px; z-index:95002; display:flex; align-items:center; transition:opacity 0.32s ease, filter 0.32s ease; }
    .lb-jukebox-tab { display:flex; align-items:center; justify-content:center; width:32px; height:83px; min-height:83px; border-radius:0 10px 10px 0; cursor:pointer; color:var(--board-primary-color,var(--lb-juke-accent,#d4af37)); border-left:none !important; transition:background 0.25s, color 0.25s, transform 0.28s cubic-bezier(0.34,1.45,0.64,1), box-shadow 0.28s ease; }
    .lb-jukebox-tab i { font-size:22px; line-height:1; transform:scale(1.15); }
    .lb-jukebox-tab:hover { color:var(--board-hover-color,#fff6c8); transform:translateX(3px); box-shadow:6px 0 22px rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.35); }
    .lb-jukebox-tab.is-radio-live { color:#9dff9d !important; border-color:rgba(90,220,120,0.55) !important; background:linear-gradient(90deg, rgba(20,60,30,0.55), rgba(30,90,45,0.35)) !important; box-shadow:0 0 16px rgba(80,220,120,0.35), inset 0 0 10px rgba(80,220,120,0.12); animation:lbJukeRadioTabPulse 1.6s ease-in-out infinite; }
    .lb-jukebox-tab.is-radio-live i { filter:drop-shadow(0 0 6px rgba(120,255,140,0.85)); }
    @keyframes lbJukeRadioTabPulse { 0%,100% { box-shadow:0 0 10px rgba(80,220,120,0.28), inset 0 0 8px rgba(80,220,120,0.08); } 50% { box-shadow:0 0 26px rgba(80,220,120,0.62), inset 0 0 14px rgba(80,220,120,0.18); } }
    #lb-app-root.lb-jukebox-active #lb-scroll-area,
    #lb-app-root.lb-jukebox-active #lb-scroll-area * { pointer-events:none !important; }
    #lb-app-root.lb-jukebox-active .lb-slide-menu,
    #lb-app-root.lb-jukebox-active #lb-top-header-tools,
    #lb-app-root.lb-jukebox-active .lb-top-btn,
    #lb-app-root.lb-jukebox-active #lb-menu-gm-wrap,
    #lb-app-root.lb-jukebox-active #lb-myfiles,
    #lb-app-root.lb-jukebox-active .lb-jukebox-tab-wrap {
        filter:grayscale(100%) opacity(0.5) !important;
        pointer-events:none !important;
    }
    #lb-app-root.lb-jukebox-active .lb-jukebox-overlay { pointer-events:auto !important; }
    #lb-app-root.lb-jukebox-active .lb-jukebox-overlay * { pointer-events:auto; }
    .lb-jukebox-overlay { position:fixed; inset:0; z-index:1000008; pointer-events:none; visibility:hidden; opacity:0; transition:opacity 0.35s ease, visibility 0.35s ease; overflow:hidden; background:transparent; }
    .lb-jukebox-overlay.is-visible { visibility:visible; opacity:1; pointer-events:auto; }
    .lb-jukebox-blur-shield { position:absolute; inset:0; backdrop-filter:blur(0px) saturate(100%); -webkit-backdrop-filter:blur(0px) saturate(100%); background:rgba(0,0,0,0.04); transition:backdrop-filter 1.3s cubic-bezier(0.22,1,0.36,1), -webkit-backdrop-filter 1.3s cubic-bezier(0.22,1,0.36,1), background 1.3s cubic-bezier(0.22,1,0.36,1); pointer-events:none; }
    .lb-jukebox-overlay.is-blurring .lb-jukebox-blur-shield { backdrop-filter:blur(9px) saturate(112%); -webkit-backdrop-filter:blur(9px) saturate(112%); background:rgba(0,0,0,0.18); }
    .lb-jukebox-slide-bg { position:absolute; inset:0; overflow:hidden; z-index:1; pointer-events:none; background:transparent; }
    .lb-jukebox-slide-bg-inner { position:absolute; top:0; left:0; width:100%; height:100%; transform:translateX(-102%); transition:transform 1.3s cubic-bezier(0.22,1,0.36,1); will-change:transform; background:transparent; }
    .lb-jukebox-overlay.lb-juke-slide-rtl .lb-jukebox-slide-bg-inner { transform:translateX(102%); }
    .lb-jukebox-overlay.is-slide-open .lb-jukebox-slide-bg-inner { transform:translateX(0) !important; }
    .lb-jukebox-overlay.lb-juke-cosytavern .lb-jukebox-slide-bg-inner img { transform:none; transform-origin:center center; }
    .lb-jukebox-overlay.lb-jukebox-classic-mode .lb-jukebox-slide-bg { display:none !important; }
    .lb-jukebox-overlay.lb-jukebox-classic-mode .lb-jukebox-era-switch { display:none !important; }
    .lb-jukebox-overlay.lb-jukebox-classic-mode .lb-jukebox-holo-fx,
    .lb-jukebox-overlay.lb-jukebox-classic-mode .lb-jukebox-notes-fx,
    .lb-jukebox-overlay.lb-jukebox-classic-mode .lb-jukebox-slide-bg-inner,
    .lb-jukebox-overlay.lb-jukebox-classic-mode .lb-jukebox-custom-view-switch { display:none !important; visibility:hidden !important; opacity:0 !important; }
    .lb-jukebox-slide-bg-inner img { width:100%; height:100%; object-fit:cover; display:block; transition:opacity 0.45s ease; border:none; outline:none; box-shadow:none; background:transparent; }
    .lb-jukebox-overlay.is-robot-active.is-slide-open .lb-jukebox-slide-bg-inner img { width:90%; height:90%; object-fit:cover; object-position:44% center; animation:lbJukeRobotFloat 6.2s ease-in-out infinite; will-change:transform; }
    @keyframes lbJukeRobotFloat { 0%,100% { transform:scale(1) translate(-14px,0); } 50% { transform:scale(1.028) translate(-14px,-18px); } }
    .lb-jukebox-overlay.is-robot-active .lb-jukebox-holo-fx,
    .lb-jukebox-overlay.is-robot-active .lb-jukebox-smoke-layer,
    .lb-jukebox-overlay.is-robot-active .lb-jukebox-notes-layer,
    .lb-jukebox-overlay.is-robot-active.is-playing-fx .lb-jukebox-notes-layer { opacity:0 !important; visibility:hidden !important; pointer-events:none !important; }
    .lb-jukebox-slide-tools { display:none !important; }
    .lb-jukebox-notes-toggle { width:38px; height:38px; border-radius:50%; border:1px solid rgba(255,255,255,0.12); background:rgba(10,10,14,0.55); color:var(--board-hover-color,var(--lb-juke-accent,#fff6c8)); cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; flex-shrink:0; transition:background 0.25s, color 0.25s, border-color 0.25s, transform 0.22s, box-shadow 0.25s; }
    .lb-jukebox-notes-toggle:hover { background:rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.16); border-color:rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.42); transform:scale(1.06); }
    .lb-jukebox-notes-toggle.is-off { color:rgba(180,180,190,0.55); opacity:0.72; }
    .lb-jukebox-notes-toggle i { font-size:15px; line-height:1; pointer-events:none; }
    .lb-jukebox-header-actions { display:flex; align-items:center; gap:8px; flex-shrink:0; }
    .lb-jukebox-overlay.is-notes-fx-disabled .lb-jukebox-notes-layer,
    .lb-jukebox-overlay.is-notes-fx-disabled.is-playing-fx .lb-jukebox-notes-layer { opacity:0 !important; visibility:hidden !important; }
    .lb-jukebox-notes-layer { display:none !important; visibility:hidden !important; opacity:0 !important; pointer-events:none !important; }
    .lb-jukebox-notes-toggle { display:none !important; }
    .lb-juke-note { position:fixed; bottom:-8px; line-height:0; color:var(--board-hover-color,var(--lb-juke-accent,#fff6c8)); opacity:0; pointer-events:none; will-change:transform,opacity; z-index:2; user-select:none; -webkit-font-smoothing:antialiased; text-rendering:geometricPrecision; filter:drop-shadow(0 2px 8px rgba(0,0,0,0.35)); display:flex; align-items:center; justify-content:center; }
    .lb-juke-note .lb-juke-note-svg { width:100%; height:100%; display:block; shape-rendering:geometricPrecision; vector-effect:non-scaling-stroke; overflow:visible; }
    @keyframes lbJukeNoteRise { 0% { opacity:0; transform:translate3d(0,0,0) scale(0.72); } 10% { opacity:0.55; } 85% { opacity:0.38; } 100% { opacity:0; transform:translate3d(var(--lb-note-drift,0px),-108vh,0) scale(1); } }
    .lb-jukebox-waves-layer { display:none !important; }
    .lb-jukebox-holo-fx { position:absolute; left:16%; bottom:26%; width:14%; height:36%; z-index:3; pointer-events:none; opacity:0; visibility:hidden; transition:opacity 0.45s ease, visibility 0.45s ease; transform:translateX(-85px); background:transparent; overflow:visible; }
    .lb-jukebox-overlay.is-holo-active.is-slide-open .lb-jukebox-holo-fx { opacity:1; visibility:visible; }
    .lb-jukebox-overlay:not(.is-slide-open) .lb-jukebox-holo-fx,
    .lb-jukebox-overlay:not(.is-holo-active) .lb-jukebox-holo-fx,
    .lb-jukebox-overlay:not(.is-visible) .lb-jukebox-holo-fx { opacity:0 !important; visibility:hidden !important; transition:none !important; }
    .lb-jukebox-holo-beam { position:absolute; left:50%; bottom:0; width:100%; height:100%; transform:translateX(-50%) scaleX(0.35) scaleY(0.15); transform-origin:50% 100%;
        clip-path:polygon(50% 100%, 16% 4%, 84% 4%);
        -webkit-clip-path:polygon(50% 100%, 16% 4%, 84% 4%);
        background:
            conic-gradient(from 180deg at 50% 100%, transparent 130deg, rgba(55,210,255,0.88) 168deg, rgba(35,145,255,0.7) 180deg, rgba(55,210,255,0.88) 192deg, transparent 230deg),
            radial-gradient(ellipse 55% 28% at 50% 100%, rgba(55,180,255,0.92) 0%, rgba(35,145,255,0.4) 44%, transparent 74%);
        -webkit-mask-image:linear-gradient(to top, transparent 0%, rgba(0,0,0,0.35) 7%, #000 18%, #000 68%, transparent 100%), linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 14%, #000 24%, #000 76%, rgba(0,0,0,0.4) 86%, transparent 100%);
        mask-image:linear-gradient(to top, transparent 0%, rgba(0,0,0,0.35) 7%, #000 18%, #000 68%, transparent 100%), linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 14%, #000 24%, #000 76%, rgba(0,0,0,0.4) 86%, transparent 100%);
        -webkit-mask-composite:source-in; mask-composite:intersect;
        filter:blur(2px); mix-blend-mode:screen; animation:lbHoloBeamShoot 2.6s cubic-bezier(0.22,0.85,0.28,1) infinite; }
    @keyframes lbHoloBeamShoot { 0% { opacity:0.35; transform:translateX(-50%) scaleX(0.3) scaleY(0.14); } 18% { opacity:1; transform:translateX(-50%) scaleX(0.95) scaleY(0.9); } 42% { opacity:0.92; transform:translateX(-50%) scaleX(1.12) scaleY(1); } 100% { opacity:0.68; transform:translateX(-50%) scaleX(1.28) scaleY(1.03); } }
    .lb-jukebox-holo-audio { position:absolute; left:50%; bottom:52%; width:54%; transform:translateX(-50%); color:#9fe8ff; filter:drop-shadow(0 0 14px rgba(90,220,255,0.95)) drop-shadow(0 0 28px rgba(40,160,255,0.55)); animation:lbHoloAudioFloat 2.8s ease-in-out infinite, lbHoloAudioFlicker 2.4s steps(1,end) infinite, lbHoloAudioGlitch 5.5s ease-in-out infinite; pointer-events:none; }
    .lb-jukebox-holo-audio svg { width:100%; height:auto; display:block; }
    .lb-jukebox-holo-audio-glow { fill:none; stroke:currentColor; stroke-width:0.8; opacity:0.55; }
    @keyframes lbHoloAudioFloat { 0%,100% { transform:translateX(-50%) translateY(0); } 50% { transform:translateX(-50%) translateY(-16px); } }
    @keyframes lbHoloAudioFlicker { 0%,100% { opacity:1; } 3% { opacity:0.15; } 5% { opacity:0.88; } 8% { opacity:0.2; } 11% { opacity:0.95; } 15% { opacity:0.35; } 18% { opacity:0.1; } 21% { opacity:0.92; } 27% { opacity:0.25; } 33% { opacity:0.98; } 39% { opacity:0.18; } 46% { opacity:0.85; } 54% { opacity:0.3; } 61% { opacity:1; } 68% { opacity:0.12; } 74% { opacity:0.78; } 82% { opacity:0.4; } 89% { opacity:0.96; } 94% { opacity:0.22; } }
    @keyframes lbHoloAudioGlitch { 0%,88%,100% { filter:drop-shadow(0 0 14px rgba(90,220,255,0.95)) drop-shadow(0 0 28px rgba(40,160,255,0.55)); } 90% { filter:drop-shadow(2px 0 12px rgba(255,80,220,0.8)) drop-shadow(-2px 0 16px rgba(80,255,255,0.9)); } 92% { filter:drop-shadow(0 0 18px rgba(120,240,255,1)); } }
    .lb-jukebox-smoke-layer { position:absolute; left:45%; bottom:12%; width:68px; height:340px; z-index:50; pointer-events:none; overflow:visible; opacity:0; transition:opacity 0.6s ease 0.4s; }
    .lb-jukebox-overlay.is-slide-open .lb-jukebox-smoke-layer { opacity:1; }
    .lb-jukebox-smoke-wisp { position:absolute; bottom:0; border-radius:999px; background:linear-gradient(to top, rgba(170,170,170,0.55) 0%, rgba(130,130,130,0.28) 35%, rgba(110,110,110,0.1) 65%, transparent 100%); filter:blur(5px); opacity:0; animation:lbJukeSmokeWisp 16s ease-in-out infinite; transform-origin:bottom center; will-change:transform,opacity; }
    @keyframes lbJukeSmokeWisp {
        0% { opacity:0; transform:translateY(0) translateX(0) scaleX(0.5) scaleY(0.25) rotate(0deg); }
        6% { opacity:0.75; }
        25% { opacity:0.6; transform:translateY(-70px) translateX(calc(var(--lb-smoke-drift,8px) * 0.4)) scaleX(0.9) scaleY(0.85) rotate(calc(var(--lb-smoke-curl,0deg) * 0.3)); }
        55% { opacity:0.35; transform:translateY(-160px) translateX(var(--lb-smoke-drift,8px)) scaleX(1.6) scaleY(1.15) rotate(var(--lb-smoke-curl,0deg)); }
        80% { opacity:0.12; transform:translateY(-230px) translateX(calc(var(--lb-smoke-drift,8px) * 1.4)) scaleX(2.4) scaleY(0.7) rotate(calc(var(--lb-smoke-curl,0deg) * 1.2)); }
        100% { opacity:0; transform:translateY(-280px) translateX(calc(var(--lb-smoke-drift,8px) * 1.8)) scaleX(3) scaleY(0.35) rotate(calc(var(--lb-smoke-curl,0deg) * 1.5)); }
    }
    .lb-jukebox-shell { position:absolute; inset:0; z-index:8; display:flex; align-items:flex-start; justify-content:center; padding:7vh 24px 24px; box-sizing:border-box; pointer-events:none; opacity:0; transform:scale(0.96) translateY(4vh); transition:opacity 0.42s cubic-bezier(0.22,1,0.36,1) 0.06s, transform 0.42s cubic-bezier(0.34,1.45,0.64,1) 0.06s; }
    .lb-jukebox-overlay.is-panel-visible .lb-jukebox-shell { opacity:1; transform:translateY(2vh); pointer-events:auto; }
    .lb-jukebox-shell.is-full-minimized { opacity:0 !important; transform:scale(0.88) translateY(24px) !important; pointer-events:none !important; filter:blur(4px); transition:opacity 0.28s ease, transform 0.28s ease, filter 0.28s ease !important; }
    .lb-jukebox-panel {
        width:min(920px, 94vw); max-height:min(88vh, 780px); display:flex; flex-direction:column; overflow:hidden;
        background:
            radial-gradient(ellipse 120% 80% at 50% -20%, rgba(var(--lb-juke-accent-rgb,212,175,55),0.08) 0%, transparent 55%),
            linear-gradient(175deg, #2a2218 0%, #16120e 38%, #0c0a08 100%);
        border:1px solid rgba(255,255,255,0.1); border-radius:22px;
        box-shadow:0 40px 100px rgba(0,0,0,0.78), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -18px 40px rgba(0,0,0,0.35), 0 0 60px rgba(var(--lb-juke-accent-rgb,212,175,55),0.06);
        font-family:'DM Sans','Segoe UI',system-ui,sans-serif;
        position:relative;
    }
    .lb-jukebox-panel::before { content:''; position:absolute; inset:10px; border-radius:16px; border:1px solid rgba(255,255,255,0.04); pointer-events:none; }
    .lb-jukebox-panel::after { content:''; position:absolute; top:0; left:0; right:0; height:42%; border-radius:22px 22px 40% 40%; background:linear-gradient(180deg, rgba(255,255,255,0.06), transparent); pointer-events:none; }
    #lb-jukebox-overlay[data-theme="noir"] .lb-jukebox-panel { background:radial-gradient(ellipse 100% 70% at 50% -10%, rgba(212,175,55,0.1) 0%, transparent 50%), linear-gradient(175deg, #2e2418 0%, #181410 42%, #0a0907 100%); }
    #lb-jukebox-overlay[data-theme="modern"] .lb-jukebox-panel { background:radial-gradient(ellipse 100% 70% at 50% -10%, rgba(74,144,217,0.12) 0%, transparent 50%), linear-gradient(175deg, #1a2430 0%, #121820 42%, #080a0e 100%); }
    #lb-jukebox-overlay[data-theme="shadowpunk"] .lb-jukebox-panel { background:radial-gradient(ellipse 100% 70% at 50% -10%, rgba(255,0,255,0.14) 0%, transparent 50%), linear-gradient(175deg, #241824 0%, #140f18 42%, #08060c 100%); }
    #lb-jukebox-overlay[data-theme="slums"] .lb-jukebox-panel { background:radial-gradient(ellipse 100% 70% at 50% -10%, rgba(138,154,91,0.16) 0%, transparent 50%), linear-gradient(175deg, #1e2218 0%, #121610 42%, #080a08 100%); }
    #lb-jukebox-overlay[data-theme="galactic"] .lb-jukebox-panel { background:radial-gradient(ellipse 100% 70% at 50% -10%, rgba(78,168,255,0.16) 0%, transparent 50%), linear-gradient(175deg, #141a28 0%, #0c1018 42%, #060810 100%); }
    #lb-jukebox-overlay[data-theme="cosytavern"] .lb-jukebox-panel { background:radial-gradient(ellipse 100% 70% at 50% -10%, rgba(224,130,46,0.16) 0%, transparent 50%), linear-gradient(175deg, #2e2014 0%, #1a120c 42%, #0c0806 100%); }
    #lb-jukebox-overlay[data-theme="modern"] .lb-jukebox-smoke-layer { display:none !important; }
    #lb-jukebox-overlay[data-theme="shadowpunk"] .lb-jukebox-smoke-layer { display:none !important; }
    #lb-jukebox-overlay[data-theme="slums"] .lb-jukebox-smoke-layer { display:none !important; }
    #lb-jukebox-overlay[data-theme="galactic"] .lb-jukebox-smoke-layer { display:none !important; }
    .lb-jukebox-radio-grille { height:14px; margin:0 24px; border-radius:4px; background:repeating-linear-gradient(90deg, rgba(0,0,0,0.55) 0 3px, rgba(255,255,255,0.04) 3px 6px); box-shadow:inset 0 2px 6px rgba(0,0,0,0.6); opacity:0.85; flex-shrink:0; }
    .lb-jukebox-header { display:flex; align-items:flex-start; justify-content:space-between; padding:16px 24px 8px; gap:16px; position:relative; z-index:2; }
    .lb-jukebox-header-left { flex:1; min-width:0; display:flex; flex-direction:column; gap:10px; }
    .lb-jukebox-era-switch { display:inline-flex; align-self:flex-start; align-items:center; gap:0; padding:3px; border-radius:999px; border:1px solid rgba(255,255,255,0.08); background:linear-gradient(180deg, rgba(0,0,0,0.42), rgba(0,0,0,0.58)); box-shadow:inset 0 2px 8px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.04); }
    .lb-jukebox-era-label { font-size:8px; letter-spacing:2px; text-transform:uppercase; color:rgba(245,230,168,0.45); font-weight:700; padding:0 8px 0 10px; user-select:none; }
    .lb-jukebox-era-btn { border:none; background:transparent; color:#9a9aa4; cursor:pointer; padding:6px 12px; border-radius:999px; font-family:'Share Tech Mono','Consolas',monospace; font-size:11px; font-weight:700; letter-spacing:1px; transition:background 0.24s, color 0.24s, box-shadow 0.24s, transform 0.2s, border-color 0.24s; line-height:1; }
    .lb-jukebox-era-btn:hover { color:var(--board-hover-color,#e8e8ec); background:rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.12); border-color:rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.28); }
    .lb-jukebox-era-btn.active { color:#0c0c0f; background:var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); box-shadow:0 0 14px rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.32); }
    .lb-jukebox-radio-brand { font-family:'Cormorant Garamond',Georgia,serif; font-size:11px; letter-spacing:4px; text-transform:uppercase; color:rgba(245,230,168,0.55); margin-bottom:4px; }
    .lb-jukebox-title-wrap { flex:1; min-width:0; }
    .lb-jukebox-title { margin:0; font-family:'Cormorant Garamond',Georgia,serif; font-weight:600; letter-spacing:6px; font-size:22px; color:#f5e6a8; text-shadow:0 0 20px rgba(var(--lb-juke-accent-rgb,212,175,55),0.22); }
    .lb-jukebox-radio-display { margin-top:8px; padding:10px 14px; border-radius:10px; background:linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.72)); border:1px solid rgba(255,255,255,0.08); box-shadow:inset 0 2px 12px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.05); display:flex; align-items:center; gap:12px; min-height:42px; }
    .lb-jukebox-radio-display-label { font-size:9px; letter-spacing:2px; text-transform:uppercase; color:rgba(125,206,130,0.75); font-weight:700; flex-shrink:0; }
    .lb-jukebox-radio-display-text { flex:1; min-width:0; font-family:'Share Tech Mono','Consolas',monospace; font-size:14px; color:#dfffe0; letter-spacing:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-shadow:0 0 12px rgba(125,206,130,0.35); }
    .lb-jukebox-radio-display.is-live .lb-jukebox-radio-display-text { animation:lbJukeDisplayGlow 2.4s ease-in-out infinite; }
    @keyframes lbJukeDisplayGlow { 0%,100% { opacity:0.88; } 50% { opacity:1; text-shadow:0 0 16px rgba(125,206,130,0.55); } }
    .lb-jukebox-radio-live-dot { width:8px; height:8px; border-radius:50%; background:#555; flex-shrink:0; box-shadow:inset 0 1px 2px rgba(0,0,0,0.5); transition:background 0.3s, box-shadow 0.3s; }
    .lb-jukebox-radio-display.is-live .lb-jukebox-radio-live-dot { background:#7dce82; box-shadow:0 0 10px rgba(125,206,130,0.85); animation:lbJukeLiveDot 1.2s ease-in-out infinite; }
    @keyframes lbJukeLiveDot { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.15); opacity:0.75; } }
    .lb-jukebox-close { width:38px; height:38px; border-radius:50%; border:1px solid rgba(255,255,255,0.12); background:rgba(10,10,14,0.55); color:#aaa; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px; transition:background 0.25s, color 0.25s, transform 0.25s; }
    .lb-jukebox-close:hover { color:#fff; background:rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.18); border-color:rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.45); transform:scale(1.08); }
    .lb-jukebox-tabs { display:flex; justify-content:center; gap:10px; padding:6px 24px 14px; position:relative; z-index:2; }
    .lb-jukebox-tab-btn { position:relative; border:1px solid rgba(255,255,255,0.08); background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.18)); color:#b8b8c0; cursor:pointer; padding:10px 24px; border-radius:999px; font-family:'DM Sans',sans-serif; font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase; transition:background 0.32s, border-color 0.32s, color 0.32s, box-shadow 0.32s, transform 0.25s; opacity:0.78; box-shadow:inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 12px rgba(0,0,0,0.25); }
    .lb-jukebox-tab-btn:hover { opacity:0.95; transform:translateY(-1px); color:var(--board-hover-color,#f5e6a8); border-color:rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.28); background:rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.08); }
    .lb-jukebox-tab-btn.active { opacity:1; color:#0c0c0f; border-color:var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); background:var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); box-shadow:0 0 22px rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.22); }
    .lb-jukebox-body { flex:1; min-height:0; padding:0 24px 16px; display:flex; flex-direction:column; gap:16px; overflow:hidden; }
    .lb-jukebox-pane { display:none; flex:1; min-height:0; flex-direction:column; gap:14px; }
    .lb-jukebox-pane.active { display:flex; }
    .lb-jukebox-upload-btn { flex:1 1 0; min-width:0; border:none; border-radius:999px; padding:13px 20px; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:600; font-size:13px; letter-spacing:1.2px; text-transform:uppercase; color:#0c0c0f; background:var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); box-shadow:0 6px 22px rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.35); transition:transform 0.28s cubic-bezier(0.34,1.45,0.64,1), box-shadow 0.28s, background 0.28s; white-space:nowrap; text-align:center; }
    .lb-jukebox-upload-btn:hover { transform:translateY(-2px); box-shadow:0 10px 32px rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.48); background:var(--board-hover-color,var(--board-primary-color,var(--lb-juke-accent,#e7c54a))); }
    .lb-jukebox-upload-btn.is-secondary { color:var(--board-primary-color,#e8e8ec); background:transparent; border:1px solid rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.35); box-shadow:none; }
    .lb-jukebox-upload-btn.is-secondary:hover { color:var(--board-hover-color,#fff); border-color:var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); background:rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.1); }
    .lb-jukebox-action-row { display:flex; flex-direction:row; flex-wrap:nowrap; gap:12px; justify-content:center; align-items:stretch; width:100%; max-width:520px; align-self:center; }
    .lb-jukebox-carousel-wrap { position:relative; flex:1; min-height:280px; display:flex; align-items:center; justify-content:center; gap:10px; }
    .lb-jukebox-carousel-viewport { position:relative; flex:1; min-width:0; height:300px; overflow:visible; touch-action:pan-y pinch-zoom; cursor:grab; }
    .lb-jukebox-carousel-viewport.is-dragging { cursor:grabbing; }
    .lb-jukebox-carousel-track { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
    .lb-jukebox-cover-slide { position:absolute; left:50%; top:50%; width:148px; height:148px; margin:-74px 0 0 -74px; transition:transform 0.58s cubic-bezier(0.22,1,0.36,1), opacity 0.58s cubic-bezier(0.22,1,0.36,1), filter 0.58s ease; cursor:pointer; will-change:transform,opacity; user-select:none; touch-action:none; transform-origin:center center; border:none; outline:none; background:transparent; backface-visibility:hidden; transform-style:flat; }
    .lb-jukebox-cover-unit { position:relative; width:100%; height:100%; overflow:hidden; border-radius:0; border:none; outline:none; box-shadow:8px 12px 28px rgba(0,0,0,0.38); background:transparent; backface-visibility:hidden; isolation:isolate; }
    .lb-jukebox-cover-slide.is-active .lb-jukebox-cover-unit { box-shadow:10px 16px 36px rgba(0,0,0,0.48), 0 0 24px rgba(var(--lb-juke-accent-rgb,212,175,55),0.18); }
    .lb-jukebox-cover-img { width:100%; height:100%; object-fit:cover; object-position:center; display:block; pointer-events:none; border:none !important; outline:none !important; background:transparent; vertical-align:top; margin:0; padding:0; box-sizing:border-box; backface-visibility:hidden; -webkit-backface-visibility:hidden; image-rendering:auto; }
    .lb-jukebox-cover-label { position:absolute; inset:0; z-index:2; display:flex; align-items:center; justify-content:center; padding:10px 8px; box-sizing:border-box; font-family:'Permanent Marker','Segoe Print',cursive,sans-serif; font-size:clamp(10px,4.2vw,14px); color:rgba(255,255,255,0.94); text-align:center; line-height:1.12; pointer-events:none; text-shadow:0 1px 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.45); word-break:break-word; overflow:hidden; transform-origin:center center; }
    .lb-jukebox-carousel-arrow { flex-shrink:0; width:46px; height:46px; border-radius:50%; border:1px solid rgba(255,255,255,0.12); background:rgba(10,10,14,0.78); color:var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); font-size:17px; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(12px); transition:transform 0.28s, background 0.28s, box-shadow 0.28s, color 0.28s; }
    .lb-jukebox-carousel-arrow:hover { background:rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.14); color:var(--board-hover-color,#fff6c8); transform:scale(1.08); box-shadow:0 0 24px rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.25); }
    .lb-jukebox-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; color:#8a8a94; text-align:center; padding:20px; }
    .lb-jukebox-empty i { font-size:42px; color:rgba(231,197,74,0.35); }
    .lb-jukebox-player { border-top:1px solid rgba(255,255,255,0.06); padding:16px 24px 20px; background:linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.32)); position:relative; z-index:2; }
    .lb-jukebox-player-row { display:flex; align-items:center; gap:10px; flex-wrap:nowrap; width:100%; }
    .lb-jukebox-transport { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:14px; background:linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.22)); border:1px solid rgba(255,255,255,0.06); box-shadow:inset 0 2px 8px rgba(0,0,0,0.35); flex-shrink:0; }
    .lb-jukebox-ctrl { width:44px; height:44px; border-radius:50%; border:1px solid rgba(255,255,255,0.1); background:radial-gradient(circle at 35% 28%, rgba(255,255,255,0.12), rgba(14,14,18,0.88) 65%); color:#e8e8ec; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:14px; transition:background 0.22s, color 0.22s, transform 0.22s, border-color 0.22s, box-shadow 0.22s; box-shadow:0 4px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08); flex-shrink:0; }
    .lb-jukebox-ctrl:hover { background:radial-gradient(circle at 35% 28%, rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.25), rgba(14,14,18,0.9) 70%); color:var(--board-hover-color,#fff6c8); border-color:rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.4); transform:scale(1.06); }
    .lb-jukebox-ctrl.is-active { background:var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); color:#0c0c0f; border-color:var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); box-shadow:0 0 18px rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.32); }
    .lb-jukebox-for-all { width:auto; min-width:44px; padding:0 12px; border-radius:22px; font-size:11px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; font-family:'Courier New',monospace; white-space:nowrap; }
    .lb-jukebox-for-all.is-active { background:var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); color:#0c0c0f; border-color:var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); }
    .lb-jukebox-seek-wrap { flex:1; min-width:0; display:flex; flex-direction:column; gap:5px; position:relative; z-index:3; }
    .lb-jukebox-progress { position:relative; height:5px; border-radius:999px; background:rgba(255,255,255,0.12); cursor:pointer; overflow:visible; transition:height 0.18s ease; }
    .lb-jukebox-seek-wrap:hover .lb-jukebox-progress, .lb-jukebox-progress.is-scrubbing { height:8px; }
    .lb-jukebox-progress-fill { height:100%; width:0%; border-radius:999px; background:var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); box-shadow:0 0 10px rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.55); transition:width 0.08s linear; pointer-events:none; }
    .lb-jukebox-progress-thumb { position:absolute; top:50%; left:0%; width:13px; height:13px; margin:0; border-radius:50%; background:var(--board-hover-color,#fff6c8); border:2px solid var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); box-shadow:0 0 10px rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.65); transform:translate(-50%,-50%); pointer-events:none; opacity:0; transition:opacity 0.15s ease; }
    .lb-jukebox-seek-wrap:hover .lb-jukebox-progress-thumb, .lb-jukebox-progress.is-scrubbing .lb-jukebox-progress-thumb { opacity:1; }
    .lb-jukebox-time { display:flex; justify-content:space-between; font-size:11px; color:#888892; letter-spacing:0.5px; font-variant-numeric:tabular-nums; }
    .lb-jukebox-speed-btns { display:flex; align-items:center; gap:4px; flex-shrink:0; margin-left:4px; }
    .lb-jukebox-speed-btn { min-width:34px; height:28px; padding:0 7px; border-radius:7px; border:1px solid rgba(255,255,255,0.1); background:rgba(14,14,18,0.82); color:#b8b8c0; font-size:11px; font-weight:700; font-family:'DM Sans',sans-serif; cursor:pointer; line-height:1; transition:background 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s; }
    .lb-jukebox-speed-btn:hover { color:var(--board-hover-color,#fff6c8); border-color:rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.35); }
    .lb-jukebox-speed-btn.active { color:#0c0c0f; background:var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); border-color:var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); box-shadow:0 0 12px rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.35); }
    .lb-jukebox-upload-cover-drop { position:relative; width:100%; aspect-ratio:1 / 1; max-width:220px; margin:0 auto; border:2px dashed rgba(var(--lb-juke-accent-rgb,212,175,55),0.35); border-radius:14px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; cursor:pointer; overflow:hidden; box-sizing:border-box; }
    .lb-jukebox-upload-cover-drop img { width:100%; height:100%; object-fit:cover; display:block; position:absolute; inset:0; border:none; outline:none; }
    .lb-jukebox-now-playing { display:none; }
    .lb-jukebox-radio-layout { flex:1; display:flex; gap:22px; align-items:stretch; min-height:0; padding:8px 0; position:relative; z-index:2; }
    .lb-jukebox-radio-list { flex:1; min-width:0; display:flex; flex-direction:column; gap:10px; overflow-y:auto; padding-right:4px; }
    .lb-jukebox-radio-station { display:flex; align-items:center; gap:14px; width:100%; padding:14px 16px 14px 18px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); background:linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.18)); color:#e8e8ec; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:14px; font-weight:600; text-align:left; transition:background 0.25s, border-color 0.25s, box-shadow 0.25s, transform 0.22s; box-shadow:inset 0 1px 0 rgba(255,255,255,0.04); position:relative; overflow:hidden; }
    .lb-jukebox-radio-station::before { content:''; position:absolute; left:0; top:8px; bottom:8px; width:4px; border-radius:0 4px 4px 0; background:rgba(255,255,255,0.08); transition:background 0.25s, box-shadow 0.25s; }
    .lb-jukebox-radio-station:hover { background:rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.1); border-color:rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.28); transform:translateX(3px); color:var(--board-hover-color,#f5e6a8); }
    .lb-jukebox-radio-station.is-active { background:rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.14); border-color:rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.45); box-shadow:0 0 24px rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.1); color:#f5e6a8; }
    .lb-jukebox-radio-station.is-active::before { background:var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); box-shadow:0 0 12px rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.55); }
    .lb-jukebox-radio-station i { font-size:16px; color:var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); flex-shrink:0; width:22px; text-align:center; transition:color 0.24s; }
    .lb-jukebox-radio-station:hover i { color:var(--board-hover-color,#fff6c8); }
    .lb-jukebox-radio-vol-panel { width:132px; flex-shrink:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:18px 12px; border-radius:16px; border:1px solid rgba(255,255,255,0.08); background:linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.28)); box-shadow:inset 0 2px 10px rgba(0,0,0,0.35); }
    .lb-jukebox-dial-label { font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:#888; font-weight:700; }
    .lb-jukebox-dial-wrap { position:relative; width:96px; height:96px; }
    .lb-jukebox-dial-face { position:relative; width:96px; height:96px; border-radius:50%; background:radial-gradient(circle at 32% 28%, #4a4844, #1a1816 68%, #0e0d0c 100%); border:3px solid #2a2824; box-shadow:inset 0 3px 10px rgba(0,0,0,0.65), 0 6px 18px rgba(0,0,0,0.45), inset 0 -2px 4px rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; }
    .lb-jukebox-dial-ticks { position:absolute; inset:8px; border-radius:50%; background:repeating-conic-gradient(from -135deg, rgba(255,255,255,0.14) 0 1deg, transparent 1deg 18deg); mask:radial-gradient(circle, transparent 58%, #000 59%); -webkit-mask:radial-gradient(circle, transparent 58%, #000 59%); pointer-events:none; }
    .lb-jukebox-dial-pointer { position:absolute; left:50%; top:50%; width:3px; height:34px; margin:-34px 0 0 -1.5px; transform-origin:50% 100%; background:linear-gradient(to top, var(--board-primary-color,var(--lb-juke-accent,#e7c54a)), #fff6c8); border-radius:999px; box-shadow:0 0 8px rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.45); transition:transform 0.12s ease-out; pointer-events:none; }
    .lb-jukebox-dial-cap { position:absolute; width:14px; height:14px; border-radius:50%; background:radial-gradient(circle at 35% 30%, #666, #222); border:2px solid #3a3834; box-shadow:inset 0 1px 2px rgba(255,255,255,0.15); pointer-events:none; }
    .lb-jukebox-radio-vol-value { position:absolute; bottom:16px; font-size:11px; font-weight:700; color:rgba(245,230,168,0.85); font-family:'Share Tech Mono','Consolas',monospace; pointer-events:none; letter-spacing:0.5px; }
    .lb-jukebox-dial-input { position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; margin:0; z-index:3; }
    .lb-jukebox-radio-live { display:none; }
    /* Upload modal */
    .lb-jukebox-upload-overlay { position:fixed; inset:0; z-index:1000012; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.55); backdrop-filter:blur(8px); animation:lbJukeboxFadeIn 0.32s ease both; }
    @keyframes lbJukeboxFadeIn { from { opacity:0; } to { opacity:1; } }
    .lb-jukebox-upload-modal { width:min(440px,92vw); padding:24px; border-radius:16px; background:linear-gradient(168deg, rgba(22,22,26,0.95), rgba(8,8,10,0.98)); border:1px solid rgba(255,255,255,0.1); box-shadow:0 30px 80px rgba(0,0,0,0.8); }
    .lb-jukebox-upload-modal-wide { width:min(480px,94vw); }
    .lb-jukebox-upload-audio-drop { margin-bottom:16px; min-height:96px; }
    .lb-jukebox-upload-single-fields { border-top:1px solid rgba(255,255,255,0.06); padding-top:14px; margin-top:4px; }
    .lb-jukebox-upload-divider { text-align:center; color:#666; font-size:11px; letter-spacing:1.5px; text-transform:uppercase; margin:12px 0; }
    .lb-jukebox-upload-modal h3 { margin:0 0 16px; font-family:'Cormorant Garamond',serif; color:#f5e6a8; letter-spacing:2px; font-size:22px; }
    .lb-jukebox-upload-modal label { display:block; margin-bottom:6px; color:#aaa; font-size:12px; letter-spacing:1px; text-transform:uppercase; }
    .lb-jukebox-upload-modal input[type=text] { width:100%; box-sizing:border-box; height:38px; padding:0 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.35); color:#eee; margin-bottom:14px; }
    .lb-jukebox-cover-drop { position:relative; min-height:140px; border:2px dashed rgba(231,197,74,0.35); border-radius:14px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; cursor:pointer; margin-bottom:14px; transition:border-color 0.28s, background 0.28s; }
    .lb-jukebox-cover-drop:hover, .lb-jukebox-cover-drop.drag-over { border-color:rgba(231,197,74,0.7); background:rgba(231,197,74,0.06); }
    .lb-jukebox-cover-drop img { max-width:100px; max-height:100px; border-radius:8px; object-fit:cover; }
    .lb-jukebox-upload-actions { display:flex; gap:10px; justify-content:flex-end; }
    .lb-jukebox-upload-actions button { padding:9px 18px; border-radius:8px; cursor:pointer; font-weight:600; font-size:13px; border:1px solid rgba(255,255,255,0.12); }
    .lb-jukebox-upload-cancel { background:rgba(255,255,255,0.04); color:#ccc; }
    .lb-jukebox-upload-next { background:linear-gradient(135deg,#e7c54a,#c8941a); color:#1a1200; border-color:rgba(231,197,74,0.5); }
    /* Image cropper */
    .lb-jukebox-crop-overlay { position:fixed; inset:0; z-index:1000015; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.82); backdrop-filter:blur(10px); }
    .lb-jukebox-crop-panel { width:min(480px,94vw); padding:20px; border-radius:16px; background:linear-gradient(168deg,#16161a,#0a0a0d); border:1px solid rgba(255,255,255,0.1); box-shadow:0 30px 90px rgba(0,0,0,0.85); }
    .lb-jukebox-crop-panel h3 { margin:0 0 14px; font-family:'Cormorant Garamond',serif; color:#f5e6a8; letter-spacing:2px; }
    .lb-jukebox-crop-stage { position:relative; width:100%; aspect-ratio:1; max-height:320px; margin:0 auto 14px; overflow:hidden; border-radius:12px; background:#000; border:1px solid rgba(255,255,255,0.1); cursor:grab; touch-action:none; }
    .lb-jukebox-crop-stage:active { cursor:grabbing; }
    .lb-jukebox-crop-stage canvas { display:block; width:100%; height:100%; }
    .lb-jukebox-crop-frame { position:absolute; inset:8%; border:2px solid rgba(231,197,74,0.85); border-radius:4px; box-shadow:0 0 0 9999px rgba(0,0,0,0.45); pointer-events:none; }
    .lb-jukebox-crop-filters { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
    .lb-jukebox-crop-filters button { padding:7px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); color:#ccc; cursor:pointer; font-size:12px; transition:background 0.22s, border-color 0.22s, color 0.22s; }
    .lb-jukebox-crop-filters button.active { background:rgba(231,197,74,0.2); border-color:rgba(231,197,74,0.5); color:#f5e6a8; }
    .lb-jukebox-crop-zoom { width:100%; margin-bottom:12px; accent-color:#e7c54a; }
    .lb-jukebox-ctx-menu { position:fixed; z-index:1000020; min-width:160px; padding:6px; border-radius:10px; background:linear-gradient(168deg, rgba(22,22,26,0.98), rgba(8,8,10,0.99)); border:1px solid rgba(255,255,255,0.12); box-shadow:0 16px 40px rgba(0,0,0,0.75); backdrop-filter:blur(14px); }
    .lb-jukebox-ctx-item { display:block; width:100%; text-align:left; padding:9px 12px; border:none; border-radius:7px; background:transparent; color:#ddd; font-family:'DM Sans',sans-serif; font-size:13px; cursor:pointer; transition:background 0.2s, color 0.2s; }
    .lb-jukebox-ctx-item:hover { background:rgba(var(--lb-juke-accent-rgb,212,175,55),0.14); color:#fff; }
    .lb-jukebox-ctx-item.is-danger:hover { background:rgba(192,57,43,0.22); color:#ffb3b3; }
    .lb-jukebox-ctx-item.is-disabled { opacity:0.45; cursor:not-allowed; }
    .lb-jukebox-ctx-sep { height:1px; margin:4px 6px; background:rgba(255,255,255,0.08); }
    .lb-jukebox-publish-overlay { position:fixed; inset:0; z-index:1000014; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.62); backdrop-filter:blur(10px); animation:lbJukeboxFadeIn 0.32s ease both; }
    .lb-jukebox-publish-modal { width:min(720px,96vw); max-height:min(82vh,680px); display:flex; flex-direction:column; padding:22px; border-radius:16px; background:linear-gradient(168deg, rgba(22,22,26,0.96), rgba(8,8,10,0.98)); border:1px solid rgba(255,255,255,0.1); box-shadow:0 30px 80px rgba(0,0,0,0.82); }
    .lb-jukebox-publish-modal h3 { margin:0 0 6px; font-family:'Cormorant Garamond',serif; color:#f5e6a8; letter-spacing:2px; font-size:22px; }
    .lb-jukebox-publish-hint { margin:0 0 14px; color:#888; font-size:12px; }
    .lb-jukebox-publish-toolbar { display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap; align-items:center; }
    .lb-jukebox-publish-toolbar input[type=text] { flex:1; min-width:140px; height:36px; padding:0 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.35); color:#eee; font-size:13px; box-sizing:border-box; }
    .lb-jukebox-publish-zones { flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:12px; padding-right:4px; }
    .lb-jukebox-publish-zone { border:1px dashed rgba(255,255,255,0.1); border-radius:12px; padding:10px; background:rgba(0,0,0,0.18); transition:border-color 0.22s, background 0.22s; }
    .lb-jukebox-publish-zone.is-drag-over { border-color:rgba(var(--lb-juke-accent-rgb,212,175,55),0.55); background:rgba(var(--lb-juke-accent-rgb,212,175,55),0.08); }
    .lb-jukebox-publish-zone-head { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    .lb-jukebox-publish-zone-head h4 { margin:0; flex:1; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; color:rgba(245,230,168,0.75); font-weight:700; }
    .lb-jukebox-publish-zone-count { font-size:10px; color:#888; font-weight:600; }
    .lb-jukebox-publish-zone-drop { display:flex; flex-direction:column; gap:6px; min-height:52px; }
    .lb-jukebox-publish-zone-drop:empty::after { content:'Drop tapes here'; display:block; color:#666; font-size:11px; font-style:italic; padding:12px 8px; text-align:center; }
    .lb-jukebox-publish-cat-delete { border:none; background:transparent; color:#888; cursor:pointer; padding:4px 6px; border-radius:6px; font-size:11px; }
    .lb-jukebox-publish-cat-delete:hover { color:#ffb3b3; background:rgba(192,57,43,0.15); }
    .lb-jukebox-publish-list { flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px; }
    .lb-jukebox-publish-item { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); cursor:grab; transition:background 0.22s, border-color 0.22s, transform 0.18s; }
    .lb-jukebox-publish-item:active { cursor:grabbing; transform:scale(0.98); }
    .lb-jukebox-publish-item:hover { background:rgba(var(--lb-juke-accent-rgb,212,175,55),0.08); border-color:rgba(var(--lb-juke-accent-rgb,212,175,55),0.22); }
    .lb-jukebox-publish-item img { width:44px; height:44px; border-radius:6px; object-fit:cover; flex-shrink:0; background:#111; }
    .lb-jukebox-publish-item-meta { flex:1; min-width:0; }
    .lb-jukebox-publish-item-name { color:#eee; font-weight:600; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .lb-jukebox-publish-item-status { font-size:11px; color:#888; margin-top:2px; }
    .lb-jukebox-publish-item-status.is-live { color:#7dce82; }
    .lb-jukebox-publish-item-status.is-hidden { color:#c9a24d; }
    .lb-jukebox-publish-footer { display:flex; justify-content:flex-end; margin-top:14px; }
    .lb-jukebox-upload-btn.is-prepare { background:linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)); color:#e8e8ec; border:1px solid rgba(255,255,255,0.14); }
    /* Custom radio builder */
    .lb-jukebox-radio-list-wrap { flex:1; min-width:0; display:flex; flex-direction:column; gap:10px; min-height:0; }
    .lb-jukebox-somafm-credit { margin:0 0 4px 0; font-size:10px; line-height:1.45; color:rgba(200,200,210,0.72); letter-spacing:0.2px; }
    .lb-jukebox-somafm-credit a { color:var(--board-primary-color,var(--lb-juke-accent,#e7c54a)); text-decoration:none; border-bottom:1px solid rgba(var(--board-primary-rgb,var(--lb-juke-accent-rgb,212,175,55)),0.35); transition:color 0.2s, border-color 0.2s; }
    .lb-jukebox-somafm-credit a:hover { color:var(--board-hover-color,#fff6c8); border-color:var(--board-hover-color,#fff6c8); }
    .lb-jukebox-custom-radio-actions { flex-shrink:0; }
    .lb-jukebox-custom-builder { flex-shrink:0; padding:14px; border-radius:14px; border:1px solid rgba(255,255,255,0.1); background:linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.22)); display:flex; flex-direction:column; gap:10px; max-height:min(42vh,320px); overflow-y:auto; }
    .lb-jukebox-custom-builder h4 { margin:0; font-size:12px; letter-spacing:2px; text-transform:uppercase; color:rgba(245,230,168,0.7); font-weight:700; }
    .lb-jukebox-custom-builder input[type=text] { width:100%; box-sizing:border-box; height:36px; padding:0 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.35); color:#eee; font-size:13px; }
    .lb-jukebox-audio-drop { min-height:88px; border:2px dashed rgba(var(--lb-juke-accent-rgb,212,175,55),0.35); border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; cursor:pointer; padding:12px; text-align:center; transition:border-color 0.28s, background 0.28s; }
    .lb-jukebox-audio-drop:hover, .lb-jukebox-audio-drop.drag-over { border-color:rgba(var(--lb-juke-accent-rgb,212,175,55),0.7); background:rgba(var(--lb-juke-accent-rgb,212,175,55),0.06); }
    .lb-jukebox-audio-drop span { color:#aaa; font-size:12px; }
    .lb-jukebox-custom-track-list { display:flex; flex-direction:column; gap:4px; max-height:120px; overflow-y:auto; }
    .lb-jukebox-custom-track-item { display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:8px; background:rgba(0,0,0,0.28); font-size:12px; color:#ccc; }
    .lb-jukebox-custom-track-item i { color:var(--lb-juke-accent,#e7c54a); flex-shrink:0; }
    .lb-jukebox-custom-track-item span { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .lb-jukebox-custom-track-remove { border:none; background:transparent; color:#888; cursor:pointer; padding:2px 6px; border-radius:4px; }
    .lb-jukebox-custom-track-remove:hover { color:#ffb3b3; background:rgba(192,57,43,0.15); }
    .lb-jukebox-custom-builder-actions { display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap; }
    .lb-jukebox-custom-stations { display:flex; flex-direction:column; gap:6px; }
    .lb-jukebox-custom-station-edit { display:flex; align-items:center; gap:10px; width:100%; padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.2); color:#ccc; cursor:pointer; font-size:12px; text-align:left; transition:background 0.22s, border-color 0.22s; }
    .lb-jukebox-custom-station-edit:hover { background:rgba(var(--lb-juke-accent-rgb,212,175,55),0.1); border-color:rgba(var(--lb-juke-accent-rgb,212,175,55),0.28); color:#eee; }
    .lb-jukebox-custom-station-edit.is-editing { border-color:rgba(var(--lb-juke-accent-rgb,212,175,55),0.5); background:rgba(var(--lb-juke-accent-rgb,212,175,55),0.12); }
    .lb-jukebox-radio-station.is-custom i { color:#9dd4ff; }
    /* Batch upload modal */
    .lb-jukebox-batch-overlay { position:fixed; inset:0; z-index:1000016; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.62); backdrop-filter:blur(10px); animation:lbJukeboxFadeIn 0.32s ease both; }
    .lb-jukebox-batch-modal { width:min(560px,94vw); max-height:min(80vh,620px); display:flex; flex-direction:column; padding:22px; border-radius:16px; background:linear-gradient(168deg, rgba(22,22,26,0.96), rgba(8,8,10,0.98)); border:1px solid rgba(255,255,255,0.1); box-shadow:0 30px 80px rgba(0,0,0,0.82); }
    .lb-jukebox-batch-modal h3 { margin:0 0 6px; font-family:'Cormorant Garamond',serif; color:#f5e6a8; letter-spacing:2px; font-size:22px; }
    .lb-jukebox-batch-hint { margin:0 0 14px; color:#888; font-size:12px; }
    .lb-jukebox-batch-list { flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px; margin-bottom:14px; }
    .lb-jukebox-batch-item { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); }
    .lb-jukebox-batch-item input[type=text] { flex:1; min-width:0; height:34px; padding:0 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.35); color:#eee; font-size:13px; box-sizing:border-box; }
    .lb-jukebox-batch-cover-btn { width:34px; height:34px; flex-shrink:0; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.35); color:var(--lb-juke-accent,#e7c54a); cursor:pointer; display:flex; align-items:center; justify-content:center; overflow:hidden; padding:0; }
    .lb-jukebox-batch-cover-btn img { width:100%; height:100%; object-fit:cover; }
    .lb-jukebox-batch-cover-btn:hover { border-color:rgba(var(--lb-juke-accent-rgb,212,175,55),0.45); background:rgba(var(--lb-juke-accent-rgb,212,175,55),0.1); }
    .lb-jukebox-batch-delete { border:none; background:transparent; color:#888; cursor:pointer; padding:6px 8px; border-radius:6px; flex-shrink:0; font-size:12px; white-space:nowrap; }
    .lb-jukebox-batch-delete:hover { color:#ffb3b3; background:rgba(192,57,43,0.15); }
    .lb-jukebox-batch-footer { display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap; }
    .lb-jukebox-batch-footer .lb-jukebox-upload-btn { flex:0 1 auto; min-width:140px; }
    `;
    document.head.appendChild(s);
}

function lbJukeboxEnsureTapes(store) {
    if (!store.jukeboxTapes) store.jukeboxTapes = [];
    store.jukeboxTapes.forEach(lbJukeboxNormalizeTape);
    return store.jukeboxTapes;
}

function lbJukeboxNormalizeTape(tape) {
    if (!tape) return null;
    if (!tape.id) tape.id = foundry.utils.randomID();
    if (tape.published === undefined) tape.published = true;
    if (tape.prepared === undefined) tape.prepared = !tape.published;
    if (tape.archived === undefined) tape.archived = false;
    if (tape.categoryId === undefined) tape.categoryId = '';
    if (!tape.createdAt) tape.createdAt = Date.now();
    return tape;
}

function lbJukeboxEnsureCategories(store) {
    if (!store.jukeboxCategories) store.jukeboxCategories = [];
    store.jukeboxCategories.forEach(lbJukeboxNormalizeCategory);
    return store.jukeboxCategories;
}

function lbJukeboxNormalizeCategory(cat) {
    if (!cat) return null;
    if (!cat.id) cat.id = foundry.utils.randomID();
    if (!cat.name) cat.name = 'Untitled';
    if (!cat.createdAt) cat.createdAt = Date.now();
    return cat;
}

function lbJukeboxFindCategory(store, id) {
    return lbJukeboxEnsureCategories(store).find(c => c.id === id);
}

function lbJukeboxStorageKey(themeId) {
    return String((typeof game !== 'undefined' && game.world && game.world.id) || 'world') + '_' + String(themeId || 'noir');
}

function lbJukeboxGetPublishedTapes(store) {
    return lbJukeboxEnsureTapes(store).filter(t => t.published && !t.archived);
}

function lbJukeboxGetLibraryTapes(store) {
    return lbJukeboxEnsureTapes(store).filter(t => !t.archived);
}

function lbJukeboxFindTape(store, id) {
    return lbJukeboxEnsureTapes(store).find(t => t.id === id);
}

async function lbJukeboxSyncWorldLibrary(store, themeId) {
    try {
        let cfg = await lbReadConfig();
        cfg.jukeboxLibrary = cfg.jukeboxLibrary || {};
        cfg.jukeboxLibrary[lbJukeboxStorageKey(themeId)] = {
            tapes: (store.jukeboxTapes || []).map(t => Object.assign({}, t)),
            categories: (store.jukeboxCategories || []).map(c => Object.assign({}, c))
        };
        await lbWriteConfig(cfg);
    } catch (e) {}
}

async function lbJukeboxLoadWorldLibrary(store, themeId) {
    try {
        let cfg = await lbReadConfig();
        let lib = (cfg.jukeboxLibrary && cfg.jukeboxLibrary[lbJukeboxStorageKey(themeId)]) || [];
        let tapes = Array.isArray(lib) ? lib : (lib.tapes || []);
        let categories = Array.isArray(lib) ? [] : (lib.categories || []);
        if (categories.length) {
            lbJukeboxEnsureCategories(store);
            let byCat = {};
            store.jukeboxCategories.forEach(c => { byCat[c.id] = c; });
            categories.forEach(raw => {
                let c = lbJukeboxNormalizeCategory(Object.assign({}, raw));
                if (byCat[c.id]) Object.assign(byCat[c.id], c);
                else store.jukeboxCategories.push(c);
            });
        }
        if (!tapes.length) return;
        let byId = {};
        lbJukeboxEnsureTapes(store).forEach(t => { byId[t.id] = t; });
        tapes.forEach(raw => {
            let t = lbJukeboxNormalizeTape(Object.assign({}, raw));
            if (byId[t.id]) Object.assign(byId[t.id], t);
            else store.jukeboxTapes.push(t);
        });
    } catch (e) {}
}

function lbJukeboxPersistTapes(store, themeId, saveStoreFn) {
    lbJukeboxEnsureTapes(store);
    if (saveStoreFn) saveStoreFn();
    lbJukeboxSyncWorldLibrary(store, themeId);
}

async function lbJukeboxSyncWorldCustomRadios(store, themeId) {
    try {
        let cfg = await lbReadConfig();
        cfg.jukeboxCustomRadios = cfg.jukeboxCustomRadios || {};
        cfg.jukeboxCustomRadios[lbJukeboxStorageKey(themeId)] = (store.jukeboxCustomRadios || []).map(r => Object.assign({}, r));
        await lbWriteConfig(cfg);
    } catch (e) {}
}

async function lbJukeboxLoadWorldCustomRadios(store, themeId) {
    try {
        let cfg = await lbReadConfig();
        let lib = (cfg.jukeboxCustomRadios && cfg.jukeboxCustomRadios[lbJukeboxStorageKey(themeId)]) || [];
        if (!lib.length) return;
        let byId = {};
        lbJukeboxEnsureCustomRadios(store).forEach(r => { byId[r.id] = r; });
        lib.forEach(raw => {
            let r = lbJukeboxNormalizeCustomRadio(Object.assign({}, raw));
            if (byId[r.id]) Object.assign(byId[r.id], r);
            else store.jukeboxCustomRadios.push(r);
        });
    } catch (e) {}
}

function lbJukeboxPersistCustomRadios(store, themeId, saveStoreFn) {
    lbJukeboxEnsureCustomRadios(store);
    if (saveStoreFn) saveStoreFn();
    lbJukeboxSyncWorldCustomRadios(store, themeId);
}

function lbJukeboxShowCtxMenu(x, y, items) {
    $('.lb-jukebox-ctx-menu').remove();
    if (!items || !items.length) return;
    let menu = $('<div class="lb-jukebox-ctx-menu"></div>');
    items.forEach(it => {
        if (it.sep) { menu.append('<div class="lb-jukebox-ctx-sep"></div>'); return; }
        let btn = $(`<button type="button" class="lb-jukebox-ctx-item${it.danger ? ' is-danger' : ''}${it.disabled ? ' is-disabled' : ''}">${it.label}</button>`);
        if (!it.disabled) btn.on('click', (e) => { e.stopPropagation(); menu.remove(); it.action(); });
        menu.append(btn);
    });
    $('body').append(menu);
    let mw = menu.outerWidth(), mh = menu.outerHeight();
    menu.css({ left: Math.min(x, window.innerWidth - mw - 8) + 'px', top: Math.min(y, window.innerHeight - mh - 8) + 'px' });
    setTimeout(() => { $(document).one('click.jukectx contextmenu.jukectx', () => menu.remove()); }, 10);
}

function lbJukeboxFormatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    let m = Math.floor(sec / 60);
    let s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
}

function lbJukeboxApplyCarousel(trackEl, tapes, activeIndex, animate, swingDir) {
    let track = trackEl instanceof jQuery ? trackEl[0] : trackEl;
    if (!track) return;
    if (!tapes.length) { track.innerHTML = ''; return; }
    if (track.children.length !== tapes.length) {
        track.innerHTML = '';
        tapes.forEach((tape, i) => {
            let slide = document.createElement('div');
            slide.className = 'lb-jukebox-cover-slide';
            slide.dataset.index = String(i);
            slide.dataset.tapeId = tape.id || '';
            slide.innerHTML = lbJukeboxBuildCaseHTML(tape);
            track.appendChild(slide);
            lbJukeboxBindCaseInteraction(slide);
        });
    } else {
        Array.from(track.children).forEach((el, i) => {
            if (tapes[i]) {
                el.innerHTML = lbJukeboxBuildCaseHTML(tapes[i]);
                delete el.dataset.lbCaseBound;
                lbJukeboxBindCaseInteraction(el);
            }
        });
    }
    let vw = track.parentElement ? track.parentElement.clientWidth : 600;
    let gap = Math.min(vw * 0.34, 240);
    let dur = animate ? '580ms' : '0ms';
    let ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
    let half = Math.floor(tapes.length / 2);
    Array.from(track.children).forEach(function(el) {
        let idx = parseInt(el.dataset.index, 10);
        let offset = ((idx - activeIndex + tapes.length + half) % tapes.length) - half;
        let abs = Math.abs(offset);
        let scale = offset === 0 ? 1 : (abs === 1 ? 0.86 : 0.72);
        let opacity = offset === 0 ? 1 : (abs === 1 ? 0.58 : 0.2);
        let z = offset === 0 ? 30 : (abs === 1 ? 20 : 5);
        let blur = offset === 0 ? 0 : (abs === 1 ? 0.6 : 1.8);
        let tx = offset * gap;
        el.style.transition = animate ? `transform ${dur} ${ease}, opacity ${dur} ${ease}, filter ${dur} ${ease}` : 'none';
        el.style.zIndex = String(z);
        el.style.opacity = String(opacity);
        el.style.filter = blur > 0 ? `blur(${blur}px)` : 'none';
        el.style.transform = `translateX(${tx}px) scale(${scale})`;
        el.classList.toggle('is-active', offset === 0);
        el.classList.remove('is-swinging');
    });
    if (animate && swingDir) {
        setTimeout(() => {
            Array.from(track.children).forEach(function(el) {
                el.classList.remove('is-swinging');
            });
        }, 600);
    }
}

function lbJukeboxOpenCoverEditor(imgSrc, onDone, uiHooks) {
    uiHooks = uiHooks || {};
    lbJukeboxEnsureCSS();
    lbJukeboxEnsureFonts();
    if (uiHooks.onMinimize) uiHooks.onMinimize();
    let overlay = document.createElement('div');
    overlay.className = 'lb-jukebox-crop-overlay';
    overlay.innerHTML = `<div class="lb-jukebox-crop-panel">
        <h3>Crop Cover Art</h3>
        <div class="lb-jukebox-crop-stage"><canvas></canvas><div class="lb-jukebox-crop-frame"></div></div>
        <input type="range" class="lb-jukebox-crop-zoom" min="100" max="300" value="100" title="Zoom">
        <div class="lb-jukebox-crop-filters">
            <button type="button" data-filter="none" class="active">Original</button>
            <button type="button" data-filter="sepia">Sepia</button>
            <button type="button" data-filter="grayscale">B&amp;W</button>
            <button type="button" data-filter="contrast">Contrast</button>
        </div>
        <div class="lb-jukebox-upload-actions">
            <button type="button" class="lb-jukebox-upload-cancel" data-act="cancel">Cancel</button>
            <button type="button" class="lb-jukebox-upload-next" data-act="confirm">Apply</button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
    let stage = overlay.querySelector('.lb-jukebox-crop-stage');
    let canvas = overlay.querySelector('canvas');
    let ctx = canvas.getContext('2d');
    let img = new Image();
    img.crossOrigin = 'anonymous';
    let state = { filter: 'none', zoom: 1, panX: 0, panY: 0, dragging: false, lastX: 0, lastY: 0 };
    let filters = {
        none: '',
        sepia: 'sepia(0.85)',
        grayscale: 'grayscale(1)',
        contrast: 'contrast(1.45) saturate(1.2)'
    };
    function drawCrop() {
        let w = stage.clientWidth;
        let h = stage.clientHeight;
        canvas.width = w;
        canvas.height = h;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        if (!img.complete || !img.naturalWidth) return;
        let baseScale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        let scale = baseScale * state.zoom;
        let dw = img.naturalWidth * scale;
        let dh = img.naturalHeight * scale;
        let dx = (w - dw) / 2 + state.panX;
        let dy = (h - dh) / 2 + state.panY;
        ctx.filter = filters[state.filter] || 'none';
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.filter = 'none';
    }
    img.onload = drawCrop;
    img.onerror = () => { ui.notifications.warn('Could not load cover image.'); closeEditor(); };
    img.src = imgSrc;
    overlay.querySelector('.lb-jukebox-crop-zoom').addEventListener('input', function() {
        state.zoom = parseInt(this.value, 10) / 100;
        drawCrop();
    });
    overlay.querySelectorAll('.lb-jukebox-crop-filters button').forEach(btn => {
        btn.addEventListener('click', function() {
            overlay.querySelectorAll('.lb-jukebox-crop-filters button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            state.filter = this.dataset.filter;
            drawCrop();
        });
    });
    stage.addEventListener('pointerdown', e => { state.dragging = true; state.lastX = e.clientX; state.lastY = e.clientY; stage.setPointerCapture(e.pointerId); });
    stage.addEventListener('pointermove', e => {
        if (!state.dragging) return;
        state.panX += e.clientX - state.lastX;
        state.panY += e.clientY - state.lastY;
        state.lastX = e.clientX;
        state.lastY = e.clientY;
        drawCrop();
    });
    stage.addEventListener('pointerup', () => { state.dragging = false; });
    let closeEditor = () => { overlay.remove(); if (uiHooks.onRestore) uiHooks.onRestore(); };
    overlay.querySelector('[data-act="cancel"]').addEventListener('click', closeEditor);
    overlay.querySelector('[data-act="confirm"]').addEventListener('click', () => {
        let w = stage.clientWidth;
        let h = stage.clientHeight;
        let inset = 0.08;
        let cropSize = Math.min(w, h) * (1 - inset * 2);
        let cx = w * inset;
        let cy = h * inset;
        let out = document.createElement('canvas');
        out.width = 512;
        out.height = 512;
        let octx = out.getContext('2d');
        octx.drawImage(canvas, cx, cy, cropSize, cropSize, 0, 0, 512, 512);
        let dataUrl = out.toDataURL('image/jpeg', 0.92);
        overlay.remove();
        if (uiHooks.onRestore) uiHooks.onRestore();
        if (onDone) onDone(dataUrl);
    });
    window.addEventListener('resize', drawCrop);
    overlay.addEventListener('remove', () => window.removeEventListener('resize', drawCrop));
}

function lbJukeboxInitBoard(html, store, theme, saveStore) {
    saveStore = function() { window.lbCurrentStore = store; };
    let isClassicBoard = !!(store.classic || window.lbClassicActive);
    let isJukeboxNoGraphics = isClassicBoard || !!store.customBoard;
    if (!lbJukeboxIsEnabled(theme.id, { classic: isClassicBoard || theme.classic })) {
        html.find('#lb-jukebox-tab-wrap').remove();
        html.find('#lb-jukebox-overlay').remove();
        return;
    }
    lbJukeboxEnsureCSS();
    lbJukeboxEnsureFonts();
    lbEnsureCreateBoardFonts();
    lbJukeboxEnsureTapes(store);
    lbJukeboxEnsureCategories(store);
    lbJukeboxEnsureCustomRadios(store);
    if (theme.id === 'modern') lbJukeboxEnsureDevice(store);
    else if (theme.id === 'shadowpunk') lbJukeboxEnsureHideoutView(store);
    else if (theme.id === 'slums') lbJukeboxEnsureSlumsView(store);
    else if (theme.id === 'galactic') lbJukeboxEnsureGalacticView(store);
    else if (theme.id !== 'cosytavern') lbJukeboxEnsureEra(store);
    let bgUrl = isJukeboxNoGraphics ? '' : lbJukeboxLayerUrl(theme.id, store);
    html.find('.lb-jukebox-slide-bg-inner img').attr('src', bgUrl || '');
    let overlay = html.find('#lb-jukebox-overlay');
    lbJukeboxApplyThemeStyles(overlay, theme);
    if (isJukeboxNoGraphics) overlay.addClass('lb-jukebox-classic-mode');
    else overlay.removeClass('lb-jukebox-classic-mode');
    overlay.find('.lb-jukebox-era-switch:not(.lb-jukebox-device-switch):not(.lb-jukebox-hideout-view-switch):not(.lb-jukebox-slums-view-switch):not(.lb-jukebox-galactic-view-switch)').toggle(!isJukeboxNoGraphics && theme.id === 'noir');
    overlay.find('.lb-jukebox-device-switch').toggle(!isJukeboxNoGraphics && theme.id === 'modern');
    overlay.find('.lb-jukebox-hideout-view-switch').toggle(!isJukeboxNoGraphics && theme.id === 'shadowpunk');
    overlay.find('.lb-jukebox-slums-view-switch').toggle(!isJukeboxNoGraphics && theme.id === 'slums');
    overlay.find('.lb-jukebox-galactic-view-switch').toggle(!isJukeboxNoGraphics && theme.id === 'galactic');
    let galacticView = theme.id === 'galactic' ? lbJukeboxNormalizeGalacticView(store.jukeboxGalacticView) : null;
    overlay.toggleClass('is-holo-active', (theme.id === 'shadowpunk' && lbJukeboxNormalizeHideoutView(store.jukeboxHideoutView) === 'holo') || (theme.id === 'galactic' && galacticView === 'holo'));
    overlay.toggleClass('is-robot-active', theme.id === 'galactic' && galacticView === 'robot');
    html.find('#lb-jukebox-trigger-tab').css('color', (LB_THEMES.find(x => x.id === theme.id) || {}).accent || '#d4af37');
    let shell = overlay.find('.lb-jukebox-shell');
    let appRoot = html;
    let panel = overlay.find('.lb-jukebox-panel');
    let audio = overlay.find('#lb-jukebox-audio')[0];
    let radioAudio = overlay.find('#lb-jukebox-radio-audio')[0];
    if (!audio) {
        overlay.append('<audio id="lb-jukebox-audio" preload="metadata" style="display:none;"></audio>');
        audio = overlay.find('#lb-jukebox-audio')[0];
    }
    if (!radioAudio) {
        overlay.append('<audio id="lb-jukebox-radio-audio" preload="none" style="display:none;"></audio>');
        radioAudio = overlay.find('#lb-jukebox-radio-audio')[0];
    }
    let triggerTab = html.find('#lb-jukebox-trigger-tab');
    let state = {
        open: false,
        animating: false,
        tab: 'tapes',
        index: 0,
        playing: false,
        scrubbing: false,
        carouselLock: false,
        noteTimer: null,
        radioStationId: null,
        radioVolume: 0.8,
        era: theme.id === 'noir' ? lbJukeboxNormalizeEra(store.jukeboxEra) : null,
        device: theme.id === 'modern' ? lbJukeboxNormalizeDevice(store.jukeboxDevice) : null,
        hideoutView: theme.id === 'shadowpunk' ? lbJukeboxNormalizeHideoutView(store.jukeboxHideoutView) : null,
        slumsView: theme.id === 'slums' ? lbJukeboxNormalizeSlumsView(store.jukeboxSlumsView) : null,
        galacticView: theme.id === 'galactic' ? lbJukeboxNormalizeGalacticView(store.jukeboxGalacticView) : null,
        customRadioActive: false,
        customRadioQueue: [],
        customRadioTracks: [],
        customBuilderEditId: null,
        notesFxEnabled: store.jukeboxNotesFx !== false,
        forAll: false
    };

    function lbJukeboxEmitForAll(tape) {
        return;
    }

    function syncForAllBtn() {
        overlay.find('.lb-jukebox-for-all').toggleClass('is-active', !!state.forAll).attr('aria-pressed', state.forAll ? 'true' : 'false');
    }

    function getJukeboxViewTitle() {
        if (theme.id === 'noir') return state.era === '1960' ? 'Recorder' : 'Phonograph';
        if (theme.id === 'modern') return state.device === 'phone' ? 'Smartphone Music Player' : 'CD Player';
        if (theme.id === 'shadowpunk') return state.hideoutView === 'holo' ? 'Cybertech Holo Lens' : 'Commlink DS-X 2.0';
        if (theme.id === 'slums') {
            if (state.slumsView === 'phone') return 'Smartphone Music Player';
            if (state.slumsView === 'device') return 'Commlink DS-X 2.0';
            return 'EYE Pod';
        }
        if (theme.id === 'galactic') return state.galacticView === 'holo' ? 'Cybertech Holo Lens' : 'EYE-Bot MK-III';
        if (theme.id === 'cosytavern') return 'Bard & Guitar';
        return 'JUKEBOX';
    }

    function updateJukeboxViewTitle() {
        overlay.find('.lb-jukebox-title').text(getJukeboxViewTitle());
    }

    function syncNotesFxToggle() {
        overlay.toggleClass('is-notes-fx-disabled', !state.notesFxEnabled);
        overlay.find('#lb-jukebox-notes-toggle').toggleClass('is-off', !state.notesFxEnabled).attr('aria-pressed', state.notesFxEnabled ? 'true' : 'false');
    }

    function openJukeboxFilePicker(opts) {
        return lbOpenFilePicker(Object.assign({}, opts, {
            jukeboxUpload: true,
            onShellMinimize: () => setMenuMinimized(true),
            onShellRestore: () => setMenuMinimized(false)
        }));
    }

    function getPublishedTapes() { return lbJukeboxGetPublishedTapes(store); }
    function getAllTapes() { return lbJukeboxEnsureTapes(store); }

    function syncJukeboxSlideDirection() {
        if (isClassicBoard) return;
        let viewKey = lbJukeboxGetSlideViewKey(theme.id, store);
        let dir = lbJukeboxGetSlideDirection(theme.id, viewKey);
        overlay.removeClass('lb-juke-slide-ltr lb-juke-slide-rtl lb-juke-cosytavern');
        overlay.addClass(dir === 'rtl' ? 'lb-juke-slide-rtl' : 'lb-juke-slide-ltr');
        if (theme.id === 'cosytavern') overlay.addClass('lb-juke-cosytavern');
    }

    function applyJukeboxLayer(url, crossfade) {
        if (isClassicBoard || store.customBoard) return;
        syncJukeboxSlideDirection();
        let img = html.find('.lb-jukebox-slide-bg-inner img');
        if (!url) {
            img.attr('src', '').css('opacity', 0);
            return;
        }
        let replaySlide = crossfade && state.open;
        if (replaySlide) overlay.removeClass('is-slide-open');
        if (crossfade && img.attr('src') && img.attr('src') !== url) {
            img.css('opacity', 0);
            setTimeout(() => {
                img.one('load', () => {
                    img.css('opacity', 1);
                    if (replaySlide) requestAnimationFrame(() => overlay.addClass('is-slide-open'));
                }).attr('src', url);
                if (img[0] && img[0].complete) {
                    img.css('opacity', 1);
                    if (replaySlide) requestAnimationFrame(() => overlay.addClass('is-slide-open'));
                }
            }, 180);
        } else {
            img.css('opacity', 1).attr('src', url);
            if (replaySlide) requestAnimationFrame(() => overlay.addClass('is-slide-open'));
        }
    }

    function applyJukeboxCustomView(viewKey, crossfade) {
        viewKey = viewKey || '';
        store.jukeboxCustomView = viewKey;
        overlay.find('.lb-jukebox-custom-view-btn').removeClass('active');
        overlay.find('.lb-jukebox-custom-view-btn[data-view="' + viewKey + '"]').addClass('active');
        applyJukeboxLayer(lbJukeboxCustomViewUrl(viewKey), crossfade);
        updateJukeboxViewTitle();
    }

    function applyJukeboxEra(era, crossfade) {
        era = lbJukeboxNormalizeEra(era);
        store.jukeboxEra = era;
        state.era = era;
        overlay.find('.lb-jukebox-era-btn').removeClass('active');
        overlay.find('.lb-jukebox-era-btn[data-era="' + era + '"]').addClass('active');
        applyJukeboxLayer(lbJukeboxEraUrl(era), crossfade);
        updateJukeboxViewTitle();
    }

    function applyJukeboxDevice(device, crossfade) {
        device = lbJukeboxNormalizeDevice(device);
        store.jukeboxDevice = device;
        state.device = device;
        overlay.find('.lb-jukebox-device-btn').removeClass('active');
        overlay.find('.lb-jukebox-device-btn[data-device="' + device + '"]').addClass('active');
        applyJukeboxLayer(lbJukeboxDeviceUrl(device), crossfade);
        updateJukeboxViewTitle();
    }

    function applyJukeboxHideoutView(view, crossfade) {
        view = lbJukeboxNormalizeHideoutView(view);
        store.jukeboxHideoutView = view;
        state.hideoutView = view;
        overlay.find('.lb-jukebox-hideout-view-btn').removeClass('active');
        overlay.find('.lb-jukebox-hideout-view-btn[data-view="' + view + '"]').addClass('active');
        applyJukeboxLayer(lbJukeboxHideoutViewUrl(view), crossfade);
        overlay.toggleClass('is-holo-active', view === 'holo');
        overlay.removeClass('is-robot-active');
        updateJukeboxViewTitle();
    }

    function applyJukeboxSlumsView(view, crossfade) {
        view = lbJukeboxNormalizeSlumsView(view);
        store.jukeboxSlumsView = view;
        state.slumsView = view;
        overlay.find('.lb-jukebox-slums-view-btn').removeClass('active');
        overlay.find('.lb-jukebox-slums-view-btn[data-view="' + view + '"]').addClass('active');
        applyJukeboxLayer(lbJukeboxSlumsViewUrl(view), crossfade);
        overlay.removeClass('is-holo-active is-robot-active');
        updateJukeboxViewTitle();
    }

    function applyJukeboxGalacticView(view, crossfade) {
        view = lbJukeboxNormalizeGalacticView(view);
        store.jukeboxGalacticView = view;
        state.galacticView = view;
        overlay.find('.lb-jukebox-galactic-view-btn').removeClass('active');
        overlay.find('.lb-jukebox-galactic-view-btn[data-view="' + view + '"]').addClass('active');
        applyJukeboxLayer(lbJukeboxGalacticViewUrl(view), crossfade);
        overlay.toggleClass('is-holo-active', view === 'holo');
        overlay.toggleClass('is-robot-active', view === 'robot');
        updateJukeboxViewTitle();
    }

    updateJukeboxViewTitle();
    syncNotesFxToggle();

    if (theme.id === 'modern') applyJukeboxDevice(store.jukeboxDevice, false);
    else if (theme.id === 'shadowpunk') applyJukeboxHideoutView(store.jukeboxHideoutView, false);
    else if (theme.id === 'slums') applyJukeboxSlumsView(store.jukeboxSlumsView, false);
    else if (theme.id === 'galactic') applyJukeboxGalacticView(store.jukeboxGalacticView, false);
    else if (theme.id === 'cosytavern') applyJukeboxLayer(LB_JUKEBOX_COSYTAVERN_ASSET, false);
    else if (!isJukeboxNoGraphics) applyJukeboxEra(store.jukeboxEra, false);
    else syncJukeboxSlideDirection();

    function getAllRadioStations() { return lbJukeboxGetAllRadioStations(theme.id, store); }

    function renderRadioList() {
        let list = overlay.find('#lb-jukebox-radio-list');
        if (!list.length) return;
        let stations = getAllRadioStations();
        let activeId = state.radioStationId;
        list.html(stations.map(s => {
            let cls = s.custom ? ' is-custom' : '';
            let icon = s.custom ? 'fa-music' : 'fa-broadcast-tower';
            return `<button type="button" class="lb-jukebox-radio-station${cls}${activeId === s.id ? ' is-active' : ''}" data-station-id="${s.id}"${s.url ? ' data-url="' + s.url.replace(/"/g, '&quot;') + '"' : ''} data-custom="${s.custom ? '1' : '0'}"><i class="fas ${icon}"></i><span>${s.name.replace(/</g, '&lt;')}</span></button>`;
        }).join(''));
        list.find('.lb-jukebox-radio-station').off('click.jukebox').on('click.jukebox', function() {
            let id = this.dataset.stationId;
            let station = lbJukeboxFindRadioStation(theme.id, store, id);
            if (!station) return;
            if (state.radioStationId === id && lbJukeboxRadioIsLive(state, radioAudio, audio)) return;
            playRadioStation(station);
        });
    }

    function renderCustomStationEditors() {
        let wrap = overlay.find('#lb-jukebox-custom-stations');
        if (!wrap.length) return;
        let radios = lbJukeboxEnsureCustomRadios(store);
        if (!radios.length) {
            wrap.html('<p style="color:#888;font-size:12px;margin:0;">No custom stations yet.</p>');
            return;
        }
        wrap.html(radios.map(r => {
            let editing = state.customBuilderEditId === r.id ? ' is-editing' : '';
            let status = r.published ? 'Published' : 'Draft';
            return `<button type="button" class="lb-jukebox-custom-station-edit${editing}" data-radio-id="${r.id}"><i class="fas fa-pen"></i><span>${(r.name || 'Custom Radio').replace(/</g, '&lt;')}</span><span style="margin-left:auto;font-size:10px;opacity:0.65;">${status} · ${(r.tracks || []).length} tracks</span></button>`;
        }).join(''));
        wrap.find('.lb-jukebox-custom-station-edit').off('click.jukebox').on('click.jukebox', function() {
            openCustomRadioBuilder(this.dataset.radioId);
        });
    }

    let builderDraft = { name: '', tracks: [] };

    function renderBuilderTracks() {
        let list = overlay.find('#lb-jukebox-custom-track-list');
        if (!builderDraft.tracks.length) {
            list.html('<p style="color:#888;font-size:11px;margin:4px 0;">Drop MP3 files above to add songs.</p>');
            return;
        }
        list.html(builderDraft.tracks.map((path, i) => {
            let label = path.split('/').pop() || ('Track ' + (i + 1));
            return `<div class="lb-jukebox-custom-track-item" data-idx="${i}"><i class="fas fa-music"></i><span title="${label.replace(/"/g, '&quot;')}">${label.replace(/</g, '&lt;')}</span><button type="button" class="lb-jukebox-custom-track-remove" data-idx="${i}" title="Remove"><i class="fas fa-times"></i></button></div>`;
        }).join(''));
        list.find('.lb-jukebox-custom-track-remove').off('click.jukebox').on('click.jukebox', function(e) {
            e.stopPropagation();
            let idx = parseInt(this.dataset.idx, 10);
            if (!isNaN(idx)) builderDraft.tracks.splice(idx, 1);
            renderBuilderTracks();
        });
    }

    async function addMp3FilesToBuilder(files) {
        if (!files || !files.length) return;
        for (let i = 0; i < files.length; i++) {
            try {
                let path = await lbJukeboxPersistAudioFileWithProgress(files[i], theme.id, overlay);
                if (path) builderDraft.tracks.push(path);
            } catch (e) {}
        }
        renderBuilderTracks();
    }

    function openCustomRadioBuilder(editId) {
        let builder = overlay.find('#lb-jukebox-custom-builder');
        builder.show();
        overlay.find('#lb-jukebox-create-radio').hide();
        state.customBuilderEditId = editId || null;
        if (editId) {
            let radio = lbJukeboxFindCustomRadio(store, editId);
            builderDraft = { name: radio ? radio.name : '', tracks: radio ? radio.tracks.slice() : [] };
        } else {
            builderDraft = { name: '', tracks: [] };
        }
        overlay.find('#lb-jukebox-custom-radio-name').val(builderDraft.name);
        renderBuilderTracks();
        renderCustomStationEditors();
    }

    function closeCustomRadioBuilder() {
        overlay.find('#lb-jukebox-custom-builder').hide();
        overlay.find('#lb-jukebox-create-radio').show();
        state.customBuilderEditId = null;
        builderDraft = { name: '', tracks: [] };
        renderCustomStationEditors();
    }

    function persistCustomRadios() { lbJukeboxPersistCustomRadios(store, theme.id, saveStore); }

    function publishCustomRadio() {
        let name = (overlay.find('#lb-jukebox-custom-radio-name').val() || '').trim() || 'Custom Radio';
        if (!builderDraft.tracks.length) {
            ui.notifications.warn('Add at least one MP3 before publishing.');
            return;
        }
        let radio;
        if (state.customBuilderEditId) {
            radio = lbJukeboxFindCustomRadio(store, state.customBuilderEditId);
            if (!radio) return;
            radio.name = name;
            radio.tracks = builderDraft.tracks.slice();
            radio.published = true;
        } else {
            radio = lbJukeboxNormalizeCustomRadio({
                id: foundry.utils.randomID(),
                name: name,
                tracks: builderDraft.tracks.slice(),
                published: true,
                createdAt: Date.now()
            });
            store.jukeboxCustomRadios.push(radio);
        }
        persistCustomRadios();
        renderRadioList();
        closeCustomRadioBuilder();
        ui.notifications.info('Custom radio "' + radio.name + '" published.');
    }

    function updateVolumeDial(pct) {
        overlay.find('#lb-jukebox-dial-pointer').css('transform', 'rotate(' + lbJukeboxDialRotation(pct) + 'deg)');
        overlay.find('.lb-jukebox-radio-vol-value').text(Math.round(pct));
    }

    function updateReceiverDisplay() {
        let display = overlay.find('#lb-jukebox-radio-display');
        let textEl = overlay.find('#lb-jukebox-display-text');
        if (lbJukeboxRadioIsLive(state, radioAudio, audio)) {
            let station = lbJukeboxFindRadioStation(theme.id, store, state.radioStationId);
            textEl.text(station ? station.name : 'On Air');
            display.addClass('is-live');
        } else if (state.radioStationId) {
            let station = lbJukeboxFindRadioStation(theme.id, store, state.radioStationId);
            textEl.text((station ? station.name : 'Station') + ' — PAUSED');
            display.removeClass('is-live');
        } else if (state.playing && audio && !audio.paused) {
            let tapes = getPublishedTapes();
            textEl.text(tapes[state.index] ? tapes[state.index].name : 'Tape playing');
            display.addClass('is-live');
        } else if (state.tab === 'tapes') {
            let tapes = getPublishedTapes();
            textEl.text(tapes[state.index] ? tapes[state.index].name : 'Insert tape');
            display.removeClass('is-live');
        } else {
            textEl.text('Standby — select a station');
            display.removeClass('is-live');
        }
        triggerTab.toggleClass('is-radio-live', lbJukeboxRadioIsLive(state, radioAudio, audio));
    }

    function initSmoke() {
        let layer = overlay.find('#lb-jukebox-smoke-layer');
        if (!layer.length || layer.data('lbSmokeInit')) return;
        layer.data('lbSmokeInit', 1);
        layer.empty();
        for (let i = 0; i < 16; i++) {
            let w = $('<span class="lb-jukebox-smoke-wisp"></span>');
            w.css({
                animationDelay: (i * 2.1 + Math.random() * 3) + 's',
                animationDuration: (14 + Math.random() * 10) + 's',
                left: (8 + Math.random() * 58) + '%',
                width: (3 + Math.random() * 7) + 'px',
                height: (100 + Math.random() * 90) + 'px',
                '--lb-smoke-drift': (-10 + Math.random() * 28) + 'px',
                '--lb-smoke-curl': (-12 + Math.random() * 24) + 'deg'
            });
            layer.append(w);
        }
    }

    function initWaves() {
        let layer = overlay.find('#lb-jukebox-waves-layer');
        if (!layer.length) return;
        layer.data('lbWavesInit', 1);
        layer.empty();
    }

    function getJukeboxPlaybackRate() {
        let btn = overlay.find('.lb-jukebox-speed-btn.active');
        return parseFloat(btn.data('rate')) || 1;
    }

    function setJukeboxPlaybackRate(rate) {
        rate = parseFloat(rate) || 1;
        overlay.find('.lb-jukebox-speed-btn').removeClass('active');
        overlay.find('.lb-jukebox-speed-btn[data-rate="' + rate + '"]').addClass('active');
        audio.playbackRate = rate;
    }

    function stopPlayFx() {
        if (state.noteTimer) { clearInterval(state.noteTimer); state.noteTimer = null; }
        overlay.removeClass('is-playing-fx');
        overlay.find('#lb-jukebox-notes-layer').empty();
    }

    function startPlayFx() {
        return;
    }

    async function stopRadio() {
        try { radioAudio.pause(); radioAudio.removeAttribute('src'); } catch (e) {}
        state.customRadioActive = false;
        state.customRadioQueue = [];
        state.customRadioTracks = [];
        state.radioStationId = null;
        overlay.find('.lb-jukebox-radio-station').removeClass('is-active');
        updateReceiverDisplay();
    }

    async function pauseRadio(keepStation) {
        if (state.customRadioActive) {
            try { audio.pause(); } catch (e) {}
            state.playing = false;
        } else {
            try { radioAudio.pause(); } catch (e) {}
        }
        if (!keepStation) {
            state.radioStationId = null;
            state.customRadioActive = false;
            state.customRadioQueue = [];
            state.customRadioTracks = [];
        }
        stopPlayFx();
        updateReceiverDisplay();
        overlay.find('.lb-jukebox-ctrl-pause').addClass('is-active');
        overlay.find('.lb-jukebox-ctrl-play').removeClass('is-active');
    }

    async function resumeRadio() {
        if (!state.radioStationId) return false;
        await lbJukeboxUnlockAudio();
        if (state.customRadioActive) {
            if (audio.src) {
                try {
                    await audio.play();
                    state.playing = true;
                    if (state.open) startPlayFx();
                    updateReceiverDisplay();
                    overlay.find('.lb-jukebox-ctrl-play').addClass('is-active');
                    overlay.find('.lb-jukebox-ctrl-pause').removeClass('is-active');
                    return true;
                } catch (e) {}
            }
            let station = lbJukeboxFindRadioStation(theme.id, store, state.radioStationId);
            if (station && station.custom) {
                await playCustomRadioStation(station);
                return lbJukeboxRadioIsLive(state, radioAudio, audio);
            }
            return false;
        }
        if (radioAudio.src) {
            try {
                await radioAudio.play();
                if (state.open) startPlayFx();
                updateReceiverDisplay();
                overlay.find('.lb-jukebox-ctrl-play').addClass('is-active');
                overlay.find('.lb-jukebox-ctrl-pause').removeClass('is-active');
                return true;
            } catch (e) {}
        }
        let station = lbJukeboxFindRadioStation(theme.id, store, state.radioStationId);
        if (station) {
            await playRadioStation(station);
            return lbJukeboxRadioIsLive(state, radioAudio, audio);
        }
        return false;
    }

    async function toggleRadioFromTab() {
        if (!state.radioStationId) {
            ui.notifications.info('Please select a radio station in the Jukebox first.');
            return;
        }
        if (lbJukeboxRadioIsLive(state, radioAudio, audio)) await pauseRadio(true);
        else await resumeRadio();
    }

    async function playNextCustomRadioTrack(autoplay) {
        if (!state.customRadioTracks.length) return;
        if (!state.customRadioQueue.length) {
            state.customRadioQueue = lbJukeboxShuffleTracks(state.customRadioTracks);
        }
        let path = state.customRadioQueue.shift();
        if (!path) return;
        audio.src = path;
        if (audio.dataset) audio.dataset.customRadio = '1';
        audio.playbackRate = getJukeboxPlaybackRate();
        audio.load();
        overlay.find('.lb-jukebox-radio-station').removeClass('is-active');
        overlay.find('[data-station-id="' + state.radioStationId + '"]').addClass('is-active');
        updateReceiverDisplay();
        if (autoplay) {
            await lbJukeboxUnlockAudio();
            try {
                await audio.play();
                state.playing = true;
                if (state.open) startPlayFx();
                overlay.find('.lb-jukebox-ctrl-play').addClass('is-active');
                overlay.find('.lb-jukebox-ctrl-pause').removeClass('is-active');
            } catch (e) {}
        }
    }

    async function playCustomRadioStation(station) {
        if (!station || !station.tracks || !station.tracks.length) {
            ui.notifications.warn('Custom radio has no tracks.');
            return;
        }
        try { radioAudio.pause(); radioAudio.removeAttribute('src'); } catch (e) {}
        state.customRadioActive = true;
        state.radioStationId = station.id;
        state.customRadioTracks = station.tracks.filter(Boolean).slice();
        state.customRadioQueue = lbJukeboxShuffleTracks(state.customRadioTracks);
        state.playing = false;
        await playNextCustomRadioTrack(true);
    }

    async function playRadioStation(station) {
        if (!station) return;
        lbPlaySound('radio');
        state.customRadioActive = false;
        state.customRadioQueue = [];
        state.customRadioTracks = [];
        if (station.custom) {
            await playCustomRadioStation(station);
            return;
        }
        try { audio.pause(); audio.currentTime = 0; audio.removeAttribute('src'); } catch (e) {}
        state.playing = false;
        stopPlayFx();
        try { radioAudio.pause(); radioAudio.removeAttribute('src'); } catch (e) {}
        await lbJukeboxUnlockAudio();
        radioAudio.volume = state.radioVolume;

        if (await lbJukeboxConnectRadio(station, radioAudio, state.radioVolume)) {
            state.radioStationId = station.id;
            state.playing = true;
            state.customRadioActive = false;
            overlay.find('.lb-jukebox-radio-station').removeClass('is-active');
            overlay.find('[data-station-id="' + station.id + '"]').addClass('is-active');
            updateReceiverDisplay();
            if (state.open) startPlayFx();
            overlay.find('.lb-jukebox-ctrl-play').addClass('is-active');
            overlay.find('.lb-jukebox-ctrl-pause').removeClass('is-active');
            return;
        }
        ui.notifications.warn('Could not connect to the radio. Please wait a moment and click again.');
    }

    window.lbJukeboxState = state;
    window.lbJukeboxStop = function() {
        try { audio.pause(); audio.currentTime = 0; audio.removeAttribute('src'); } catch (e) {}
        state.playing = false;
        stopRadio();
        stopPlayFx();
        overlay.find('.lb-jukebox-ctrl-play, .lb-jukebox-ctrl-pause').removeClass('is-active');
    };
    window.lbJukeboxApplyRemotePlay = function(data) {
        if (!data || !data.audioPath) return;
        let tape = data.tapeId ? lbJukeboxFindTape(store, data.tapeId) : null;
        if (!tape) tape = { id: data.tapeId, audioPath: data.audioPath, name: data.tapeName || 'Untitled' };
        let tapes = getPublishedTapes();
        let idx = tapes.findIndex(t => t.id === tape.id);
        if (idx >= 0) state.index = idx;
        else if (tapes.length) state.index = 0;
        renderCarousel(false);
        loadTape(tape, true);
    };

    function persistTapes() {
        lbJukeboxEnsureCategories(store);
        lbJukeboxPersistTapes(store, theme.id, saveStore);
    }

    function renderCarousel(animate, dir) {
        let tapes = getPublishedTapes();
        let track = overlay.find('.lb-jukebox-carousel-track');
        let empty = overlay.find('.lb-jukebox-tapes-empty');
        let carousel = overlay.find('.lb-jukebox-carousel-wrap');
        if (!tapes.length) {
            track.empty();
            empty.show();
            carousel.hide();
            overlay.find('.lb-jukebox-now-playing').text('No tape selected');
            updateReceiverDisplay();
            return;
        }
        empty.hide();
        carousel.show();
        if (state.index >= tapes.length) state.index = 0;
        lbJukeboxApplyCarousel(track, tapes, state.index, !!animate, dir || 0);
        overlay.find('.lb-jukebox-now-playing').text(tapes[state.index].name || 'Untitled');
        updateReceiverDisplay();
        if (!audio.src && tapes[state.index]) loadTape(tapes[state.index], false);
        track.find('.lb-jukebox-cover-slide').off('click.jukebox').on('click.jukebox', function() {
            let idx = parseInt(this.dataset.index, 10);
            if (idx === state.index || state.carouselLock) return;
            state.carouselLock = true;
            let swing = idx > state.index ? 1 : -1;
            if (idx === 0 && state.index === tapes.length - 1) swing = 1;
            if (idx === tapes.length - 1 && state.index === 0) swing = -1;
            state.index = idx;
            renderCarousel(true, swing);
            loadTape(tapes[idx], state.playing);
            setTimeout(() => { state.carouselLock = false; }, 600);
        }).off('contextmenu.jukebox').on('contextmenu.jukebox', function(e) {
            e.preventDefault();
            e.stopPropagation();
            let tape = lbJukeboxFindTape(store, this.dataset.tapeId);
            if (!tape) return;
            let items = [];
            if (game.user.isGM) {
                items.push({ label: '<i class="fas fa-box-archive"></i> Archive', action: () => archiveTape(tape.id) });
                items.push({ label: '<i class="fas fa-trash"></i> Delete', danger: true, action: () => deleteTape(tape.id) });
            }
            if (items.length) lbJukeboxShowCtxMenu(e.clientX, e.clientY, items);
        });
    }

    function loadTape(tape, autoplay) {
        if (!tape || !tape.audioPath) return;
        stopRadio();
        audio.src = tape.audioPath;
        if (audio.dataset) audio.dataset.tapeId = tape.id || '';
        audio.playbackRate = getJukeboxPlaybackRate();
        audio.load();
        overlay.find('.lb-jukebox-now-playing').text(tape.name || 'Untitled');
        updateReceiverDisplay();
        if (autoplay) {
            audio.play().then(() => {
                state.playing = true;
                startPlayFx();
                overlay.find('.lb-jukebox-ctrl-play').addClass('is-active');
                overlay.find('.lb-jukebox-ctrl-pause').removeClass('is-active');
                lbJukeboxEmitForAll(tape);
            }).catch(() => {});
        }
    }

    function updateProgress() {
        if (!audio.duration) return;
        let pct = (audio.currentTime / audio.duration) * 100;
        overlay.find('.lb-jukebox-progress-fill').css('width', pct + '%');
        overlay.find('.lb-jukebox-progress-thumb').css('left', pct + '%');
        overlay.find('.lb-jukebox-time-current').text(lbJukeboxFormatTime(audio.currentTime));
        if (!state.scrubbing) overlay.find('.lb-jukebox-time-total').text(lbJukeboxFormatTime(audio.duration));
    }

    function openJukebox() {
        if (state.open || state.animating) return;
        state.animating = true;
        state.open = true;
        lbPlaySound('radio');
        appRoot.addClass('lb-jukebox-active');
        overlay.addClass('is-visible is-blurring is-panel-visible');
        initSmoke();
        initWaves();
        requestAnimationFrame(() => {
            overlay.addClass('is-slide-open');
            renderCarousel(false);
            updateReceiverDisplay();
            setTimeout(() => { state.animating = false; }, 1300);
        });
    }

    function closeJukebox() {
        if (!state.open || state.animating) return;
        state.animating = true;
        try { audio.pause(); audio.currentTime = 0; audio.removeAttribute('src'); } catch (e) {}
        state.playing = false;
        stopPlayFx();
        overlay.removeClass('is-panel-visible is-slide-open is-blurring is-holo-active is-robot-active');
        overlay.find('.lb-jukebox-holo-fx').css({ opacity: 0, visibility: 'hidden' });
        setTimeout(() => {
            overlay.removeClass('is-visible');
            appRoot.removeClass('lb-jukebox-active');
            shell.removeClass('is-full-minimized');
            overlay.find('.lb-jukebox-holo-fx').css({ opacity: '', visibility: '' });
            state.open = false;
            state.animating = false;
        }, 900);
    }

    function navigateCarousel(delta) {
        let tapes = getPublishedTapes();
        if (tapes.length <= 1 || state.carouselLock) return;
        state.carouselLock = true;
        state.index = (state.index + delta + tapes.length) % tapes.length;
        renderCarousel(true, delta);
        loadTape(tapes[state.index], state.playing);
        setTimeout(() => { state.carouselLock = false; }, 600);
    }

    function bindCarouselScroll() {
        let viewport = overlay.find('.lb-jukebox-carousel-viewport');
        if (!viewport.length || viewport.data('lbCarouselScroll')) return;
        viewport.data('lbCarouselScroll', 1);
        let drag = { active: false, sx: 0, moved: false };
        viewport.on('wheel.jukebox', function(e) {
            if (!getPublishedTapes().length || state.carouselLock) return;
            e.preventDefault();
            let delta = Math.abs(e.originalEvent.deltaX) > Math.abs(e.originalEvent.deltaY) ? e.originalEvent.deltaX : e.originalEvent.deltaY;
            if (Math.abs(delta) < 8) return;
            navigateCarousel(delta > 0 ? 1 : -1);
        });
        viewport.on('pointerdown.jukebox', function(e) {
            if (e.button !== 0 || !getPublishedTapes().length) return;
            if (e.target.closest('.lb-jukebox-cover-slide.is-active')) return;
            drag.active = true;
            drag.sx = e.clientX;
            drag.moved = false;
            viewport.addClass('is-dragging');
            try { this.setPointerCapture(e.pointerId); } catch (_) {}
        });
        viewport.on('pointermove.jukebox', function(e) {
            if (!drag.active) return;
            let dx = e.clientX - drag.sx;
            if (Math.abs(dx) > 12) drag.moved = true;
        });
        viewport.on('pointerup.jukebox pointercancel.jukebox', function(e) {
            if (!drag.active) return;
            let dx = e.clientX - drag.sx;
            drag.active = false;
            viewport.removeClass('is-dragging');
            if (drag.moved && Math.abs(dx) > 48 && !state.carouselLock) navigateCarousel(dx < 0 ? 1 : -1);
        });
    }

    function setMenuMinimized(min) {
        shell.toggleClass('is-full-minimized', !!min);
    }

    async function saveNewTape(flow, opts) {
        opts = opts || {};
        let publish = opts.publish === true;
        let coverPath = '';
        if (flow.coverData) {
            try {
                coverPath = await lbJukeboxPersistCoverWithProgress(flow.coverData, overlay);
            } catch (e) { coverPath = ''; }
        }
        let tape = lbJukeboxNormalizeTape({
            id: foundry.utils.randomID(),
            name: flow.name,
            audioPath: flow.audioPath,
            coverPath: coverPath || '',
            coverData: coverPath ? '' : (flow.coverData || ''),
            labelRot: (Math.random() * 30 - 15).toFixed(1),
            published: publish,
            prepared: !publish,
            archived: false,
            categoryId: flow.categoryId || '',
            createdAt: Date.now()
        });
        getAllTapes().push(tape);
        persistTapes();
        if (publish) {
            let pub = getPublishedTapes();
            state.index = Math.max(0, pub.findIndex(t => t.id === tape.id));
            renderCarousel(true, 1);
            loadTape(tape, false);
            if (!opts.silent) ui.notifications.info('Tape published to jukebox.');
        } else if (!opts.silent) {
            ui.notifications.info('Tape prepared — use Publish Tape to make it live.');
        }
        return tape;
    }

    function deleteTape(tapeId) {
        let tape = lbJukeboxFindTape(store, tapeId);
        if (!tape) return;
        new Dialog({
            title: 'Delete Tape',
            content: `<p style="color:#ddd;">Permanently delete <strong>${(tape.name || 'Untitled').replace(/</g, '&lt;')}</strong>?</p>`,
            buttons: {
                delete: { icon: '<i class="fas fa-trash"></i>', label: 'Delete', callback: () => {
                    store.jukeboxTapes = getAllTapes().filter(t => t.id !== tapeId);
                    if (audio.dataset && audio.dataset.tapeId === tapeId) window.lbJukeboxStop();
                    state.index = 0;
                    persistTapes();
                    renderCarousel(false);
                    setMenuMinimized(false);
                    ui.notifications.info('Tape deleted.');
                }},
                cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' }
            },
            default: 'cancel'
        }, { classes: ['dialog', 'lb-modern-dialog'], width: 360 }).render(true);
    }

    function archiveTape(tapeId) {
        let tape = lbJukeboxFindTape(store, tapeId);
        if (!tape || !game.user.isGM) return;
        tape.archived = true;
        tape.published = false;
        tape.prepared = false;
        if (audio.dataset && audio.dataset.tapeId === tapeId) window.lbJukeboxStop();
        state.index = 0;
        persistTapes();
        renderCarousel(false);
        ui.notifications.info('Tape moved to GM Archive.');
    }

    function setTapePublished(tapeId, published) {
        if (!game.user.isGM) { ui.notifications.warn('Only the GM can publish or hide tapes.'); return; }
        let tape = lbJukeboxFindTape(store, tapeId);
        if (!tape || tape.archived) return;
        tape.published = !!published;
        tape.prepared = !published;
        persistTapes();
        renderCarousel(false);
        setMenuMinimized(false);
        ui.notifications.info(published ? 'Tape is now live in the player.' : 'Tape hidden from the player.');
    }

    function openPublishModal() {
        if (!game.user.isGM) { ui.notifications.warn('Only the GM can manage tape publishing.'); return; }
        lbJukeboxEnsureCategories(store);
        let categories = lbJukeboxEnsureCategories(store);
        let tapes = getAllTapes().filter(t => !t.archived);

        function buildZoneHtml(catId, title, deletable) {
            let zoneTapes = tapes.filter(t => (t.categoryId || '') === (catId || ''));
            let items = zoneTapes.length ? zoneTapes.map(t => {
                let st = t.published ? 'Live in player' : 'Prepared / hidden';
                let cls = t.published ? 'is-live' : 'is-hidden';
                return `<div class="lb-jukebox-publish-item" draggable="true" data-tape-id="${t.id}">
                    <img src="${lbJukeboxCoverSrc(t) || LB_JUKEBOX_JEWEL_PLACEHOLDER}" alt="">
                    <div class="lb-jukebox-publish-item-meta">
                        <div class="lb-jukebox-publish-item-name">${(t.name || 'Untitled').replace(/</g, '&lt;')}</div>
                        <div class="lb-jukebox-publish-item-status ${cls}">${st}</div>
                    </div>
                </div>`;
            }).join('') : '';
            let delBtn = deletable ? `<button type="button" class="lb-jukebox-publish-cat-delete" data-cat-id="${catId}" title="Delete category"><i class="fas fa-trash"></i></button>` : '';
            return `<div class="lb-jukebox-publish-zone" data-category-id="${catId || ''}">
                <div class="lb-jukebox-publish-zone-head">
                    <h4>${title.replace(/</g, '&lt;')}</h4>
                    <span class="lb-jukebox-publish-zone-count">${zoneTapes.length}</span>
                    ${delBtn}
                </div>
                <div class="lb-jukebox-publish-zone-drop">${items}</div>
            </div>`;
        }

        function renderZones(modalEl) {
            let zones = buildZoneHtml('', 'Uncategorized', false);
            categories.forEach(c => { zones += buildZoneHtml(c.id, c.name, true); });
            modalEl.find('.lb-jukebox-publish-zones').html(zones);
            wirePublishZones(modalEl);
        }

        function wirePublishZones(modalEl) {
            let dragId = null;
            modalEl.find('.lb-jukebox-publish-item').each(function() {
                this.addEventListener('dragstart', (e) => {
                    dragId = this.dataset.tapeId;
                    e.dataTransfer.setData('text/plain', dragId);
                    e.dataTransfer.effect = 'move';
                });
                this.addEventListener('dragend', () => { dragId = null; });
            });
            modalEl.find('.lb-jukebox-publish-zone').each(function() {
                let zone = this;
                zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('is-drag-over'); });
                zone.addEventListener('dragleave', () => zone.classList.remove('is-drag-over'));
                zone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    zone.classList.remove('is-drag-over');
                    let id = dragId || e.dataTransfer.getData('text/plain');
                    let tape = lbJukeboxFindTape(store, id);
                    if (!tape) return;
                    tape.categoryId = zone.dataset.categoryId || '';
                    persistTapes();
                    tapes = getAllTapes().filter(t => !t.archived);
                    renderZones(modalEl);
                });
            });
            modalEl.find('.lb-jukebox-publish-cat-delete').off('click.jukebox').on('click.jukebox', function(e) {
                e.stopPropagation();
                let catId = this.dataset.catId;
                getAllTapes().forEach(t => { if (t.categoryId === catId) t.categoryId = ''; });
                store.jukeboxCategories = categories.filter(c => c.id !== catId);
                persistTapes();
                tapes = getAllTapes().filter(t => !t.archived);
                categories = lbJukeboxEnsureCategories(store);
                renderZones(modalEl);
            });
            modalEl.find('.lb-jukebox-publish-item').off('click.jukebox').on('click.jukebox', function(e) {
                e.stopPropagation();
                let id = this.dataset.tapeId;
                lbJukeboxShowCtxMenu(e.clientX, e.clientY, [
                    { label: '<i class="fas fa-eye"></i> Publish', action: () => { setTapePublished(id, true); modalEl.remove(); openPublishModal(); } },
                    { label: '<i class="fas fa-eye-slash"></i> Hide', action: () => { setTapePublished(id, false); modalEl.remove(); openPublishModal(); } },
                    { sep: true },
                    { label: '<i class="fas fa-box-archive"></i> Archive', action: () => { archiveTape(id); modalEl.remove(); } },
                    { label: '<i class="fas fa-trash"></i> Delete', danger: true, action: () => { deleteTape(id); modalEl.remove(); } }
                ]);
            });
        }

        let modal = $(`<div class="lb-jukebox-publish-overlay">
            <div class="lb-jukebox-publish-modal">
                <h3>Publish Tape</h3>
                <p class="lb-jukebox-publish-hint">Drag tapes into categories · Click a tape for Publish, Hide, Archive or Delete.</p>
                <div class="lb-jukebox-publish-toolbar">
                    <button type="button" class="lb-jukebox-upload-btn is-secondary" data-act="add-cat"><i class="fas fa-folder-plus"></i> Add Category</button>
                </div>
                <div class="lb-jukebox-publish-zones"></div>
                <div class="lb-jukebox-publish-footer"><button type="button" class="lb-jukebox-upload-btn is-secondary" data-act="close">Close</button></div>
            </div>
        </div>`);
        $('body').append(modal);
        renderZones(modal);
        modal.find('[data-act="close"]').on('click', () => { modal.remove(); setMenuMinimized(false); });
        modal.on('click', function(e) { if (e.target === this) { modal.remove(); setMenuMinimized(false); } });
        modal.find('[data-act="add-cat"]').on('click', function() {
            new Dialog({
                title: 'New Category',
                content: `<div class="lb-ed" style="padding:8px;"><label style="display:block;margin-bottom:8px;color:#ddd;font-size:12px;">Category name</label><input type="text" id="lb-juke-new-cat-name" maxlength="32" placeholder="Category name" style="width:100%;box-sizing:border-box;height:38px;padding:0 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(0,0,0,0.35);color:#eee;"></div>`,
                buttons: {
                    add: { icon: '<i class="fas fa-folder-plus"></i>', label: 'Add', callback: (dHtml) => {
                        let name = (dHtml.find('#lb-juke-new-cat-name').val() || '').trim();
                        if (!name) return false;
                        store.jukeboxCategories.push(lbJukeboxNormalizeCategory({ id: foundry.utils.randomID(), name, createdAt: Date.now() }));
                        persistTapes();
                        categories = lbJukeboxEnsureCategories(store);
                        renderZones(modal);
                    }},
                    cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' }
                },
                default: 'add'
            }, { classes: ['dialog', 'lb-modern-dialog'], width: 360, zIndex: 1000015 }).render(true);
        });
    }

    function openBatchUploadModal(entries, onDone, onCancel) {
        setMenuMinimized(true);
        let draft = entries.map(e => Object.assign({ id: foundry.utils.randomID(), name: 'Untitled', audioPath: '', coverData: null, file: null }, e));
        let uiMin = { onMinimize: () => setMenuMinimized(true), onRestore: () => setMenuMinimized(false) };

        function renderBatchList(modalEl) {
            let list = modalEl.find('.lb-jukebox-batch-list');
            if (!draft.length) {
                list.html('<p style="color:#888;text-align:center;padding:20px;">No tracks remaining.</p>');
                return;
            }
            list.html(draft.map((t, i) => {
                let coverHtml = t.coverData ? `<img src="${t.coverData}" alt="">` : '<i class="fas fa-image"></i>';
                return `<div class="lb-jukebox-batch-item" data-idx="${i}">
                    <input type="text" class="lb-juke-batch-name" value="${(t.name || '').replace(/"/g, '&quot;')}" maxlength="48" placeholder="Track name">
                    <button type="button" class="lb-jukebox-batch-cover-btn" data-idx="${i}" title="Upload cover">${coverHtml}</button>
                    <button type="button" class="lb-jukebox-batch-delete" data-idx="${i}"><i class="fas fa-trash"></i> Delete</button>
                </div>`;
            }).join(''));
            list.find('.lb-juke-batch-name').off('input.jukebox').on('input.jukebox', function() {
                let idx = parseInt($(this).closest('.lb-jukebox-batch-item').data('idx'), 10);
                if (!isNaN(idx) && draft[idx]) draft[idx].name = this.value;
            });
            list.find('.lb-jukebox-batch-cover-btn').off('click.jukebox').on('click.jukebox', function(e) {
                e.stopPropagation();
                let idx = parseInt(this.dataset.idx, 10);
                if (isNaN(idx) || !draft[idx]) return;
                setMenuMinimized(true);
                let imgPicked = false;
                let fpImg = openJukeboxFilePicker({
                    type: 'image',
                    anchorEl: panel[0],
                    callback: (path) => {
                        imgPicked = true;
                        lbJukeboxOpenCoverEditor(path, (dataUrl) => {
                            draft[idx].coverData = dataUrl;
                            renderBatchList(modalEl);
                        }, uiMin);
                    }
                });
                Hooks.once('closeFilePicker', (app) => {
                    if (app !== fpImg || imgPicked) return;
                    setMenuMinimized(true);
                });
            });
            list.find('.lb-jukebox-batch-delete').off('click.jukebox').on('click.jukebox', function(e) {
                e.stopPropagation();
                let idx = parseInt(this.dataset.idx, 10);
                if (!isNaN(idx)) { draft.splice(idx, 1); renderBatchList(modalEl); }
            });
        }

        let modal = $(`<div class="lb-jukebox-batch-overlay">
            <div class="lb-jukebox-batch-modal">
                <h3>Batch Upload</h3>
                <p class="lb-jukebox-batch-hint">${draft.length} track(s) — edit names, add covers, then save all or dismiss.</p>
                <div class="lb-jukebox-batch-list"></div>
                <div class="lb-jukebox-batch-footer">
                    <button type="button" class="lb-jukebox-upload-btn is-secondary" data-act="dismiss">Dismiss All</button>
                    <button type="button" class="lb-jukebox-upload-btn" data-act="save"><i class="fas fa-check"></i> Take All</button>
                </div>
            </div>
        </div>`);
        $('body').append(modal);
        renderBatchList(modal);
        modal.find('[data-act="dismiss"]').on('click', () => {
            modal.remove();
            setMenuMinimized(false);
            if (onCancel) onCancel();
        });
        modal.on('click', function(e) { if (e.target === this) { modal.remove(); setMenuMinimized(false); if (onCancel) onCancel(); } });
        modal.find('[data-act="save"]').on('click', async function() {
            if (!draft.length) { modal.remove(); setMenuMinimized(false); if (onDone) onDone(); return; }
            let btn = $(this);
            btn.prop('disabled', true);
            try {
                await lbRunJukeboxUploadProgress(lbJukeboxUploadProgressCaption(theme.id), async () => {
                    for (let t of draft) {
                        let audioPath = t.audioPath;
                        if (!audioPath && t.file) {
                            try { audioPath = await lbJukeboxPersistAudioFile(t.file); } catch (e) { continue; }
                        }
                        if (!audioPath) continue;
                        await saveNewTape({
                            name: (t.name || '').trim() || 'Untitled Tape',
                            audioPath,
                            coverData: t.coverData
                        }, { publish: false, silent: true });
                    }
                }, overlay);
                modal.remove();
                setMenuMinimized(false);
                if (onDone) onDone();
            } catch (e) {
                btn.prop('disabled', false);
            }
        });
    }

    async function pickAudioForFlow(flow, opts) {
        opts = opts || {};
        setMenuMinimized(true);
        return new Promise(resolve => {
            let picked = false;
            let fp = openJukeboxFilePicker({
                type: 'audio',
                anchorEl: panel[0],
                callback: async (path) => {
                    picked = true;
                    if (!path) { setMenuMinimized(false); resolve(false); return; }
                    flow.audioPath = path;
                    await saveNewTape(flow, opts);
                    setMenuMinimized(false);
                    resolve(true);
                }
            });
            Hooks.once('closeFilePicker', (app) => {
                if (app !== fp || picked) return;
                setMenuMinimized(false);
                resolve(false);
            });
        });
    }

    function openUploadFlow() {
        if (!lbUserHasPerm('uploadTapes')) {
            lbDenyPermission();
            return;
        }
        setMenuMinimized(true);
        let modal = $(`<div class="lb-jukebox-upload-overlay">
            <div class="lb-jukebox-upload-modal lb-jukebox-upload-modal-wide">
                <h3>Upload Tape</h3>
                <label>Sound File</label>
                <div class="lb-jukebox-audio-drop lb-jukebox-upload-audio-drop" id="lb-juke-upload-audio-drop">
                    <i class="fas fa-file-audio" style="font-size:28px;color:rgba(var(--lb-juke-accent-rgb,212,175,55),0.55);"></i>
                    <span style="color:#aaa;font-size:13px;">Drop audio here or click to browse</span>
                </div>
                <label>Tape Name</label>
                <input type="text" id="lb-juke-upload-name" placeholder="My Mixtape" maxlength="48">
                <label>Cover Art (optional)</label>
                <div class="lb-jukebox-upload-cover-drop lb-jukebox-cover-drop" id="lb-juke-cover-drop">
                    <i class="fas fa-image" style="font-size:28px;color:rgba(231,197,74,0.5);"></i>
                    <span style="color:#aaa;font-size:13px;">Drop square cover or click to browse</span>
                </div>
                <p id="lb-juke-upload-hint" style="display:none;color:#e9776f;font-size:12px;margin:8px 0 0;text-align:center;"></p>
                <div class="lb-jukebox-upload-actions">
                    <button type="button" class="lb-jukebox-upload-cancel" data-act="cancel">Cancel</button>
                    <button type="button" class="lb-jukebox-upload-next is-prepare" data-act="prepare"><i class="fas fa-clock"></i> Prepare</button>
                </div>
            </div>
        </div>`);
        $('body').append(modal);
        let flow = { name: '', audioPath: '', audioFile: null, coverData: null };

        function closeUpload() {
            modal.remove();
            setMenuMinimized(false);
        }

        function setCoverPreview(dataUrl) {
            flow.coverData = dataUrl;
            modal.find('#lb-juke-cover-drop').html(`<img src="${dataUrl}" alt=""><span style="position:relative;z-index:1;color:#8a8a94;font-size:12px;">Cover ready — click to replace</span>`);
        }

        function loadCoverFile(file) {
            if (!file || !file.type || !file.type.startsWith('image/')) return;
            let reader = new FileReader();
            reader.onload = () => setCoverPreview(reader.result);
            reader.readAsDataURL(file);
        }

        modal.find('[data-act="cancel"]').on('click', closeUpload);
        modal.on('click', function(e) { if (e.target === this) closeUpload(); });

        async function handleAudioFiles(files) {
            if (!files || !files.length) return;
            let mp3s = files.filter(f => (f.type && f.type.startsWith('audio/')) || /\.(mp3|wav|ogg|m4a|flac)$/i.test(f.name || ''));
            if (!mp3s.length) {
                modal.find('#lb-juke-upload-hint').text('No audio files detected.').show();
                return;
            }
            modal.find('#lb-juke-upload-hint').hide();
            if (mp3s.length > 1) {
                modal.remove();
                openBatchUploadModal(mp3s.map(f => ({
                    name: (f.name || 'Untitled').replace(/\.[^.]+$/, ''),
                    file: f,
                    coverData: null
                })), closeUpload, () => {
                    setMenuMinimized(true);
                    openUploadFlow();
                });
                return;
            }
            flow.audioFile = mp3s[0];
            flow.audioPath = '';
            flow.name = (mp3s[0].name || 'Untitled').replace(/\.[^.]+$/, '');
            modal.find('#lb-juke-upload-name').val(flow.name);
            modal.find('#lb-juke-upload-audio-drop span').text((mp3s[0].name || 'Audio') + ' selected');
        }

        lbAttachAudioDrop(modal.find('#lb-juke-upload-audio-drop')[0], handleAudioFiles);
        modal.find('#lb-juke-upload-audio-drop').on('click.jukebox', function() {
            let input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/*,.mp3,.wav,.ogg,.m4a,.flac';
            input.multiple = true;
            input.onchange = () => { if (input.files && input.files.length) handleAudioFiles(Array.from(input.files)); };
            input.click();
        });

        modal.find('#lb-juke-cover-drop').on('click', function() {
            let input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*,.png,.jpg,.jpeg,.webp';
            input.onchange = () => { if (input.files && input.files[0]) loadCoverFile(input.files[0]); };
            input.click();
        });
        lbAttachImageDrop(modal.find('#lb-juke-cover-drop')[0], (src) => setCoverPreview(src));

        modal.find('[data-act="prepare"]').on('click', async function() {
            let btn = $(this);
            flow.name = (modal.find('#lb-juke-upload-name').val() || '').trim() || 'Untitled Tape';
            if (!flow.audioPath && !flow.audioFile) {
                modal.find('#lb-juke-upload-hint').text('Add a sound file before preparing.').show();
                return;
            }
            btn.prop('disabled', true);
            modal.remove();
            setMenuMinimized(true);
            try {
                if (!flow.audioPath && flow.audioFile) {
                    flow.audioPath = await lbJukeboxPersistAudioFileWithProgress(flow.audioFile, theme.id, overlay);
                }
                await saveNewTape(flow, { publish: false, silent: true });
            } catch (e) {
                openUploadFlow();
                return;
            } finally {
                setMenuMinimized(false);
            }
        });
    }

    html.find('#lb-jukebox-trigger-tab').off('click.jukebox').on('click.jukebox', function() {
        if (!lbUserHasPerm('useJukebox')) { lbDenyPermission(); return; }
        openJukebox();
    });
    triggerTab.off('contextmenu.jukebox').on('contextmenu.jukebox', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleRadioFromTab();
    });
    overlay.find('.lb-jukebox-era-btn').off('click.jukebox').on('click.jukebox', function() {
        if (!this.dataset.era) return;
        let era = lbJukeboxNormalizeEra(this.dataset.era);
        if (era === lbJukeboxNormalizeEra(store.jukeboxEra)) return;
        applyJukeboxEra(era, true);
    });
    overlay.find('.lb-jukebox-device-btn').off('click.jukebox').on('click.jukebox', function() {
        let device = lbJukeboxNormalizeDevice(this.dataset.device);
        if (device === lbJukeboxNormalizeDevice(store.jukeboxDevice)) return;
        applyJukeboxDevice(device, true);
    });
    overlay.find('.lb-jukebox-hideout-view-btn').off('click.jukebox').on('click.jukebox', function() {
        let view = lbJukeboxNormalizeHideoutView(this.dataset.view);
        if (view === lbJukeboxNormalizeHideoutView(store.jukeboxHideoutView)) return;
        applyJukeboxHideoutView(view, true);
    });
    overlay.find('.lb-jukebox-slums-view-btn').off('click.jukebox').on('click.jukebox', function() {
        let view = lbJukeboxNormalizeSlumsView(this.dataset.view);
        if (view === lbJukeboxNormalizeSlumsView(store.jukeboxSlumsView)) return;
        applyJukeboxSlumsView(view, true);
    });
    overlay.find('.lb-jukebox-galactic-view-btn').off('click.jukebox').on('click.jukebox', function() {
        let view = lbJukeboxNormalizeGalacticView(this.dataset.view);
        if (view === lbJukeboxNormalizeGalacticView(store.jukeboxGalacticView)) return;
        applyJukeboxGalacticView(view, true);
    });
    overlay.find('.lb-jukebox-custom-view-btn').off('click.jukebox').on('click.jukebox', function() {
        let view = this.dataset.view || '';
        if (view === (store.jukeboxCustomView || '')) return;
        applyJukeboxCustomView(view, true);
        if (saveStore) saveStore();
    });
    overlay.find('.lb-jukebox-close').off('click.jukebox').on('click.jukebox', closeJukebox);
    overlay.find('#lb-jukebox-notes-toggle').off('click.jukebox').on('click.jukebox', function(e) {
        e.stopPropagation();
        state.notesFxEnabled = !state.notesFxEnabled;
        store.jukeboxNotesFx = state.notesFxEnabled;
        if (saveStore) saveStore();
        syncNotesFxToggle();
        if (!state.notesFxEnabled) stopPlayFx();
        else if (state.open && (state.playing || lbJukeboxRadioIsLive(state, radioAudio, audio))) startPlayFx();
    });
    overlay.find('.lb-jukebox-tab-btn').off('click.jukebox').on('click.jukebox', function() {
        let t = $(this).data('tab');
        state.tab = t;
        overlay.find('.lb-jukebox-tab-btn').removeClass('active');
        $(this).addClass('active');
        overlay.find('.lb-jukebox-pane').removeClass('active');
        overlay.find('.lb-jukebox-pane[data-pane="' + t + '"]').addClass('active');
        updateReceiverDisplay();
    });
    overlay.find('#lb-jukebox-create-radio').off('click.jukebox').on('click.jukebox', () => openCustomRadioBuilder(null));
    overlay.find('#lb-jukebox-custom-cancel').off('click.jukebox').on('click.jukebox', closeCustomRadioBuilder);
    overlay.find('#lb-jukebox-custom-publish').off('click.jukebox').on('click.jukebox', publishCustomRadio);
    let audioDropEl = overlay.find('#lb-jukebox-audio-drop')[0];
    if (audioDropEl) {
        lbAttachAudioDrop(audioDropEl, (files) => addMp3FilesToBuilder(files));
        overlay.find('#lb-jukebox-audio-drop').off('click.jukebox').on('click.jukebox', function() {
            let input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/mpeg,.mp3';
            input.multiple = true;
            input.onchange = () => { if (input.files && input.files.length) addMp3FilesToBuilder(Array.from(input.files)); };
            input.click();
        });
    }
    renderRadioList();
    renderCustomStationEditors();
    overlay.find('#lb-jukebox-radio-volume').off('input.jukebox').on('input.jukebox', function() {
        state.radioVolume = Math.max(0, Math.min(1, parseInt(this.value, 10) / 100));
        radioAudio.volume = state.radioVolume;
        updateVolumeDial(parseInt(this.value, 10));
    });
    radioAudio.volume = state.radioVolume;
    updateVolumeDial(80);
    overlay.find('#lb-jukebox-upload-tape').off('click.jukebox').on('click.jukebox', openUploadFlow);
    if (!lbUserHasPerm('uploadTapes')) overlay.find('#lb-jukebox-upload-tape').hide();
    if (game.user.isGM) overlay.find('#lb-jukebox-publish-tape').off('click.jukebox').on('click.jukebox', openPublishModal);
    overlay.find('.lb-jukebox-carousel-prev').off('click.jukebox').on('click.jukebox', () => navigateCarousel(-1));
    overlay.find('.lb-jukebox-carousel-next').off('click.jukebox').on('click.jukebox', () => navigateCarousel(1));
    bindCarouselScroll();
    overlay.find('.lb-jukebox-ctrl-play').off('click.jukebox').on('click.jukebox', async function() {
        if (state.radioStationId) {
            await resumeRadio();
            return;
        }
        let tapes = getPublishedTapes();
        if (!tapes.length) return;
        if (!audio.src) loadTape(tapes[state.index], false);
        audio.play().then(() => {
            state.playing = true;
            startPlayFx();
            updateReceiverDisplay();
            $(this).addClass('is-active');
            overlay.find('.lb-jukebox-ctrl-pause').removeClass('is-active');
            let tapes = getPublishedTapes();
            if (tapes[state.index]) lbJukeboxEmitForAll(tapes[state.index]);
        }).catch(() => ui.notifications.warn('Could not play audio.'));
    });
    overlay.find('.lb-jukebox-for-all').off('click.jukebox').on('click.jukebox', function() {
        state.forAll = !state.forAll;
        syncForAllBtn();
        ui.notifications.info(state.forAll ? 'Tape playback will be shared with all players.' : 'Tape playback is local only.');
    });
    syncForAllBtn();
    overlay.find('.lb-jukebox-ctrl-pause').off('click.jukebox').on('click.jukebox', function() {
        if (state.radioStationId) {
            pauseRadio(true);
        } else {
            audio.pause();
            state.playing = false;
            stopPlayFx();
        }
        $(this).addClass('is-active');
        overlay.find('.lb-jukebox-ctrl-play').removeClass('is-active');
    });
    overlay.find('.lb-jukebox-ctrl-stop').off('click.jukebox').on('click.jukebox', () => {
        window.lbJukeboxStop();
        updateProgress();
    });
    overlay.find('.lb-jukebox-speed-btn').off('click.jukebox').on('click.jukebox', function() {
        setJukeboxPlaybackRate(parseFloat(this.dataset.rate) || 1);
    });
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('ended', () => {
        if (state.customRadioActive && state.radioStationId) {
            playNextCustomRadioTrack(true);
            return;
        }
        state.playing = false;
        stopPlayFx();
        overlay.find('.lb-jukebox-ctrl-play, .lb-jukebox-ctrl-pause').removeClass('is-active');
    });
    let prog = overlay.find('.lb-jukebox-progress');
    prog.off('mousedown.jukebox touchstart.jukebox').on('mousedown.jukebox touchstart.jukebox', function(e) {
        if (!audio.duration) return;
        state.scrubbing = true;
        prog.addClass('is-scrubbing');
        let rect = this.getBoundingClientRect();
        let clientX = e.touches ? e.touches[0].clientX : e.clientX;
        let ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        audio.currentTime = ratio * audio.duration;
        updateProgress();
    });
    $(document).off('mousemove.jukeboxscrub touchmove.jukeboxscrub').on('mousemove.jukeboxscrub touchmove.jukeboxscrub', function(e) {
        if (!state.scrubbing) return;
        let bar = prog[0];
        if (!bar || !audio.duration) return;
        let rect = bar.getBoundingClientRect();
        let clientX = e.touches ? e.touches[0].clientX : e.clientX;
        let ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        audio.currentTime = ratio * audio.duration;
        updateProgress();
    });
    $(document).off('mouseup.jukeboxscrub touchend.jukeboxscrub').on('mouseup.jukeboxscrub touchend.jukeboxscrub', () => {
        state.scrubbing = false;
        prog.removeClass('is-scrubbing');
    });
    overlay.find('.lb-jukebox-carousel-viewport').off('touchstart.jukebox').on('touchstart.jukebox', function(e) {
        overlay.data('touchX', e.originalEvent.touches[0].clientX);
    }).off('touchend.jukebox').on('touchend.jukebox', function(e) {
        let start = overlay.data('touchX');
        if (start == null) return;
        let dx = e.originalEvent.changedTouches[0].clientX - start;
        overlay.removeData('touchX');
        if (Math.abs(dx) < 40) return;
        navigateCarousel(dx < 0 ? 1 : -1);
    });
    window.lbJukeboxClose = closeJukebox;
    Promise.all([
        lbJukeboxLoadWorldLibrary(store, theme.id),
        lbJukeboxLoadWorldCustomRadios(store, theme.id)
    ]).then(() => {
        renderCarousel(false);
        renderRadioList();
        renderCustomStationEditors();
    });
}

function lbGetThemePreviewBg(id) {
    let t = LB_THEMES.find(x => x.id === id);
    return t ? t.bg : LB_THEMES[0].bg;
}

// Parallax themes (e.g. Galactic) show BOTH back + front layers in thumbnails.
function lbThemePreviewHTML(t, extraStyle) {
    extraStyle = extraStyle || '';
    if (t && t.parallax && t.fg) {
        return `<div style="position:relative;width:100%;height:100%;overflow:hidden;${extraStyle}">
            <img src="${t.bg}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">
            <img src="${t.fg}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">
        </div>`;
    }
    let bg = (t && t.bg) ? t.bg : lbGetThemePreviewBg(t ? t.id : 'noir');
    return `<img src="${bg}" alt="" style="width:100%;height:100%;object-fit:cover;${extraStyle}">`;
}

// Build a small 16:9 reconstruction of a saved board state (live content thumbnail — not generic icons).
function lbBuildThumb(data, themeId, boxW) {
    let store = data && data.items ? data : (data && data.store ? data.store : data);
    themeId = themeId || (store && store.theme) || 'noir';
    let themeObj = LB_THEMES.find(x => x.id === themeId);
    let isClassic = !!(store && store.classic);
    let isCustom = !!(store && store.customBoard);
    let wrap = $(`<div class="lb-open-thumb-inner" style="width:${boxW}px; aspect-ratio:16/9; position:relative; overflow:hidden; border-radius:6px; background:#000;"></div>`);
    let inner = $(`<div style="width:1920px; height:1080px; position:absolute; top:0; left:0; transform-origin:top left; overflow:hidden;"></div>`);
    if (isClassic || isCustom) {
        let bg = store.classicBg || '';
        let fg = store.classicFg || '';
        if (bg) inner.append(`<img src="${bg}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;">`);
        if (fg) inner.append(`<img src="${fg}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;">`);
        if (!bg && !fg) inner.css('background', '#2a2218');
    } else if (themeObj && themeObj.parallax && themeObj.fg) {
        inner.append(`<img src="${themeObj.bg}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;">`);
        inner.append(`<img src="${themeObj.fg}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;">`);
    } else {
        let bgUrl = (themeObj && themeObj.bg) ? themeObj.bg : lbGetThemePreviewBg(themeId);
        inner.append(`<img src="${bgUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;">`);
        if (themeObj && themeObj.fg) inner.append(`<img src="${themeObj.fg}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;">`);
        if (themeObj && themeObj.files) inner.append(`<img src="${themeObj.files}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;opacity:0.95;">`);
    }
    let items = (store && store.items) ? store.items : [];
    items.forEach(it => {
        if (it.stored) return;
        let z = Math.min(9999, Math.max(10, it.z || 100));
        let d = $(`<div style="position:absolute; left:${it.x||0}px; top:${it.y||0}px; width:${it.w||150}px; height:${it.h||150}px; transform:rotate(${it.rot||0}deg); overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.35); z-index:${z};"></div>`);
        if (it.type === 'polaroid' || it.type === 'framed-image' || it.type === 'poster') {
            let src = it.img || it.customImg || it.imgSrc || '';
            if (src) d.append(`<img src="${src}" style="width:100%; height:100%; object-fit:cover; display:block;">`);
            else d.css({ background: 'rgba(250,248,240,0.9)', border: '1px solid #bbb' });
        } else if (it.type === 'actor-file') {
            let src = it.defaultImg || it.realImg || it.img || '';
            let vis = it.visibility || 'open';
            if (vis === 'photo-hidden' || vis === 'full-hidden') src = '';
            d.css({ background: 'rgba(250,248,240,0.95)', border: '1px solid #ccc', borderRadius: '2px' });
            if (src) d.append(`<img src="${src}" style="width:100%; height:72%; object-fit:cover; display:block;">`);
            let nm = (it.name || '???').slice(0, 18);
            d.append(`<div style="height:28%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:#111;">${nm}</div>`);
        } else if (it.type === 'evidence') {
            if (it.evBaked && it.bakedSrc) {
                d.append(`<img src="${it.bakedSrc}" style="width:100%;height:100%;object-fit:fill;display:block;">`);
            } else {
            let postitUrl = LB_POSTIT_URLS[(it.postit || 5) - 1] || LB_POSTIT_DEFAULT;
            let fs = Math.max(8, Math.round((it.fontSize || 22) * 0.35));
            let txt = (it.text || it.richText || '').replace(/<[^>]+>/g, '').slice(0, 40);
            d.css({ background: `url('${postitUrl}') center/100% 100% no-repeat`, border: 'none' })
                .append(`<div style="position:absolute;inset:8%;display:flex;align-items:center;justify-content:center;font-family:${it.font || 'Caveat'};font-size:${fs}px;font-weight:bold;color:${it.color || '#000'};overflow:hidden;text-align:center;line-height:1.1;">${txt}</div>`);
            }
        } else if (it.type === 'noir-newspaper') {
            d.css({ background: '#f4f0e4', border: '1px solid #999' })
                .append(`<div style="padding:4%;font-size:10px;font-weight:bold;text-align:center;color:#111;line-height:1.2;">${(it.title || it.npName || 'News').slice(0, 32)}</div>`);
        } else if (it.type === 'drag-text' || it.type === 'add-paper' || it.type === 'letter') {
            d.css({ background: 'rgba(250,248,240,0.95)', border: '1px solid #ccc' })
                .append(`<div style="padding:6%;font-size:11px;color:#111;overflow:hidden;line-height:1.25;">${String(it.text || it.title || '').replace(/<[^>]+>/g, '').slice(0, 80)}</div>`);
        } else if (it.customImg || it.imgSrc) {
            d.append(`<img src="${it.customImg || it.imgSrc}" style="width:100%;height:100%;object-fit:cover;">`);
        } else {
            d.css({ background: 'rgba(250,248,240,0.92)', border: '1px solid #aaa' });
        }
        inner.append(d);
    });
    if (store && store.drawings && store.drawings.length) {
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" style="position:absolute;inset:0;width:100%;height:100%;z-index:5000;pointer-events:none;">`;
        store.drawings.forEach(dr => {
            if (dr.type === 'path' && dr.d) svg += `<path d="${dr.d}" fill="none" stroke="${dr.color || '#111'}" stroke-width="${dr.width || 3}" opacity="${(dr.opacity != null ? dr.opacity : 100) / 100}"/>`;
        });
        svg += '</svg>';
        inner.append(svg);
    }
    wrap.append(inner);
    setTimeout(() => { let s = wrap.width() / 1920; inner.css('transform', `scale(${s})`); }, 30);
    return wrap;
}

async function lbReadSavedBoards() {
    let out = [];
    try {
        let hidden = lbReadHiddenSnapsRaw();
        if (hidden && Array.isArray(hidden.boards)) {
            hidden.boards.forEach(b => {
                out.push({ id: b.id, name: b.name, theme: b.theme || 'noir', store: b.store || b, savedAt: b.savedAt || 0 });
            });
        }
    } catch (e) {}
    if (!out.length && game.user.isGM) {
        let folder = game.folders.find(f => f.name === LB_SNAP_FOLDER && f.type === "JournalEntry");
        if (folder) {
            folder.contents.forEach(j => {
                try {
                    let raw = j.pages.contents[0].text.content.replace(/(<([^>]+)>)/gi, "");
                    let parsed = JSON.parse(raw);
                    out.push({ id: j.id, journal: j, legacyJournal: true, name: j.name, theme: parsed.theme || 'noir', store: parsed.store || parsed });
                } catch (e) {}
            });
        }
    }
    out.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return out;
}

function lbReadHiddenSnapsRaw() {
    try {
        let data = game.settings.get(LB_MODULE_ID, LB_SETTING_HIDDEN_SNAPS);
        if (data && Array.isArray(data.boards)) return data;
    } catch (e) {}
    try {
        let legacy = game.world?.flags?.[FLAG_SCOPE]?.[LB_SETTING_HIDDEN_SNAPS];
        if (legacy && Array.isArray(legacy.boards)) return legacy;
    } catch (e) {}
    return { boards: [] };
}

async function lbWriteHiddenSnapsRaw(hidden) {
    if (!game.settings.settings.has(`${LB_MODULE_ID}.${LB_SETTING_HIDDEN_SNAPS}`)) {
        try {
            game.settings.register(LB_MODULE_ID, LB_SETTING_HIDDEN_SNAPS, {
                name: 'Loreboard Saved Boards',
                scope: 'world',
                config: false,
                type: Object,
                default: { boards: [] }
            });
        } catch (e) { /* already registered */ }
    }
    await game.settings.set(LB_MODULE_ID, LB_SETTING_HIDDEN_SNAPS, hidden);
}

async function lbSaveHiddenSnap(name, themeId, storeData) {
    let hidden = lbReadHiddenSnapsRaw();
    hidden.boards = hidden.boards || [];
    let entry = { id: foundry.utils.randomID(), name, theme: themeId, store: foundry.utils.deepClone(storeData), savedAt: Date.now() };
    entry.store.savedSnapId = entry.id;
    hidden.boards.push(entry);
    try {
        await lbWriteHiddenSnapsRaw(hidden);
    } catch (e) {
        console.error('lbSaveHiddenSnap', e);
        ui.notifications.error('The board could not be saved to Use Board.');
        throw e;
    }
    return entry;
}

async function lbDeleteHiddenSnap(id) {
    let hidden = lbReadHiddenSnapsRaw();
    hidden.boards = (hidden.boards || []).filter(b => b.id !== id);
    try {
        await lbWriteHiddenSnapsRaw(hidden);
    } catch (e) {
        console.error('lbDeleteHiddenSnap', e);
    }
}

async function lbUpdateHiddenSnap(id, name, themeId, storeData) {
    if (!id) return;
    let hidden = lbReadHiddenSnapsRaw();
    hidden.boards = hidden.boards || [];
    let idx = hidden.boards.findIndex(b => b.id === id);
    if (idx < 0) return;
    let snapStore = foundry.utils.deepClone(storeData || {});
    snapStore.savedSnapId = id;
    hidden.boards[idx] = {
        id: id,
        name: name || hidden.boards[idx].name,
        theme: themeId || hidden.boards[idx].theme,
        store: snapStore,
        savedAt: Date.now()
    };
    try {
        await lbWriteHiddenSnapsRaw(hidden);
    } catch (e) {
        console.error('lbUpdateHiddenSnap', e);
    }
}

function lbConfirmDeleteBoard(boardName) {
    let safeName = String(boardName || 'this board').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return new Promise(function(resolve) {
        let step = 1;
        function ask() {
            let isFinal = step === 2;
            new Dialog({
                title: isFinal ? 'Final Warning — Delete Board' : 'Delete Board?',
                content: isFinal
                    ? `<div class="lb-modal-form" style="line-height:1.55;color:#e9e9ec;">
                        <p style="color:#dc3545;font-weight:700;margin:0 0 10px;">LAST CHANCE — THIS CANNOT BE UNDONE.</p>
                        <p style="margin:0 0 8px;">You are about to permanently erase <strong>"${safeName}"</strong> and every item, thread, drawing, and file stored on it.</p>
                        <p style="margin:0;color:#ffb4b4;">Click <strong>Delete Forever</strong> only if you are absolutely sure.</p>
                    </div>`
                    : `<div class="lb-modal-form" style="line-height:1.55;color:#e9e9ec;">
                        <p style="margin:0 0 8px;">This permanently deletes the board and all saved contents. This cannot be undone.</p>
                        <p style="margin:0;color:#ffb4b4;font-weight:600;">Delete <strong>"${safeName}"</strong> from Use Board?</p>
                    </div>`,
                buttons: {
                    cancel: { label: 'Cancel', callback: function() { resolve(false); } },
                    delete: {
                        label: isFinal ? 'Delete Forever' : 'Continue',
                        icon: '<i class="fas fa-trash"></i>',
                        callback: function() {
                            if (isFinal) resolve(true);
                            else { step = 2; ask(); }
                        }
                    }
                },
                default: 'cancel'
            }, { classes: ['dialog', 'lb-modern-dialog'], width: 460, zIndex: 100004 }).render(true);
        }
        ask();
    });
}

function lbReadHiddenArchiveVersions(boardKey) {
    let data = storageEntity?.getFlag(FLAG_SCOPE, PREFIX + 'hiddenArchives') || {};
    let list = data[boardKey] || [];
    return list.slice().sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

async function lbSaveHiddenArchiveVersion(boardKey, payload) {
    if (!storageEntity) return null;
    let data = storageEntity.getFlag(FLAG_SCOPE, PREFIX + 'hiddenArchives') || {};
    data[boardKey] = data[boardKey] || [];
    let entry = Object.assign({ id: foundry.utils.randomID(), savedAt: Date.now() }, payload);
    data[boardKey].push(entry);
    await storageEntity.setFlag(FLAG_SCOPE, PREFIX + 'hiddenArchives', data).catch(() => {});
    return entry;
}

async function lbDeleteHiddenArchiveVersion(boardKey, entryId) {
    if (!storageEntity) return;
    let data = storageEntity.getFlag(FLAG_SCOPE, PREFIX + 'hiddenArchives') || {};
    data[boardKey] = (data[boardKey] || []).filter(v => v.id !== entryId);
    await storageEntity.setFlag(FLAG_SCOPE, PREFIX + 'hiddenArchives', data).catch(() => {});
}

/** Stable archive key — scopes save/load states to the currently open board only. */
function lbBoardArchiveKey(store, themeId, sceneId) {
    store = store || {};
    sceneId = sceneId || storageEntity?.id || 'local';
    let theme = themeId || store.theme || 'noir';
    let name = String(store.boardName || '').trim();
    let preset = store.boardPresetId || '';
    let classicId = store.classicBoardId || (store.classic ? 'classic' : '');
    let customId = store.customBoardId || '';
    return [sceneId, theme, name, preset, classicId, customId].join('::');
}

function lbArchiveEntryMatchesBoard(entry, store, themeId) {
    if (!entry || !store) return false;
    let es = entry.store || entry;
    if ((entry.theme || es.theme) && themeId && entry.theme !== themeId && es.theme !== themeId) return false;
    if (store.boardName && es.boardName && store.boardName !== es.boardName) return false;
    if (store.boardPresetId && es.boardPresetId && store.boardPresetId !== es.boardPresetId) return false;
    if (store.classicBoardId && es.classicBoardId && store.classicBoardId !== es.classicBoardId) return false;
    return true;
}

function lbJournalSelectHTML(selectedId, inputId) {
    inputId = inputId || 'sec-journal';
    let journals = (game.journal?.contents || game.journal || []).filter(j => j && !j.folder?.name?.includes?.('Loreboard Config'));
    let opts = journals.map(j => `<option value="${j.id}" ${selectedId === j.id ? 'selected' : ''}>${String(j.name || j.id).replace(/</g, '&lt;')}</option>`).join('');
    return `<label class="theme-heading">Journal:</label>
        <select id="${inputId}-pick" class="lb-sec-journal-pick" style="width:100%;margin-bottom:6px;">
            <option value="">— Choose journal —</option>${opts}
        </select>
        <label class="theme-heading" style="font-size:10px;">Journal-ID (manuell):</label>
        <input type="text" id="${inputId}" value="${selectedId || ''}" placeholder="JournalEntry.xyz123...">`;
}

async function lbEvidenceBakeItemAsync(item, htmlContent) {
    if (!item) return item;
    const FIXED = { textXPct: 10, textYPct: 12, textWPct: 80, textHPct: 76 };
    Object.assign(item, FIXED);
    item.attachType = 'none';
    item.evBaked = true;
    let iw = Math.round(item.originalW || item.w || 180);
    let ih = Math.round(item.originalH || item.h || 180);
    let dpr = Math.max(2, Math.min(3, window.devicePixelRatio || 2));
    let postitUrl = LB_POSTIT_URLS[(item.postit || 5) - 1] || LB_POSTIT_DEFAULT;
    let wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:-99999px;top:0;pointer-events:none;opacity:0;';
    wrap.innerHTML = lbEvidenceTagInnerHTML(Object.assign({}, item, FIXED), htmlContent, 'board');
    document.body.appendChild(wrap);
    try {
        let canvas = document.createElement('canvas');
        canvas.width = Math.round(iw * dpr);
        canvas.height = Math.round(ih * dpr);
        let ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        await new Promise((resolve, reject) => {
            let bg = new Image();
            bg.crossOrigin = 'anonymous';
            bg.onload = () => {
                let evHue = item.evHue !== undefined ? item.evHue : 0;
                let evSat = item.evSat !== undefined ? item.evSat : 100;
                let evCont = item.evCont !== undefined ? item.evCont : 100;
                ctx.filter = `hue-rotate(${evHue}deg) saturate(${evSat}%) contrast(${evCont}%)`;
                ctx.drawImage(bg, 0, 0, iw, ih);
                ctx.filter = 'none';
                if (item.evColor) {
                    ctx.globalCompositeOperation = 'multiply';
                    ctx.fillStyle = item.evColor;
                    ctx.globalAlpha = (item.evOpacity !== undefined ? item.evOpacity : 100) / 100;
                    ctx.fillRect(0, 0, iw, ih);
                    ctx.globalAlpha = 1;
                    ctx.globalCompositeOperation = 'source-over';
                }
                let textPlain = String(item.text || '').replace(/<[^>]+>/g, '') || '01';
                let fs = lbEvidenceScaledFontSize(item, item.fontSize || 22);
                ctx.fillStyle = item.color || '#000';
                ctx.font = `bold ${fs}px ${item.font || 'Caveat'}, cursive`;
                ctx.textAlign = item.textCenter ? 'center' : 'left';
                ctx.textBaseline = 'middle';
                let tx = iw * (FIXED.textXPct / 100) + (item.textCenter ? iw * FIXED.textWPct / 200 : 4);
                let ty = ih * (FIXED.textYPct / 100) + ih * FIXED.textHPct / 200;
                let maxW = iw * FIXED.textWPct / 100 - 8;
                let lines = textPlain.split(/\n/);
                let lineH = fs * 1.15;
                let startY = ty - ((lines.length - 1) * lineH) / 2;
                lines.forEach((line, i) => {
                    if (item.textCenter) ctx.fillText(line, tx, startY + i * lineH, maxW);
                    else ctx.fillText(line, tx, startY + i * lineH);
                });
                item.bakedSrc = canvas.toDataURL('image/png');
                resolve();
            };
            bg.onerror = reject;
            bg.src = postitUrl;
        });
    } catch (e) {
        item.evBaked = false;
    } finally {
        wrap.remove();
    }
    return item;
}

function lbTypewriterText(el, finalText, msPerChar, onDone) {
    // Even without a target element the completion callback MUST fire — reveal
    // cinematics rely on it to stop sounds, remove the fullscreen blocker and
    // clear the busy flag that gates board sync.
    if (!el || finalText == null) { if (onDone) onDone(); return; }
    finalText = String(finalText);
    let i = 0;
    el.textContent = '';
    let tick = () => {
        if (i >= finalText.length) { if (onDone) onDone(); return; }
        el.textContent += finalText.charAt(i++);
        setTimeout(tick, msPerChar || 55);
    };
    tick();
}

function lbConfirmBoardLoadDialog(title, itemName, previewFn) {
    return new Promise(resolve => {
        new Dialog({
            title: title || 'Load board?',
            content: `<div class="lb-modal-form"><p class="theme-heading" style="text-align:center;margin:0 0 10px 0;">Load <b>${String(itemName || 'Selection').replace(/</g, '&lt;')}</b> — the current state will be overwritten unless you save first.</p><div id="lb-load-confirm-preview" style="width:240px;margin:0 auto;"></div></div>`,
            buttons: {
                load: { label: '<i class="fas fa-download"></i> Load', callback: () => resolve('load') },
                saveLoad: { label: '<i class="fas fa-save"></i> Save & Load', callback: () => resolve('saveLoad') },
                cancel: { label: 'Cancel', callback: () => resolve('cancel') }
            },
            render: (h) => { if (previewFn) previewFn(h.find('#lb-load-confirm-preview')); }
        }, { classes: ['dialog', 'lb-modern-dialog'], width: 440, zIndex: 100004 }).render(true);
    });
}

async function lbActivateBoard(themeId, store, boardName, opts) {
    opts = opts || {};
    lbEyeDismissForBoard();
    $('#lb-start-overlay').remove();
    $('#lb-create-overlay').remove();
    let themeObj = LB_THEMES.find(t => t.id === themeId) || LB_THEMES[0];
    if (!store.permissions) store.permissions = null;
    store.theme = themeId;
    if (boardName) store.boardName = boardName;
    if (opts.savedSnapId) store.savedSnapId = opts.savedSnapId;
    if (store.revision == null) store.revision = 0;
    let isClassic = opts.classic === true || (opts.classic !== false && lbIsClassicBoardStore(store));
    if (!isClassic) lbClearClassicBoardFields(store);
    else store.classic = true;
    let scene = lbActiveScene();
    if (game.user.isGM) {
        store.gmBoardPreloaded = true;
        store.revision = Math.max(store.revision || 0, 0);
        if (store.revision === 0 && (store.items?.length || store.boardName)) store.revision = 1;
        if (scene) {
            await scene.setFlag(FLAG_SCOPE, PREFIX + "data", store);
        } else {
            ui.notifications.warn('No active scene — the board opens locally; scene sync follows on the next scene change.');
        }
        window.lbGmBoardLive = true;
        let syncPayload = lbSerializeBoardSyncState(store, { includePlayerRoles: true });
        try {
            game.socket.emit('module.loreboard', {
                type: 'lbBoardActivated',
                payload: syncPayload,
                revision: store.revision || 0,
                userId: game.user.id,
                sceneId: canvas.scene?.id || scene?.id
            });
            lbEmitGmBoardStatus(true, syncPayload);
        } catch (e) {}
    }
    lbRefreshFloatingStartButtonVisibility();
    lbInitBoardFromStoreData(store);
}

async function lbOpenSceneBoard() {
    if (!lbActiveScene()) { ui.notifications.error('No active scene.'); return; }
    if (document.getElementById('lb-app-root')) return;
    let data = lbResolveBoardStoreData();
    if (!data) {
        if (game.user.isGM) lbStartupMenu();
        else ui.notifications.warn(LB_GM_BOARD_MSG);
        return;
    }
    lbInitBoardFromStoreData(data);
}
window.lbOpenSceneBoard = lbOpenSceneBoard;

async function lbCreateClassicBoard(classic, boardName) {
    let name = (boardName || classic.name || 'New Board').trim();
    let emptyStore = { items: [], threads: [], drawings: [], permissions: null, boardName: name, theme: 'noir', classic: true, classicBg: classic.bg, classicBgFit: classic.bgFit || null, classicFg: classic.fg || (classic.customBoard ? LB_CUSTOM_BOARD_DEFAULT_FG_URL : ''), classicBoardId: classic.id, customBoard: !!classic.customBoard, jukeboxCustomView: classic.customBoard ? LB_CUSTOM_BOARD_DEFAULT_FG_VIEW : undefined };
    let entry = await lbSaveHiddenSnap(name, 'noir', emptyStore);
    emptyStore.savedSnapId = entry.id;
    await lbActivateBoard('noir', emptyStore, name, { classic: true, savedSnapId: entry.id });
}

function lbPromptBoardName(defaultName) {
    return new Promise((resolve) => {
        let safeDefault = String(defaultName || 'New Board').replace(/"/g, '&quot;');
        let settled = false;
        let finish = (val) => {
            if (settled) return;
            settled = true;
            resolve(val);
        };
        new Dialog({
            title: 'Board Name',
            content: `<div class="lb-modal-form"><label class="theme-heading">Give your board a name:</label><input type="text" id="lb-new-board-name" value="${safeDefault}" style="width:100%;" autocomplete="off" spellcheck="false"></div>`,
            buttons: {
                create: {
                    icon: '<i class="fas fa-folder-plus"></i>',
                    label: 'Create & Open',
                    callback: () => {
                        let inp = document.getElementById('lb-new-board-name');
                        finish(String((inp && inp.value) || defaultName || 'New Board').trim());
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: 'Cancel',
                    callback: () => finish(null)
                }
            },
            default: 'create',
            close: () => finish(null),
            render: (html) => {
                let inp = html.find('#lb-new-board-name');
                if (inp.length) setTimeout(() => { inp.focus(); inp.select(); }, 40);
            }
        }, { classes: ['dialog', 'lb-modern-dialog'], width: 420, zIndex: 1000010 }).render(true);
    });
}

async function lbRunCreateBoardFromMenu(cat, classicEntry, themeObj, presetId, customClassic, defaultName) {
    let name = await lbPromptBoardName(defaultName);
    if (!name) return false;
    try {
        if (cat === 'classic' && classicEntry) {
            await lbCreateClassicBoard(classicEntry, name);
        } else if (cat === 'immersive' && themeObj) {
            await lbCreateThemeBoard(themeObj, presetId, name);
        } else if (customClassic) {
            await lbCreateClassicBoard(customClassic, name);
        } else {
            ui.notifications.warn('The board type could not be determined.');
            return false;
        }
        return true;
    } catch (e) {
        console.error('lbRunCreateBoardFromMenu', e);
        ui.notifications.error('The board could not be created.');
        return false;
    }
}

// ---------------------------------------------------------------------------
// Persistent OS config (custom boards + published roster) stored in a journal.
// ---------------------------------------------------------------------------
async function lbGetConfigJournal(create) {
    let j = game.journal.getName("Loreboard Config");
    if (!j && create) {
        let folder = game.folders.find(f => f.name === LB_SNAP_FOLDER && f.type === "JournalEntry") || await Folder.create({ name: LB_SNAP_FOLDER, type: "JournalEntry" });
        j = await JournalEntry.create({ name: "Loreboard Config", folder: folder.id, pages: [{ name: "Data", type: "text", text: { content: JSON.stringify({ customBoards: [] }) } }] });
    }
    return j;
}
function lbParseConfig(j) {
    if (!j) return { customBoards: [], stamps: [], tweakPresets: [] };
    try {
        let raw = j.pages.contents[0].text.content.replace(/(<([^>]+)>)/gi, "");
        let c = JSON.parse(raw);
        c.customBoards = c.customBoards || [];
        c.stamps = c.stamps || [];
        c.tweakPresets = c.tweakPresets || [];
        c.jukeboxLibrary = c.jukeboxLibrary || {};
        c.blueprints = Array.isArray(c.blueprints) ? c.blueprints : [];
        return c;
    } catch (e) { return { customBoards: [], stamps: [], tweakPresets: [], jukeboxLibrary: {}, blueprints: [] }; }
}
async function lbReadConfig() { return lbParseConfig(await lbGetConfigJournal(false)); }
async function lbWriteConfig(cfg) {
    let j = await lbGetConfigJournal(true);
    await j.pages.contents[0].update({ "text.content": JSON.stringify(cfg) });
}

// ---------------------------------------------------------------------------
// GLOBAL BLUEPRINT LIBRARY — blueprints saved in the Blueprint Designer live in
// the world config journal, so they survive reloads and load on ANY board.
// window.lbGlobalBlueprints is the synchronous cache used by lbGetAllBlueprints.
// ---------------------------------------------------------------------------
async function lbRefreshGlobalBlueprints() {
    try {
        let cfg = await lbReadConfig();
        window.lbGlobalBlueprints = cfg.blueprints || [];
    } catch (e) {
        window.lbGlobalBlueprints = window.lbGlobalBlueprints || [];
    }
    return window.lbGlobalBlueprints;
}
async function lbPersistGlobalBlueprint(bp) {
    if (!bp || !bp.id) return;
    try {
        let cfg = await lbReadConfig();
        cfg.blueprints = cfg.blueprints || [];
        let i = cfg.blueprints.findIndex(b => b && b.id === bp.id);
        if (i >= 0) cfg.blueprints[i] = bp; else cfg.blueprints.push(bp);
        await lbWriteConfig(cfg);
        window.lbGlobalBlueprints = cfg.blueprints;
    } catch (e) { /* players without journal rights keep the per-board copy */ }
}
async function lbRemoveGlobalBlueprint(id) {
    if (!id) return;
    try {
        let cfg = await lbReadConfig();
        cfg.blueprints = (cfg.blueprints || []).filter(b => b && b.id !== id);
        await lbWriteConfig(cfg);
        window.lbGlobalBlueprints = cfg.blueprints;
    } catch (e) {}
}
window.lbRefreshGlobalBlueprints = lbRefreshGlobalBlueprints;
window.lbPersistGlobalBlueprint = lbPersistGlobalBlueprint;
window.lbRemoveGlobalBlueprint = lbRemoveGlobalBlueprint;

// ---------------------------------------------------------------------------
// Foundry Scene Controls — Loreboard category (below Lighting)
// ---------------------------------------------------------------------------

function lbEnsureSceneControlCSS() { /* styles loaded via module.json */ }

function lbBuildLoreboardSceneControlTools() {
    let tools = {
        'loreboard-menu': {
            name: 'loreboard-menu',
            title: 'Loreboard (use floating button)',
            icon: 'fa-solid fa-square',
            button: true,
            onClick: () => true
        }
    };
    if (foundry?.utils?.isNewerVersion && !foundry.utils.isNewerVersion(game.version, '11')) {
        return Object.values(tools);
    }
    return tools;
}

function lbInjectLoreboardSceneControls(controls) {
    if (!Array.isArray(controls)) return;
    if (controls.some(c => c.name === 'loreboard')) return;
    let lightingIdx = controls.findIndex(c => c.name === 'lighting');
    let insertAt = lightingIdx >= 0 ? lightingIdx + 1 : controls.length;
    let lightingOrder = lightingIdx >= 0 ? (controls[lightingIdx].order ?? lightingIdx) : insertAt;
    let loreboardControl = {
        name: 'loreboard',
        title: 'Loreboard OS',
        layer: 'loreboard',
        icon: 'fa-solid fa-square',
        order: lightingOrder + 0.01,
        visible: true,
        tools: lbBuildLoreboardSceneControlTools(),
        activeTool: 'loreboard-menu'
    };
    controls.splice(insertAt, 0, loreboardControl);
}

function lbRefreshSceneControls() {
    lbEnsureSceneControlCSS();
    try {
        if (ui.controls && typeof ui.controls.render === 'function') ui.controls.render(true);
        else if (game.canvas?.controls && typeof game.canvas.controls.render === 'function') game.canvas.controls.render(true);
    } catch (e) {}
}
window.lbRefreshSceneControls = lbRefreshSceneControls;

Hooks.on('getSceneControlButtons', (controls) => {
    lbInjectLoreboardSceneControls(controls);
});

Hooks.on('activateSceneControl', (control, tool, active) => {
    if (control !== 'loreboard' || !active) return;
});

Hooks.on('renderSceneControls', (app, html) => {
    lbEnsureSceneControlCSS();
    html.find('[data-control="loreboard"]').off('click.lbLoreMain');
});
