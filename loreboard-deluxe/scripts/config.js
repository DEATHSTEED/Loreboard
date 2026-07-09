// LOREBOARD - Configuration and constants

const FLAG_SCOPE = "world";
const PREFIX = "myloreboard_v10_";
const LB_MODULE_ID = "loreboard-deluxe";
const LB_SETTING_HIDDEN_SNAPS = PREFIX + "hiddenSnaps";
// Board data is persisted on the active scene. Exposed as a live accessor:
// scripts load before any scene exists, and the active scene changes at runtime.
Object.defineProperty(globalThis, 'storageEntity', {
    configurable: true,
    get() { return globalThis.canvas?.scene || null; }
});
function lbActiveScene() {
    return globalThis.canvas?.scene || null;
}
// Fallback only — module.json is the source of truth once the game is ready.
const LB_VERSION = "1.0.0";
function lbModuleVersion() {
    return globalThis.game?.modules?.get?.(LB_MODULE_ID)?.version || LB_VERSION;
}

// ---------------------------------------------------------------------------
// EDITIONS — Lite and Deluxe are built from this one codebase. The active
// edition is stamped into module.json (flags.loreboard.edition) by
// tools/build-editions.mjs; Deluxe-only behaviour must go through
// lbHasFeature() so Lite never needs a code fork.
// ---------------------------------------------------------------------------
const LB_DELUXE_FEATURES = ["themed-boards", "jukebox", "premium-boards"];
function lbEdition() {
    let mod = globalThis.game?.modules?.get?.(LB_MODULE_ID);
    let flags = mod?.flags || {};
    return flags[LB_MODULE_ID]?.edition || flags.edition || "deluxe";
}
function lbHasFeature(feature) {
    return lbEdition() === "deluxe" || !LB_DELUXE_FEATURES.includes(feature);
}
window.lbEdition = lbEdition;
window.lbHasFeature = lbHasFeature;

/** Debounced callback — prefers Foundry's util, falls back to a local timer. */
function debounce(fn, wait) {
    if (typeof foundry !== 'undefined' && foundry.utils?.debounce) return foundry.utils.debounce(fn, wait);
    let t;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

const LB_SNAP_FOLDER = "Loreboard Snaps";
const DISCORD_URL = "";
const PATREON_URL = "";
const LB_ASSET_BASE = "modules/loreboard-deluxe/assets/graphics";
const LB_SOUND_BASE = "modules/loreboard-deluxe/assets/sounds";
const LB_ASSET = LB_ASSET_BASE + "/";
const LB_GALAXY_THUMB = LB_ASSET_BASE + "/Galaxythumb.webp";
const LB_GALAXY_BACK = LB_ASSET_BASE + "/GalaxyBack.webp";
const LB_PIN_URLS = [1, 2, 3].map(n => LB_ASSET_BASE + "/Pin" + n + ".webp");
const LB_MAGNET_URLS = [LB_ASSET_BASE + "/Magnet.webp", LB_ASSET_BASE + "/Magnet1.webp", LB_ASSET_BASE + "/Magnet2.webp"];
const LB_NAIL_URLS = [1, 2, 3, 4, 5, 6, 7].map(n => LB_ASSET_BASE + "/Nail" + n + ".webp");
const LB_OFFICE_PIN_URLS = [1, 2, 3].map(n => LB_ASSET_BASE + "/OfficePin" + n + ".webp");
const LB_METAL_PIN_URLS = [1, 2, 3].map(n => LB_ASSET_BASE + "/MetalPin" + n + ".webp");
const LB_OFFICE_MAGNET_URLS = [1, 2, 3].map(n => LB_ASSET_BASE + "/OfficeMagnet" + n + ".webp");
const LB_HEAVY_MAGNET_URLS = [1, 2, 3].map(n => LB_ASSET_BASE + "/HeavyMagnet" + n + ".webp");
const LB_TAPE_DESIGNS = {
    painter: { prefix: 'Paintertape', label: 'Painter Tape' },
    transparent: { prefix: 'Transparenttape', label: 'Transparent Tape' },
    heavy: { prefix: 'Heavytape', label: 'Heavy Tape' },
    structure: { prefix: 'Structuretape', label: 'Structure Tape' }
};
const LB_FASTENER_SETS = {
    officePin: LB_OFFICE_PIN_URLS,
    metalPin: LB_METAL_PIN_URLS,
    officeMagnet: LB_OFFICE_MAGNET_URLS,
    heavyMagnet: LB_HEAVY_MAGNET_URLS,
    nail: LB_NAIL_URLS,
    pin: LB_PIN_URLS,
    magnet: LB_MAGNET_URLS
};
const LB_BOARD_FASTENER_CONFIG = {
    corkboard:       { tapeDesign: 'structure',  fastenerSet: 'officePin',   defaultVariant: 2, allowedKinds: ['pin'],    allowTape: true,  maxVariants: 3 },
    whiteboard:      { tapeDesign: 'transparent', fastenerSet: 'officeMagnet', defaultVariant: 2, allowedKinds: ['magnet'], allowTape: true,  maxVariants: 3 },
    'metal-board':   { tapeDesign: 'heavy',       fastenerSet: 'heavyMagnet',  defaultVariant: 2, allowedKinds: ['magnet'], allowTape: true,  maxVariants: 3 },
    'the-board':     { tapeDesign: 'transparent', fastenerSet: 'officeMagnet', defaultVariant: 1, allowedKinds: ['magnet'], allowTape: true,  maxVariants: 3 },
    'wooden-board':  { tapeDesign: 'structure', fastenerSet: 'nail', defaultVariant: 1, allowedKinds: ['nail'], allowTape: true, maxVariants: 7 },
    noir:            { tapeDesign: 'painter',     fastenerSet: 'officePin',   defaultVariant: 1, allowedKinds: ['pin'],    allowTape: true,  maxVariants: 3 },
    cosytavern:      { tapeDesign: 'painter', fastenerSet: 'nail', defaultVariant: 1, allowedKinds: ['nail'], allowTape: true, maxVariants: 7 },
    slums:           { tapeDesign: 'structure',  fastenerSet: 'metalPin',    defaultVariant: 2, allowedKinds: ['pin'],    allowTape: true,  maxVariants: 3 },
    modern:          { tapeDesign: 'transparent', fastenerSet: 'officeMagnet', defaultVariant: 2, allowedKinds: ['magnet'], allowTape: true,  maxVariants: 3 },
    galactic:        { tapeDesign: 'structure',  fastenerSet: 'heavyMagnet',  defaultVariant: 1, allowedKinds: ['magnet'], allowTape: true,  maxVariants: 3 },
    shadowpunk:      { tapeDesign: 'structure',  fastenerSet: 'officeMagnet', defaultVariant: 3, allowedKinds: ['magnet'], allowTape: true,  maxVariants: 3 }
};
const LB_PIN_IMG = LB_PIN_URLS[0];
const LB_CLASSIC_FASTENER = { corkboard: 'pin', whiteboard: 'magnet', 'metal-board': 'magnet', 'wooden-board': 'nail', 'the-board': 'magnet' };
const LB_NEUTRAL_BOARD_THUMB = LB_ASSET_BASE + "/neutralboardthumb.webp";
const LB_NEUTRAL_BOARD_BG = LB_ASSET_BASE + "/neutralboard.webp";
const LB_THEME_FASTENER = { noir: 'pin', slums: 'pin', cosytavern: 'nail', shadowpunk: 'magnet', modern: 'magnet', galactic: 'magnet' };
const LB_FASTENER_LABELS = { pin: 'Pin', magnet: 'Magnet', nail: 'Nail', tape: 'Tape' };
const LB_FASTENER_ICONS = { pin: 'fa-thumbtack', magnet: 'fa-magnet', nail: 'fa-hammer', tape: 'fa-tape' };
const LB_FADEN_IMG = LB_ASSET_BASE + "/Faden.webp";   // #21 thread texture
const LB_DRAW_MASKS = [
    LB_ASSET_BASE + "/Mask.webp",
    "modules/loreboard-deluxe/assets/graphics/Mask2.png",
    "modules/loreboard-deluxe/assets/graphics/Mask3.png"
];
const LB_DRAWN_MASK = LB_DRAW_MASKS[0];
function lbDrawMaskUrl(styleOrIdx) {
    if (styleOrIdx === 'drawn' || styleOrIdx === 'draw1' || styleOrIdx === 0 || styleOrIdx === '0') return LB_DRAW_MASKS[0];
    if (styleOrIdx === 'draw2' || styleOrIdx === 1 || styleOrIdx === '1') return LB_DRAW_MASKS[1];
    if (styleOrIdx === 'draw3' || styleOrIdx === 2 || styleOrIdx === '2') return LB_DRAW_MASKS[2];
    let n = parseInt(styleOrIdx, 10);
    if (!isNaN(n) && n >= 1 && n <= 3) return LB_DRAW_MASKS[n - 1];
    return LB_DRAW_MASKS[0];
}
function lbIsDrawFrameStyle(style) {
    return style === 'drawn' || style === 'draw1' || style === 'draw2' || style === 'draw3';
}
function lbDrawFrameSelectOptions(selected) {
    selected = selected || 'draw1';
    if (selected === 'drawn') selected = 'draw1';
    return [
        { v: 'draw1', l: 'Draw 1' },
        { v: 'draw2', l: 'Draw 2' },
        { v: 'draw3', l: 'Draw 3' }
    ].map(o => `<option value="${o.v}" ${selected === o.v ? 'selected' : ''}>${o.l}</option>`).join('');
}
function lbDrawMaskLabel(val) {
    if (val === 'draw2') return 'Draw 2';
    if (val === 'draw3') return 'Draw 3';
    return 'Draw 1';
}
function lbDrawMaskPickerHTML(selected, pickerId) {
    selected = selected || 'draw1';
    if (selected === 'drawn') selected = 'draw1';
    let opts = lbDrawFrameSelectOptions(selected);
    let rows = [
        { v: 'draw1', l: 'Draw 1' },
        { v: 'draw2', l: 'Draw 2' },
        { v: 'draw3', l: 'Draw 3' }
    ].map(o => `<div class="lb-paper-embed-row${selected === o.v ? ' lb-pd-active' : ''}" data-val="${o.v}">${o.l}</div>`).join('');
    return `<div class="lb-paper-embed lb-paper-embed-inline" id="${pickerId}-embed" data-picker-id="${pickerId}">
        <button type="button" class="lb-paper-embed-trigger" id="${pickerId}-trigger" aria-haspopup="listbox" aria-expanded="false">
            <span class="lb-paper-embed-label">${lbDrawMaskLabel(selected)}</span><i class="fas fa-chevron-down"></i>
        </button>
        <div class="lb-paper-embed-panel lb-af-float-panel" id="${pickerId}-panel" hidden role="listbox">
            <div class="lb-paper-embed-list">${rows}</div>
        </div>
        <select id="${pickerId}" class="lb-paper-select" data-picker-kind="draw" data-selected="${selected}" style="display:none !important;">${opts}</select>
    </div>`;
}
function lbPositionEmbedPanelFixed(trigger, panel) {
    if (!trigger || !panel) return;
    let r = trigger.getBoundingClientRect();
    panel.style.position = 'fixed';
    panel.style.left = Math.max(8, r.left) + 'px';
    panel.style.top = (r.bottom + 4) + 'px';
    panel.style.zIndex = '100000010';
    panel.style.width = Math.max(r.width, 190) + 'px';
    panel.style.maxHeight = 'min(280px, calc(100vh - ' + Math.round(r.bottom + 16) + 'px))';
}
window.lbDrawMaskUrl = lbDrawMaskUrl;
window.lbIsDrawFrameStyle = lbIsDrawFrameStyle;
window.lbDrawFrameSelectOptions = lbDrawFrameSelectOptions;
window.lbDrawMaskLabel = lbDrawMaskLabel;
window.lbDrawMaskPickerHTML = lbDrawMaskPickerHTML;
window.lbPositionEmbedPanelFixed = lbPositionEmbedPanelFixed;
const LB_POSTIT_DEFAULT = LB_ASSET_BASE + "/Postit5.webp";
const LB_PARCHMENT_MASK = LB_ASSET_BASE + "/Paper.webp";
const LB_POSTIT_URLS = [1,2,3,4,5,6].map(n => LB_ASSET_BASE + "/Postit" + n + ".webp");
const LB_SEAL_BASES = [1,2,3,4].map(n => LB_ASSET_BASE + "/Seal" + n + ".webp");   // #15 wax-seal bases (legacy)
const LB_WAX_SEALS = [1,2,3,4,5,6,7,8,9,10].map(n => LB_ASSET_BASE + "/Wax" + n + ".webp");   // wax seal graphics (selectable)
const LB_BLOOD_SPLAT_URLS = [1,2,3,4,5,6,7,8,9,10].map(n => LB_ASSET_BASE + "/Blood%20Splat%20" + n + ".webp");
const LB_INK_SPLAT_URLS = [1,2,3,4,5,6,7,8,9,10].map(n => LB_ASSET_BASE + "/Ink%20Splat%20" + n + ".webp");
const LB_PAPER_COUNT = 21;
const LB_SOUND_START_OFFSETS = { paper: 0.04, paperspin: 0.03, reveal: 0.02 };
const LB_SOUNDS = {
    paper: [1,2,3,4].map(n => LB_SOUND_BASE + "/PaperSheet" + n + ".mp3"),
    paperLift: LB_SOUND_BASE + "/PaperOff.mp3",
    pin: LB_SOUND_BASE + "/Pin.mp3",
    magnet: LB_SOUND_BASE + "/Magnet.mp3",
    nail: LB_SOUND_BASE + "/Nailes.mp3",
    radio: LB_SOUND_BASE + "/Radio.mp3",
    lamp: LB_SOUND_BASE + "/Lamp.mp3",
    uvOn: LB_SOUND_BASE + "/On.mp3",
    magicDetect: LB_SOUND_BASE + "/Magic.mp3",
    paperspin: LB_SOUND_BASE + "/Paperspin.mp3",
    reveal: LB_SOUND_BASE + "/Reveal.mp3",
    draw: LB_SOUND_BASE + "/Draw.mp3",
    print: LB_SOUND_BASE + "/Print.mp3",
    delete: LB_SOUND_BASE + "/Delete.mp3"
};