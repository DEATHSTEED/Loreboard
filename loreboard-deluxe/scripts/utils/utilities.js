'use strict';
// LOREBOARD - Utilities, documents, fonts and language

// ---------------------------------------------------------------------------
// GLOBAL MOUSE INTERACTION MODULE — RMB hold+wheel scale, LMB drag+wheel rotate,
// short RMB tap opens context menus only (no menu while scaling).
// ---------------------------------------------------------------------------
const LB_RMB_HOLD_MS = 220;
const LB_RMB_TAP_MAX_MS = 280;
window.lbSuppressContextMenu = false;
let lbRmbScaleItemId = null;
let lbRmbScaleAttachOnly = false;
let lbAttachLmbRotateId = null;
let lbAttachLmbRotated = false;
let lbRmbHoldActive = false;
let lbRmbHoldTimer = null;
let lbRmbDidWheel = false;
let lbRmbDownAt = 0;
let lbRmbWasHold = false;
let lbAttachRmbLastClick = {};
let lbAttachRmbMenuTimer = null;
const LB_ATTACH_EDGE_INSET = 0.09;
const LB_ATTACH_Y_OFFSET = '-52%';
const LB_TAPE_Y_OFFSET = '-50%';
const LB_ATTACH_TOP_Y = 0.042;
const LB_ATTACH_DEFAULT_Y = Math.max(0, LB_ATTACH_TOP_Y - 0.05);
const LB_TAPE_TOP_Y = 0.048;
const LB_TAPE_Y_LOWER = 0.048;
const LB_TAPE_SIZE_MULT = 4.8;
const LB_GLOBAL_RMB_BACK_MS = 380;
let lbLightRmbItemId = null;
let lbLightRmbHoldTimer = null;
let lbLightRmbHoldActive = false;
let lbLightRmbDidWheel = false;
let lbLightRmbWasHold = false;

function lbShouldBlockContextMenu() {
    return !!(window.lbSuppressContextMenu || lbRmbHoldActive || lbRmbDidWheel || lbRmbWasHold || window.lbPlacingSeal || window.lbPlacingStamp);
}
function lbClearRmbScaleState(suppressMenu) {
    if (lbRmbHoldTimer) { clearTimeout(lbRmbHoldTimer); lbRmbHoldTimer = null; }
    let suppress = suppressMenu || lbRmbWasHold || lbRmbDidWheel;
    lbRmbScaleItemId = null;
    lbRmbScaleAttachOnly = false;
    lbRmbHoldActive = false;
    if (suppress) {
        window.lbSuppressContextMenu = true;
        setTimeout(() => { window.lbSuppressContextMenu = false; lbRmbDidWheel = false; lbRmbWasHold = false; }, 120);
    } else {
        lbRmbDidWheel = false;
        lbRmbWasHold = false;
    }
}
function lbBeginRmbScale(itemId, attachOnly) {
    lbRmbDownAt = Date.now();
    lbRmbDidWheel = false;
    lbRmbWasHold = false;
    lbRmbScaleItemId = itemId;
    lbRmbScaleAttachOnly = !!attachOnly;
    if (lbRmbHoldTimer) clearTimeout(lbRmbHoldTimer);
    lbRmbHoldTimer = setTimeout(() => { lbRmbHoldActive = true; lbRmbWasHold = true; }, LB_RMB_HOLD_MS);
}
function lbScaleAttachment(item, factor) {
    if (!item || !factor) return;
    lbDefaultPinSize(item);
    item.pinScale = Math.max(0.35, Math.min(2.5, (item.pinScale || 1) * factor));
    return 'attach';
}
function lbCycleAttachVariant(item, themeId) {
    if (!item) return false;
    lbEnsureAttachVariant(item, themeId, store);
    let t = item.attachType;
    if (item.type === 'midpin') {
        t = item.attachType || lbDefaultAttachType('midpin', themeId, store);
    }
    if (t === 'tape') {
        item.attachVariant = ((parseInt(item.attachVariant, 10) || 1) % 3) + 1;
        return 'tape';
    }
    if (t !== 'pin' && t !== 'magnet' && t !== 'nail') return false;
    let maxV = lbBoardMaxVariants(store, themeId);
    item.attachVariant = ((parseInt(item.attachVariant, 10) || 1) % maxV) + 1;
    return t;
}
function lbAttachItemIdFromPinEl(el) {
    if (!el) return null;
    let host = el.closest('.lb-item');
    if (host && host.id) return host.id;
    let slot = el.closest('.lb-attach-slot');
    if (slot && slot.dataset.itemId) return slot.dataset.itemId;
    return null;
}
function lbResolveThreadPinTarget(clientX, clientY) {
    let temp = document.getElementById('lb-temp-thread');
    if (temp) temp.style.display = 'none';
    let hit = document.elementFromPoint(clientX, clientY);
    if (temp) temp.style.display = '';
    if (!hit) return null;
    let pinEl = hit.closest('.lb-pin, .lb-pin-wrap, .lb-attach-hit, .lb-pin-img');
    if (!pinEl || pinEl.closest('.lb-tape-wrap, .lb-tape-hit')) return null;
    return lbAttachItemIdFromPinEl(pinEl);
}
function lbAttachRailY(item) {
    if (!item) return LB_ATTACH_EDGE_INSET * 0.8;
    let inset = lbAttachEdgeInset(item);
    let r = Math.round(((((item.rot || 0) % 360) + 360) % 360) / 90) * 90 % 360;
    if (r === 0) return inset;
    if (r === 90) return 0.5;
    if (r === 180) return 1 - inset;
    if (r === 270) return 0.5;
    return inset;
}
function lbClampAttachToRail(item, ax, ay) {
    ax = Math.max(0.04, Math.min(0.96, ax));
    let r = Math.round(((((item.rot || 0) % 360) + 360) % 360) / 90) * 90 % 360;
    if (r === 0 || r === 180) return { ax, ay: lbAttachRailY(item) };
    if (r === 90 || r === 270) return { ax: lbAttachRailY(item), ay: Math.max(0.04, Math.min(0.96, ay)) };
    return { ax, ay: lbAttachRailY(item) };
}
function lbScaleBoardItem(item, el, factor) {
    if (!item || !el || !factor) return;
    if (item.type === 'midpin' || item.type === 'player-pin') {
        item.pinScale = Math.max(0.35, Math.min(2.5, (item.pinScale || 1) * factor));
        return 'pin';
    }
    if (item.type === 'ambient-light') return null;
    let ow = item.originalW || item.w || el.offsetWidth || 100;
    let oh = item.originalH || item.h || el.offsetHeight || 100;
    let aspect = ow / Math.max(oh, 1);
    let nw = Math.max(20, (item.w || ow) * factor);
    let nh = Math.max(20, nw / aspect);
    item.w = nw; item.h = nh;
    if (['drag-text','add-paper','empty-sheet','quest','framed-image','poster','evidence','custom-paper','noir-newspaper','actor-file'].includes(item.type)) {
        /* Baked typography/layout stays fixed — only the outer frame scales as a graphic. */
        if (!item.originalW) item.originalW = ow;
        if (!item.originalH) item.originalH = oh;
    } else {
        if (!item.originalW) item.originalW = ow;
        if (!item.originalH) item.originalH = oh;
    }
    el.style.width = nw + 'px';
    el.style.height = nh + 'px';
    return 'item';
}
window.lbShouldBlockContextMenu = lbShouldBlockContextMenu;

const LB_FONTS = [
    { group: 'Handwritten', fonts: [
        { value: 'Caveat', label: 'Caveat' }, { value: 'Patrick Hand', label: 'Patrick Hand' },
        { value: 'Kalam', label: 'Kalam' }, { value: 'Indie Flower', label: 'Indie Flower' },
        { value: 'Shadows Into Light', label: 'Shadows Into Light' }, { value: 'Gloria Hallelujah', label: 'Gloria Hallelujah' },
        { value: 'Handlee', label: 'Handlee' }, { value: 'Reenie Beanie', label: 'Reenie Beanie' },
        { value: "Architects Daughter", label: "Architect's Daughter" }
    ]},
    { group: 'Detective / Evidence', fonts: [
        { value: 'Special Elite', label: 'Special Elite' }, { value: 'Courier Prime', label: 'Courier Prime' },
        { value: 'Cutive Mono', label: 'Cutive Mono' }
    ]},
    { group: 'Newspaper', fonts: [
        { value: 'Libre Baskerville', label: 'Libre Baskerville' }, { value: 'Merriweather', label: 'Merriweather' },
        { value: 'Crimson Pro', label: 'Crimson Pro' }, { value: 'Times New Roman', label: 'Times New Roman' },
        { value: 'Georgia', label: 'Georgia' }
    ]},
    { group: 'Typewriter', fonts: [
        { value: 'Courier New', label: 'Courier New (Typewriter)' }, { value: 'IBM Plex Mono', label: 'IBM Plex Mono' }
    ]},
    { group: 'Clean', fonts: [
        { value: 'Arial', label: 'Arial' }, { value: 'Pacifico', label: 'Pacifico' }
    ]},
    { group: 'Sci-Fi', fonts: [
        { value: 'Orbitron', label: 'Orbitron' }, { value: 'Audiowide', label: 'Audiowide' },
        { value: 'Exo 2', label: 'Exo 2' }, { value: 'Rajdhani', label: 'Rajdhani' }
    ]},
    { group: 'Cyberpunk', fonts: [
        { value: 'Wallpoet', label: 'Wallpoet' }, { value: 'Syncopate', label: 'Syncopate' },
        { value: 'Iceland', label: 'Iceland' }, { value: 'Major Mono Display', label: 'Major Mono' }
    ]},
    { group: 'Medieval / Fantasy', fonts: [
        { value: 'Uncial Antiqua', label: 'Uncial Antiqua' }, { value: 'MedievalSharp', label: 'MedievalSharp' },
        { value: 'Pirata One', label: 'Pirata One' }, { value: 'Cinzel Decorative', label: 'Cinzel Decorative' }
    ]},
    { group: 'Cryptic / Encrypted', fonts: [
        { value: 'Caesar Dressing', label: 'Cipher Runes' }, { value: 'UnifrakturMaguntia', label: 'Gothic Runes' },
        { value: 'Almendra SC', label: 'Elvish Script' }, { value: 'Metal Mania', label: 'Orcish Glyphs' },
        { value: 'Geostar Fill', label: 'Star Cipher' }, { value: 'Eagle Lake', label: 'Arcane Hand' },
        { value: 'Rubik Glitch', label: 'Glitch Code' }, { value: 'Nosifer', label: 'Shadow Tongue' },
        { value: 'Macondo', label: 'Forgotten Dialect' }, { value: 'New Rocker', label: 'War Rune' }
    ]},
    { group: 'Foreign Fonts', fonts: [
        { value: 'LB Alien', label: 'Alien' },
        { value: 'Anglo-Saxon Runes', label: 'Anglo-Saxon Runes' },
        { value: 'Cirnaja Bookhand', label: 'Cirnaja Bookhand' },
        { value: 'Csenge', label: 'Csenge' },
        { value: 'Drachenklaue', label: 'Drachenklaue' },
        { value: 'Mage Script', label: 'Mage Script' },
        { value: 'Maximal Text', label: 'Maximal Text' },
        { value: 'Mk Runes Light', label: 'Mk Runes Light' },
        { value: 'Modern Cybertronic', label: 'Modern Cybertronic' },
        { value: 'Modern Runes', label: 'Modern Runes' },
        { value: 'Ophidean Runes', label: 'Ophidean Runes' },
        { value: 'Runar', label: 'Runar' },
        { value: 'SGA Smooth', label: 'SGA Smooth' },
        { value: 'Tengwar Optime', label: 'Tengwar Optime' },
        { value: 'Wyverns Soul', label: 'Wyverns Soul' }
    ]}
];
// ---------------------------------------------------------------------------
// Foreign Languages — 45 configurable slots (3 columns × 15 rows)
const LB_FOREIGN_LANG_ROWS = 15;
const LB_FOREIGN_LANG_COLS = 3;
const LB_FOREIGN_LANG_COUNT = LB_FOREIGN_LANG_ROWS;
const LB_FL_CRYPTIC_POOL = (LB_FONTS.find(g => g.group === 'Cryptic / Encrypted') || { fonts: [] }).fonts;
const LB_FOREIGN_LANGUAGES = Array.from({ length: LB_FOREIGN_LANG_COUNT }, (_, i) => {
    let f = LB_FL_CRYPTIC_POOL[i % Math.max(1, LB_FL_CRYPTIC_POOL.length)] || { value: 'Caesar Dressing', label: 'Cipher' };
    return {
        id: 'lang-' + String(i + 1).padStart(2, '0'),
        defaultName: 'Foreign ' + (i + 1),
        font: f.value,
        sample: '◈'
    };
});
window.LB_FOREIGN_LANGUAGES = LB_FOREIGN_LANGUAGES;
const LB_QUILL_CURSOR = "url('" + LB_ASSET + "quill.png'), auto";
function lbInstallForeignFonts() {
    if (typeof registerLoreboardFonts === 'function') registerLoreboardFonts();
}
window.lbInstallForeignFonts = lbInstallForeignFonts;
const LB_MAGIC_INK_SIZES = [8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 72, 84, 96, 120, 144, 180, 216];
// THE single global font registry. Every dropdown in Loreboard is built from this so they stay in sync.
window.LB_FONTS = LB_FONTS;

// ---------------------------------------------------------------------------
// ILanguageDocument / ILanguageCipher — data vs view (MVC split)
// Model: store.languageSkills + item.documentLanguage (persisted in scene flag)
// View:  lbMaybeCipherHtml / lbWrapLanguageCipher (client-side font swap only)
// ---------------------------------------------------------------------------
const LB_LANGUAGE_DOC_TYPES = new Set(['drag-text', 'quest', 'noir-newspaper', 'evidence', 'add-paper', 'letter', 'custom-paper', 'actor-file']);
const LB_FOREIGN_FONT_PREFIX = 'lb-fl:';

function lbIsLanguageDocument(item) {
    return !!(item && LB_LANGUAGE_DOC_TYPES.has(item.type));
}
function lbForeignFontToken(langId) {
    return langId ? (LB_FOREIGN_FONT_PREFIX + langId) : '';
}
function lbParseForeignFontToken(val) {
    if (!val || !String(val).startsWith(LB_FOREIGN_FONT_PREFIX)) return '';
    return String(val).slice(LB_FOREIGN_FONT_PREFIX.length);
}
function lbFontPickerSelectedValue(font, documentLanguage) {
    if (documentLanguage) return lbForeignFontToken(documentLanguage);
    return font || 'Courier New';
}
function lbResolveFontPickerValue(pickerVal, boardStore) {
    boardStore = boardStore || (typeof store !== 'undefined' ? store : null) || window.lbCurrentStore;
    let langId = lbParseForeignFontToken(pickerVal);
    if (langId) {
        return { font: lbGetLanguageFontValue(langId, boardStore), documentLanguage: langId };
    }
    return { font: pickerVal || 'Courier New', documentLanguage: '' };
}
function lbGetLanguageFontValue(langId, boardStore) {
    if (!langId) return '';
    boardStore = boardStore || (typeof store !== 'undefined' ? store : null);
    if (boardStore) lbEnsureLanguageSkills(boardStore);
    let row = boardStore ? (boardStore.languageSkills || []).find(s => s.langId === langId) : null;
    let def = lbGetLanguageDef(langId);
    return (row && row.font) || (def && def.font) || 'Courier New';
}
function lbApplyLanguageFontToInks(inks, langId, boardStore) {
    if (!inks || !langId) return;
    let font = lbGetLanguageFontValue(langId, boardStore);
    if (!font) return;
    inks.forEach(ink => { if (ink && ink.kind !== 'effect') ink.fontFamily = font; });
}
function lbApplyLanguageFontToFace(face, langId, boardStore) {
    if (!face) return;
    face.documentLanguage = langId || '';
    let font = lbGetLanguageFontValue(langId, boardStore);
    if (langId && font) {
        face.font = font;
        lbApplyLanguageFontToInks(face.invisibleInks, langId, boardStore);
    }
    (face.blueprintModules || []).forEach(m => {
        if (m.type === 'text' && langId && font) m.font = font;
    });
}
function lbApplyLanguageFontToBlueprintModules(modules, langId, boardStore) {
    if (!modules || !langId) return;
    let font = lbGetLanguageFontValue(langId, boardStore);
    if (!font) return;
    modules.forEach(m => { if (m.type === 'text') m.font = font; });
}
function lbApplyFontPickerToItem(item, pickerVal, boardStore) {
    if (!item) return;
    let resolved = lbResolveFontPickerValue(pickerVal, boardStore);
    item.font = resolved.font;
    item.documentLanguage = resolved.documentLanguage;
    if (item.type === 'noir-newspaper') item.npFont = resolved.font;
    if (item.type === 'quest') {
        item.titleFont = resolved.font;
        if (item.subtitleFont) item.subtitleFont = resolved.font;
    }
    if (resolved.documentLanguage) {
        lbApplyLanguageFontToInks(item.invisibleInks, resolved.documentLanguage, boardStore);
        lbApplyLanguageFontToBlueprintModules(item.blueprintModules, resolved.documentLanguage, boardStore);
        if (lbIsFlippable(item)) {
            lbEnsureDualFaceItem(item);
            lbApplyLanguageFontToFace(item.faces.front, resolved.documentLanguage, boardStore);
            lbApplyLanguageFontToFace(item.faces.back, resolved.documentLanguage, boardStore);
            lbPersistRootToActiveFace(item);
        }
    }
    return resolved;
}
function lbGmDocLangBadgeHTML(item, boardStore) {
    if (!game.user.isGM || !item || !item.documentLanguage) return '';
    let name = lbGetLanguageDisplayName(item.documentLanguage, boardStore);
    if (!name) return '';
    let safe = String(name).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    return `<div class="lb-gm-doc-lang-badge" title="Document language">${safe}</div>`;
}
function lbGetLanguageDef(langId) {
    return LB_FOREIGN_LANGUAGES.find(l => l.id === langId) || null;
}
function lbEnsureLanguageSkills(boardStore) {
    boardStore = boardStore || (typeof store !== 'undefined' ? store : null);
    if (!boardStore) return [];
    if (!boardStore.languageSkills || !Array.isArray(boardStore.languageSkills) || boardStore.languageSkills.length !== LB_FOREIGN_LANGUAGES.length) {
        let prev = boardStore.languageSkills || [];
        boardStore.languageSkills = LB_FOREIGN_LANGUAGES.map(lang => {
            let existing = prev.find(s => s.langId === lang.id);
            return {
                langId: lang.id,
                customName: (existing && existing.customName) ? String(existing.customName) : '',
                font: (existing && existing.font) ? String(existing.font) : lang.font,
                playerIds: (existing && Array.isArray(existing.playerIds)) ? existing.playerIds.slice() : []
            };
        });
    }
    return boardStore.languageSkills;
}
function lbGetLanguageDisplayName(langId, boardStore) {
    let def = lbGetLanguageDef(langId);
    if (!def) return '';
    boardStore = boardStore || (typeof store !== 'undefined' ? store : null);
    let skill = boardStore ? (boardStore.languageSkills || []).find(s => s.langId === langId) : null;
    let custom = skill && skill.customName && String(skill.customName).trim();
    return custom || def.defaultName || def.id;
}
function lbUserSpeaksLanguage(langId, userId) {
    if (!langId) return true;
    if (game.user.isGM) return true;
    userId = userId || game.user.id;
    let boardStore = typeof store !== 'undefined' ? store : null;
    if (!boardStore) return false;
    lbEnsureLanguageSkills(boardStore);
    let row = boardStore.languageSkills.find(s => s.langId === langId);
    if (!row || !row.playerIds || !row.playerIds.length) return false;
    return row.playerIds.includes(userId);
}
function lbShouldCipherLanguage(langId, userId) {
    return !!(langId && !lbUserSpeaksLanguage(langId, userId));
}
function lbLanguageFontFamily(langId, boardStore) {
    boardStore = boardStore || (typeof store !== 'undefined' ? store : null);
    if (boardStore) lbEnsureLanguageSkills(boardStore);
    let row = boardStore ? (boardStore.languageSkills || []).find(s => s.langId === langId) : null;
    let def = lbGetLanguageDef(langId);
    let font = (row && row.font) || (def && def.font) || 'Courier New';
    return lbCssFontFamily(font);
}
function lbWrapLanguageCipher(htmlContent, langId) {
    if (!htmlContent || !langId) return htmlContent || '';
    let fam = lbLanguageFontFamily(langId);
    return `<div class="lb-lang-cipher" data-lang-id="${langId}" style="--lb-cipher-font:${fam};font-family:var(--lb-cipher-font);width:100%;height:100%;">${htmlContent}</div>`;
}
function lbMaybeCipherHtml(htmlContent, langId, userId) {
    if (!htmlContent || !langId) return htmlContent || '';
    userId = userId || (typeof game !== 'undefined' && game.user ? game.user.id : null);
    if (typeof game !== 'undefined' && game.user && game.user.isGM) {
        return `<div class="lb-lang-readable" style="font-family:'Handlee',cursive;width:100%;height:100%;">${htmlContent}</div>`;
    }
    if (lbShouldCipherLanguage(langId, userId)) return lbWrapLanguageCipher(htmlContent, langId);
    if (lbUserSpeaksLanguage(langId, userId)) {
        return `<div class="lb-lang-readable" style="font-family:'Handlee',cursive;width:100%;height:100%;">${htmlContent}</div>`;
    }
    return htmlContent;
}
function lbEditorDisplayFontFamily(font, documentLanguage, boardStore) {
    if (documentLanguage && typeof game !== 'undefined' && game.user && game.user.isGM) return "'Handlee',cursive";
    if (documentLanguage && lbUserSpeaksLanguage(documentLanguage)) return "'Handlee',cursive";
    return lbCssFontFamily(font || 'Courier New');
}
function lbEnsureEditorAttachVisible(item, themeId, storeRef) {
    if (!item || item.noPaper || item.paper === 'transparent') return;
    if (!item.attachType || item.attachType === 'none') {
        item.attachType = lbDefaultAttachType(item.type || 'drag-text', themeId, storeRef);
        lbEnsureAttachVariant(item, themeId, storeRef);
    }
}
function lbDocLanguageSelectHTML(selectedId, selectId, boardStore) {
    selectId = selectId || 'lb-doc-language';
    boardStore = boardStore || (typeof store !== 'undefined' ? store : null);
    lbEnsureLanguageSkills(boardStore);
    let opts = `<option value="">— Common —</option>`;
    (boardStore.languageSkills || []).forEach(row => {
        let name = lbGetLanguageDisplayName(row.langId, boardStore).replace(/"/g, '&quot;').replace(/</g, '&lt;');
        opts += `<option value="${row.langId}" ${selectedId === row.langId ? 'selected' : ''}>${name}</option>`;
    });
    return `<select id="${selectId}" class="lb-doc-lang-select" title="Document language">${opts}</select>`;
}
function lbReadDocLanguageFromDialog(dHtml) {
    let sel = dHtml.find('#lb-doc-language, .lb-doc-lang-select').first();
    return sel.length ? (sel.val() || '') : '';
}
function lbFinalizeDocLangHeader(header) {
    if (!header || !header.length) return;
    let langHdr = header.find('.lb-doc-lang-header');
    if (!langHdr.length) return;
    let cluster = header.find('.lb-header-controls-right');
    if (!cluster.length) {
        cluster = $('<div class="lb-header-controls-right"></div>');
        header.append(cluster);
    }
    langHdr.detach().appendTo(cluster);
    header.find('.lb-win-minimize').detach().appendTo(cluster);
    header.find('.header-button.close, .close').detach().appendTo(cluster);
    header.css({ display: 'flex', alignItems: 'center', flexWrap: 'nowrap' });
}
function lbInstallDocLanguageHeader(html, langId, boardStore, onChange) {}
function lbForeignLangGlyphHTML(langId, boardStore) {
    let def = lbGetLanguageDef(langId);
    if (!def) return '';
    boardStore = boardStore || (typeof store !== 'undefined' ? store : null);
    let row = boardStore ? (boardStore.languageSkills || []).find(s => s.langId === langId) : null;
    let font = (row && row.font) || def.font;
    let fam = String(font).replace(/'/g, "\\'");
    return `<span class="lb-fl-glyph" style="font-family:'${fam}',serif;font-size:18px;line-height:1;">${def.sample}</span>`;
}
function lbEnsureLanguageCSS() { /* styles loaded via module.json */ }
function lbOpenLanguagePlayerPicker(langId, onSave) {
    if (!game.user.isGM) return;
    lbEnsureLanguageSkills(store);
    let row = store.languageSkills.find(s => s.langId === langId);
    if (!row) return;
    let users = (game.users?.contents || game.users || []).filter(u => !u.isGM);
    let checks = users.map(u => {
        let checked = row.playerIds.includes(u.id) ? 'checked' : '';
        return `<label style="display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;">
            <input type="checkbox" class="lb-lang-player-chk" data-user="${u.id}" ${checked}>
            <span style="width:10px;height:10px;border-radius:50%;background:${u.color};flex-shrink:0;"></span>
            <span style="color:${u.color};font-weight:600;">${u.name}</span>
        </label>`;
    }).join('') || '<p style="color:#9aa0aa;text-align:center;">No players connected.</p>';
    new Dialog({
        title: 'Assign Players — ' + lbGetLanguageDisplayName(langId),
        content: `<div class="lb-modal-form" style="max-height:320px;overflow-y:auto;">${checks}</div>`,
        buttons: {
            save: { icon: '<i class="fas fa-check"></i>', label: 'Apply', callback: (d) => {
                row.playerIds = [];
                d.find('.lb-lang-player-chk:checked').each(function() { row.playerIds.push($(this).attr('data-user')); });
                if (onSave) onSave();
                return true;
            }},
            cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' }
        },
        default: 'save'
    }, { classes: ['dialog', 'lb-modern-dialog'], width: 360, zIndex: 100010 }).render(true);
}

function lbForeignLangPlayerBadgesHTML(langId, boardStore) {
    lbEnsureLanguageSkills(boardStore);
    let skill = (boardStore.languageSkills || []).find(s => s.langId === langId) || { playerIds: [] };
    let users = (game.users?.contents || game.users || []).filter(u => !u.isGM);
    if (!users.length) return '<span style="font-size:10px;color:#888;">No players</span>';
    return users.map(u => {
        let on = (skill.playerIds || []).includes(u.id);
        let ini = (u.name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
        return `<button type="button" class="lb-fl-player-badge${on ? ' active' : ''}" data-lang="${langId}" data-user="${u.id}" title="${u.name.replace(/"/g, '&quot;')}" style="--fl-user-color:${u.color};">${ini}${on ? '<i class="fas fa-check lb-fl-badge-check"></i>' : ''}</button>`;
    }).join('');
}
function lbForeignLangGridHTML(boardStore) {
    lbEnsureLanguageSkills(boardStore);
    let cells = '';
    for (let i = 0; i < LB_FOREIGN_LANG_ROWS; i++) {
        let lang = LB_FOREIGN_LANGUAGES[i];
        if (!lang) continue;
        let skill = (boardStore.languageSkills || []).find(s => s.langId === lang.id) || { customName: '', font: lang.font, playerIds: [] };
        let nameVal = (skill.customName || '').replace(/"/g, '&quot;');
        cells += `<input type="text" class="lb-fl-name" data-lang="${lang.id}" value="${nameVal}" placeholder="${lang.defaultName.replace(/"/g, '&quot;')}">`;
        cells += `<select class="lb-fl-font" data-lang="${lang.id}" title="Font">${lbFontOptionsHTML(skill.font || lang.font, boardStore, { skipForeign: true })}</select>`;
        cells += `<div class="lb-fl-player-badges" data-lang="${lang.id}">${lbForeignLangPlayerBadgesHTML(lang.id, boardStore)}</div>`;
    }
    return cells;
}

function lbSaveForeignLangConfigFromDialog(dHtml, boardStore) {
    lbEnsureLanguageSkills(boardStore);
    dHtml.find('.lb-fl-name').each(function() {
        let lid = $(this).data('lang');
        let row = boardStore.languageSkills.find(s => s.langId === lid);
        if (row) row.customName = $(this).val() || '';
    });
    dHtml.find('.lb-fl-font').each(function() {
        let lid = $(this).data('lang');
        let row = boardStore.languageSkills.find(s => s.langId === lid);
        if (row) row.font = $(this).val() || row.font;
    });
}
function lbBindForeignLangPlayerBadges(dHtml, boardStore) {
    dHtml.on('click', '.lb-fl-player-badge', function() {
        let lid = $(this).data('lang');
        let uid = $(this).data('user');
        let row = boardStore.languageSkills.find(s => s.langId === lid);
        if (!row) return;
        row.playerIds = row.playerIds || [];
        let idx = row.playerIds.indexOf(uid);
        if (idx >= 0) row.playerIds.splice(idx, 1);
        else row.playerIds.push(uid);
        $(this).closest('.lb-fl-player-badges').html(lbForeignLangPlayerBadgesHTML(lid, boardStore));
    });
}

function lbOpenForeignLanguagesEditor(boardStore, saveStoreFn, themeColor) {
    if (!game.user.isGM) return;
    lbEnsureLanguageCSS();
    lbEnsureLanguageSkills(boardStore);
    let gridCells = lbForeignLangGridHTML(boardStore);
    let content = `<div class="lb-fl-editor" style="--lb-accent:${themeColor || '#d4af37'};">
        <div class="lb-fl-grid">
            <div class="lb-fl-col-head">Sprache</div>
            <div class="lb-fl-col-head">Schriftstil</div>
            <div class="lb-fl-col-head">Spoken by</div>
            ${gridCells}
        </div>
    </div>`;
    new Dialog({
        title: 'Foreign Languages',
        content: content,
        buttons: {
            save: { icon: '<i class="fas fa-save"></i>', label: 'Save Config', callback: (html) => {
                lbSaveForeignLangConfigFromDialog(html, boardStore);
                saveStoreFn();
                ui.notifications.info('Foreign language configuration saved.');
                return false;
            }},
            close: { icon: '<i class="fas fa-times"></i>', label: 'Close' }
        },
        default: 'save',
        render: (dHtml) => { lbBindForeignLangPlayerBadges(dHtml, boardStore); }
    }, { classes: ['dialog', 'lb-modern-dialog', 'lb-fl-dialog'], width: Math.min(920, window.innerWidth * 0.96), height: 'auto', zIndex: 100012 }).render(true);
}
window.lbIsLanguageDocument = lbIsLanguageDocument;
window.lbEnsureLanguageSkills = lbEnsureLanguageSkills;
window.lbGetLanguageDisplayName = lbGetLanguageDisplayName;
window.lbUserSpeaksLanguage = lbUserSpeaksLanguage;
window.lbMaybeCipherHtml = lbMaybeCipherHtml;
window.lbEditorDisplayFontFamily = lbEditorDisplayFontFamily;
window.lbDocLanguageSelectHTML = lbDocLanguageSelectHTML;
window.lbFinalizeDocLangHeader = lbFinalizeDocLangHeader;
window.lbInstallDocLanguageHeader = lbInstallDocLanguageHeader;
window.lbReadDocLanguageFromDialog = lbReadDocLanguageFromDialog;
window.lbForeignLangGlyphHTML = lbForeignLangGlyphHTML;
window.lbOpenLanguagePlayerPicker = lbOpenLanguagePlayerPicker;
window.lbEnsureLanguageCSS = lbEnsureLanguageCSS;
window.lbOpenForeignLanguagesEditor = lbOpenForeignLanguagesEditor;
window.lbApplyFontPickerToItem = lbApplyFontPickerToItem;
window.lbResolveFontPickerValue = lbResolveFontPickerValue;
window.lbFontPickerSelectedValue = lbFontPickerSelectedValue;
window.lbGmDocLangBadgeHTML = lbGmDocLangBadgeHTML;

function lbForeignFontOptionsHTML(selected, boardStore) {
    boardStore = boardStore || (typeof store !== 'undefined' ? store : null) || window.lbCurrentStore;
    if (boardStore) lbEnsureLanguageSkills(boardStore);
    let opts = '<optgroup label="Foreign Languages" style="font-family:\'Segoe UI\',sans-serif;">';
    LB_FOREIGN_LANGUAGES.forEach(lang => {
        let token = lbForeignFontToken(lang.id);
        let name = lbGetLanguageDisplayName(lang.id, boardStore).replace(/"/g, '&quot;').replace(/</g, '&lt;');
        let font = lbGetLanguageFontValue(lang.id, boardStore).replace(/'/g, '');
        opts += `<option value="${token}" style="font-family:'${font}';" ${selected === token ? 'selected' : ''}>${name}</option>`;
    });
    opts += '</optgroup>';
    return opts;
}
window.lbForeignFontOptionsHTML = lbForeignFontOptionsHTML;

function lbFontOptionsHTML(selected, boardStore, options) {
    options = options || {};
    boardStore = boardStore || (typeof store !== 'undefined' ? store : null) || window.lbCurrentStore;
    let opts = '';
    LB_FONTS.forEach(g => {
        opts += `<optgroup label="${g.group}" style="font-family:'Segoe UI',sans-serif;">`;
        g.fonts.forEach(f => { opts += `<option value="${f.value}" style="font-family:'${f.value}';" ${selected === f.value ? 'selected' : ''}>${f.label}</option>`; });
        opts += `</optgroup>`;
    });
    if (!options.skipForeign) opts += lbForeignFontOptionsHTML(selected, boardStore);
    return opts;
}
window.lbFontOptionsHTML = lbFontOptionsHTML;
function lbFontSelectHTML(selected, pickerId, inline, documentLanguage) {
    let boardStore = (typeof store !== 'undefined' ? store : null) || window.lbCurrentStore;
    selected = lbFontPickerSelectedValue(selected, documentLanguage);
    let cls = inline ? 'lb-font-select lb-font-select-inline' : 'lb-font-select';
    return `<select id="${pickerId}" class="${cls}" title="${lbFontLabel(selected, boardStore).replace(/"/g, '&quot;')}">${lbFontOptionsHTML(selected, boardStore)}</select>`;
}
window.lbFontSelectHTML = lbFontSelectHTML;

function lbFontLabel(value, boardStore) {
    if (!value) return 'Font';
    let langId = lbParseForeignFontToken(value);
    if (langId) return lbGetLanguageDisplayName(langId, boardStore);
    for (let g of LB_FONTS) {
        let f = g.fonts.find(x => x.value === value);
        if (f) return f.label;
    }
    return value;
}
window.lbFontLabel = lbFontLabel;

// Size dropdown for document editors — always shows the active size, never a blank "Size" label.
function lbSizeSelectHTML(id, current, sizes) {
    sizes = sizes || [11, 12, 14, 16, 18, 20, 24, 32, 40];
    current = parseInt(current) || sizes[3] || 16;
    let opts = sizes.map(s => `<option value="${s}" ${s === current ? 'selected' : ''}>${s}</option>`).join('');
    return `<select id="${id}" class="lb-size-select" title="Font size">${opts}</select>`;
}
window.lbSizeSelectHTML = lbSizeSelectHTML;

// True when RTE HTML carries visible text (ignores empty <br> / whitespace nodes).
function lbRteHasContent(html) {
    let d = document.createElement('div');
    d.innerHTML = html || '';
    return !!(d.textContent || '').trim();
}
window.lbRteHasContent = lbRteHasContent;

// CSS font-family value safe for embedding in SVG/HTML style attributes.
function lbCssFontFamily(font) {
    let f = (font || 'Special Elite').replace(/'/g, "\\'");
    return `'${f}', serif`;
}
window.lbCssFontFamily = lbCssFontFamily;

// Grow/shrink Foundry dialog chrome to fit dynamic content.
function lbFitDialogHeight(root) {
    requestAnimationFrame(() => {
        let $root = root && root.jquery ? root : $(root);
        let app = $root.closest('.window-app');
        if (!app.length) return;
        app.css({ height: 'auto', maxHeight: '95vh' });
        app.find('.window-content, .dialog-content').css({ overflow: 'visible', maxHeight: 'none' });
        let top = Math.max(10, Math.min(app.position().top, window.innerHeight - app.outerHeight() - 10));
        app.css('top', top + 'px');
    });
}
window.lbFitDialogHeight = lbFitDialogHeight;

// ---------------------------------------------------------------------------
// GLOBAL RICH TEXT EDITOR — one shared component used by every Loreboard editor
// (Quest, Bulletin, Newspaper, Write Letter, Drop Comment, Journal-linked, future RTEs).
// Compact icon toolbar: Bold / Italic / Underline / Strikethrough.
// ---------------------------------------------------------------------------
function lbRTEHtml(opts) {
    opts = opts || {};
    let id = opts.id || ('lbrte_' + Math.random().toString(36).slice(2));
    let cls = opts.className || '';
    let style = opts.style || '';
    let html = (opts.html != null) ? opts.html : '';
    let minH = opts.minHeight || 60;
    let ph = (opts.placeholder || '').replace(/"/g, '&quot;');
    // #7/#16/#18 Optional inline Color + Size controls living in the SAME toolbar row as B/I/U/S.
    // They carry caller-supplied ids so the editor wires them to its existing item properties.
    let extra = '';
    if (opts.color) {
        extra += `<input type="color" class="lb-rte-color"${opts.colorId ? ` id="${opts.colorId}"` : ''}${opts.selectionColor ? ' data-rte-selection="1"' : ''} value="${opts.colorVal || '#000000'}" title="Color">`;
    }
    if (opts.size) {
        extra += `<input type="number" class="lb-rte-size"${opts.sizeId ? ` id="${opts.sizeId}"` : ''} value="${opts.sizeVal != null ? opts.sizeVal : 0}" min="${opts.sizeMin != null ? opts.sizeMin : 0}" max="${opts.sizeMax != null ? opts.sizeMax : 200}" title="${opts.sizeTitle || 'Size (0 = auto)'}">`;
    }
    if (opts.sizeDropdown) {
        extra += lbSizeSelectHTML(opts.sizeId || 'rte-size-dd', opts.sizeVal || 14, opts.sizeList || [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32]).replace('class="lb-size-select"', 'class="lb-size-select lb-rte-size-dd"');
    }
    return `<div class="lb-rte" data-rte-id="${id}">
        <div class="lb-rte-bar">
            <button type="button" class="lb-rte-btn" data-cmd="bold" title="Bold"><b>B</b></button>
            <button type="button" class="lb-rte-btn" data-cmd="italic" title="Italic"><i>I</i></button>
            <button type="button" class="lb-rte-btn" data-cmd="underline" title="Underline"><u>U</u></button>
            <button type="button" class="lb-rte-btn" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
            ${extra}
        </div>
        <div id="${id}" class="lb-rte-area ${cls}" contenteditable="true" data-ph="${ph}" style="min-height:${minH}px;${style}">${html}</div>
    </div>`;
}
function lbRTEBarHtml(opts) {
    opts = opts || {};
    let extra = '';
    if (opts.color) {
        extra += `<input type="color" class="lb-rte-color"${opts.colorId ? ` id="${opts.colorId}"` : ''}${opts.selectionColor ? ' data-rte-selection="1"' : ''} value="${opts.colorVal || '#000000'}" title="Color">`;
    }
    if (opts.size) {
        extra += `<input type="number" class="lb-rte-size"${opts.sizeId ? ` id="${opts.sizeId}"` : ''} value="${opts.sizeVal != null ? opts.sizeVal : 0}" min="${opts.sizeMin != null ? opts.sizeMin : 0}" max="${opts.sizeMax != null ? opts.sizeMax : 200}" title="${opts.sizeTitle || 'Size (0 = auto)'}">`;
    }
    if (opts.sizeDropdown) {
        extra += lbSizeSelectHTML(opts.sizeId || 'rte-size-dd', opts.sizeVal || 14, opts.sizeList || [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32]).replace('class="lb-size-select"', 'class="lb-size-select lb-rte-size-dd"');
    }
    return `<div class="lb-rte-bar" data-rte-bar-for="${opts.id || ''}">
        <button type="button" class="lb-rte-btn" data-cmd="bold" title="Bold"><b>B</b></button>
        <button type="button" class="lb-rte-btn" data-cmd="italic" title="Italic"><i>I</i></button>
        <button type="button" class="lb-rte-btn" data-cmd="underline" title="Underline"><u>U</u></button>
        <button type="button" class="lb-rte-btn" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
        ${extra}
    </div>`;
}
function lbRTEAreaHtml(opts) {
    opts = opts || {};
    let id = opts.id || ('lbrte_' + Math.random().toString(36).slice(2));
    let cls = opts.className || '';
    let style = opts.style || '';
    let html = (opts.html != null) ? opts.html : '';
    let minH = opts.minHeight || 60;
    let ph = (opts.placeholder || '').replace(/"/g, '&quot;');
    return `<div id="${id}" class="lb-rte-area ${cls}" contenteditable="true" data-ph="${ph}" style="min-height:${minH}px;${style}">${html}</div>`;
}
// Wire toolbar buttons for every RTE found under `root` (idempotent).
function lbBindRTE(root, onChange) {
    let nodes;
    if (!root) nodes = document.querySelectorAll('.lb-rte');
    else if (root.find) nodes = root.find('.lb-rte').toArray();
    else if (root.querySelectorAll) nodes = root.querySelectorAll('.lb-rte');
    else nodes = [];
    nodes.forEach(wrap => {
        if (wrap.dataset.rteBound) return;
        wrap.dataset.rteBound = '1';
        let area = wrap.querySelector('.lb-rte-area');
        wrap.querySelectorAll('.lb-rte-btn').forEach(b => {
            b.addEventListener('mousedown', e => { e.preventDefault(); });
            b.addEventListener('click', e => {
                e.preventDefault();
                if (area) area.focus();
                try { document.execCommand(b.dataset.cmd, false, null); } catch (_) {}
                if (onChange) onChange();
            });
        });
        // Rich-text font size — selection applies to highlighted text; collapsed caret sets typing style.
        let sizeInp = wrap.querySelector('.lb-rte-size');
        if (sizeInp && area) {
            sizeInp.addEventListener('mousedown', e => e.stopPropagation());
            let applySize = () => {
                let px = parseInt(sizeInp.value);
                if (px && !isNaN(px) && px > 0) lbRteApplyFontSize(area, px);
                if (onChange) onChange();
            };
            sizeInp.addEventListener('input', applySize);
            sizeInp.addEventListener('change', applySize);
            area.addEventListener('keyup', () => lbRteSyncSizeInput(area, sizeInp));
            area.addEventListener('mouseup', () => lbRteSyncSizeInput(area, sizeInp));
            document.addEventListener('selectionchange', () => {
                if (document.activeElement === area) lbRteSyncSizeInput(area, sizeInp);
            });
        }
        let sizeSel = wrap.querySelector('.lb-rte-size-dd');
        if (sizeSel && area) {
            sizeSel.addEventListener('mousedown', e => e.stopPropagation());
            sizeSel.addEventListener('change', () => {
                let px = parseInt(sizeSel.value);
                if (px && !isNaN(px) && px > 0) lbRteApplyFontSize(area, px);
                if (onChange) onChange();
            });
        }
        // Per-selection text colour (only used where the caller does not bind it to a base property).
        let colInp = wrap.querySelector('.lb-rte-color[data-rte-selection="1"]');
        if (colInp) {
            colInp.addEventListener('input', () => {
                if (area) area.focus();
                try { document.execCommand('styleWithCSS', false, true); document.execCommand('foreColor', false, colInp.value); } catch (_) {}
                if (onChange) onChange();
            });
        }
        if (area && onChange) area.addEventListener('input', onChange);
    });
}
// Word/Docs-style font size: selected text only, or typing style when caret is collapsed.
function lbRteGetFontSizeAtSelection(area) {
    if (!area) return null;
    let sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let node = sel.anchorNode;
    if (!node || !area.contains(node)) return null;
    let el = node.nodeType === 3 ? node.parentElement : node;
    while (el && el !== area) {
        let inline = parseInt(el.style && el.style.fontSize);
        if (inline > 0) return inline;
        el = el.parentElement;
    }
    return parseInt(area.style.fontSize) || parseInt(getComputedStyle(area).fontSize) || null;
}
function lbRteResolveAreaColor(area) {
    if (!area) return '#111111';
    if (area.dataset.defaultColor) return area.dataset.defaultColor;
    let inline = area.style && area.style.color;
    if (inline && inline !== 'inherit') return inline;
    let fs = lbRteGetFontSizeAtSelection(area);
    if (fs) {
        let sel = window.getSelection();
        if (sel && sel.rangeCount) {
            let node = sel.anchorNode;
            let el = node && node.nodeType === 3 ? node.parentElement : node;
            while (el && el !== area) {
                if (el.style && el.style.color && el.style.color !== 'inherit') return el.style.color;
                el = el.parentElement;
            }
        }
    }
    let computed = getComputedStyle(area).color;
    if (computed && computed !== 'inherit' && computed !== 'rgb(255, 255, 255)' && computed !== '#ffffff') return computed;
    return '#111111';
}
function lbRteApplyFontName(area, fontFamily) {
    if (!area || !fontFamily) return;
    let preserveColor = lbRteResolveAreaColor(area);
    area.focus();
    let sel = window.getSelection();
    let range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    if (range && range.collapsed && area.childNodes.length) {
        range.selectNodeContents(area);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        range = sel.getRangeAt(0);
    }
    try {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('fontName', false, fontFamily);
    } catch (_) {}
    if (preserveColor) {
        area.style.color = preserveColor;
        area.dataset.defaultColor = preserveColor;
        area.querySelectorAll('font, span, div, p, b, i, u, s').forEach(function(el) {
            if (!area.contains(el)) return;
            if (!el.style.color || el.style.color === 'inherit') el.style.color = preserveColor;
        });
    }
    area.dataset.defaultFont = fontFamily;
}
function lbRteApplyFontSize(area, px) {
    if (!area || !px || px <= 0) return;
    let preserveColor = lbRteResolveAreaColor(area);
    area.focus();
    let sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let range = sel.getRangeAt(0);
    if (range.collapsed && area.childNodes.length) {
        range.selectNodeContents(area);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        range = sel.getRangeAt(0);
    }
    function stripFontSizeInRange(r) {
        let walker = document.createTreeWalker(area, NodeFilter.SHOW_ELEMENT, null);
        let nodes = [];
        while (walker.nextNode()) {
            let n = walker.currentNode;
            if (r.intersectsNode(n) && n.style && n.style.fontSize) nodes.push(n);
        }
        nodes.forEach(n => { n.style.fontSize = ''; if (!n.getAttribute('style')) n.removeAttribute('style'); });
        area.querySelectorAll('font[size]').forEach(f => {
            if (r.intersectsNode(f)) { f.removeAttribute('size'); f.style.fontSize = ''; }
        });
    }
    try {
        stripFontSizeInRange(range);
        let span = document.createElement('span');
        span.style.fontSize = px + 'px';
        if (preserveColor) span.style.color = preserveColor;
        try {
            range.surroundContents(span);
        } catch (_) {
            document.execCommand('styleWithCSS', false, true);
            document.execCommand('fontSize', false, '7');
            area.querySelectorAll('font[size="7"]').forEach(f => {
                f.removeAttribute('size');
                f.style.fontSize = px + 'px';
                if (preserveColor) f.style.color = preserveColor;
            });
        }
        if (preserveColor) {
            area.querySelectorAll('span[style*="font-size"]').forEach(sp => {
                if (!sp.style.color || sp.style.color === 'inherit') sp.style.color = preserveColor;
            });
        }
    } catch (_) {}
    area.dataset.defaultFontSize = px;
    if (preserveColor) area.dataset.defaultColor = preserveColor;
}
function lbRteSyncSizeInput(area, sizeInp) {
    if (!area || !sizeInp) return;
    let fs = lbRteGetFontSizeAtSelection(area);
    if (fs && fs !== parseInt(sizeInp.value)) sizeInp.value = fs;
}
window.lbRTEHtml = lbRTEHtml;
window.lbRTEBarHtml = lbRTEBarHtml;
window.lbRTEAreaHtml = lbRTEAreaHtml;
window.lbBindRTE = lbBindRTE;
window.lbRteApplyFontSize = lbRteApplyFontSize;
window.lbRteApplyFontName = lbRteApplyFontName;

// ---------------------------------------------------------------------------
// QUEST SYSTEM — layout catalogue (DIN sizing keeps WYSIWYG aspect ratios).
// All quests render losslessly as SVG; the same builder feeds the editor preview,
// the board element and any export, guaranteeing 1:1 WYSIWYG.
// ---------------------------------------------------------------------------
const LB_QUEST_LAYOUTS = {
    // A4 portrait (210x297) text only
    A: { id: 'A', name: 'A4 Portrait (Text)', w: 420, h: 594, hasImage: false, orient: 'portrait', frameToggle: false },
    // A4 landscape (297x210) text only
    B: { id: 'B', name: 'A4 Landscape (Text)', w: 594, h: 420, hasImage: false, orient: 'landscape', frameToggle: false },
    // Wanted-style portrait, square image with optional frame
    D: { id: 'D', name: 'Wanted (Portrait + Square Image)', w: 430, h: 600, hasImage: true, orient: 'portrait', frameToggle: true }
};
// Fraction of preview height occupied by the body text block (matches lbBuildQuestSVG geometry).
function lbQuestBodyHeightRatio(layId) {
    let lay = LB_QUEST_LAYOUTS[layId] || LB_QUEST_LAYOUTS.A;
    let vw = lay.w, vh = lay.h;
    let bodyLineRatio = (Math.round(vw * 0.032) * 1.4) / vh;
    if (layId === 'C') return Math.max(0.05, 0.58 - bodyLineRatio);
    if (layId === 'D') {
        let titleEnd = 6 + 12 + 2;
        let sq = Math.min(80 * 0.62, 38);
        let iy = titleEnd + 2;
        let textY = iy + sq + 2;
        return Math.max(0.05, (100 - textY - 5) / 100 - bodyLineRatio);
    }
    return Math.max(0.05, 0.70 - bodyLineRatio);
}
// Measure rich-text block height for collision-free vertical quest/bulletin layout.
function lbQuestMeasureBlockHeight(html, width, fontFamily, baseFontSize, baseColor, lineHeight, extraStyle) {
    let el = document.createElement('div');
    el.style.cssText = `position:fixed;left:-9999px;top:0;visibility:hidden;width:${width}px;font-family:${fontFamily};font-size:${baseFontSize}px;color:${baseColor};line-height:${lineHeight};word-wrap:break-word;overflow-wrap:break-word;box-sizing:border-box;${extraStyle || ''}`;
    el.innerHTML = html;
    document.body.appendChild(el);
    let h = Math.ceil(el.scrollHeight) + 6;
    document.body.removeChild(el);
    return Math.max(baseFontSize * lineHeight, h);
}
window.lbQuestMeasureBlockHeight = lbQuestMeasureBlockHeight;

// #6 Single scale factor shared by the stamp cursor-preview AND board placement so the placed
// stamp is pixel-identical to the preview (no auto-scaling, no size change after placement).
const LB_STAMP_PLACE_SCALE = 0.6;

// Vintage / rubber-stamp fonts (loaded via the global @import in initLoreBoard).
const LB_STAMP_FONTS = [
    { value: 'Special Elite', label: 'Special Elite (Typewriter)' },
    { value: 'Courier Prime', label: 'Courier Prime' },
    { value: 'Cutive Mono', label: 'Cutive Mono' },
    { value: 'Oswald', label: 'Oswald (Condensed)' },
    { value: 'Anton', label: 'Anton (Heavy)' },
    { value: 'Stardos Stencil', label: 'Stardos Stencil' },
    { value: 'Black Ops One', label: 'Black Ops One' },
    { value: 'Saira Stencil One', label: 'Saira Stencil' }
];
function lbStampFontSelectHTML(selected, id) {
    let opts = LB_STAMP_FONTS.map(f => `<option value="${f.value}" style="font-family:'${f.value}';" ${selected === f.value ? 'selected' : ''}>${f.label}</option>`).join('');
    return `<select id="${id}" class="lb-font-select">${opts}</select>`;
}

// Deterministic PRNG so a saved stamp's *base* look is stable, while each imprint
// adds fresh jitter on top (handled at stamp-placement time).
function lbStampRng(seed) {
    let s = (seed || Math.floor(Math.random() * 1e9)) >>> 0;
    return () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
}

// Build the SVG markup for a stamp from its stored definition.
// `variation` (0..1 jitter object) is applied per-imprint so no two stamps are identical.
function lbBuildStampSVG(def, variation) {
    let v = variation || {};
    let w = def.w || 220, h = def.h || 120;
    let ink = def.color || '#7a1f1f';
    let baseOpacity = (def.opacity !== undefined ? def.opacity : 0.85);
    let opacity = Math.max(0.25, Math.min(1, baseOpacity + (v.opacity || 0)));
    let rot = (def.rotation || 0) + (v.rotation || 0);
    let strokeW = def.frameStroke || 4;
    // #13 Dotted = zero-length dashes with ROUND caps → real round dots (a 0.1 dash with butt caps
    // was effectively invisible). Dashed keeps butt caps for clean rectangular dashes.
    let frameDash = def.frameDash === 'dashed' ? `${strokeW*2.2},${strokeW*1.6}` : (def.frameDash === 'dotted' ? `0,${(strokeW*1.9).toFixed(2)}` : '');
    let frameCap = def.frameDash === 'dotted' ? 'round' : 'butt';
    let smudge = (v.smudge || 0);
    // Roughen edges with turbulence; distortion scale jitters per imprint.
    let distort = (def.distortion || 1.6) + (v.distortion || 0);
    // Unique per render so each imprint's displacement (distortion/seed) is independent in the DOM.
    let fid = 'stf_' + Math.random().toString(36).slice(2);
    // #16 Realistic rubber-stamp ink: the edges are roughened (displacement) AND the ink is eroded by
    // high-frequency noise so each imprint shows tiny gaps / faded specks like real, uneven ink. The
    // erosion seed varies per imprint (variation), so repeated stamps never look identical.
    let inkSeed = (def.seed || 7) + (v.inkSeed || v.seed || 0);
    let erode = Math.max(0, Math.min(1, (def.inkDefect != null ? def.inkDefect : 0.6) + (v.inkDefect || 0)));
    // alpha_out = B - A*noiseAlpha → scattered holes where noise is high. Higher erode = more gaps.
    let eA = (1.4 + erode * 1.6).toFixed(2);
    let eB = (1.18 + erode * 0.55).toFixed(2);
    let filter = `<filter id="${fid}" x="-25%" y="-25%" width="150%" height="150%">
        <feTurbulence type="fractalNoise" baseFrequency="${(0.04 + (v.freq||0)).toFixed(3)} ${(0.09 + (v.freq||0)).toFixed(3)}" numOctaves="2" seed="${def.seed || 7}" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="${distort.toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="disp"/>
        <feTurbulence type="turbulence" baseFrequency="0.55 0.72" numOctaves="2" seed="${inkSeed}" result="grain"/>
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -${eA} ${eB}" result="speck"/>
        <feComposite in="disp" in2="speck" operator="in"/>
    </filter>`;
    let frameSVG = '';
    if (def.frameShape && def.frameShape !== 'none') {
        let dash = frameDash ? `stroke-dasharray="${frameDash}" stroke-linecap="${frameCap}"` : '';
        if (def.frameShape === 'oval') {
            frameSVG = `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2 - strokeW*1.5}" ry="${h/2 - strokeW*1.5}" fill="none" stroke="${ink}" stroke-width="${strokeW}" ${dash}/>`;
        } else {
            frameSVG = `<rect x="${strokeW*1.5}" y="${strokeW*1.5}" width="${w - strokeW*3}" height="${h - strokeW*3}" rx="6" fill="none" stroke="${ink}" stroke-width="${strokeW}" ${dash}/>`;
        }
    }
    let inner = '';
    if (def.mode === 'icon' && def.iconSrc) {
        // Monochrome icon — mask-based tint in ink colour; sharp rendering for all image formats incl. SVG.
        inner = `<foreignObject x="${w*0.12}" y="${h*0.12}" width="${w*0.76}" height="${h*0.76}">
            <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;filter:url(#${fid});">
                <div style="width:100%;height:100%;background:${ink};opacity:${opacity};-webkit-mask:url('${def.iconSrc}') center/contain no-repeat;mask:url('${def.iconSrc}') center/contain no-repeat;-webkit-mask-size:contain;mask-size:contain;image-rendering:-webkit-optimize-contrast;image-rendering:crisp-edges;"></div>
            </div>
        </foreignObject>`;
    } else {
        // Rich-text stamp (up to 5 lines): rendered through a foreignObject so bold/italic/font/size/
        // alignment from the editor's RTE survive 1:1, while the ink displacement filter keeps the
        // vintage rubber-stamp look.
        let font = def.font || 'Special Elite';
        let fs = def.fontSize || 34;
        let align = def.align || 'center';
        let rich = def.richText || (def.text ? def.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>') : 'STAMP');
        inner = `<foreignObject x="${(w*0.06).toFixed(1)}" y="${(h*0.06).toFixed(1)}" width="${(w*0.88).toFixed(1)}" height="${(h*0.88).toFixed(1)}" style="filter:url(#${fid})">
            <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
              <div style="width:100%;font-family:'${font}';font-size:${fs}px;font-weight:bold;color:${ink};text-align:${align};line-height:1.1;text-transform:uppercase;letter-spacing:${def.letterSpacing||1}px;word-wrap:break-word;overflow-wrap:break-word;">${rich}</div>
            </div>
          </foreignObject>`;
    }
    // Optional smudge: a faint, offset, blurred duplicate of the ink.
    let smudgeLayer = smudge > 0 ? `<g opacity="${(smudge*0.4).toFixed(2)}" transform="translate(${(v.smX||1.5)},${(v.smY||1)})" style="filter:blur(0.8px)">${frameSVG}${inner}</g>` : '';
    // #16 Subtle edge bleaching: a radial fade mask makes the imprint a touch lighter toward the rim.
    let mid = 'stm_' + Math.random().toString(36).slice(2);
    let edgeFade = `<radialGradient id="${mid}" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stop-color="#fff"/><stop offset="72%" stop-color="#fff"/><stop offset="100%" stop-color="#9a9a9a"/>
        </radialGradient>
        <mask id="${mid}_m"><rect x="0" y="0" width="${w}" height="${h}" fill="url(#${mid})"/></mask>`;
    return `<svg class="lb-stamp-svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;">
        <defs>${filter}${edgeFade}</defs>
        <g transform="rotate(${rot} ${w/2} ${h/2})" opacity="${opacity}" mask="url(#${mid}_m)">${smudgeLayer}${frameSVG}${inner}</g>
    </svg>`;
}

// #14/#15 Wax-seal graphic: a tinted seal base (Seal1..4) with the uploaded motif centred inside the
// circle and a soft inner shadow so the motif reads as pressed into the wax. Used by the seal editor
// preview, the placement cursor preview and the on-element render (so it is pixel-identical everywhere).
// Wax seal graphic: a Wax{n}.webp image with an optional colour tint (masked multiply).
// Used by the seal selection grid, the customization preview, the placement cursor preview
// and the on-element render so the seal is pixel-identical everywhere.
function lbEffectFilterCSS(def) {
    def = def || {};
    let bright = def.brightness != null ? def.brightness : 100;
    let cont = def.contrast != null ? def.contrast : 100;
    let expos = def.exposure != null ? def.exposure : 100;
    let opac = def.opacity != null ? def.opacity : 100;
    return `brightness(${(bright * expos / 100).toFixed(1)}%) contrast(${cont}%) opacity(${(opac / 100).toFixed(2)})`;
}
function lbEffectAssetUrl(def) {
    def = def || {};
    if (def.effectKind === 'blood') return LB_BLOOD_SPLAT_URLS[(parseInt(def.effectIndex, 10) || 1) - 1] || LB_BLOOD_SPLAT_URLS[0];
    if (def.effectKind === 'ink') return LB_INK_SPLAT_URLS[(parseInt(def.effectIndex, 10) || 1) - 1] || LB_INK_SPLAT_URLS[0];
    let idx = parseInt(def.wax, 10) || 1;
    return LB_WAX_SEALS[idx - 1] || LB_WAX_SEALS[0];
}
function lbBuildWaxSVG(def) {
    def = def || {};
    let url = lbEffectAssetUrl(def);
    let tint = def.tint || '#7a1f1f';
    let tintOn = def.tintEnabled === true || (def.tintEnabled == null && (def.tintStrength != null ? def.tintStrength > 0 : false));
    let strength = tintOn ? (def.tintStrength != null ? def.tintStrength : 55) : 0;
    let filter = lbEffectFilterCSS(def);
    // Tint uses mask-image so only opaque pixels receive colour — alpha/transparency stays intact.
    let tintLayer = strength > 0 ? `<div style="position:absolute;inset:0;background:${tint};-webkit-mask-image:url('${url}');mask-image:url('${url}');-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;mix-blend-mode:multiply;opacity:${(strength/100).toFixed(2)};"></div>` : '';
    return `<svg class="lb-effect-graphic lb-seal-graphic" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block;overflow:visible;pointer-events:none;">
        <foreignObject x="0" y="0" width="100" height="100">
            <div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:100%;height:100%;pointer-events:none;filter:${filter};">
                <div style="position:absolute;inset:0;background:url('${url}') center/contain no-repeat;-webkit-mask-image:url('${url}');mask-image:url('${url}');-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;"></div>
                ${tintLayer}
            </div>
        </foreignObject>
    </svg>`;
}
window.lbBuildWaxSVG = lbBuildWaxSVG;
window.lbEffectFilterCSS = lbEffectFilterCSS;
window.lbEffectAssetUrl = lbEffectAssetUrl;

function lbBuildSealSVG(def, opts) {
    def = def || {};
    // New wax-seal model (selectable Wax1..10 + tint). Legacy custom seals fall through below.
    if (def.effectKind === 'blood' || def.effectKind === 'ink' || def.wax) return lbBuildWaxSVG(def);
    let baseIdx = def.base || 1;
    let baseUrl = LB_SEAL_BASES[(parseInt(baseIdx, 10) || 1) - 1] || LB_SEAL_BASES[0];
    let color = def.color || '#8c2f2f';
    let zoom = def.zoom || 1;
    let motif = def.motif || '';
    let tintOp = def.tintOpacity != null ? def.tintOpacity : 0.82;
    let motifClip = 58; // motif occupies the inner ~58% of the seal diameter
    // The uploaded motif is INTEGRATED INTO THE WAX (it is not a flat sticker on top):
    //  • Colour matching  — the emblem is filled with the wax colour (multiply layer) so it adopts the
    //                        exact hue/tone of the seal instead of showing its own colours.
    //  • Embossing / relief— dual drop-shadows (light top-left, dark bottom-right) make the shape read as
    //                        pressed into / raised out of the wax.
    //  • Surface distortion— a grayscale luminance copy blended with 'overlay' lets the image's own
    //                        light/dark detail deform the wax surface (material blending).
    let motifLayers = motif ? `
        <div class="lb-seal-motif-wrap" style="position:absolute;left:50%;top:50%;width:${motifClip}%;height:${motifClip}%;transform:translate(-50%,-50%) scale(${zoom});pointer-events:none;">
            <div style="position:absolute;inset:0;background:${color};-webkit-mask:url('${motif}') center/contain no-repeat;mask:url('${motif}') center/contain no-repeat;-webkit-mask-size:contain;mask-size:contain;filter:brightness(0.8) drop-shadow(-0.4px -0.4px 0.3px rgba(255,255,255,0.55)) drop-shadow(0.5px 0.7px 0.45px rgba(0,0,0,0.6));mix-blend-mode:multiply;"></div>
            <div style="position:absolute;inset:0;background:url('${motif}') center/contain no-repeat;-webkit-mask:url('${motif}') center/contain no-repeat;mask:url('${motif}') center/contain no-repeat;-webkit-mask-size:contain;mask-size:contain;filter:grayscale(1) contrast(1.3) brightness(1.05);mix-blend-mode:overlay;opacity:0.5;"></div>
        </div>` : '';
    return `<div class="lb-seal-graphic" style="position:relative;width:100%;height:100%;pointer-events:none;">
        <div style="position:absolute;inset:0;background:url('${baseUrl}') center/contain no-repeat;"></div>
        <div style="position:absolute;inset:0;background:${color};-webkit-mask:url('${baseUrl}') center/contain no-repeat;mask:url('${baseUrl}') center/contain no-repeat;-webkit-mask-size:contain;mask-size:contain;mix-blend-mode:multiply;opacity:${tintOp};"></div>
        ${motifLayers}
    </div>`;
}
window.lbBuildSealSVG = lbBuildSealSVG;

/** Document types that accept baked seal/stamp embeds. */
function lbDocEmbedBlocked(item) {
    if (!item) return true;
    return ['midpin', 'player-pin', 'ambient-light', 'board-comment'].includes(item.type);
}

/** Baked SVG/HTML layer for seals & stamps on a document face — integral part of the document, visible in Investigation Mode. */
function lbBuildDocEmbedsLayerHTML(item, faceSide, opts) {
    if (!item || lbDocEmbedBlocked(item)) return '';
    opts = opts || {};
    let iw = opts.iw || lbDocDisplayDims(item).w || 300;
    let ih = opts.ih || lbDocDisplayDims(item).h || 400;
    faceSide = faceSide || 'front';
    let parts = [];
    (item.seals || []).forEach(seal => {
        if (seal.face && seal.face !== faceSide) return;
        let dia, lx, ly;
        if (seal.pxDia != null && seal.pxX != null && seal.pxY != null) {
            dia = seal.pxDia;
            lx = seal.pxX;
            ly = seal.pxY;
        } else {
            let refW = seal.layoutW || iw;
            let refH = seal.layoutH || ih;
            dia = (seal.scale || 0.32) * Math.min(refW, refH);
            lx = (seal.fx || 0.5) * refW;
            ly = (seal.fy || 0.5) * refH;
        }
        let z = seal.aboveText ? 8600 : 4;
        parts.push(`<div class="lb-seal lb-doc-embed-baked${lbEffectUsesRoundFrame(seal.def || seal) ? ' lb-seal-round' : ''}" data-seal-id="${seal.id}" data-item-id="${item.id}" style="position:absolute;left:${lx}px;top:${ly}px;width:${dia}px;height:${dia}px;transform:translate(-50%,-50%) rotate(${seal.rot || 0}deg);pointer-events:auto;z-index:${z};filter:drop-shadow(0 3px 5px rgba(0,0,0,0.5));">${lbBuildSealSVG(seal.def || seal, {})}</div>`);
    });
    (item.stamps || []).forEach(st => {
        if (st.face && st.face !== faceSide) return;
        let def = st.def || st.stampDef || {};
        let dw, dh, lx, ly;
        if (st.pxW != null && st.pxX != null && st.pxY != null) {
            dw = st.pxW;
            dh = st.pxH != null ? st.pxH : dw;
            lx = st.pxX;
            ly = st.pxY;
        } else {
            let refW = st.layoutW || iw;
            let refH = st.layoutH || ih;
            dw = (st.w || def.w || 220) * (st.scale || LB_STAMP_PLACE_SCALE || 0.6);
            dh = (st.h || def.h || 120) * (st.scale || LB_STAMP_PLACE_SCALE || 0.6);
            lx = (st.fx || 0.5) * refW;
            ly = (st.fy || 0.5) * refH;
        }
        parts.push(`<div class="lb-stamp-embed lb-doc-embed-baked" data-stamp-id="${st.id}" data-item-id="${item.id}" style="position:absolute;left:${lx}px;top:${ly}px;width:${dw}px;height:${dh}px;transform:translate(-50%,-50%) rotate(${st.rot || 0}deg);pointer-events:auto;z-index:8500;">${lbBuildStampSVG(def, st.variation || {})}</div>`);
    });
    if (!parts.length) return '';
    return `<div class="lb-doc-embeds-layer" style="position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:5;">${parts.join('')}</div>`;
}
window.lbBuildDocEmbedsLayerHTML = lbBuildDocEmbedsLayerHTML;
window.lbDocEmbedBlocked = lbDocEmbedBlocked;

function lbFindBoardDocItemAt(clientX, clientY, store) {
    let el = document.elementFromPoint(clientX, clientY);
    while (el && el !== document.body) {
        if (el.id && el.classList && el.classList.contains('lb-item')) {
            let item = (store && store.items) ? store.items.find(i => i.id === el.id) : null;
            if (item && !lbDocEmbedBlocked(item) && item.type !== 'board-comment') return { el: el, item: item };
        }
        el = el.parentElement;
    }
    return null;
}

function lbBoardRectToDocPct(docEl, x, y, w, h) {
    let content = docEl.querySelector('.lb-item-content') || docEl;
    let r = content.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return {
        relXPct: Math.max(0, Math.min(92, ((x - r.left) / r.width) * 100)),
        relYPct: Math.max(0, Math.min(92, ((y - r.top) / r.height) * 100)),
        relWPct: Math.max(6, Math.min(100, (w / r.width) * 100)),
        relHPct: Math.max(4, Math.min(100, (h / r.height) * 100))
    };
}
window.lbFindBoardDocItemAt = lbFindBoardDocItemAt;

function lbMeasureDocSize(text, font, fontSize) {
    let el = $('<span>').css({ position: 'fixed', left: -9999, top: 0, visibility: 'hidden', fontFamily: font || 'Courier New', fontSize: (fontSize || 16) + 'px', whiteSpace: 'pre', lineHeight: 1.45, padding: '6px 10px' }).text(text || '');
    $('body').append(el);
    let w = Math.ceil(el.outerWidth()) + 24, h = Math.ceil(el.outerHeight()) + 20;
    el.remove();
    return { w: Math.max(90, Math.min(w, 640)), h: Math.max(32, Math.min(h, 900)) };
}

// Write Letter sizing: wrap text at a hard 20-character maximum, then measure so the paper grows to fit
// exactly (single line → narrow, multiple lines → taller). The text content (inset 10% on the paper)
// drives the final dimensions.
// ---------------------------------------------------------------------------
// RESIZABLE MOVABLE FIELD — shared drag/resize (editors + board)
// ---------------------------------------------------------------------------
function lbRMFHandlesHTML(variant) {
    variant = variant || 'editor';
    let boardCls = variant === 'board' ? ' lb-rte-handle-board' : '';
    let nW = variant === 'board' ? 12 : (variant === 'blueprint' ? 10 : 14);
    let nH = variant === 'board' ? 8 : (variant === 'blueprint' ? 8 : 10);
    let cW = variant === 'board' ? 8 : (variant === 'blueprint' ? 8 : 10);
    let mvHandle;
    if (variant === 'crop') {
        mvHandle = `<div class="lb-rte-handle lb-rte-mv" title="Drag image area" style="position:absolute;left:-6px;top:-6px;width:14px;height:14px;cursor:move;z-index:11;background:rgba(80,130,200,0.9);border:1px solid #fff;border-radius:2px;pointer-events:auto;"></div>`;
    } else if (variant === 'blueprint') {
        mvHandle = `<div class="lb-rte-handle lb-rte-mv lb-bp-drag-bar" title="Drag to move" style="position:absolute;left:0;right:0;top:0;height:14px;cursor:move;z-index:14;background:rgba(212,175,55,0.38);border-bottom:1px solid rgba(212,175,55,0.55);pointer-events:auto;"></div>`;
    } else if (variant === 'magic-ink') {
        /* #8 Magic Ink: top-left drag zone + four corner resize handles (fixed font-size field) */
        mvHandle = `<div class="lb-rte-handle lb-rte-mv lb-magic-ink-drag" title="Drag field" style="position:absolute;left:-8px;top:-8px;width:16px;height:16px;cursor:move;z-index:16;background:rgba(155,48,255,0.92);border:2px solid #fff;border-radius:3px;pointer-events:auto;box-shadow:0 0 8px rgba(155,48,255,0.55);"></div>`;
    } else {
        mvHandle = `<div class="lb-rte-handle lb-rte-mv${boardCls}" title="Drag to move" style="position:absolute;inset:0;cursor:move;z-index:0;pointer-events:auto;"></div>`;
    }
    let pe = 'pointer-events:auto;';
    if (variant === 'magic-ink') {
        let mk = 'rgba(155,48,255,0.88)';
        return `${mvHandle}
<div class="lb-rte-handle lb-rte-nw" style="position:absolute;left:-6px;top:-6px;width:12px;height:12px;cursor:nw-resize;background:${mk};border:2px solid #fff;border-radius:2px;z-index:15;${pe}"></div>
<div class="lb-rte-handle lb-rte-ne" style="position:absolute;right:-6px;top:-6px;width:12px;height:12px;cursor:ne-resize;background:${mk};border:2px solid #fff;border-radius:2px;z-index:15;${pe}"></div>
<div class="lb-rte-handle lb-rte-sw" style="position:absolute;left:-6px;bottom:-6px;width:12px;height:12px;cursor:sw-resize;background:${mk};border:2px solid #fff;border-radius:2px;z-index:15;${pe}"></div>
<div class="lb-rte-handle lb-rte-se" style="position:absolute;right:-6px;bottom:-6px;width:12px;height:12px;cursor:se-resize;background:${mk};border:2px solid #fff;border-radius:2px;z-index:15;${pe}"></div>
<div class="lb-rte-handle lb-rte-rot" title="Rotate" style="position:absolute;right:-24px;top:50%;transform:translateY(-50%);width:18px;height:18px;cursor:grab;background:${mk};border:2px solid #fff;border-radius:50%;z-index:17;${pe}display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;line-height:1;"><i class="fas fa-sync-alt" style="pointer-events:none;"></i></div>`;
    }
    return `${mvHandle}
<div class="lb-rte-handle lb-rte-n${boardCls}" style="position:absolute;left:50%;top:-5px;transform:translateX(-50%);width:${nW}px;height:${nH}px;cursor:n-resize;background:rgba(255,255,255,0.9);border:1px solid #888;border-radius:${variant === 'board' ? 2 : 3}px;z-index:10;${pe}"></div>
<div class="lb-rte-handle lb-rte-s${boardCls}" style="position:absolute;left:50%;bottom:-5px;transform:translateX(-50%);width:${nW}px;height:${nH}px;cursor:s-resize;background:rgba(255,255,255,0.9);border:1px solid #888;border-radius:${variant === 'board' ? 2 : 3}px;z-index:10;${pe}"></div>
<div class="lb-rte-handle lb-rte-e${boardCls}" style="position:absolute;right:-5px;top:50%;transform:translateY(-50%);width:${nH}px;height:${nW}px;cursor:e-resize;background:rgba(255,255,255,0.9);border:1px solid #888;border-radius:${variant === 'board' ? 2 : 3}px;z-index:10;${pe}"></div>
<div class="lb-rte-handle lb-rte-w${boardCls}" style="position:absolute;left:-5px;top:50%;transform:translateY(-50%);width:${nH}px;height:${nW}px;cursor:w-resize;background:rgba(255,255,255,0.9);border:1px solid #888;border-radius:${variant === 'board' ? 2 : 3}px;z-index:10;${pe}"></div>
<div class="lb-rte-handle lb-rte-nw${boardCls}" style="position:absolute;left:-5px;top:-5px;width:${cW}px;height:${cW}px;cursor:nw-resize;background:rgba(255,255,255,0.9);border:1px solid #888;border-radius:2px;z-index:10;${pe}"></div>
<div class="lb-rte-handle lb-rte-ne${boardCls}" style="position:absolute;right:-5px;top:-5px;width:${cW}px;height:${cW}px;cursor:ne-resize;background:rgba(255,255,255,0.9);border:1px solid #888;border-radius:2px;z-index:10;${pe}"></div>
<div class="lb-rte-handle lb-rte-sw${boardCls}" style="position:absolute;left:-5px;bottom:-5px;width:${cW}px;height:${cW}px;cursor:sw-resize;background:rgba(255,255,255,0.9);border:1px solid #888;border-radius:2px;z-index:10;${pe}"></div>
<div class="lb-rte-handle lb-rte-se${boardCls}" style="position:absolute;right:-5px;bottom:-5px;width:${cW}px;height:${cW}px;cursor:se-resize;background:rgba(255,255,255,0.9);border:1px solid #888;border-radius:2px;z-index:10;${pe}"></div>`;
}
function lbRMFPctStyle(item, prefix, defaults) {
    let x = item[prefix + 'XPct'], y = item[prefix + 'YPct'], w = item[prefix + 'WPct'], h = item[prefix + 'HPct'];
    if (x === undefined) x = defaults.x;
    if (y === undefined) y = defaults.y;
    if (w === undefined) w = defaults.w;
    if (h === undefined) h = defaults.h;
    return `left:${x}%;top:${y}%;width:${w}%;height:${h}%;`;
}
function lbRMFBindField(fieldEl, stageEl, opts) {
    if (!fieldEl || !stageEl) return { getRectPct: function() { return {}; } };
    opts = opts || {};
    let minW = opts.minW || 40, minH = opts.minH || 30;
    let minWPct = opts.minWPct || 3, minHPct = opts.minHPct || 3;
    let mode = opts.mode || 'pixels';
    let allowOverflow = !!opts.allowOverflow;
    let activeHandle = null, startX, startY, startL, startT, startW, startH, moveRaf = null;
    let rotCenterX = 0, rotCenterY = 0, startRotDeg = 0, startPointerAngle = 0;
    function applyMoveStyles(nl, nt, nw, nh, pctMode, pw, ph) {
        if (pctMode) {
            fieldEl.style.left = nl + '%'; fieldEl.style.top = nt + '%';
            fieldEl.style.width = (nw / pw) * 100 + '%'; fieldEl.style.height = (nh / ph) * 100 + '%';
        } else {
            fieldEl.style.left = nl + 'px'; fieldEl.style.top = nt + 'px';
            fieldEl.style.width = nw + 'px'; fieldEl.style.height = nh + 'px';
        }
    }
    function onMove(e) {
        if (!activeHandle) return;
        if (moveRaf) return;
        moveRaf = requestAnimationFrame(function() {
            moveRaf = null;
            if (!activeHandle) return;
            let dx = e.clientX - startX, dy = e.clientY - startY;
            let nl = startL, nt = startT, nw = startW, nh = startH;
            let isMv = activeHandle.classList.contains('lb-rte-mv');
            let isRot = activeHandle.classList.contains('lb-rte-rot');
            if (isRot) {
                let pointerAngle = Math.atan2(e.clientY - rotCenterY, e.clientX - rotCenterX) * (180 / Math.PI);
                let newRot = startRotDeg + (pointerAngle - startPointerAngle);
                fieldEl.style.transform = 'rotate(' + newRot.toFixed(2) + 'deg)';
                fieldEl.dataset.lbRot = String(newRot);
            } else if (mode === 'pixels') {
                if (isMv) { nl = startL + dx; nt = startT + dy; }
                else {
                    if (activeHandle.classList.contains('lb-rte-w') || activeHandle.classList.contains('lb-rte-nw') || activeHandle.classList.contains('lb-rte-sw')) { nl = startL + dx; nw = Math.max(minW, startW - dx); }
                    if (activeHandle.classList.contains('lb-rte-e') || activeHandle.classList.contains('lb-rte-ne') || activeHandle.classList.contains('lb-rte-se')) { nw = Math.max(minW, startW + dx); }
                    if (activeHandle.classList.contains('lb-rte-n') || activeHandle.classList.contains('lb-rte-nw') || activeHandle.classList.contains('lb-rte-ne')) { nt = startT + dy; nh = Math.max(minH, startH - dy); }
                    if (activeHandle.classList.contains('lb-rte-s') || activeHandle.classList.contains('lb-rte-sw') || activeHandle.classList.contains('lb-rte-se')) { nh = Math.max(minH, startH + dy); }
                }
                applyMoveStyles(nl, nt, nw, nh, false);
            } else {
                let parent = stageEl.getBoundingClientRect();
                let pw = parent.width || 1, ph = parent.height || 1;
                if (isMv) {
                    nl = startL + ((dx / pw) * 100);
                    nt = startT + ((dy / ph) * 100);
                    if (!allowOverflow) {
                        let wPctMv = (startW / pw) * 100, hPctMv = (startH / ph) * 100;
                        nl = Math.max(0, Math.min(100 - wPctMv, nl));
                        nt = Math.max(0, Math.min(100 - hPctMv, nt));
                    }
                } else {
                    if (activeHandle.classList.contains('lb-rte-w') || activeHandle.classList.contains('lb-rte-nw') || activeHandle.classList.contains('lb-rte-sw')) { nl = startL + (dx / pw) * 100; nw = Math.max(pw * (minWPct / 100), startW - dx); }
                    if (activeHandle.classList.contains('lb-rte-e') || activeHandle.classList.contains('lb-rte-ne') || activeHandle.classList.contains('lb-rte-se')) { nw = Math.max(pw * (minWPct / 100), startW + dx); }
                    if (activeHandle.classList.contains('lb-rte-n') || activeHandle.classList.contains('lb-rte-nw') || activeHandle.classList.contains('lb-rte-ne')) { nt = startT + (dy / ph) * 100; nh = Math.max(ph * (minHPct / 100), startH - dy); }
                    if (activeHandle.classList.contains('lb-rte-s') || activeHandle.classList.contains('lb-rte-sw') || activeHandle.classList.contains('lb-rte-se')) { nh = Math.max(ph * (minHPct / 100), startH + dy); }
                    if (!allowOverflow) {
                        let wPct = (nw / pw) * 100, hPct = (nh / ph) * 100;
                        if (nt + hPct > 100) nh = Math.max(ph * (minHPct / 100), ph * ((100 - nt) / 100));
                        if (nl + wPct > 100) nw = Math.max(pw * (minWPct / 100), pw * ((100 - nl) / 100));
                        wPct = (nw / pw) * 100; hPct = (nh / ph) * 100;
                        nl = Math.max(0, Math.min(100 - wPct, nl));
                        nt = Math.max(0, Math.min(100 - hPct, nt));
                    }
                }
                applyMoveStyles(nl, nt, nw, nh, true, pw, ph);
            }
            if (opts.onChange && !fieldEl.classList.contains('lb-bp-mod')) opts.onChange();
        });
    }
    function getEditorRect() {
        let sr = stageEl.getBoundingClientRect(), er = fieldEl.getBoundingClientRect();
        return { l: er.left - sr.left, t: er.top - sr.top, w: er.width, h: er.height };
    }
    fieldEl.querySelectorAll('.lb-rte-handle').forEach(function(h) {
        h.addEventListener('mousedown', function(e) {
            if (e.target !== h && !e.target.classList.contains('lb-rte-handle')) return;
            activeHandle = h;
            if (fieldEl.classList.contains('lb-bp-mod')) fieldEl.classList.add('lb-bp-mod-resizing');
            e.preventDefault(); e.stopPropagation();
            startX = e.clientX; startY = e.clientY;
            if (h.classList.contains('lb-rte-rot')) {
                let fr = fieldEl.getBoundingClientRect();
                rotCenterX = fr.left + fr.width / 2;
                rotCenterY = fr.top + fr.height / 2;
                startRotDeg = parseFloat(fieldEl.dataset.lbRot) || 0;
                startPointerAngle = Math.atan2(e.clientY - rotCenterY, e.clientX - rotCenterX) * (180 / Math.PI);
            } else if (mode === 'pixels') {
                let r = getEditorRect();
                startL = r.l; startT = r.t; startW = r.w; startH = r.h;
                fieldEl.style.left = startL + 'px'; fieldEl.style.top = startT + 'px';
                fieldEl.style.width = startW + 'px'; fieldEl.style.height = startH + 'px';
            } else {
                startL = parseFloat(fieldEl.style.left) || 0;
                startT = parseFloat(fieldEl.style.top) || 0;
                startW = fieldEl.offsetWidth; startH = fieldEl.offsetHeight;
            }
        });
    });
    function onUp() {
        if (fieldEl.classList.contains('lb-bp-mod')) fieldEl.classList.remove('lb-bp-mod-resizing');
        if (activeHandle && opts.onCommit) opts.onCommit();
        activeHandle = null;
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return {
        getRectPct: function() {
            let sr = stageEl.getBoundingClientRect(), er = fieldEl.getBoundingClientRect();
            return {
                xPct: ((er.left - sr.left) / sr.width) * 100,
                yPct: ((er.top - sr.top) / sr.height) * 100,
                wPct: (er.width / sr.width) * 100,
                hPct: (er.height / sr.height) * 100
            };
        },
        destroy: function() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
    };
}
function lbRMFApplyRectPct(item, prefix, rect) {
    if (!item || !rect) return item;
    item[prefix + 'XPct'] = rect.xPct;
    item[prefix + 'YPct'] = rect.yPct;
    item[prefix + 'WPct'] = rect.wPct;
    item[prefix + 'HPct'] = rect.hPct;
    return item;
}
function lbRMFRectFromItem(item, prefix, vw, vh, fallback) {
    if (item[prefix + 'XPct'] !== undefined) {
        return {
            x: vw * item[prefix + 'XPct'] / 100,
            y: vh * item[prefix + 'YPct'] / 100,
            w: vw * item[prefix + 'WPct'] / 100,
            h: vh * item[prefix + 'HPct'] / 100
        };
    }
    return fallback;
}

// ---------------------------------------------------------------------------
// BOARD FIELD + LAYER MODULE — clean board render vs editor-only field chrome
// ---------------------------------------------------------------------------
const LB_LAYER_Z = {
    THREADS: 500,
    THREAD_NOTES: 520,
    ATTACH_TAPE: 99400,
    ATTACH_PIN: 99550
};
function lbQuestFieldDefaults(layoutId) {
    let marginX = 10, contentW = 80, gap = 2, curY = 6, bottomPad = 5;
    let titleDef = { x: marginX, y: curY, w: contentW, h: 12 };
    let contentTop = curY + 12 + gap;
    let contentH = Math.max(5, 100 - contentTop - bottomPad);
    let textDef = { x: marginX, y: contentTop, w: contentW, h: contentH };
    let imgDef = null;
    if (layoutId === 'C') {
        let gapMid = 3, colW = (contentW - gapMid) / 2;
        textDef = { x: marginX, y: contentTop, w: colW, h: contentH };
        imgDef = { x: marginX + colW + gapMid, y: contentTop, w: colW, h: contentH * 0.92 };
    } else if (layoutId === 'D') {
        let titleEnd = curY + 12 + gap;
        let sq = Math.min(contentW * 0.62, 38);
        let ix = (100 - sq) / 2;
        let iy = titleEnd + gap;
        imgDef = { x: ix, y: iy, w: sq, h: sq };
        textDef = { x: marginX, y: iy + sq + gap, w: contentW, h: Math.max(5, 100 - (iy + sq + gap) - bottomPad) };
    }
    return lbQuestClampFieldDefs({ title: titleDef, text: textDef, img: imgDef });
}
function lbQuestClampFieldDefs(defs) {
    if (!defs) return defs;
    ['title', 'text', 'img'].forEach(k => {
        let d = defs[k];
        if (!d) return;
        d.x = Math.max(2, Math.min(98 - (d.w || 10), d.x));
        d.y = Math.max(2, Math.min(98 - (d.h || 10), d.y));
        d.w = Math.max(5, Math.min(100 - d.x - 2, d.w));
        d.h = Math.max(5, Math.min(100 - d.y - 2, d.h));
    });
    return defs;
}
function lbQuestResetFieldRects(item, layoutId) {
    if (!item) return;
    ['title', 'text', 'img'].forEach(p => {
        delete item[p + 'XPct']; delete item[p + 'YPct']; delete item[p + 'WPct']; delete item[p + 'HPct'];
    });
    lbQuestClampFieldDefs(lbQuestFieldDefaults(layoutId));
}
function lbPrintedInkSeed(key) {
    let s = 0;
    key = String(key || 'lb');
    for (let i = 0; i < key.length; i++) s = ((s << 5) - s + key.charCodeAt(i)) | 0;
    return Math.abs(s) || 7;
}
function lbBuildPrintedInkFilterSVG(filterId, seed, intensity) {
    intensity = intensity == null ? 1 : intensity;
    let disp = (0.28 + (seed % 19) * 0.018) * intensity;
    let erode = (0.48 + (seed % 13) * 0.022) * intensity;
    let worn = (0.06 + (seed % 9) * 0.009) * intensity;
    let eA = (1.15 + erode * 1.4).toFixed(2);
    let eB = (1.08 + erode * 0.42).toFixed(2);
    return `<filter id="${filterId}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.042 0.078" numOctaves="3" seed="${seed}" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="${disp.toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="disp"/>
        <feTurbulence type="turbulence" baseFrequency="0.62 0.85" numOctaves="2" seed="${(seed + 5) % 997}" result="grain"/>
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -${eA} ${eB}" result="speck"/>
        <feComposite in="disp" in2="speck" operator="in" result="ink"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.018 0.035" numOctaves="2" seed="${(seed + 17) % 997}" result="wornN"/>
        <feColorMatrix in="wornN" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${(1.35 * worn).toFixed(3)} ${(1 - worn * 0.28).toFixed(3)}" result="wornA"/>
        <feComposite in="ink" in2="wornA" operator="out" result="wornInk"/>
        <feComponentTransfer in="wornInk"><feFuncA type="linear" slope="0.965" intercept="0.018"/></feComponentTransfer>
    </filter>`;
}
function lbWrapPrintedInkHTML(innerHtml, styleObj) {
    styleObj = styleObj || {};
    if (styleObj.skipInk || styleObj.variant === 'editor') return innerHtml;
    let seed = lbPrintedInkSeed(styleObj.inkSeed || styleObj.itemId || 'lb');
    let fid = 'lbInk_' + seed + '_' + Math.random().toString(36).slice(2, 8);
    let vbW = Math.max(100, styleObj.viewW || 1000);
    let vbH = Math.max(100, styleObj.viewH || 1000);
    let intensity = styleObj.inkIntensity != null ? styleObj.inkIntensity : (0.85 + (seed % 5) * 0.03);
    return `<svg class="lb-printed-ink-svg ev-svg-text" viewBox="0 0 ${vbW} ${vbH}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;pointer-events:none;">
        <defs>${lbBuildPrintedInkFilterSVG(fid, seed, intensity)}</defs>
        <foreignObject width="${vbW}" height="${vbH}" filter="url(#${fid})" style="pointer-events:none;">
            <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;pointer-events:none;">${innerHtml}</div>
        </foreignObject>
    </svg>`;
}
window.lbPrintedInkSeed = lbPrintedInkSeed;
window.lbWrapPrintedInkHTML = lbWrapPrintedInkHTML;
function lbBoardTextRenderHTML(content, styleObj) {
    styleObj = styleObj || {};
    let font = styleObj.font || 'Courier New';
    let size = styleObj.fontSize || 16;
    let color = styleObj.color || '#111';
    let lineHeight = styleObj.lineHeight || 1.45;
    let extra = styleObj.extraStyle || '';
    let cls = styleObj.className || 'lb-board-text-render';
    let inner = `<div class="${cls}" style="width:100%;height:auto;min-height:100%;overflow:visible;font-family:${font};font-size:${size}px;color:${color};line-height:${lineHeight};white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;text-align:left;vertical-align:top;background:transparent;outline:none;border:none;box-sizing:border-box;${extra}">${content}</div>`;
    let langId = styleObj.documentLanguage || '';
    if (langId) inner = lbMaybeCipherHtml(inner, langId, styleObj.userId || (typeof game !== 'undefined' ? game.user.id : null));
    if (styleObj.skipInk || styleObj.variant === 'editor') return inner;
    return lbWrapPrintedInkHTML(inner, Object.assign({}, styleObj, {
        viewW: styleObj.viewW || 1000,
        viewH: styleObj.viewH || Math.round(1000 * (lineHeight || 1.45))
    }));
}
function lbDropCommentBoardTextHTML(content, styleObj) {
    styleObj = styleObj || {};
    return lbBoardTextRenderHTML(content, Object.assign({}, styleObj, {
        className: 'lb-drop-comment-board-text',
        lineHeight: 1.45,
        extraStyle: 'position:relative;width:100%;height:100%;min-height:100%;overflow:hidden;margin:0;' + (styleObj.extraStyle || '')
    }));
}
const LB_EV_EDITOR_REF = 320;
function lbEvidenceScaleFactor(itemOrW, itemH) {
    return 1;
}
function lbEvidenceScaledFontSize(item, fontSize) {
    return fontSize || item.fontSize || 22;
}
function lbEvidenceTextFieldStyle(item, fontSize, color, font) {
    let fs = lbEvidenceScaledFontSize(item, fontSize);
    let f = font || item.font || 'Caveat';
    let c = color || item.color || '#000000';
    return `font-family:'${f}',cursive;font-size:${fs}px;color:${c};`;
}
function lbEvidenceBoardTextHTML(content, styleObj) {
    styleObj = styleObj || {};
    let item = styleObj.item;
    let fs = item ? lbEvidenceScaledFontSize(item, styleObj.fontSize) : (styleObj.fontSize || 22);
    // Nested ink SVG inside foreignObject breaks board rendering — match editor preview 1:1 as plain HTML.
    return lbBoardTextRenderHTML(content, Object.assign({}, styleObj, {
        className: 'lb-ev-text-inner ev-svg-text',
        fontSize: fs,
        color: styleObj.color || '#000000',
        extraStyle: 'font-weight:bold;overflow:hidden;margin:0;padding:4%;-webkit-font-smoothing:subpixel-antialiased;text-rendering:geometricPrecision;' + (styleObj.extraStyle || ''),
        skipInk: true,
        variant: styleObj.variant || 'board'
    }));
}
function lbEvidenceTagInnerHTML(item, content, variant) {
    variant = variant || 'board';
    let postitIdx = (item.postit || 5) - 1;
    let postitUrl = LB_POSTIT_URLS[postitIdx] || LB_POSTIT_DEFAULT;
    let evHue = item.evHue !== undefined ? item.evHue : 0;
    let evSat = item.evSat !== undefined ? item.evSat : 100;
    let evCont = item.evCont !== undefined ? item.evCont : 100;
    let evFilter = `hue-rotate(${evHue}deg) saturate(${evSat}%) contrast(${evCont}%)`;
    let evColor = item.evColor || '';
    let evOpacity = item.evOpacity !== undefined ? item.evOpacity : 100;
    let evTint = evColor ? `<div class="lb-ev-tint" style="position:absolute;inset:0;background:${evColor};opacity:${(evOpacity / 100).toFixed(2)};mix-blend-mode:multiply;pointer-events:none;-webkit-mask:url('${postitUrl}') center/100% 100% no-repeat;mask:url('${postitUrl}') center/100% 100% no-repeat;"></div>` : '';
    let txPct = item.textXPct !== undefined ? item.textXPct : 10;
    let tyPct = item.textYPct !== undefined ? item.textYPct : 12;
    let twPct = item.textWPct !== undefined ? item.textWPct : 80;
    let thPct = item.textHPct !== undefined ? item.textHPct : 76;
    let evHasText = (item.richText && item.richText.trim()) || (item.text && String(item.text).trim());
    let evContent = content || (evHasText ? (item.richText || String(item.text).replace(/\n/g, '<br>')) : '01');
    let docLang = item.documentLanguage || '';
    if (variant !== 'editor' && docLang) evContent = lbMaybeCipherHtml(evContent, docLang);
    let textStyle = lbEvidenceTextFieldStyle(item, item.fontSize, item.color, item.font);
    let centerCls = item.textCenter ? ' lb-ev-text-field-centered' : '';
    let previewCls = variant === 'editor' ? ' lb-ev-text-preview' : ' lb-ev-text-inner ev-svg-text';
    let editable = variant === 'editor' ? ' contenteditable="true"' : '';
    let handles = '';
    let textHtml = lbEvidenceBoardTextHTML(evContent, { item: item, fontSize: item.fontSize, color: item.color, font: item.font, variant: variant === 'editor' ? 'editor' : 'board' });
    if (variant === 'editor') {
        textHtml = textHtml.replace('class="lb-ev-text-inner', 'id="ev-text-preview" class="lb-ev-text-inner lb-ev-text-preview" contenteditable="true"');
    }
    if (variant === 'board') {
        let iw = item.originalW || item.w || 150;
        let ih = item.originalH || item.h || 150;
        return `<svg class="lb-ev-board-svg" viewBox="0 0 ${iw} ${ih}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block;overflow:visible;pointer-events:none;shape-rendering:geometricPrecision;text-rendering:geometricPrecision;-webkit-font-smoothing:subpixel-antialiased;image-rendering:auto;">
            <foreignObject width="${iw}" height="${ih}" pointer-events="none">
                <div xmlns="http://www.w3.org/1999/xhtml" class="lb-ev-stage-inner" style="position:relative;width:${iw}px;height:${ih}px;background:url('${postitUrl}') center/100% 100% no-repeat;filter:${evFilter};box-sizing:border-box;">
                    ${evTint}
                    <div class="lb-ev-text-field lb-letter-rte${centerCls}" style="position:absolute;left:${txPct}%;top:${tyPct}%;width:${twPct}%;height:${thPct}%;box-sizing:border-box;overflow:hidden;pointer-events:none;">
                        ${textHtml}
                    </div>
                </div>
            </foreignObject>
        </svg>`;
    }
    let iw = item.originalW || item.w || 150;
    let ih = item.originalH || item.h || 150;
    return `<svg class="lb-ev-board-svg lb-ev-editor-svg" viewBox="0 0 ${iw} ${ih}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block;overflow:visible;">
        <foreignObject width="${iw}" height="${ih}">
            <div xmlns="http://www.w3.org/1999/xhtml" class="lb-ev-stage-inner" style="position:relative;width:${iw}px;height:${ih}px;background:url('${postitUrl}') center/100% 100% no-repeat;filter:${evFilter};box-sizing:border-box;">
                ${evTint}
                <div id="ev-text-field" class="lb-ev-text-field lb-letter-rte${centerCls}" style="position:absolute;left:${txPct}%;top:${tyPct}%;width:${twPct}%;height:${thPct}%;box-sizing:border-box;overflow:hidden;">
                    ${handles}${textHtml}
                </div>
            </div>
        </foreignObject>
    </svg>`;
}
const LB_DEFAULT_BLUEPRINTS = [];
function lbIsDefaultBlueprintId(id) {
    return LB_DEFAULT_BLUEPRINTS.some(function(b) { return b.id === id; });
}
window.lbIsDefaultBlueprintId = lbIsDefaultBlueprintId;
function lbGetAllBlueprints(store) {
    return ((store && store.blueprints) || []).filter(function(b) { return b && b.id && !lbIsDefaultBlueprintId(b.id); }).map(function(b) { return foundry.utils.deepClone(b); });
}
function lbScaleHtmlFontSizes(html, scale) {
    if (!html || !scale || scale === 1) return html || '';
    return String(html).replace(/font-size:\s*(\d+(?:\.\d+)?)(px|pt)/gi, function(_m, n, u) {
        return 'font-size:' + Math.max(1, Math.round(parseFloat(n) * scale)) + u;
    });
}
function lbBPBoardFontScale(item, iw) {
    if (!item) return 1;
    let editorW = item._editorW || 0;
    let boardW = iw || item.w || item.originalW || 0;
    if (editorW > 0 && boardW > 0) return boardW / editorW;
    return LB_DOC_BOARD_SPAWN_SCALE;
}
/** Board SVG viewBox dimensions — live element size for editors; baked docs use fixed bake reference. */
function lbDocDisplayDims(item) {
    return {
        w: Math.max(1, Math.round(item.w || item.originalW || 300)),
        h: Math.max(1, Math.round(item.h || item.originalH || 400))
    };
}
window.lbDocDisplayDims = lbDocDisplayDims;
/** Fixed viewBox for baked blueprint/document SVG — content scales as a graphic on resize. */
function lbDocBakedViewDims(item, faceData) {
    faceData = faceData || {};
    if (faceData.blueprintBakedW && faceData.blueprintBakedH) {
        return { w: faceData.blueprintBakedW, h: faceData.blueprintBakedH };
    }
    if (item && item.originalW && item.originalH) {
        return { w: item.originalW, h: item.originalH };
    }
    return lbDocDisplayDims(item);
}
window.lbDocBakedViewDims = lbDocBakedViewDims;
function lbBPStripModuleContent(mods) {
    return (mods || []).map(function(m) {
        let c = foundry.utils.deepClone(m);
        if (c.type === 'text') c.html = '';
        if (c.type === 'image') {
            c.imgSrc = '';
            delete c.scale; delete c.panX; delete c.panY; delete c.panFracX; delete c.panFracY;
        }
        return c;
    });
}
/** Clone blueprint modules for save — preserves exact preview layout & content. */
function lbBPCloneModulesForSave(mods) {
    return foundry.utils.deepClone(mods || []);
}
function lbEmitBlueprintToChat(bp) {
    if (!bp || typeof ChatMessage === 'undefined') return;
    let exportObj = foundry.utils.deepClone(bp);
    let json = JSON.stringify(exportObj, null, 2);
    let safe = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let name = (bp.name || 'Blueprint').replace(/</g, '&lt;');
    let msg = `<div class="lb-bp-chat-export" style="font-family:'Segoe UI',sans-serif;">
        <div style="font-family:'Cinzel',serif;color:#9ec8e8;font-weight:700;margin-bottom:8px;"><i class="fas fa-drafting-compass"></i> Blueprint saved: ${name}</div>
        <p style="font-size:11px;color:#9aa0aa;margin:0 0 8px;">Copy this JSON as a layout template for the next prompt:</p>
        <pre style="white-space:pre-wrap;max-height:520px;overflow:auto;font-size:10px;line-height:1.35;background:rgba(0,0,0,0.45);padding:10px;border-radius:8px;border:1px solid rgba(140,170,210,0.25);color:#dce8f5;margin:0;"><code>${safe}</code></pre>
    </div>`;
    ChatMessage.create({ content: msg, speaker: { alias: 'LoreBoard OS' }, whisper: [game.user.id] });
}
window.lbEmitBlueprintToChat = lbEmitBlueprintToChat;
function lbBPEnsureImageLayout(m, boxW, boxH) {
    if (!m || m.type !== 'image') return;
    if (!m.imgLayoutW || !m.imgLayoutH) {
        m.imgLayoutW = Math.max(1, Math.round(boxW || 1));
        m.imgLayoutH = Math.max(1, Math.round(boxH || 1));
    }
}
window.lbBPEnsureImageLayout = lbBPEnsureImageLayout;
/** WYSIWYG image transform inside a blueprint module box (matches Image Editor cropper). */
function lbBPImageImgStyle(m, boxW, boxH) {
    lbBPEnsureImageLayout(m, boxW, boxH);
    let layoutW = m.imgLayoutW || boxW || 1;
    let layoutH = m.imgLayoutH || boxH || 1;
    let s = m.scale || 1;
    let px = (m.panFracX != null) ? m.panFracX * layoutW : (m.panX || 0);
    let py = (m.panFracY != null) ? m.panFracY * layoutH : (m.panY || 0);
    let filt = m.filter || 'none';
    let maskExtra = '';
    if (m.frameStyle && lbIsDrawFrameStyle(m.frameStyle)) {
        let mu = lbDrawMaskUrl(m.frameStyle);
        maskExtra = `-webkit-mask:url('${mu}') center/100% 100% no-repeat;mask:url('${mu}') center/100% 100% no-repeat;`;
    }
    /* #6 WebP resize: GPU layer + stable transform to prevent flicker during blueprint module scaling */
    return `position:absolute;top:50%;left:50%;min-width:100%;min-height:100%;width:100%;height:100%;object-fit:cover;transform:translate3d(calc(-50% + ${px}px), calc(-50% + ${py}px), 0) scale(${s});transform-origin:center center;will-change:transform;backface-visibility:hidden;-webkit-backface-visibility:hidden;image-rendering:auto;filter:${filt};${maskExtra}pointer-events:none;`;
}
function lbBPImageModuleWrapStyle(m, boxW, boxH) {
    lbBPEnsureImageLayout(m, boxW, boxH);
    let lw = m.imgLayoutW || boxW || 1;
    let lh = m.imgLayoutH || boxH || 1;
    let sx = (boxW || lw) / lw;
    let sy = (boxH || lh) / lh;
    return `position:absolute;left:0;top:0;width:${lw}px;height:${lh}px;transform:scale(${sx},${sy});transform-origin:top left;overflow:hidden;pointer-events:none;`;
}
window.lbBPImageImgStyle = lbBPImageImgStyle;
window.lbBPImageModuleWrapStyle = lbBPImageModuleWrapStyle;
/** Single WYSIWYG builder for blueprint text/image modules (editor preview + board). */
function lbBuildBlueprintModulesHTML(modules, iw, ih, ctx) {
    ctx = ctx || {};
    let dtFont = ctx.font || 'Courier New';
    let sizeScale = ctx.sizeScale != null ? ctx.sizeScale : 1;
    let dtSize = Math.max(1, Math.round((ctx.fontSize || 16) * sizeScale));
    let dtColor = ctx.color || '#111';
    let inkSeed = ctx.inkSeed || '';
    let viewW = (iw || 300) * 10, viewH = (ih || 400) * 10;
    let baked = !!ctx.baked;
    let useInk = !!ctx.usePrintedInk;
    return (modules || []).map(function(m) {
        let xPx = Math.round(((m.xPct || 0) / 100) * (iw || 300));
        let yPx = Math.round(((m.yPct || 0) / 100) * (ih || 400));
        let wPx = Math.round(((m.wPct || 35) / 100) * (iw || 300));
        let hPx = Math.round(((m.hPct || 28) / 100) * (ih || 400));
        if (m.type === 'image') {
            let modW = wPx, modH = hPx;
            lbBPEnsureImageLayout(m, modW, modH);
            let layoutW = m.imgLayoutW || modW;
            let layoutH = m.imgLayoutH || modH;
            if (m.imgSrc) {
                let imgSrcEsc = String(m.imgSrc).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                let wrapStyle = lbBPImageModuleWrapStyle(m, modW, modH);
                let imgStyle = lbBPImageImgStyle(m, layoutW, layoutH);
                if (baked) {
                    return `<svg class="lb-bp-mod-image lb-bp-mod-baked" data-mod-id="${m.id || ''}" viewBox="0 0 ${modW} ${modH}" preserveAspectRatio="xMidYMid meet" style="position:absolute;left:${xPx}px;top:${yPx}px;width:${wPx}px;height:${hPx}px;overflow:hidden;pointer-events:auto;z-index:3;cursor:context-menu;display:block;"><foreignObject width="${modW}" height="${modH}"><div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${modW}px;height:${modH}px;overflow:hidden;"><div style="${wrapStyle}"><img src="${imgSrcEsc}" style="${imgStyle}"></div></div></foreignObject></svg>`;
                }
                return `<div class="lb-bp-mod-image" data-mod-id="${m.id || ''}" style="position:absolute;left:${m.xPct}%;top:${m.yPct}%;width:${m.wPct}%;height:${m.hPct}%;box-sizing:border-box;overflow:hidden;pointer-events:auto;z-index:3;cursor:context-menu;"><div style="${wrapStyle}"><img src="${imgSrcEsc}" style="${imgStyle}"></div></div>`;
            }
            return `<div class="lb-bp-mod-image lb-bp-mod-image-empty" data-mod-id="${m.id || ''}" style="position:absolute;left:${m.xPct}%;top:${m.yPct}%;width:${m.wPct}%;height:${m.hPct}%;box-sizing:border-box;overflow:hidden;pointer-events:none;z-index:3;background:rgba(0,0,0,0.05);border:1px dashed rgba(0,0,0,0.2);"></div>`;
        }
        if (m.type === 'text') {
            let txtHtml = m.html || '';
            if (sizeScale !== 1 && txtHtml) txtHtml = lbScaleHtmlFontSizes(txtHtml, sizeScale);
            let docLang = ctx.documentLanguage || '';
            if (docLang && txtHtml && baked) txtHtml = lbMaybeCipherHtml(txtHtml, docLang);
            let txtColor = m.color || dtColor;
            let modFontSize = Math.max(1, Math.round(m.fontSize ? m.fontSize * sizeScale : dtSize));
            let txtInner = `<div style="width:100%;height:100%;overflow:hidden;text-overflow:ellipsis;font-family:${m.font || dtFont};font-size:${modFontSize}px;color:${txtColor};line-height:1.45;word-wrap:break-word;overflow-wrap:break-word;position:relative;z-index:10;padding-top:1.45em;box-sizing:border-box;-webkit-font-smoothing:subpixel-antialiased;text-rendering:geometricPrecision;">${txtHtml || '<span style="opacity:0.35;">&#8203;</span>'}</div>`;
            if (baked) {
                /* Plain text in baked foreignObject — nested ink SVG breaks visibility in browsers. */
                return `<svg class="lb-bp-mod-text lb-bp-mod-baked" data-mod-id="${m.id || ''}" viewBox="0 0 ${wPx} ${hPx}" preserveAspectRatio="xMidYMid meet" style="position:absolute;left:${xPx}px;top:${yPx}px;width:${wPx}px;height:${hPx}px;overflow:visible;pointer-events:none;z-index:10;display:block;"><foreignObject width="${wPx}" height="${hPx}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${wPx}px;height:${hPx}px;overflow:visible;color:${txtColor};">${txtInner}</div></foreignObject></svg>`;
            }
            if (useInk && txtHtml.trim()) {
                return `<div class="lb-bp-mod-text" data-mod-id="${m.id || ''}" style="position:absolute;left:${m.xPct}%;top:${m.yPct}%;width:${m.wPct}%;height:${m.hPct}%;box-sizing:border-box;overflow:hidden;pointer-events:none;z-index:3;">${lbWrapPrintedInkHTML(txtInner, { inkSeed: inkSeed + (m.id || ''), viewW: viewW, viewH: viewH })}</div>`;
            }
            return `<div class="lb-bp-mod-text" data-mod-id="${m.id || ''}" style="position:absolute;left:${m.xPct}%;top:${m.yPct}%;width:${m.wPct}%;height:${m.hPct}%;box-sizing:border-box;overflow:hidden;pointer-events:none;z-index:3;">${txtInner}</div>`;
        }
        return '';
    }).join('');
}
window.lbBPStripModuleContent = lbBPStripModuleContent;
window.lbBPCloneModulesForSave = lbBPCloneModulesForSave;
window.lbBuildBlueprintModulesHTML = lbBuildBlueprintModulesHTML;
/** Bake blueprint modules to fixed SVG HTML at board dimensions (WYSIWYG with editor mirror). */
function lbBakeBlueprintFaceHtml(item, faceData, modules, iw, ih) {
    modules = (modules || []).filter(function(m) { return m.type !== 'alignLine'; });
    if (!modules.length) return '';
    let dtFont = (faceData && faceData.font) || (item && item.font) || 'Courier New';
    let bpScale = lbBPBoardFontScale(item, iw);
    let bpEditorFont = (item && item._editorFontSize) || Math.max(1, Math.round((((faceData && faceData.fontSize) || (item && item.fontSize) || 16)) / (bpScale || 1)));
    return lbBuildBlueprintModulesHTML(modules, iw, ih, {
        font: dtFont, fontSize: bpEditorFont,
        color: (faceData && faceData.color) || (item && item.color) || '#111',
        inkSeed: item && item.id,
        documentLanguage: (faceData && faceData.documentLanguage) || (item && item.documentLanguage) || '',
        usePrintedInk: true, baked: true,
        sizeScale: bpScale
    });
}
function lbWrapBlueprintBakedLayer(html, layoutW, layoutH) {
    if (!html) return '';
    layoutW = Math.max(1, Math.round(layoutW || 1));
    layoutH = Math.max(1, Math.round(layoutH || 1));
    return `<div class="lb-bp-board-baked-host" style="position:absolute;left:0;top:0;width:${layoutW}px;height:${layoutH}px;overflow:visible;pointer-events:none;z-index:10;">${html}</div>`;
}
window.lbWrapBlueprintBakedLayer = lbWrapBlueprintBakedLayer;
function lbResolveBlueprintBakedLayer(item, faceData, bpModules, iw, ih) {
    let cached = faceData && faceData.blueprintBakedHtml;
    if (cached) {
        return lbWrapBlueprintBakedLayer(cached, faceData.blueprintBakedW || iw, faceData.blueprintBakedH || ih);
    }
    let html = lbBakeBlueprintFaceHtml(item, faceData, bpModules, iw, ih);
    if (faceData && html) {
        faceData.blueprintBakedHtml = html;
        faceData.blueprintBakedW = iw;
        faceData.blueprintBakedH = ih;
    }
    return lbWrapBlueprintBakedLayer(html, iw, ih);
}
window.lbResolveBlueprintBakedLayer = lbResolveBlueprintBakedLayer;
function lbCommitBlueprintBake(item, faceData, modules) {
    if (!item || !faceData) return;
    let dims = lbDocDisplayDims(item);
    if (!item.originalW) item.originalW = dims.w;
    if (!item.originalH) item.originalH = dims.h;
    faceData.blueprintBakedHtml = lbBakeBlueprintFaceHtml(item, faceData, modules, dims.w, dims.h);
    faceData.blueprintBakedW = dims.w;
    faceData.blueprintBakedH = dims.h;
}
window.lbBakeBlueprintFaceHtml = lbBakeBlueprintFaceHtml;
window.lbCommitBlueprintBake = lbCommitBlueprintBake;
function lbCommitFramedImageBake(item) {
    if (!item || item.type !== 'framed-image') return;
    let imgSrc = item.customImg || item.imgSrc;
    if (!imgSrc || !window.lbBuildFramedImageBoardHTML) return;
    let dims = lbDocDisplayDims(item);
    item.framedImageBakedHtml = window.lbBuildFramedImageBoardHTML(item, imgSrc);
    item.framedImageBakedW = dims.w;
    item.framedImageBakedH = dims.h;
}
window.lbCommitFramedImageBake = lbCommitFramedImageBake;
/** Apply board-identical typography to a blueprint text module contenteditable (editor scale). */
function lbBPApplyEditorTextInnerStyle(inner, m, ctx) {
    if (!inner) return;
    ctx = ctx || {};
    let font = (m && m.font) || ctx.font || 'Courier New';
    let size = (m && m.fontSize) || ctx.fontSize || 16;
    let color = (m && m.color) || ctx.color || '#111111';
    inner.style.fontFamily = font;
    inner.style.fontSize = size + 'px';
    inner.style.color = color;
    inner.style.lineHeight = '1.45';
    inner.style.whiteSpace = 'pre-wrap';
    inner.style.wordWrap = 'break-word';
    inner.style.overflowWrap = 'break-word';
    inner.style.paddingTop = '0';
    inner.style.boxSizing = 'border-box';
    inner.style.position = 'absolute';
    inner.style.left = '0';
    inner.style.right = '0';
    inner.style.top = '0';
    inner.style.height = '100%';
    inner.style.maxHeight = '100%';
    inner.style.minHeight = '0';
    inner.style.overflow = 'hidden';
    inner.style.textOverflow = 'ellipsis';
    inner.style.outline = 'none';
    inner.style.border = 'none';
    inner.style.background = 'transparent';
    inner.style.caretColor = '#111';
    inner.style.textAlign = 'left';
}
window.lbBPApplyEditorTextInnerStyle = lbBPApplyEditorTextInnerStyle;
/** Apply board-identical typography to letter editor contenteditable (editor scale). */
function lbApplyLetterEditorInnerStyle(inner, ctx) {
    if (!inner) return;
    ctx = ctx || {};
    let font = ctx.font || 'Courier New';
    let size = ctx.fontSize || LB_DOC_DEFAULT_FONT_SIZE;
    let color = ctx.color || '#111111';
    let langId = ctx.documentLanguage || '';
    let displayFont = window.lbEditorDisplayFontFamily
        ? window.lbEditorDisplayFontFamily(font, langId)
        : font;
    inner.style.fontFamily = displayFont;
    inner.style.fontSize = size + 'px';
    inner.style.color = color;
    inner.style.lineHeight = '1.45';
    inner.style.whiteSpace = 'pre-wrap';
    inner.style.wordWrap = 'break-word';
    inner.style.overflowWrap = 'break-word';
    inner.style.padding = '8px 10px';
    inner.style.boxSizing = 'border-box';
    inner.style.textAlign = 'left';
    inner.style.verticalAlign = 'top';
    inner.style.outline = 'none';
    inner.style.border = 'none';
    inner.style.background = 'transparent';
    inner.style.caretColor = '#111';
}
window.lbApplyLetterEditorInnerStyle = lbApplyLetterEditorInnerStyle;
/** Shrink text (uniformly) until it fits inside a fixed editor text field. */
function lbFitEditorTextToField(inner, opts) {
    opts = opts || {};
    if (!inner) return opts.fontSize || LB_DOC_DEFAULT_FONT_SIZE;
    let minSize = opts.minSize || 6;
    let maxH = inner.clientHeight;
    let maxW = inner.clientWidth;
    if (maxH < 4 || maxW < 4) return opts.fontSize || LB_DOC_DEFAULT_FONT_SIZE;
    let baseSize = opts.fontSize || parseInt(inner.style.fontSize, 10) || LB_DOC_DEFAULT_FONT_SIZE;
    let size = baseSize;
    inner.style.overflow = 'hidden';
    inner.style.maxHeight = '100%';
    inner.style.height = '100%';
    inner.style.boxSizing = 'border-box';
    let guard = 0;
    while ((inner.scrollHeight > maxH + 1 || inner.scrollWidth > maxW + 1) && size > minSize && guard++ < 120) {
        size--;
        inner.style.fontSize = size + 'px';
        inner.querySelectorAll('[style*="font-size"], font[size]').forEach(function(el) {
            let n = parseFloat(el.style.fontSize);
            if (n > 0) el.style.fontSize = Math.max(minSize, Math.round(n * (size / baseSize))) + 'px';
            if (el.tagName === 'FONT') el.removeAttribute('size');
        });
    }
    if (opts.updateSizeSelect && size !== baseSize) {
        let sel = document.getElementById(opts.sizeSelectId || 'dc-size');
        if (sel) sel.value = String(size);
    }
    return size;
}
window.lbFitEditorTextToField = lbFitEditorTextToField;
function lbRteApplyLiveFont(area, fontFamily, displayFont) {
    if (!area || !fontFamily) return;
    displayFont = displayFont || fontFamily;
    area.focus();
    let sel = window.getSelection();
    let hasRange = sel && sel.rangeCount && !sel.getRangeAt(0).collapsed;
    if (hasRange && window.lbRteApplyFontName) {
        window.lbRteApplyFontName(area, fontFamily);
        area.style.fontFamily = displayFont;
    } else {
        area.style.fontFamily = displayFont;
        area.dataset.defaultFont = fontFamily;
        area.querySelectorAll('font, span, div, p, b, i, u, s').forEach(function(el) {
            if (!area.contains(el)) return;
            el.style.fontFamily = displayFont;
        });
    }
}
function lbRteApplyLiveSize(area, px) {
    if (!area || !px) return;
    px = Math.max(1, Math.round(px));
    area.focus();
    let sel = window.getSelection();
    let hasRange = sel && sel.rangeCount && !sel.getRangeAt(0).collapsed;
    if (hasRange && window.lbRteApplyFontSize) {
        window.lbRteApplyFontSize(area, px);
    } else {
        area.style.fontSize = px + 'px';
        area.dataset.defaultFontSize = String(px);
        area.querySelectorAll('[style*="font-size"], font[size]').forEach(function(el) {
            el.style.fontSize = px + 'px';
            if (el.tagName === 'FONT') el.removeAttribute('size');
        });
    }
}
function lbRteApplyLiveColor(area, color) {
    if (!area || !color) return;
    area.focus();
    area.dataset.userColored = '1';
    let sel = window.getSelection();
    let hasRange = sel && sel.rangeCount && !sel.getRangeAt(0).collapsed;
    if (hasRange) {
        try { document.execCommand('styleWithCSS', false, true); document.execCommand('foreColor', false, color); } catch (e) {}
    } else {
        area.style.color = color;
        area.dataset.defaultColor = color;
        area.querySelectorAll('font, span, div, p, b, i, u, s').forEach(function(el) {
            if (!area.contains(el)) return;
            el.style.color = color;
        });
    }
}
window.lbRteApplyLiveFont = lbRteApplyLiveFont;
window.lbRteApplyLiveSize = lbRteApplyLiveSize;
window.lbRteApplyLiveColor = lbRteApplyLiveColor;
/** Keep blueprint module boxes at fixed pixel size when the paper stage is resized. */
function lbBPLockModulesOnStageResize(modulesArr, oldW, oldH, newW, newH) {
    if (!modulesArr || !oldW || !oldH || !newW || !newH) return;
    if (Math.abs(oldW - newW) < 1 && Math.abs(oldH - newH) < 1) return;
    modulesArr.forEach(function(m) {
        if (m.type === 'alignLine') {
            if (m.orientation === 'horizontal') {
                let px = (m.posPct / 100) * oldH;
                m.posPct = (px / newH) * 100;
            } else {
                let px = (m.posPct / 100) * oldW;
                m.posPct = (px / newW) * 100;
            }
            return;
        }
        if (m.type !== 'text' && m.type !== 'image') return;
        let xPx = (m.xPct / 100) * oldW;
        let yPx = (m.yPct / 100) * oldH;
        let wPx = (m.wPct / 100) * oldW;
        let hPx = (m.hPct / 100) * oldH;
        m.xPct = (xPx / newW) * 100;
        m.yPct = (yPx / newH) * 100;
        m.wPct = (wPx / newW) * 100;
        m.hPct = (hPx / newH) * 100;
    });
    lbBPClampModulesToStage(modulesArr);
}
/** Clamp blueprint text/image modules inside the paper stage (bottom edge is a hard boundary). */
function lbBPClampModulesToStage(modulesArr) {
    if (!modulesArr) return;
    modulesArr.forEach(function(m) {
        if (m.type !== 'text' && m.type !== 'image') return;
        if (m.xPct < 0) m.xPct = 0;
        if (m.yPct < 0) m.yPct = 0;
        m.wPct = Math.max(2, Math.min(100 - m.xPct, m.wPct));
        m.hPct = Math.max(2, Math.min(100 - m.yPct, m.hPct));
        if (m.xPct + m.wPct > 100) m.xPct = Math.max(0, 100 - m.wPct);
        if (m.yPct + m.hPct > 100) m.yPct = Math.max(0, 100 - m.hPct);
    });
}
window.lbBPLockModulesOnStageResize = lbBPLockModulesOnStageResize;
window.lbBPClampModulesToStage = lbBPClampModulesToStage;
/** Build a single A4 text module for journal → Letter Style blueprint import. */
function lbJournalLetterBlueprintModules(title, bodyText) {
    let safeTitle = String(title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let safeBody = String(bodyText || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    let plain = (String(title || '') + (bodyText ? '\n' + bodyText : '')).trim();
    let maxChars = 2400;
    if (plain.length > maxChars) {
        plain = plain.substring(0, maxChars - 3).replace(/\s+\S*$/, '') + '...';
        let parts = plain.split('\n');
        safeTitle = parts[0] ? parts[0].replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
        safeBody = parts.slice(1).join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        if (!parts.slice(1).length) {
            safeBody = '';
            safeTitle = plain.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
    }
    let html = safeTitle ? `<p style="font-weight:bold;font-size:14px;margin:0 0 8px 0;">${safeTitle}</p><div>${safeBody}</div>` : `<div>${safeBody || safeTitle}</div>`;
    return [{
        id: foundry.utils.randomID(),
        type: 'text',
        xPct: 5,
        yPct: 5,
        wPct: 90,
        hPct: 90,
        html: html,
        font: 'Times New Roman',
        fontSize: 12,
        color: '#111111'
    }];
}
window.lbJournalLetterBlueprintModules = lbJournalLetterBlueprintModules;
function lbBoardFieldOverlayHTML(item, prefix, defaults, variant) {
    variant = variant || 'editor';
    return `<div class="lb-rmf-preview-field" data-rmf-prefix="${prefix}" style="position:absolute;box-sizing:border-box;outline:1px dashed rgba(212,175,55,0.45);pointer-events:auto;z-index:20;${lbRMFPctStyle(item, prefix, defaults)}">${lbRMFHandlesHTML(variant)}</div>`;
}
function lbBoardImageFieldOverlayHTML(item, prefix, defaults, variant) {
    variant = variant || 'editor';
    return `<div class="lb-rmf-preview-field" data-rmf-prefix="${prefix}" style="position:absolute;box-sizing:border-box;outline:1px dashed rgba(80,130,200,0.45);pointer-events:auto;z-index:20;${lbRMFPctStyle(item, prefix, defaults)}">${lbRMFHandlesHTML(variant)}</div>`;
}
function lbBoardImagePlaceholderSVG(ix, iy, iw, ih, rx) {
    return `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="${rx || 0}" fill="rgba(0,0,0,0.04)" stroke="rgba(0,0,0,0.22)" stroke-width="2" stroke-dasharray="8 6"/>
        <text x="${ix + iw / 2}" y="${iy + ih / 2}" text-anchor="middle" dominant-baseline="central" font-family="Special Elite, Courier New, monospace" font-size="${Math.max(12, Math.min(iw, ih) * 0.08)}" fill="rgba(0,0,0,0.35)">Upload Image</text>`;
}
function lbAttachLayerZIndex(item) {
    if (!item) return LB_LAYER_Z.ATTACH_PIN;
    let t = item.attachType;
    if (t === 'tape') return LB_LAYER_Z.ATTACH_TAPE;
    return LB_LAYER_Z.ATTACH_PIN;
}
window.lbQuestFieldDefaults = lbQuestFieldDefaults;
window.lbBoardTextRenderHTML = lbBoardTextRenderHTML;
window.lbDropCommentBoardTextHTML = lbDropCommentBoardTextHTML;
window.lbEvidenceBoardTextHTML = lbEvidenceBoardTextHTML;
window.lbEvidenceTagInnerHTML = lbEvidenceTagInnerHTML;
window.lbEvidenceScaledFontSize = lbEvidenceScaledFontSize;
window.lbEvidenceScaleFactor = lbEvidenceScaleFactor;
window.LB_EV_EDITOR_REF = LB_EV_EDITOR_REF;
window.lbBoardFieldOverlayHTML = lbBoardFieldOverlayHTML;
window.lbBoardImageFieldOverlayHTML = lbBoardImageFieldOverlayHTML;
window.lbBoardImagePlaceholderSVG = lbBoardImagePlaceholderSVG;
window.lbAttachLayerZIndex = lbAttachLayerZIndex;
window.lbRteResolveAreaColor = lbRteResolveAreaColor;
window.lbRMFHandlesHTML = lbRMFHandlesHTML;
window.lbRMFPctStyle = lbRMFPctStyle;
window.lbRMFBindField = lbRMFBindField;
window.lbRMFApplyRectPct = lbRMFApplyRectPct;
window.lbRMFRectFromItem = lbRMFRectFromItem;

async function lbRunPrintProgress(onComplete) {
    let prog = $('#lb-upload-progress'), bar = $('#lb-upload-bar'), txt = $('#lb-upload-text');
    if (!prog.length) { if (onComplete) await onComplete(); return; }
    txt.text('Printing Graphic...');
    prog.show(); bar.css({ width: '0%', transition: 'width 0.12s linear' });
    lbPlaySound('print', { loop: true, volume: 0.45 });
    let pct = 0;
    let crawl = setInterval(() => { if (pct < 92) { pct++; bar.css('width', pct + '%'); } }, 70);
    try {
        if (onComplete) await onComplete();
        clearInterval(crawl);
        bar.css('width', '100%');
        await new Promise(r => setTimeout(r, 350));
        lbFadeOutSound('print', 450);
        await new Promise(r => setTimeout(r, 200));
    } catch (err) {
        clearInterval(crawl);
        lbFadeOutSound('print', 300);
    } finally {
        prog.hide(); bar.css('width', '0%');
    }
}
// #15 Generic progress bar (reuses the print progress visual) but with a custom caption and NO sound.
async function lbRunSimpleProgress(caption, onComplete) {
    let prog = $('#lb-upload-progress'), bar = $('#lb-upload-bar'), txt = $('#lb-upload-text');
    if (!prog.length) { if (onComplete) await onComplete(); return; }
    txt.text(caption || 'Working...');
    prog.show(); bar.css({ width: '0%', transition: 'width 0.12s linear' });
    let pct = 0;
    let crawl = setInterval(() => { if (pct < 92) { pct += 2; bar.css('width', pct + '%'); } }, 45);
    try {
        if (onComplete) await onComplete();
        clearInterval(crawl);
        bar.css('width', '100%');
        await new Promise(r => setTimeout(r, 300));
    } catch (err) {
        clearInterval(crawl);
    } finally {
        prog.hide(); bar.css('width', '0%');
    }
}
window.lbRunSimpleProgress = lbRunSimpleProgress;

async function lbRunJukeboxUploadProgress(caption, onComplete, overlayEl) {
    let prog = $('#lb-upload-progress'), bar = $('#lb-upload-bar'), txt = $('#lb-upload-text');
    if (!prog.length) { if (onComplete) await onComplete(); return; }
    let hover = '#fff6c8';
    let ov = overlayEl && (overlayEl[0] || overlayEl);
    if (!ov || !ov.style) ov = document.getElementById('lb-jukebox-overlay');
    if (ov) hover = getComputedStyle(ov).getPropertyValue('--board-hover-color').trim() || hover;
    else {
        let app = document.getElementById('lb-app-root');
        if (app) hover = getComputedStyle(app).getPropertyValue('--board-hover-color').trim() || hover;
    }
    txt.text(caption || 'Preparing Sound');
    prog.css('border-color', hover);
    bar.css({ width: '0%', transition: 'width 0.12s linear', background: hover, boxShadow: '0 0 15px ' + hover });
    prog.show();
    let pct = 0;
    let crawl = setInterval(() => { if (pct < 92) { pct += 2; bar.css('width', pct + '%'); } }, 45);
    let blockUploadNotif = (notification, type, content) => {
        let msg = (typeof content === 'string' ? content : (content && content.message) || '').toLowerCase();
        if (/upload|uploaded|file picker|speicher|gespeichert/.test(msg)) return false;
    };
    Hooks.on('createNotification', blockUploadNotif);
    try {
        if (onComplete) await onComplete();
        clearInterval(crawl);
        bar.css('width', '100%');
        await new Promise(r => setTimeout(r, 300));
    } catch (err) {
        clearInterval(crawl);
    } finally {
        Hooks.off('createNotification', blockUploadNotif);
        prog.hide(); bar.css('width', '0%');
    }
}
window.lbRunJukeboxUploadProgress = lbRunJukeboxUploadProgress;
function lbAllowedAttachTypes(themeId, store) {
    let cfg = lbGetBoardFastenerConfig(store, themeId);
    let out = ['tape'];
    (cfg.allowedKinds || ['pin']).forEach(k => { if (!out.includes(k)) out.push(k); });
    return out;
}
function lbAttachTypeToInternal(type) {
    if (type === 'magnet' || type === 'nail') return 'pin';
    return type;
}
function lbInternalAttachMatchesKind(internal, kind) {
    if (kind === 'pin') return internal === 'pin';
    return internal === 'pin' || internal === kind;
}
function lbDefaultAttachType(itemType, themeId, store) {
    if (itemType === 'evidence') return 'none';
    if (itemType === 'midpin') return lbGetBoardFastenerKind(store, themeId);
    let cfg = lbGetBoardFastenerConfig(store, themeId);
    if (itemType === 'add-paper' || itemType === 'empty-sheet' || itemType === 'framed-image' || itemType === 'drag-text') {
        return cfg.allowTape ? 'tape' : (cfg.allowedKinds[0] || 'pin');
    }
    if (itemType === 'noir-newspaper' || itemType === 'polaroid' || itemType === 'actor-file') return lbGetBoardFastenerKind(store, themeId);
    return 'none';
}
function lbDefaultAttachVariant(themeId, store) {
    let cfg = lbGetBoardFastenerConfig(store, themeId);
    return cfg.defaultVariant || 1;
}
function lbSanitizeAttachType(aType, themeId, store) {
    let allowed = lbAllowedAttachTypes(themeId, store);
    let kind = lbGetBoardFastenerKind(store, themeId);
    if (aType === 'none' || !aType) return aType || 'none';
    if (aType === 'magnet' || aType === 'nail' || aType === 'pin') aType = kind;
    if (aType === 'tape') return allowed.includes('tape') ? 'tape' : kind;
    if (allowed.includes(aType)) return aType;
    return lbDefaultAttachType('framed-image', themeId, store);
}
function lbItemHasThread(item, threads) {
    if (!item || !item.id || !threads || !threads.length) return false;
    return threads.some(t => t.from === item.id || t.to === item.id);
}
function lbAttachMenuOptions(item, themeId, cur, threads, store, extraOpts) {
    return lbBuildAttachSelectOptions(themeId, store, Object.assign({
        includeNone: !(item && item.type === 'midpin'),
        includeTape: !(item && item.type === 'midpin'),
        forMidpin: !!(item && item.type === 'midpin'),
        curType: cur,
        curVariant: item && item.attachVariant,
        item, threads
    }, extraOpts || {}));
}
function lbParseAttachSelect(val, themeId, store) {
    if (!val || val === 'none') return { type: 'none', variant: null };
    let cfg = lbGetBoardFastenerConfig(store, themeId);
    if (String(val).indexOf('tape:') === 0) {
        let parts = val.split(':');
        if (parts.length >= 3 && LB_TAPE_DESIGNS[parts[1]]) {
            return { type: 'tape', variant: parseInt(parts[2], 10) || lbRandomAttachVariant(), tapeDesign: parts[1] };
        }
        return { type: 'tape', variant: parseInt(parts[1], 10) || lbRandomAttachVariant(), tapeDesign: cfg.tapeDesign };
    }
    if (val === 'tape') {
        return { type: 'tape', variant: lbRandomAttachVariant(), tapeDesign: cfg.tapeDesign };
    }
    if (String(val).indexOf(':') > -1) {
        let p = val.split(':');
        if (LB_FASTENER_SETS[p[0]]) {
            let setKey = p[0];
            let kind = 'pin';
            ['pin', 'magnet', 'nail'].forEach(function(k) {
                if ((LB_FASTENER_SET_GROUPS[k] || []).includes(setKey)) kind = k;
            });
            return { type: kind, variant: parseInt(p[1], 10) || 1, fastenerSet: setKey };
        }
        let type = p[0];
        let kind = lbGetBoardFastenerKind(store, themeId);
        if (type === 'magnet' || type === 'nail' || type === 'pin') type = kind;
        return { type, variant: parseInt(p[1], 10) || lbDefaultAttachVariant(themeId, store) };
    }
    let type = val;
    if (type === 'magnet' || type === 'nail' || type === 'pin') type = lbGetBoardFastenerKind(store, themeId);
    return { type, variant: lbDefaultAttachVariant(themeId, store) };
}
window.lbParseAttachSelect = lbParseAttachSelect;
window.lbApplyParsedAttach = lbApplyParsedAttach;
function lbApplyParsedAttach(item, parsed, themeId, store) {
    if (!item || !parsed) return;
    item.attachType = parsed.type;
    if (parsed.type === 'tape') {
        if (parsed.tapeDesign) item.tapeDesign = parsed.tapeDesign;
        item.attachVariant = parsed.variant || lbRandomAttachVariant();
        lbEnsureTapeDefaults(item, themeId, store);
    } else if (parsed.variant) {
        item.attachVariant = parsed.variant;
        if (parsed.fastenerSet) item.fastenerSet = parsed.fastenerSet;
        lbEnsureAttachVariant(item, themeId, store);
    }
}
function lbItemSkipsAttach(item) {
    if (!item) return true;
    if (item.attachType === 'none') return true;
    if (item.type === 'drag-text' && item.textOnly) return true;
    if (item.dropComment && (item.paper === 'transparent' || item.noPaper)) return true;
    return false;
}
function lbEditorAttachSelectHTML(themeId, item, selectId, threads, store) {
    lbEnsureAttachVariant(item, themeId, store);
    let itemType = item.type || 'drag-text';
    let cur = lbSanitizeAttachType(item.attachType || lbDefaultAttachType(itemType, themeId, store), themeId, store);
    let o = lbBuildAttachSelectOptions(themeId, store, {
        includeNone: false, includeTape: true, item, threads, curType: cur, curVariant: item.attachVariant
    });
    return `<div id="${selectId}-wrap" class="lb-ed-attach-wrap" style="display:flex; align-items:center; gap:8px;"><label class="theme-heading" style="font-size:12px; white-space:nowrap;">Fastening</label><select id="${selectId}" class="lb-attach-type-select">${o}</select></div>`;
}
window.lbPaperBgStyle = lbPaperBgStyle;
window.lbItemIsLandscape = lbItemIsLandscape;
window.lbFastenerSetLabel = lbFastenerSetLabel;
window.lbInitItemAttachDefaults = lbInitItemAttachDefaults;
window.lbGetBoardFastenerConfig = lbGetBoardFastenerConfig;
window.lbTapeImgSrc = lbTapeImgSrc;
window.lbGetBoardFastenerKind = lbGetBoardFastenerKind;
window.lbFastenerLabel = lbFastenerLabel;