'use strict';
// LOREBOARD - Editors, uploads and secrets
// ---------------------------------------------------------------------------
// Shared modern editor chrome: horizontal card layout, dynamic + always fully visible.
// ===========================================================================
// UNIFIED IMAGE UPLOAD — every image workflow (Stamp, Add Quest, Newspaper, …)
// supports both the Data Browser (FilePicker, docked left of the active menu)
// and native Drag & Drop, and always runs the print sound + progress animation.
// ===========================================================================
function lbDockFilePickerLeft(fp, anchorEl) {
    Hooks.once('renderFilePicker', (app, html) => {
        if (app !== fp) return;
        try {
            let root = html[0].closest('.app') || html[0];
            let a = (anchorEl && anchorEl.getBoundingClientRect) ? anchorEl.getBoundingClientRect() : null;
            requestAnimationFrame(() => {
                let pw = root.offsetWidth || 520;
                if (a) {
                    root.style.left = Math.max(8, a.left - pw - 14) + 'px';
                    root.style.top = Math.max(8, a.top) + 'px';
                }
            });
        } catch (e) {}
    });
}

function lbMaximizeFilePickerForUpload(fp) {
    Hooks.once('renderFilePicker', (app, html) => {
        if (app !== fp) return;
        try {
            let root = html[0].closest('.app') || html[0];
            requestAnimationFrame(() => {
                let w = Math.min(window.innerWidth * 0.92, 960);
                let h = Math.min(window.innerHeight * 0.88, 720);
                app.setPosition({
                    width: w,
                    height: h,
                    left: (window.innerWidth - w) / 2,
                    top: (window.innerHeight - h) / 2
                });
                root.style.setProperty('z-index', '10000120', 'important');
                if (app.bringToTop) app.bringToTop();
            });
        } catch (e) {}
    });
}
 
 // Default thread colour for newly created connections (light beige).
const LB_DEFAULT_THREAD_COLOR = '#e8dcc8';
// Global string thickness scale — 30% thinner than the prior default (was ×0.8).
const LB_THREAD_THICKNESS_SCALE = 0.56;

// ===========================================================================
// WINDOW UPLOAD MINIMIZE — deterministic state machine for ALL upload flows.
// When a file picker opens the owning window collapses to a thin title strip;
// on pick, cancel, or close the window is restored pixel-perfectly.
// ===========================================================================
const LB_UPLOAD_SESSIONS = new WeakMap();
const LB_USER_MIN_SESSIONS = new WeakMap();

function lbFindWindowEl(anchorEl) {
    let el = (anchorEl && anchorEl.closest) ? anchorEl.closest('.lb-ov-panel, .lb-ov-overlay .lb-ov-panel, .app.window-app, .window-app, .app') : null;
    if (el && el.classList.contains('lb-ov-overlay')) el = el.querySelector('.lb-ov-panel') || el;
    if (el) return el;
    let apps = Array.from(document.querySelectorAll('.lb-modern-dialog.app, .lb-modern-dialog.window-app, .lb-ov-panel'));
    return apps.length ? apps[apps.length - 1] : null;
}

function lbMinimizeWindowForUpload(anchorEl) {
    lbEnsureEditorCSS();
    let win = lbFindWindowEl(anchorEl);
    if (!win || win.dataset.lbUploadSession) return null;
    let titleEl = win.querySelector('.window-title') || win.querySelector('.lb-ov-title');
    let titleText = titleEl ? titleEl.textContent.trim() : 'Loreboard Editor';
    let state = {
        cssText: win.style.cssText,
        className: win.className,
        titleText,
        headerEl: win.querySelector('.window-header') || win.querySelector('.lb-ov-header'),
        headerHtml: null
    };
    if (state.headerEl) state.headerHtml = state.headerEl.innerHTML;
    win.dataset.lbUploadSession = '1';
    win.classList.add('lb-upload-minimized');
    LB_UPLOAD_SESSIONS.set(win, state);
    if (state.headerEl && titleEl) {
        titleEl.textContent = titleText;
        let hint = state.headerEl.querySelector('.lb-upload-hint');
        if (!hint) {
            hint = document.createElement('span');
            hint.className = 'lb-upload-hint';
            state.headerEl.appendChild(hint);
        }
        hint.textContent = ' — selecting file…';
    }
    win.style.setProperty('position', 'fixed', 'important');
    win.style.setProperty('top', '6px', 'important');
    win.style.setProperty('left', '50%', 'important');
    win.style.setProperty('transform', 'translateX(-50%)', 'important');
    win.style.setProperty('width', 'auto', 'important');
    win.style.setProperty('min-width', '280px', 'important');
    win.style.setProperty('max-width', '92vw', 'important');
    win.style.setProperty('height', 'auto', 'important');
    win.style.setProperty('max-height', '36px', 'important');
    win.style.setProperty('overflow', 'hidden', 'important');
    win.style.setProperty('z-index', '100010', 'important');
    return () => lbRestoreWindowFromUpload(win);
}

function lbRestoreWindowFromUpload(win) {
    if (!win || !win.dataset.lbUploadSession) return;
    let state = LB_UPLOAD_SESSIONS.get(win) || {};
    win.classList.remove('lb-upload-minimized');
    delete win.dataset.lbUploadSession;
    win.className = state.className || win.className;
    win.style.cssText = state.cssText || '';
    if (state.headerEl && state.headerHtml != null) state.headerEl.innerHTML = state.headerHtml;
    LB_UPLOAD_SESSIONS.delete(win);
}

// User-initiated minimize (title-bar button) — separate from upload minimize.
function lbToggleUserMinimize(win) {
    if (!win) return;
    if (win.classList.contains('lb-user-minimized')) {
        let st = LB_USER_MIN_SESSIONS.get(win);
        win.classList.remove('lb-user-minimized');
        if (st) { win.style.cssText = st.cssText || ''; win.className = st.className || win.className; }
        LB_USER_MIN_SESSIONS.delete(win);
        return;
    }
    LB_USER_MIN_SESSIONS.set(win, { cssText: win.style.cssText, className: win.className });
    win.classList.add('lb-user-minimized');
    win.style.setProperty('position', 'fixed', 'important');
    win.style.setProperty('top', '6px', 'important');
    win.style.setProperty('left', '50%', 'important');
    win.style.setProperty('transform', 'translateX(-50%)', 'important');
    win.style.setProperty('width', 'auto', 'important');
    win.style.setProperty('min-width', '220px', 'important');
    win.style.setProperty('height', 'auto', 'important');
    win.style.setProperty('max-height', '36px', 'important');
    win.style.setProperty('overflow', 'hidden', 'important');
}

function lbInstallWindowChrome() {
    if (window.__lbWindowChromeInstalled) return;
    window.__lbWindowChromeInstalled = true;
    lbEnsureEnterGuard();
    window.lbCleanupDialogState = function(app) {
        document.querySelectorAll('[data-lb-upload-session]').forEach(win => lbRestoreWindowFromUpload(win));
        // Do not clear active board placement — editor dialogs hand off to cursor placement mode.
        if (!window.lbPlacingDoc && !window.lbPlacingDocHandoff && !window.lbPlacingItem && !window.lbPlacingStamp && !window.lbPlacingSeal && !window.lbPlacingCopy) {
            window.lbPlacingSeal = null;
            window.lbPlacingStamp = null;
            window.lbPlacingItem = null;
            window.lbPlacingDoc = null;
            window.lbPlacingCopy = null;
            window.lbSealPlaceRMB = false;
            window.lbSealPlaceLMB = false;
            $('body').removeClass('lb-placing-seal lb-placing-stamp');
            let prev = document.getElementById('lb-cursor-preview');
            if (prev) prev.remove();
        }
        let prog = document.getElementById('lb-upload-progress');
        if (prog && prog.style) prog.style.display = 'none';
    };
    Hooks.on('renderDialog', (app, html) => {
        if (!html.hasClass('lb-modern-dialog')) return;
        let header = html.find('.window-header');
        if (!header.length || header.find('.lb-win-minimize').length) return;
        let closeBtn = header.find('.header-button.close, .close');
        let minBtn = $(`<a class="header-button control lb-win-minimize" title="Minimize"><i class="fas fa-window-minimize"></i></a>`);
        if (closeBtn.length) closeBtn.before(minBtn); else header.append(minBtn);
        minBtn.on('click', ev => { ev.preventDefault(); lbToggleUserMinimize(app.element[0]); });
        closeBtn.off('click.lbclose').on('click.lbclose', () => { window.lbCleanupDialogState(app); });
        lbFinalizeDocLangHeader(header);
    });
    Hooks.on('closeDialog', (app) => { window.lbCleanupDialogState && window.lbCleanupDialogState(app); });
    lbEnsureOverlayCSS();
    if (!document.getElementById('lb-window-chrome-css')) {
        let s = document.createElement('style');
        s.id = 'lb-window-chrome-css';
        s.textContent = `
        .lb-user-minimized .window-content, .lb-user-minimized .dialog-buttons { display:none !important; }
        .lb-user-minimized .window-header { display:flex !important; padding:6px 14px !important; min-height:34px; cursor:pointer; }
        .lb-ov-panel.lb-user-minimized .lb-ov-body, .lb-ov-panel.lb-user-minimized .lb-ov-progress { display:none !important; }
        .lb-ov-panel.lb-user-minimized { max-height:36px !important; overflow:hidden !important; }
        .lb-ov-header-actions { display:flex; align-items:center; gap:14px; margin-left:auto; flex-shrink:0; }
        .lb-ov-header .lb-ov-minimize { margin-left:0; margin-right:0; cursor:pointer; opacity:0.75; transition:opacity .15s; font-size:18px; color:#8a8a90; }
        .lb-ov-header .lb-ov-minimize:hover { opacity:1; color:#fff; }
        .lb-ov-header .lb-ov-close { flex-shrink:0; }`;
        document.head.appendChild(s);
    }
}

// Unified file-picker entry point — image, audio, or any future upload type.
function lbOpenFilePicker(opts) {
    opts = opts || {};
    let type = opts.type || 'any';
    let anchorEl = opts.anchorEl;
    let onPick = opts.callback || opts.onPick;
    let jukeboxUpload = !!opts.jukeboxUpload;
    let restore = jukeboxUpload ? null : lbMinimizeWindowForUpload(anchorEl);
    if (jukeboxUpload && opts.onShellMinimize) opts.onShellMinimize();
    let done = false;
    let finish = () => {
        if (done) return;
        done = true;
        if (restore) restore();
        if (jukeboxUpload && opts.onShellRestore) opts.onShellRestore();
    };
    let fp = new FilePicker({
        type,
        current: opts.current || '',
        callback: async (path) => {
            finish();
            try {
                if (type === 'image' && onPick && !jukeboxUpload) await lbRunPrintProgress(async () => {});
                if (onPick) await onPick(path);
            } catch (e) { }
        }
    });
    if (jukeboxUpload) lbMaximizeFilePickerForUpload(fp);
    else if (opts.dockLeft !== false) lbDockFilePickerLeft(fp, anchorEl);
    Hooks.once('closeFilePicker', (app) => { if (app === fp) finish(); });
    fp.render(true);
    return fp;
}

function lbMinimizeForUpload(anchorEl) { return lbMinimizeWindowForUpload(anchorEl); }
function lbRestoreFromUpload(win) { lbRestoreWindowFromUpload(win); }
window.lbMinimizeForUpload = lbMinimizeForUpload;
window.lbRestoreFromUpload = lbRestoreFromUpload;
window.lbOpenFilePicker = lbOpenFilePicker;
window.lbMinimizeWindowForUpload = lbMinimizeWindowForUpload;
window.lbRestoreWindowFromUpload = lbRestoreWindowFromUpload;

function lbUploadImage(onPick, anchorEl) {
    return lbOpenFilePicker({ type: 'image', callback: onPick, anchorEl });
}

function lbAttachImageDrop(el, onPick) {
    if (!el || el.dataset.lbDropBound) return;
    el.dataset.lbDropBound = '1';
    el.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); el.style.outline = '2px dashed var(--lb-accent,#d4af37)'; });
    el.addEventListener('dragleave', () => { el.style.outline = ''; });
    el.addEventListener('drop', e => {
        e.preventDefault(); e.stopPropagation(); el.style.outline = '';
        let restore = lbMinimizeWindowForUpload(el);
        let finish = () => { if (restore) restore(); };
        let dt = e.dataTransfer;
        let f = dt && dt.files && dt.files[0];
        if (f && f.type && f.type.startsWith('image/')) {
            let r = new FileReader();
            r.onload = async () => { try { await lbRunPrintProgress(async () => {}); if (onPick) onPick(r.result); } finally { finish(); } };
            r.onerror = finish;
            r.readAsDataURL(f);
            return;
        }
        let txt = dt ? dt.getData('text/plain') : '';
        if (txt) {
            let src = txt;
            try { let d = JSON.parse(txt); src = d.src || d.path || d.url || txt; } catch (_) {}
            if (src && /\.(png|jpe?g|webp|gif|svg)$/i.test(src)) {
                lbRunPrintProgress(async () => {}).then(() => { if (onPick) onPick(src); finish(); }).catch(finish);
            } else finish();
        } else finish();
    });
}

/** Drag-and-drop zone for multiple MP3 files (custom radio builder). */
function lbAttachAudioDrop(el, onFiles) {
    if (!el || el.dataset.lbAudioDropBound) return;
    el.dataset.lbAudioDropBound = '1';
    el.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => { el.classList.remove('drag-over'); });
    el.addEventListener('drop', e => {
        e.preventDefault(); e.stopPropagation(); el.classList.remove('drag-over');
        let dt = e.dataTransfer;
        let files = dt && dt.files ? Array.from(dt.files) : [];
        let mp3s = files.filter(f => (f.type && f.type.startsWith('audio/')) || /\.mp3$/i.test(f.name || ''));
        if (mp3s.length && onFiles) onFiles(mp3s);
    });
}

// Global Enter-key guard: inside any Loreboard editor/menu, Enter must NEVER confirm/close/save.
// Multi-line fields (textarea / contenteditable) keep their native newline; single-line inputs
// simply swallow Enter so the dialog's default button can't fire.
function lbEnsureEnterGuard() {
    if (window.__lbEnterGuard) return;
    window.__lbEnterGuard = true;
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey) return;
        let t = e.target;
        if (!t || !t.closest) return;
        if (!t.closest('.lb-modern-dialog, .lb-ed, #lb-app-root')) return;
        let tag = (t.tagName || '').toLowerCase();
        let editable = t.isContentEditable || tag === 'textarea';
        if (editable) { e.stopPropagation(); return; }            // allow newline, block submit
        if (tag === 'input') {
            let ty = (t.type || 'text').toLowerCase();
            if (['button','submit','checkbox','radio','range','color','file'].includes(ty)) return;
            e.preventDefault(); e.stopPropagation();               // single-line: never submit/close
            return;
        }
        if (tag === 'button' || tag === 'a' || t.closest('button, a')) return; // buttons keep native Enter
        // Anywhere else inside a Loreboard dialog: swallow Enter entirely. Foundry's
        // Dialog._onKeyDown would submit the "default" button — our dialogs often have
        // none, which crashes with "Cannot read properties of undefined (reading 'callback')".
        if (t.closest('.lb-modern-dialog')) { e.preventDefault(); e.stopPropagation(); }
    }, true);
}

function lbEnsureEditorCSS() { /* styles loaded via module.json */ }

function lbEnsureCreateBoardFonts() {
    if (document.getElementById('lb-create-board-fonts')) return;
    let link = document.createElement('link');
    link.id = 'lb-create-board-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap';
    document.head.appendChild(link);
}

function lbEnsureOverlayCSS() { /* styles loaded via module.json */ }

function lbOpenOverlay(opts) {
    lbEnsureOverlayCSS();
    $('#' + opts.id).remove();
    let ov = $(`
    <div class="lb-ov-overlay" id="${opts.id}">
        <div class="lb-ov-panel${opts.panelClass ? ' ' + opts.panelClass : ''}" style="width:${opts.width || 780}px;">
            <div class="lb-ov-header">
                <span class="lb-ov-title">${opts.title}</span>
                <div class="lb-ov-header-actions">
                    <i class="fas fa-window-minimize lb-ov-minimize" title="Minimize"></i>
                    <i class="fas fa-times lb-ov-close" title="Close"></i>
                </div>
            </div>
            <div class="lb-ov-body" style="${opts.bodyStyle || ''}">${opts.bodyHtml}</div>
            <div class="lb-ov-progress"><div class="lb-ov-progress-text">Printing Graphic...</div><div class="lb-ov-progress-bar"></div></div>
        </div>
    </div>`);
    $('body').append(ov);
    lbEyeCompanionSync('overlay-open');
    let close = () => ov.fadeOut(160, () => { ov.remove(); lbEyeCompanionSync('overlay-close'); });
    ov.find('.lb-ov-close').click(function() {
        if (window.lbCleanupDialogState) window.lbCleanupDialogState();
        close();
    });
    ov.find('.lb-ov-minimize').click(() => lbToggleUserMinimize(ov.find('.lb-ov-panel')[0]));
    ov.data('close', close);
    if (opts.onRender) opts.onRender(ov, close);
    return ov;
}

function lbRadialEyeHTML() {
    return `<div class="lb-radial-eye" aria-hidden="true">
        <div class="lb-radial-eye-float">
            <div class="lb-radial-eye-socket">
                <div class="lb-radial-eye-iris"><div class="lb-radial-eye-pupil"></div><div class="lb-radial-eye-shine"></div></div>
                <div class="lb-radial-eye-lid lb-radial-eye-lid-top"></div>
                <div class="lb-radial-eye-lid lb-radial-eye-lid-bot"></div>
            </div>
        </div>
    </div>`;
}

function lbRadialLaserOverlayHTML(accentRgb) {
    accentRgb = accentRgb || '212,175,55';
    return `<svg class="lb-radial-laser-overlay" style="--lb-accent-rgb:${accentRgb}" aria-hidden="true">
        <defs>
            <filter id="lb-radial-plasma-blur" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="4" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="lb-radial-plasma-bloom" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="1.6" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="lb-radial-beam-noise" x="-20%" y="-80%" width="140%" height="260%">
                <feTurbulence type="fractalNoise" baseFrequency="0.85 0.12" numOctaves="2" seed="4" result="n"/>
                <feDisplacementMap in="SourceGraphic" in2="n" scale="2.8" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
            <filter id="lb-radial-pupil-flare" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur stdDeviation="5" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
        </defs>
        <g class="lb-radial-laser-chains"></g>
        <g class="lb-radial-laser-hover-wrap" style="display:none"></g>
    </svg>`;
}

function lbRadialCreatePlasmaBeam(defs, accentRgb, kind) {
    accentRgb = accentRgb || '212,175,55';
    let uid = 'lbpg_' + Math.random().toString(36).slice(2, 10);
    let grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.setAttribute('id', uid);
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '100');
    grad.setAttribute('y2', '0');
    [['0%', `rgba(${accentRgb},0)`], ['18%', `rgba(${accentRgb},0.35)`], ['42%', `rgba(${accentRgb},0.82)`], ['50%', '#fffef8'], ['58%', `rgba(${accentRgb},0.78)`], ['82%', `rgba(${accentRgb},0.42)`], ['100%', `rgba(${accentRgb},0.08)`]].forEach(([off, col]) => {
        let stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop.setAttribute('offset', off);
        stop.setAttribute('stop-color', col);
        grad.appendChild(stop);
    });
    if (defs) defs.appendChild(grad);
    let g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'lb-radial-beam-group lb-radial-beam-' + (kind || 'chain'));
    let outer = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    outer.setAttribute('class', 'lb-radial-beam-outer');
    outer.setAttribute('stroke', `rgba(${accentRgb},0.42)`);
    outer.style.filter = 'url(#lb-radial-plasma-blur)';
    let plasma = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    plasma.setAttribute('class', 'lb-radial-beam-plasma');
    plasma.setAttribute('stroke', `url(#${uid})`);
    plasma.style.filter = 'url(#lb-radial-beam-noise)';
    let flicker = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    flicker.setAttribute('class', 'lb-radial-beam-flicker');
    flicker.setAttribute('stroke', `rgba(${accentRgb},0.65)`);
    let core = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    core.setAttribute('class', 'lb-radial-beam-core');
    core.setAttribute('stroke', '#fffef8');
    let flare = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    flare.setAttribute('class', 'lb-radial-beam-flare');
    flare.setAttribute('r', '6');
    let sparks = [];
    for (let i = 0; i < 10; i++) {
        let sp = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        sp.setAttribute('class', 'lb-radial-beam-spark');
        sp.setAttribute('r', '1.1');
        sparks.push(sp);
        g.appendChild(sp);
    }
    let impact = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    impact.setAttribute('class', 'lb-radial-beam-impact');
    impact.setAttribute('fill', `rgba(${accentRgb},0.92)`);
    impact.setAttribute('r', '5');
    g.appendChild(outer);
    g.appendChild(plasma);
    g.appendChild(flicker);
    g.appendChild(core);
    g.appendChild(flare);
    g.appendChild(impact);
    return { g: g, outer: outer, plasma: plasma, flicker: flicker, core: core, flare: flare, sparks: sparks, impact: impact, gradEl: grad, fromEl: null, toEl: null, isEye: kind === 'eye' };
}

function lbRadialPositionPlasmaBeamCoords(beam, ax, ay, bx, by, widths, phase, active) {
    if (!beam) return;
    let dx = bx - ax, dy = by - ay;
    let len = Math.hypot(dx, dy) || 1;
    let pulse = 0.5 + 0.5 * Math.sin(phase * 2.8);
    let pulse2 = 0.5 + 0.5 * Math.sin(phase * 5.3 + 0.8);
    let pulse3 = 0.5 + 0.5 * Math.sin(phase * 7.1 + 2.1);
    let wOuter = widths.outer * (0.86 + pulse * 0.22);
    let wPlasma = widths.plasma * (0.82 + pulse2 * 0.28);
    let wCore = widths.core * (0.75 + pulse3 * 0.35);
    let slide = (phase * 95) % (len + 60) - 30;
    let ux = dx / len, uy = dy / len;
    let gx1 = ax + ux * slide;
    let gy1 = ay + uy * slide;
    let gx2 = gx1 + ux * Math.min(len * 0.42, 90);
    let gy2 = gy1 + uy * Math.min(len * 0.42, 90);
    if (beam.gradEl) {
        beam.gradEl.setAttribute('x1', String(gx1));
        beam.gradEl.setAttribute('y1', String(gy1));
        beam.gradEl.setAttribute('x2', String(gx2));
        beam.gradEl.setAttribute('y2', String(gy2));
    }
    [beam.outer, beam.plasma, beam.flicker, beam.core].forEach((ln) => {
        ln.setAttribute('x1', ax);
        ln.setAttribute('y1', ay);
        ln.setAttribute('x2', bx);
        ln.setAttribute('y2', by);
    });
    beam.outer.setAttribute('stroke-width', wOuter.toFixed(2));
    beam.plasma.setAttribute('stroke-width', wPlasma.toFixed(2));
    beam.flicker.setAttribute('stroke-width', (wPlasma * 0.55).toFixed(2));
    beam.flicker.setAttribute('opacity', (0.25 + pulse2 * 0.45).toFixed(3));
    beam.core.setAttribute('stroke-width', wCore.toFixed(2));
    beam.core.setAttribute('opacity', (0.62 + pulse * 0.38).toFixed(3));
    beam.plasma.setAttribute('opacity', (0.55 + pulse2 * 0.4).toFixed(3));
    if (beam.flare) {
        beam.flare.setAttribute('cx', ax);
        beam.flare.setAttribute('cy', ay);
        beam.flare.setAttribute('r', ((widths.flare || 5) * (0.85 + pulse * 0.35)).toFixed(2));
    }
    if (beam.sparks) {
        beam.sparks.forEach((sp, i) => {
            let t = ((i / beam.sparks.length) + phase * 0.14 + Math.sin(i * 1.7) * 0.08) % 1;
            let flick = 0.35 + 0.65 * Math.abs(Math.sin(phase * 6 + i * 1.3));
            sp.setAttribute('cx', (ax + dx * t).toFixed(2));
            sp.setAttribute('cy', (ay + dy * t).toFixed(2));
            sp.setAttribute('r', (0.6 + flick * 1.4).toFixed(2));
            sp.setAttribute('opacity', (flick * 0.75).toFixed(3));
        });
    }
    beam.impact.setAttribute('cx', bx);
    beam.impact.setAttribute('cy', by);
    beam.impact.setAttribute('r', (3.5 + pulse * 4 + (widths.impact || 0)).toFixed(2));
    beam.g.classList.toggle('lb-radial-beam-active', !!active);
}

function lbRadialPositionPlasmaBeam(beam, fromEl, toEl, widths, phase, active) {
    if (!beam || !fromEl || !toEl) return;
    let a = lbRadialElCenter(fromEl);
    let b = lbRadialElCenter(toEl);
    lbRadialPositionPlasmaBeamCoords(beam, a.x, a.y, b.x, b.y, widths, phase, active);
    beam.fromEl = fromEl;
    beam.toEl = toEl;
}

function lbRadialTipText(opt) {
    return String(opt.tip || opt.label || '').replace(/"/g, '&quot;');
}

function lbRadialElCenter(el) {
    if (!el || !el.getBoundingClientRect) return { x: 0, y: 0 };
    let r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function lbRadialIsSubNode(el) {
    return !!(el && el.classList && el.classList.contains('lb-cf-sub-node'));
}

/** Tier-2+ radial menus: permanent chain is eye→tier1 only; tier1→hovered sub via hover beam. */
function lbRadialBuildHoverOnlyChain(nodesEl) {
    nodesEl = (nodesEl || []).filter(el => el && document.body.contains(el));
    let hasSubs = nodesEl.some(lbRadialIsSubNode);
    let segments = [];
    let chainList = [];
    if (hasSubs) {
        let tier1 = nodesEl.find(el => !lbRadialIsSubNode(el));
        if (tier1) {
            segments.push({ from: 'eye', to: tier1 });
            chainList = [tier1];
        }
    } else if (nodesEl.length) {
        segments.push({ from: 'eye', to: nodesEl[0] });
        for (let i = 1; i < nodesEl.length; i++) segments.push({ from: nodesEl[i - 1], to: nodesEl[i] });
        chainList = nodesEl.slice();
    }
    return { chainList, segments };
}

function lbRadialHoverBeamFrom(ov, hoveredEl, chainNodes, pupilEl) {
    if (!hoveredEl) return pupilEl;
    let $h = $(hoveredEl);
    if ($h.hasClass('lb-cf-sub-node')) {
        let parents = ov.find('.lb-cd-selected').filter(function() { return this !== hoveredEl; });
        if (parents.length) return parents.last()[0];
        if (chainNodes.length) return chainNodes[0];
        return pupilEl;
    }
    if (ov.find('.lb-cf-sub-node').length > 0) return null;
    return chainNodes.length ? chainNodes[chainNodes.length - 1] : pupilEl;
}

function lbInitRadialHubInteraction(ov, opts) {
    opts = opts || {};
    let eye = ov.find('.lb-radial-eye').first();
    let socket = eye.find('.lb-radial-eye-socket');
    let iris = eye.find('.lb-radial-eye-iris');
    let pupil = eye.find('.lb-radial-eye-pupil');
    let accentRgb = opts.accentRgb || (ov.css('--lb-accent-rgb') || '212,175,55').replace(/\s/g, '');
    let laserSvg = $(lbRadialLaserOverlayHTML(accentRgb)).appendTo('body');
    let laserDefs = laserSvg.find('defs')[0];
    let chainGroup = laserSvg.find('.lb-radial-laser-chains');
    let hoverWrap = laserSvg.find('.lb-radial-laser-hover-wrap');
    let hoverBeam = lbRadialCreatePlasmaBeam(laserDefs, accentRgb, 'eye');
    hoverWrap[0].appendChild(hoverBeam.g);
    let chainBeams = [];
    let tip = $('<div class="lb-radial-cursor-tip"></div>').appendTo('body');
    const MAX_IRIS_OFFSET = 34;
    const PUPIL_MAX_OFFSET = 14;
    let targetIx = 0, targetIy = 0, curIx = 0, curIy = 0;
    let targetPx = 0, targetPy = 0, curPx = 0, curPy = 0;
    let targetRx = 0, targetRy = 0, curRx = 0, curRy = 0;
    let hoveredNode = null;
    let hoverEngaged = false;
    let directionLocked = false;
    let lockedAimEl = null;
    let chainNodes = [];
    let chainSegments = [];
    let chainDepth = 0;
    let blinkTimer = null;
    let rafId = null;
    let alive = true;
    let beamPhase = 0;
    let hitTimer = null;
    let leaveTimer = null;
    let suspended = false;

    function refreshEngagedVisuals() {
        let on = hoverEngaged || chainDepth > 0;
        eye.toggleClass('lb-radial-eye-engaged', on);
        socket.toggleClass('lb-radial-eye-engaged', on);
    }

    function setChainDepth(n) {
        chainDepth = Math.max(0, n);
        ov[0].style.setProperty('--lb-chain-depth', String(chainDepth));
        laserSvg[0].style.setProperty('--lb-chain-depth', String(chainDepth));
        refreshEngagedVisuals();
    }

    function beamWidths(kind, extra) {
        let boost = chainDepth * 0.45 + (extra || 0);
        if (kind === 'eye') return { outer: 4.5 + boost, plasma: 1.8 + boost * 0.55, core: 0.65 + boost * 0.18, impact: 2 + boost * 0.35, flare: 5 + boost * 0.6 };
        return { outer: 3 + boost * 0.7, plasma: 1.2 + boost * 0.4, core: 0.45 + boost * 0.12, impact: 1.5 + boost * 0.25, flare: 0 };
    }

    function triggerLaserHit(el) {
        if (!el) return;
        let $el = $(el);
        $el.addClass('lb-radial-laser-hit');
        if (hitTimer) clearTimeout(hitTimer);
        hitTimer = setTimeout(() => { if (alive) $el.removeClass('lb-radial-laser-hit'); }, 520);
    }

    function aimAtPoint(clientX, clientY) {
        let anchor = lbRadialElCenter(socket.length ? socket[0] : eye[0]);
        let dx = clientX - anchor.x;
        let dy = clientY - anchor.y;
        let angle = Math.atan2(dy, dx);
        let dist = Math.min(MAX_IRIS_OFFSET, Math.hypot(dx, dy) * 0.14);
        targetIx = Math.cos(angle) * dist;
        targetIy = Math.sin(angle) * dist;
        let pDist = Math.min(PUPIL_MAX_OFFSET, Math.hypot(dx, dy) * 0.05);
        targetPx = Math.cos(angle) * pDist;
        targetPy = Math.sin(angle) * pDist;
        targetRx = Math.max(-14, Math.min(14, dy * 0.035));
        targetRy = Math.max(-16, Math.min(16, -dx * 0.035));
    }

    function aimAtElement(el) {
        if (!el) return;
        let c = lbRadialElCenter(el);
        aimAtPoint(c.x, c.y);
    }

    function resolveAimTarget() {
        if (directionLocked && lockedAimEl && document.body.contains(lockedAimEl)) return lockedAimEl;
        if (hoverEngaged && hoveredNode && hoveredNode.length) return hoveredNode[0];
        return null;
    }

    function refreshChainMarks() {
        ov.find('.lb-radial-chain-linked').removeClass('lb-radial-chain-linked');
        chainNodes.forEach((n) => { if (n && document.body.contains(n)) $(n).addClass('lb-radial-chain-linked'); });
    }

    function rebuildChainLines() {
        chainGroup.empty();
        chainBeams = [];
        chainSegments.forEach((seg) => {
            let fromEl = seg.from === 'eye' ? pupil[0] : seg.from;
            let toEl = seg.to;
            if (!fromEl || !toEl) return;
            let beam = lbRadialCreatePlasmaBeam(laserDefs, accentRgb, seg.from === 'eye' ? 'eye' : 'chain');
            chainGroup[0].appendChild(beam.g);
            chainBeams.push({ beam: beam, fromEl: fromEl, toEl: toEl, isEye: seg.from === 'eye' });
        });
    }

    function setChain(nodes, segments) {
        chainNodes = (nodes || []).filter(Boolean);
        chainSegments = (segments || []).slice();
        setChainDepth(chainSegments.length);
        refreshChainMarks();
        rebuildChainLines();
        if (chainNodes.length) triggerLaserHit(chainNodes[chainNodes.length - 1]);
    }

    function lockDirectionTo(el) {
        directionLocked = true;
        lockedAimEl = el || null;
        if (lockedAimEl) aimAtElement(lockedAimEl);
    }

    function unlockDirection() {
        directionLocked = false;
        lockedAimEl = null;
    }

    function setEngaged(on) {
        hoverEngaged = !!on && !suspended;
        refreshEngagedVisuals();
        if (!hoverEngaged) hoverWrap.hide();
    }

    function suspend() {
        suspended = true;
        hoverEngaged = false;
        hoveredNode = null;
        hoverWrap.hide();
        tip.removeClass('visible');
        laserSvg.css('visibility', 'hidden');
        ov.find('.lb-radial-focused').removeClass('lb-radial-focused');
        refreshEngagedVisuals();
    }

    function resume() {
        suspended = false;
        laserSvg.css('visibility', 'visible');
    }

    function updateLaserPositions() {
        if (suspended) return;
        chainBeams.forEach((entry) => {
            let kind = entry.isEye ? 'eye' : 'chain';
            lbRadialPositionPlasmaBeam(entry.beam, entry.fromEl, entry.toEl, beamWidths(kind), beamPhase, true);
        });
        if (hoverEngaged && hoveredNode && hoveredNode.length) {
            let fromEl = lbRadialHoverBeamFrom(ov, hoveredNode[0], chainNodes, pupil[0]);
            if (fromEl) {
                let toEl = hoveredNode[0];
                let isEyeShot = fromEl === pupil[0] && !chainNodes.length;
                lbRadialPositionPlasmaBeam(hoverBeam, fromEl, toEl, beamWidths(isEyeShot ? 'eye' : 'chain', 0.35), beamPhase + 0.4, true);
                hoverWrap.show();
            } else {
                hoverWrap.hide();
            }
        }
    }

    function scheduleBlink() {
        if (!alive) return;
        let delay = 1800 + Math.random() * 5200;
        blinkTimer = setTimeout(() => {
            if (!alive) return;
            eye.addClass('lb-radial-eye-blink');
            setTimeout(() => { if (alive) eye.removeClass('lb-radial-eye-blink'); }, 280);
            scheduleBlink();
        }, delay);
    }

    function tick() {
        if (!alive) return;
        if (!suspended) {
            let aimEl = resolveAimTarget();
            if (aimEl) aimAtElement(aimEl);
            curIx += (targetIx - curIx) * 0.16;
            curIy += (targetIy - curIy) * 0.16;
            curPx += (targetPx - curPx) * 0.18;
            curPy += (targetPy - curPy) * 0.18;
            curRx += (targetRx - curRx) * 0.11;
            curRy += (targetRy - curRy) * 0.11;
            iris.css('transform', `translate3d(${curIx.toFixed(2)}px,${curIy.toFixed(2)}px,0)`);
            pupil.css('transform', `translate3d(${curPx.toFixed(2)}px,${curPy.toFixed(2)}px,0)`);
            let sc = (hoverEngaged || chainDepth > 0) ? 1.08 : 1;
            eye.css('transform', `rotateX(${curRx.toFixed(2)}deg) rotateY(${curRy.toFixed(2)}deg) scale(${sc})`);
            beamPhase += 0.055;
            updateLaserPositions();
        }
        rafId = requestAnimationFrame(tick);
    }

    ov.on('mousemove.radialhub', function(e) {
        if (tip.hasClass('visible')) tip.css({ left: (e.clientX + 18) + 'px', top: (e.clientY + 14) + 'px' });
        if (!directionLocked && !hoverEngaged && eye.length) aimAtPoint(e.clientX, e.clientY);
    });

    ov.on('mouseenter.radialhub', '.lb-cd-node, .lb-cf-node', function(e) {
        if (suspended) return;
        if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
        if ($(this).hasClass('lb-cf-dimmed') && !$(this).hasClass('lb-cf-selected') && (parseInt($(this).data('level')) || 1) > 1) return;
        hoveredNode = $(this);
        setEngaged(true);
        aimAtElement(this);
        triggerLaserHit(this);
        let t = hoveredNode.attr('data-tip') || hoveredNode.data('tip');
        if (t) {
            tip.text(t).addClass('visible');
            tip.css({ left: (e.clientX + 18) + 'px', top: (e.clientY + 14) + 'px' });
        }
        ov.find('.lb-radial-focused').not(this).removeClass('lb-radial-focused');
        hoveredNode.addClass('lb-radial-focused');
    });

    ov.on('mouseleave.radialhub', '.lb-cd-node, .lb-cf-node', function() {
        let el = this;
        if (leaveTimer) clearTimeout(leaveTimer);
        leaveTimer = setTimeout(() => {
            if (hoveredNode && hoveredNode[0] === el) {
                hoveredNode = null;
                setEngaged(false);
                tip.removeClass('visible');
            }
            if (!$(el).hasClass('lb-radial-chain-linked')) $(el).removeClass('lb-radial-focused');
        }, 48);
    });

    ov.on('click.radialhub', '.lb-cd-node, .lb-cf-node', function() {
        if ($(this).hasClass('lb-cf-dimmed') && !$(this).hasClass('lb-cf-selected') && (parseInt($(this).data('level')) || 1) > 1) return;
        lockDirectionTo(this);
        setEngaged(true);
        triggerLaserHit(this);
        hoveredNode = $(this);
        $(this).addClass('lb-radial-focused');
    });

    $(window).on('resize.radialhub scroll.radialhub', updateLaserPositions);

    let cleanup = () => {
        alive = false;
        if (rafId) cancelAnimationFrame(rafId);
        if (blinkTimer) clearTimeout(blinkTimer);
        if (hitTimer) clearTimeout(hitTimer);
        if (leaveTimer) clearTimeout(leaveTimer);
        tip.remove();
        laserSvg.remove();
        $(window).off('.radialhub');
        ov.off('.radialhub');
    };
    ov.on('remove.radialhub', cleanup);
    ov.data('radialCleanup', cleanup);
    scheduleBlink();
    tick();
    return {
        destroy: cleanup,
        setChain: setChain,
        lockDirectionTo: lockDirectionTo,
        unlockDirection: unlockDirection,
        setChainDepth: setChainDepth,
        refreshLasers: updateLaserPositions,
        getPupilEl: () => pupil[0],
        suspend: suspend,
        resume: resume
    };
}

function lbInitInvMagicInkLaser(accentRgb) {
    accentRgb = accentRgb || '155,48,255';
    let laserSvg = $(lbRadialLaserOverlayHTML(accentRgb)).appendTo('body');
    laserSvg.addClass('lb-inv-magic-ink-laser');
    let laserDefs = laserSvg.find('defs')[0];
    let chainGroup = laserSvg.find('.lb-radial-laser-chains');
    let hoverWrap = laserSvg.find('.lb-radial-laser-hover-wrap');
    let eyeBeam = lbRadialCreatePlasmaBeam(laserDefs, accentRgb, 'eye');
    let docBeam = lbRadialCreatePlasmaBeam(laserDefs, accentRgb, 'chain');
    chainGroup[0].appendChild(eyeBeam.g);
    hoverWrap[0].appendChild(docBeam.g);
    hoverWrap.show();
    let alive = true;
    let rafId = null;
    let beamPhase = 0;
    let toolEl = null;
    let targetX = 0;
    let targetY = 0;

    function getEyePupil() {
        return document.querySelector('#lb-investigation-cursor .lb-radial-eye-pupil') ||
            document.querySelector('#lb-investigation-cursor .lb-radial-eye-socket') ||
            document.getElementById('lb-investigation-cursor');
    }

    function beamWidths(kind, extra) {
        let boost = extra || 0;
        if (kind === 'eye') return { outer: 4.2 + boost, plasma: 1.7 + boost * 0.5, core: 0.62 + boost * 0.16, impact: 2 + boost * 0.3, flare: 5 + boost * 0.55 };
        return { outer: 2.8 + boost * 0.65, plasma: 1.1 + boost * 0.38, core: 0.42 + boost * 0.11, impact: 1.6 + boost * 0.22, flare: 0 };
    }

    function tick() {
        if (!alive) return;
        let pupil = getEyePupil();
        if (pupil && toolEl) {
            lbRadialPositionPlasmaBeam(eyeBeam, pupil, toolEl, beamWidths('eye'), beamPhase, true);
            let tc = lbRadialElCenter(toolEl);
            lbRadialPositionPlasmaBeamCoords(docBeam, tc.x, tc.y, targetX, targetY, beamWidths('chain', 0.25), beamPhase + 0.35, true);
        }
        beamPhase += 0.055;
        rafId = requestAnimationFrame(tick);
    }

    function cleanup() {
        alive = false;
        if (rafId) cancelAnimationFrame(rafId);
        laserSvg.remove();
    }

    tick();
    return {
        destroy: cleanup,
        setToolEl: (el) => { toolEl = el || null; },
        setTarget: (x, y) => { targetX = x || 0; targetY = y || 0; }
    };
}

function lbBuildMagicInkEffectFilter(adj) {
    adj = Object.assign({ bright: 118, cont: 122, sat: 240, hue: 278, opacity: 92 }, adj || {});
    return `brightness(${adj.bright}%) contrast(${adj.cont}%) saturate(${adj.sat}%) hue-rotate(${adj.hue}deg) opacity(${(adj.opacity / 100).toFixed(2)})`;
}
function lbMagicInkEffectFilter(ink, uvTint) {
    ink = ink || {};
    if (uvTint) return LB_MAGIC_INK_PURPLE_CSS_FILTER;
    let b = ink.bright != null ? ink.bright : 100;
    let c = ink.cont != null ? ink.cont : 100;
    let s = ink.sat != null ? ink.sat : 100;
    let hue = ink.hue != null ? ink.hue : (ink.tint != null ? ink.tint : 0);
    let op = ink.opacity != null ? ink.opacity : 100;
    let ex = ink.exposure != null ? ink.exposure : 100;
    return `brightness(${(b * ex / 100).toFixed(1)}%) contrast(${c}%) saturate(${s}%) hue-rotate(${hue}deg) opacity(${(op / 100).toFixed(2)})`;
}
function lbMagicInkEffectInnerHTML(ink, opts) {
    if (!ink || !ink.imgSrc) return '';
    opts = opts || {};
    let src = String(ink.imgSrc).replace(/"/g, '&quot;');
    let customFilter = lbMagicInkEffectFilter(ink, !!opts.uvTint);
    if (opts.uvTint) {
        let fid = 'lbPurpleInk_' + String(ink.id || foundry.utils.randomID()).replace(/[^a-zA-Z0-9_-]/g, '');
        // UV reveal: the purple recolor must always win. A CSS filter in `style` overrides the
        // SVG filter attribute, so the inline filter IS the purple tint (never the ink's own
        // color adjustments); the feColorMatrix filter attribute stays as a fallback layer.
        return `<svg class="lb-inv-ink-effect-svg lb-magic-ink-tinted" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" style="display:block;pointer-events:none;overflow:visible;">
        <defs><filter id="${fid}" color-interpolation-filters="sRGB">
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0.78 0 0 0 0 0.08 0 0 0 0 1 0 0 0 1 0"/>
            <feComponentTransfer><feFuncR type="discrete" tableValues="0.78"/><feFuncG type="discrete" tableValues="0.08"/><feFuncB type="discrete" tableValues="1"/></feComponentTransfer>
        </filter></defs>
        <image class="lb-inv-ink-effect" href="${src}" xlink:href="${src}" width="100" height="100" preserveAspectRatio="xMidYMid meet" filter="url(#${fid})" style="mix-blend-mode:normal;opacity:1;filter:${LB_MAGIC_INK_PURPLE_CSS_FILTER};"/>
    </svg>`;
    }
    return `<img class="lb-inv-ink-effect lb-inv-ink-effect-plain" src="${src}" alt="" style="width:100%;height:100%;object-fit:contain;display:block;pointer-events:none;border:none;background:transparent;filter:${customFilter};">`;
}
const LB_SECRET_INK_DEFAULT_ADJ = { bright: 130, cont: 118, sat: 180, exposure: 118, tint: 262, style: 'none' };
window.LB_SECRET_INK_DEFAULT_ADJ = LB_SECRET_INK_DEFAULT_ADJ;
const LB_UV_INK_GLOW = {
    text: '#f3e8ff',
    glow1: '#e9d5ff',
    glow2: '#c77dff',
    glow3: '#a855f7',
    glow4: 'rgba(155,48,255,0.82)'
};
function lbInkRotStyle(ink) {
    if (!ink) return '';
    let rot = ink.rot != null ? ink.rot : ink.rotation;
    if (rot == null || Math.abs(rot) < 0.01) return '';
    return `transform:rotate(${rot}deg);transform-origin:center center;`;
}
function lbUvInkTextStyle(fontFam, fontSize, visible) {
    let base = `font-family:'${fontFam}';font-size:${fontSize}px;line-height:1.35;word-wrap:break-word;overflow-wrap:break-word;white-space:pre-wrap;overflow:visible;background:transparent;border:none;box-sizing:border-box;`;
    if (visible) {
        return base + `color:${LB_UV_INK_GLOW.text};opacity:1;visibility:visible;text-shadow:0 0 8px ${LB_UV_INK_GLOW.glow1},0 0 16px ${LB_UV_INK_GLOW.glow2},0 0 28px ${LB_UV_INK_GLOW.glow3},0 0 42px ${LB_UV_INK_GLOW.glow4};`;
    }
    return base + `color:transparent;opacity:0;visibility:visible;text-shadow:none;pointer-events:none;`;
}
/** UV-lamp visible ink HTML — white-lila glow, 1:1 font size. */
function lbUvVisibleInkHTML(ink) {
    if (!ink) return '';
    let rotWrap = lbInkRotStyle(ink);
    let outerStyle = 'width:100%;height:100%;background:transparent;border:none;overflow:visible;' + rotWrap;
    if (ink.kind === 'effect' && ink.imgSrc) {
        return `<div class="lb-uv-ink-visible-effect" style="${outerStyle}">${lbMagicInkEffectInnerHTML(ink, { uvTint: true })}</div>`;
    }
    let inkHtml = ink.html || '';
    let fontFam = (ink.fontFamily || 'Special Elite').replace(/'/g, "\\'");
    let fontSize = ink.fontSize || 18;
    return `<div class="lb-uv-ink-visible-text lb-inv-ink-text" style="${outerStyle}${lbUvInkTextStyle(fontFam, fontSize, true)}">${inkHtml}</div>`;
}
function lbUvMarkerScreenRect(marker, inspectEl) {
    if (!marker) return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
    let r = marker.getBoundingClientRect();
    if (r.width > 0.5 && r.height > 0.5) return r;
    let host = lbInvElementHost(inspectEl);
    if (!host) return r;
    let hr = host.getBoundingClientRect();
    if (!hr.width || !hr.height) return r;
    let xPct = parseFloat(marker.style.left);
    let yPct = parseFloat(marker.style.top);
    let wPct = parseFloat(marker.style.width);
    let hPct = parseFloat(marker.style.height);
    if (isNaN(xPct)) xPct = 0;
    if (isNaN(yPct)) yPct = 0;
    if (isNaN(wPct) || wPct <= 0) wPct = 20;
    if (isNaN(hPct) || hPct <= 0) hPct = 12;
    let left = hr.left + (xPct / 100) * hr.width;
    let top = hr.top + (yPct / 100) * hr.height;
    let width = (wPct / 100) * hr.width;
    let height = (hPct / 100) * hr.height;
    return { left: left, top: top, width: width, height: height, right: left + width, bottom: top + height };
}
window.lbUvVisibleInkHTML = lbUvVisibleInkHTML;
window.lbUvMarkerScreenRect = lbUvMarkerScreenRect;
function lbEnsureMagicInkCustomEffects(st) {
    st = st || {};
    if (!Array.isArray(st.magicInkCustomEffects)) st.magicInkCustomEffects = [];
    return st.magicInkCustomEffects;
}
function lbMagicInkInspectEffectGridHTML(activeSrc, st) {
    let tiles = [];
    LB_BLOOD_SPLAT_URLS.forEach((u, i) => {
        tiles.push(`<button type="button" class="lb-wax-tile lb-seal-splat-item lb-inv-ink-effect-pick ${activeSrc === u ? 'active' : ''}" data-effect-src="${u}" title="Blood ${i + 1}"><div class="lb-wax-thumb lb-seal-splat-thumb"><img src="${u}" alt=""></div></button>`);
    });
    LB_INK_SPLAT_URLS.forEach((u, i) => {
        tiles.push(`<button type="button" class="lb-wax-tile lb-seal-splat-item lb-inv-ink-effect-pick ${activeSrc === u ? 'active' : ''}" data-effect-src="${u}" title="Ink ${i + 1}"><div class="lb-wax-thumb lb-seal-splat-thumb"><img src="${u}" alt=""></div></button>`);
    });
    lbEnsureMagicInkCustomEffects(st).forEach((u, i) => {
        let esc = String(u).replace(/"/g, '&quot;');
        tiles.push(`<button type="button" class="lb-wax-tile lb-seal-splat-item lb-inv-ink-effect-pick lb-inv-ink-effect-custom ${activeSrc === u ? 'active' : ''}" data-effect-src="${esc}" data-custom-idx="${i}" title="Custom ${i + 1}">
            <span class="lb-inv-ink-effect-del" data-custom-src="${esc}" title="Delete">&times;</span>
            <div class="lb-wax-thumb lb-seal-splat-thumb"><img src="${esc}" alt=""></div>
        </button>`);
    });
    return tiles.join('');
}

// ---------------------------------------------------------------------------
// IFlippable / ISecretContainer — dual-face document data (view ↔ model split)
// ---------------------------------------------------------------------------
const LB_FLIPPABLE_TYPES = new Set([
    'add-paper', 'empty-sheet', 'drag-text', 'quest', 'letter', 'noir-newspaper',
    'polaroid', 'actor-file', 'framed-image', 'poster', 'evidence', 'custom-paper'
]);
const LB_FACE_SCALAR_KEYS = [
    'text', 'richText', 'font', 'fontSize', 'color', 'bold', 'italic', 'underline',
    'textXPct', 'textYPct', 'textWPct', 'textHPct', 'paper', 'title', 'placeholder',
    'dropComment', 'textOnly', 'noPaper', 'text1', 'text2', 'npName', 'npDate', 'layout',
    'customImg', 'imgFilter', 'imgScale', 'imgPanX', 'imgPanY', 'npFont', 'documentLanguage',
    'isBlueprint', 'blueprintModules',
    '_editorW', '_editorH', '_editorFontSize', '_boardSpawnScaled',
    'faceFormat', 'imgMode', 'imgSrc', 'filter', 'scale', 'panX', 'panY', 'panFracX', 'panFracY',
    'aspect', 'transparent', 'imgXPct', 'imgYPct', 'imgWPct', 'imgHPct',
    'frameStyle', 'frameBorderColor', 'frameBorderWidth',
    'paperFade', 'paperSoft', 'paperPrint', 'paperPaint', 'paperBrush',
    'bright', 'cont', 'sat', 'exposure', 'tint', 'style', 'fullFeather'
];
const LB_FACE_IMAGE_KEYS = [
    'faceFormat', 'customImg', 'imgSrc', 'imgMode', 'filter', 'scale', 'panX', 'panY', 'panFracX', 'panFracY', '_cropPaperW',
    'aspect', 'transparent', 'imgXPct', 'imgYPct', 'imgWPct', 'imgHPct',
    'frameStyle', 'frameBorderColor', 'frameBorderWidth',
    'paperFade', 'paperSoft', 'paperPrint', 'paperPaint', 'paperBrush',
    'bright', 'cont', 'sat', 'exposure', 'tint', 'style', 'fullFeather', 'imgFilter'
];

function lbIsFlippable(item) {
    return !!(item && LB_FLIPPABLE_TYPES.has(item.type));
}
function lbIsSecretContainer(item) {
    return lbIsFlippable(item);
}
function lbEnsureFaceIds(item) {
    if (!lbIsFlippable(item)) return item;
    if (!item.faceIds) item.faceIds = {};
    if (!item.faceIds.front) item.faceIds.front = foundry.utils.randomID();
    if (!item.faceIds.back) item.faceIds.back = foundry.utils.randomID();
    return item;
}
function lbGetFaceId(item, side) {
    lbEnsureDualFaceItem(item);
    return item.faceIds[side === 'back' ? 'back' : 'front'];
}
function lbEmptyFaceData(item) {
    let baseFont = (item && item.font) || 'Courier New';
    return {
        text: '', richText: '', font: baseFont, fontSize: (item && item.fontSize) || 16,
        color: (item && item.color) || '#111', bold: false, italic: false, underline: false,
        textXPct: 0, textYPct: 0, textWPct: 100, textHPct: 100,
        paper: (item && item.paper) || 7, invisibleInks: []
    };
}
function lbEnsureDualFaceItem(item) {
    if (!lbIsFlippable(item)) return item;
    if (item.faces && item.faces.front && item.faces.back) {
        item.faceSide = item.faceSide || (item.flipped ? 'back' : 'front');
        lbEnsureFaceIds(item);
        return item;
    }
    let front = lbEmptyFaceData(item);
    LB_FACE_SCALAR_KEYS.forEach(k => {
        if (item[k] !== undefined && item[k] !== null && item[k] !== '') front[k] = item[k];
    });
    if (item.invisibleInks && item.invisibleInks.length) {
        front.invisibleInks = JSON.parse(JSON.stringify(item.invisibleInks));
    }
    item.faces = { front, back: lbEmptyFaceData(item) };
    item.faceSide = item.flipped ? 'back' : 'front';
    lbEnsureFaceIds(item);
    lbApplyActiveFaceToRoot(item);
    return item;
}
function lbGetItemFaceSide(item) {
    if (!item) return 'front';
    lbEnsureDualFaceItem(item);
    return item.faceSide || 'front';
}
function lbGetFaceData(item, side) {
    lbEnsureDualFaceItem(item);
    return item.faces[side === 'back' ? 'back' : 'front'];
}
function lbGetActiveFaceData(item) {
    return lbGetFaceData(item, lbGetItemFaceSide(item));
}
function lbSyncRootToActiveFace(item) {
    if (!lbIsFlippable(item)) return;
    let data = lbGetActiveFaceData(item);
    LB_FACE_SCALAR_KEYS.forEach(k => {
        if (data[k] !== undefined) item[k] = data[k];
    });
    item.invisibleInks = data.invisibleInks ? JSON.parse(JSON.stringify(data.invisibleInks)) : [];
}
function lbApplyActiveFaceToRoot(item) {
    lbSyncRootToActiveFace(item);
}
function lbPersistRootToActiveFace(item) {
    if (!lbIsFlippable(item)) return;
    lbEnsureDualFaceItem(item);
    let side = lbGetItemFaceSide(item);
    let data = item.faces[side];
    LB_FACE_SCALAR_KEYS.forEach(k => {
        if (item[k] !== undefined) data[k] = item[k];
    });
    data.invisibleInks = item.invisibleInks ? JSON.parse(JSON.stringify(item.invisibleInks)) : (data.invisibleInks || []);
}
function lbSyncPaperBothFaces(item, paperVal) {
    if (!item) return;
    let isNoPaper = paperVal === 'transparent' || paperVal === 'no-paper';
    let resolvedPaper = isNoPaper ? '10' : paperVal;
    if (!lbIsFlippable(item)) {
        item.paper = resolvedPaper;
        item.noPaper = isNoPaper;
        return;
    }
    lbEnsureDualFaceItem(item);
    item.faces.front.paper = resolvedPaper;
    item.faces.back.paper = resolvedPaper;
    item.paper = resolvedPaper;
    item.noPaper = isNoPaper;
    item.faces.front.noPaper = isNoPaper;
    item.faces.back.noPaper = isNoPaper;
}
function lbFlipItemFace(item) {
    if (!lbIsFlippable(item)) return false;
    lbPersistRootToActiveFace(item);
    item.faceSide = lbGetItemFaceSide(item) === 'back' ? 'front' : 'back';
    item.flipped = item.faceSide === 'back';
    lbApplyActiveFaceToRoot(item);
    return true;
}
function lbGetFrontFaceFormat(item) {
    if (!item) return 'text';
    lbEnsureDualFaceItem(item);
    let front = item.faces.front;
    if (front.isBlueprint || (front.blueprintModules && front.blueprintModules.length)) return 'text';
    if (front.faceFormat === 'image') return 'image';
    if (front.faceFormat === 'text') return 'text';
    if (item.type === 'framed-image' || item.type === 'poster') return 'image';
    if (front.customImg || front.imgSrc) return 'image';
    return 'text';
}
function lbGetBackFaceFormat(item) {
    if (!lbIsFlippable(item)) return null;
    if (!item.doubleSided) return null;
    lbEnsureDualFaceItem(item);
    let back = item.faces.back;
    let hasContent = !!(back.isBlueprint || (back.blueprintModules && back.blueprintModules.length)
        || (back.richText && back.richText.trim()) || (back.text && back.text.trim())
        || back.customImg || back.imgSrc || back.faceFormat);
    if (!hasContent) return null;
    return lbGetFrontFaceFormat(item);
}
function lbEnforceBackFormatFromFront(item) {
    if (!lbIsFlippable(item) || !item.doubleSided) return;
    lbEnsureDualFaceItem(item);
    let fmt = lbGetFrontFaceFormat(item);
    let back = item.faces.back;
    if (fmt === 'image') back.faceFormat = 'image';
    else {
        back.faceFormat = back.isBlueprint ? 'text' : (back.faceFormat === 'text' ? 'text' : null);
        if (back.isBlueprint || (back.blueprintModules && back.blueprintModules.length)) back.faceFormat = 'text';
    }
    lbEnforceBackPaperFromFront(item);
}
window.lbGetFrontFaceFormat = lbGetFrontFaceFormat;
window.lbEnforceBackFormatFromFront = lbEnforceBackFormatFromFront;
function lbIsTwoSidedDocument(item) {
    return !!lbGetBackFaceFormat(item);
}
function lbIsBackFaceEmpty(item) {
    return !lbGetBackFaceFormat(item);
}
function lbEnforceBackPaperFromFront(item) {
    if (!lbIsFlippable(item)) return;
    lbEnsureDualFaceItem(item);
    let fp = item.faces.front.paper;
    item.faces.back.paper = fp;
    item.faces.back.noPaper = fp === 'transparent' ? !!item.faces.front.noPaper : false;
    if (lbGetItemFaceSide(item) === 'back') {
        item.paper = fp;
        item.noPaper = item.faces.back.noPaper;
    }
}
function lbResetBackFaceData(item) {
    if (!lbIsFlippable(item)) return;
    lbEnsureDualFaceItem(item);
    let frontPaper = item.faces.front.paper;
    let frontNoPaper = item.faces.front.noPaper;
    item.faces.back = lbEmptyFaceData(item);
    item.faces.back.paper = frontPaper;
    item.faces.back.noPaper = frontNoPaper;
    item.faces.back.faceFormat = null;
}
function lbFaceImageToPseudoItem(faceData, parentItem) {
    return Object.assign({}, faceData, {
        type: 'framed-image',
        customImg: faceData.customImg || faceData.imgSrc,
        w: parentItem.w || parentItem.originalW || 400,
        h: parentItem.h || parentItem.originalH || 300,
        originalW: parentItem.originalW || parentItem.w || 400,
        originalH: parentItem.originalH || parentItem.h || 300,
        paper: faceData.paper || parentItem.faces.front.paper || parentItem.paper || 1
    });
}
function lbPersistImageCropToFace(face, cropData) {
    face.faceFormat = 'image';
    LB_FACE_IMAGE_KEYS.forEach(k => {
        if (cropData[k] !== undefined) face[k] = cropData[k];
    });
    if (cropData.customImg) face.customImg = cropData.customImg;
    else if (cropData.imgSrc) { face.customImg = cropData.imgSrc; face.imgSrc = cropData.imgSrc; }
    face.isBlueprint = false;
    face.blueprintModules = [];
}
function lbInvestigationFaceFromFlipDeg(flipDeg) {
    return ((flipDeg || 0) % 360) === 180 ? 'back' : 'front';
}
function lbDocFlipCornerHTML() {
    return '<div class="lb-flip-corner-hit" title="Flip"></div>';
}
function lbPaperFaceStyle(item, mirrored) {
    let num = item && item.paper;
    if (!num || num === 'transparent') return 'background:transparent; box-shadow:none; border:none;';
    let n = parseInt(num, 10) || 1;
    let url = `${LB_ASSET}Paper${n}.webp`;
    return lbPaperBgStyle(url, { mirrored: !!mirrored, landscape: lbItemIsLandscape(item) });
}
function lbWrapFlippableBoardHTML(item, frontInner, backInner) {
    if (!lbIsFlippable(item)) return frontInner;
    lbEnsureDualFaceItem(item);
    let frontId = lbGetFaceId(item, 'front');
    let backId = lbGetFaceId(item, 'back');
    return `<div class="lb-doc-flip-stage">
        <div class="lb-doc-flip-face lb-doc-flip-front" data-face-id="${frontId}" data-face-side="front">${frontInner}</div>
        <div class="lb-doc-flip-face lb-doc-flip-back lb-doc-back-face-host" data-face-id="${backId}" data-face-side="back">${backInner || ''}</div>
    </div>`;
}
function lbBuildPaperOnlyBackFaceInner(item) {
    lbEnsureDualFaceItem(item);
    let frontData = item.faces.front;
    let paperStyle = lbPaperFaceStyle({ paper: frontData.paper || item.paper || 1, noPaper: frontData.noPaper || item.noPaper }, true);
    return `<div class="lb-item-content lb-doc-back-face-host" style="width:100%; height:100%; pointer-events:auto;">
        <div class="lb-paper-only" style="width:100%; height:100%; ${paperStyle}"></div></div>`;
}
function lbFlippableItemClass(item) {
    if (!lbIsFlippable(item)) return '';
    lbEnsureDualFaceItem(item);
    let cls = ' lb-doc-flippable';
    if (lbGetItemFaceSide(item) === 'back') cls += ' lb-doc-showing-back';
    return cls;
}
function lbSecretsForParentFace(store, parentId, faceSide) {
    return (store.items || []).filter(s =>
        s.type === 'secret' && s.parentItemId === parentId && (s.faceSide || 'front') === faceSide
    );
}
function lbInksForFace(parentItem, faceSide) {
    if (!parentItem) return [];
    lbEnsureDualFaceItem(parentItem);
    return lbGetFaceData(parentItem, faceSide).invisibleInks || [];
}
window.lbIsFlippable = lbIsFlippable;
window.lbIsSecretContainer = lbIsSecretContainer;
window.lbEnsureDualFaceItem = lbEnsureDualFaceItem;
window.lbFlipItemFace = lbFlipItemFace;
window.lbGetBackFaceFormat = lbGetBackFaceFormat;
window.lbIsTwoSidedDocument = lbIsTwoSidedDocument;
window.lbIsBackFaceEmpty = lbIsBackFaceEmpty;
window.lbEnforceBackPaperFromFront = lbEnforceBackPaperFromFront;
window.lbResetBackFaceData = lbResetBackFaceData;
window.lbFaceImageToPseudoItem = lbFaceImageToPseudoItem;
window.lbPersistImageCropToFace = lbPersistImageCropToFace;
window.lbSyncPaperBothFaces = lbSyncPaperBothFaces;
window.lbGetItemFaceSide = lbGetItemFaceSide;
window.lbPersistRootToActiveFace = lbPersistRootToActiveFace;
window.lbEnsureFaceIds = lbEnsureFaceIds;
window.lbGetFaceId = lbGetFaceId;

// ---------------------------------------------------------------------------
// SECRET HELPERS — board-absolute or parent-item-relative (%)
// ---------------------------------------------------------------------------
function lbSecretResolveRect(secret, store) {
    if (!secret) return { x: 0, y: 0, w: 24, h: 24 };
    if (!secret.parentItemId) return { x: secret.x || 0, y: secret.y || 0, w: secret.w || 24, h: secret.h || 24 };
    let parent = (store && store.items) ? store.items.find(i => i.id === secret.parentItemId) : null;
    if (!parent) return { x: secret.x || 0, y: secret.y || 0, w: secret.w || 24, h: secret.h || 24 };
    let pw = parent.w || 300, ph = parent.h || 400;
    return {
        x: parent.x + ((secret.relXPct || 0) / 100) * pw,
        y: parent.y + ((secret.relYPct || 0) / 100) * ph,
        w: ((secret.relWPct || 6) / 100) * pw,
        h: ((secret.relHPct || 6) / 100) * ph
    };
}
function lbSecretPctFromElementRect(parentItem, left, top, width, height) {
    let pw = parentItem.w || 300, ph = parentItem.h || 400;
    return {
        relXPct: Math.max(0, Math.min(94, ((left / pw) * 100))),
        relYPct: Math.max(0, Math.min(94, ((top / ph) * 100))),
        relWPct: Math.max(4, Math.min(100, ((width / pw) * 100))),
        relHPct: Math.max(4, Math.min(100, ((height / ph) * 100)))
    };
}
function lbSecretInspectOverlayHTML(secret, themeColor, isGM) {
    let style = `left:${secret.relXPct || 0}%;top:${secret.relYPct || 0}%;width:${secret.relWPct || 6}%;height:${secret.relHPct || 6}%;`;
    if (!isGM) {
        if (secret.state === 'open') {
            return `<div class="lb-inv-secret-marker" data-secret-id="${secret.id}" style="position:absolute;${style}z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);border-radius:50%;border:2px solid #28a745;color:#28a745;box-sizing:border-box;pointer-events:auto;"><i class="fas fa-check" style="font-size:clamp(8px,40%,14px);"></i></div>`;
        }
        if (secret.state === 'ready') {
            return `<div class="lb-inv-secret-marker lb-inv-secret-hit" data-secret-id="${secret.id}" style="position:absolute;${style}z-index:50;opacity:0;background:transparent;border:none;pointer-events:auto;cursor:crosshair;"></div>`;
        }
        return '';
    }
    let sClass = secret.state === 'open' ? 'fa-check' : 'fa-eye';
    let sColor = secret.state === 'open' ? '#28a745' : themeColor;
    let opac = secret.state === 'hidden' ? '0.3' : '1.0';
    return `<div class="lb-inv-secret-marker" data-secret-id="${secret.id}" style="position:absolute;${style}z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);border-radius:50%;border:2px solid ${sColor};color:${sColor};opacity:${opac};cursor:pointer;box-sizing:border-box;pointer-events:auto;"><i class="fas ${sClass}" style="font-size:clamp(8px,40%,14px);"></i></div>`;
}
const LB_EV_FIXED_TEXT = { textXPct: 10, textYPct: 12, textWPct: 80, textHPct: 76 };
const LB_INV_RADIAL_RADIUS = 168;
const LB_INV_RADIAL_L2_DIST = 96;
const LB_INV_RADIAL_ARC = Math.PI * 0.72;
const LB_INV_RMB_BACK_MS = 380;
const LB_INV_INSPECT_ZOOM_MIN = 0.7;
const LB_INV_INSPECT_ZOOM_MAX = 3.6;
const LB_INV_LOOK_START_ZOOM = 2.25;
const LB_INV_SWING_MAX = 42;
const LB_INV_FLIP_PUSH_THRESHOLD = 28;
const LB_INV_FLIP_RESISTANCE_POWER = 7.5;
const LB_INV_LOOK_ROT_SENSITIVITY = 0.14;
const LB_UV_LAMP_RADIUS_MIN = 90;
const LB_UV_LAMP_RADIUS_MAX = 180;
const LB_PAPER_URLS_GLOBAL = Array.from({ length: LB_PAPER_COUNT }, (_, i) => LB_ASSET + 'Paper' + (i + 1) + '.webp');

function lbGlobalPaperUrl(num) {
    if (!num || num === 'transparent') return null;
    let n = parseInt(num, 10) || 1;
    return LB_PAPER_URLS_GLOBAL[Math.max(0, Math.min(LB_PAPER_COUNT - 1, n - 1))];
}
function lbInvPaperUrl(num) {
    return lbGlobalPaperUrl(num) || LB_PAPER_URLS_GLOBAL[6];
}
window.lbGlobalPaperUrl = lbGlobalPaperUrl;
function lbInvPaperUrlForItem(item) {
    if (!item) return LB_PAPER_URLS_GLOBAL[6];
    if (item.type === 'noir-newspaper') return LB_PAPER_URLS_GLOBAL[6];
    if (item.type === 'quest' || item.type === 'letter') return lbInvPaperUrl(item.paper || 7);
    if (item.paper === 'transparent' || item.paper === 'none' || item.noPaper) return LB_PAPER_URLS_GLOBAL[6];
    return lbInvPaperUrl(item.paper || 7);
}
function lbInvItemCanFlip(item) {
    return lbIsFlippable(item);
}
function lbInvSwingResistanceFactor(rotY, swingMax) {
    let edge = Math.min(1, Math.abs(rotY) / Math.max(swingMax, 1));
    return Math.max(0.04, 1 - Math.pow(edge, LB_INV_FLIP_RESISTANCE_POWER) * 0.96);
}

function lbInvElementHost(el) {
    return (el && (el.querySelector('.lb-item-content') || el)) || el;
}
function lbInvPointToHostPct(el, clientX, clientY) {
    let host = lbInvElementHost(el);
    if (!host) return null;
    let hr = host.getBoundingClientRect();
    if (!hr.width || !hr.height) return null;
    return {
        relXPct: Math.max(0, Math.min(94, ((clientX - hr.left) / hr.width) * 100)),
        relYPct: Math.max(0, Math.min(94, ((clientY - hr.top) / hr.height) * 100)),
        hostW: hr.width,
        hostH: hr.height
    };
}
function lbInvHostPctToRect(el, relXPct, relYPct, relWPct, relHPct) {
    let host = lbInvElementHost(el);
    if (!host) return { left: 0, top: 0, width: 0, height: 0 };
    let hr = host.getBoundingClientRect();
    return {
        left: (relXPct / 100) * hr.width,
        top: (relYPct / 100) * hr.height,
        width: (relWPct / 100) * hr.width,
        height: (relHPct / 100) * hr.height
    };
}
function lbMagicEffectGridHTML(activeSrc) {
    let tiles = [];
    LB_BLOOD_SPLAT_URLS.forEach((u, i) => {
        tiles.push(`<button type="button" class="lb-ed-tile lb-magic-effect-tile ${activeSrc === u ? 'active' : ''}" data-effect-src="${u}" title="Blood ${i + 1}"><img src="${u}" alt=""></button>`);
    });
    LB_INK_SPLAT_URLS.forEach((u, i) => {
        tiles.push(`<button type="button" class="lb-ed-tile lb-magic-effect-tile ${activeSrc === u ? 'active' : ''}" data-effect-src="${u}" title="Ink ${i + 1}"><img src="${u}" alt=""></button>`);
    });
    return tiles.join('');
}
function lbInvisibleInkOverlayHTML(ink, isGM, uvActive, highlight, showFrames, magicInkActive) {
    if (!ink) return '';
    let canEditInk = isGM || lbCanPlaceMagicInk();
    if (!canEditInk && !uvActive) return '';
    let editMode = !!showFrames;
    let gmEditVisible = !!(canEditInk && (editMode || magicInkActive));
    let rotStyle = lbInkRotStyle(ink);
    let style = `left:${ink.relXPct || 0}%;top:${ink.relYPct || 0}%;width:${ink.relWPct || 20}%;height:${ink.relHPct || 12}%;${rotStyle}`;
    let hlCls = (highlight && editMode) ? ' lb-inv-ink-hover' : '';
    let handles = (isGM && editMode && !uvActive) ? lbRMFHandlesHTML('magic-ink') : '';
    if (ink.kind === 'effect' && ink.imgSrc) {
        let gmSeeEffect = isGM && !uvActive;
        let visCls = gmSeeEffect ? ' lb-inv-ink-effect-visible' : (' lb-inv-ink-hidden-doc' + ((isGM && editMode) ? ' lb-inv-ink-editing' : ''));
        let effectInner = lbMagicInkEffectInnerHTML(ink, { uvTint: false });
        let pe = (isGM && (editMode || gmSeeEffect)) ? 'auto' : 'none';
        return `<div class="lb-inv-ink-marker lb-inv-ink-effect-marker lb-inv-ink-baked${visCls}${hlCls}" data-ink-id="${ink.id}" style="position:absolute;${style}z-index:45;pointer-events:${pe};box-sizing:border-box;overflow:visible;background:transparent;border:none;">
        ${handles}${effectInner}</div>`;
    }
    let visCls = gmEditVisible ? ' lb-inv-ink-editing lb-inv-ink-uv-glow' : ' lb-inv-ink-hidden-doc';
    let pe = (isGM && editMode) ? 'auto' : 'none';
    let inkHtml = ink.html || '';
    let fontFam = (ink.fontFamily || 'Special Elite').replace(/'/g, "\\'");
    let fontSize = ink.fontSize || 18;
    let textStyle = lbUvInkTextStyle(fontFam, fontSize, gmEditVisible);
    let textDiv = `<div class="lb-inv-ink-text" data-ink-html="1" style="position:relative;width:100%;height:100%;${textStyle}">${inkHtml}</div>`;
    return `<div class="lb-inv-ink-marker lb-inv-ink-baked${visCls}${hlCls}" data-ink-id="${ink.id}" style="position:absolute;${style}z-index:45;pointer-events:${pe};box-sizing:border-box;overflow:visible;background:transparent;border:none;">
        ${handles}${textDiv}
    </div>`;
}
function lbBindMagicInkInspectMarker(markerEl, hostEl, ink, onChange) {
    if (!markerEl || !hostEl || !ink || !onChange) return;
    if (markerEl.dataset.lbMagicInkBound === '1') return;
    markerEl.dataset.lbMagicInkBound = '1';
    let initRot = ink.rot != null ? ink.rot : (ink.rotation || 0);
    if (Math.abs(initRot) >= 0.01) {
        markerEl.style.transform = 'rotate(' + initRot + 'deg)';
        markerEl.dataset.lbRot = String(initRot);
    }
    lbRMFBindField(markerEl, hostEl, {
        mode: 'percent', minWPct: 4, minHPct: 3, allowOverflow: true,
        onChange: function() {
            let sr = hostEl.getBoundingClientRect();
            let er = markerEl.getBoundingClientRect();
            ink.relXPct = Math.max(0, Math.min(94, ((er.left - sr.left) / sr.width) * 100));
            ink.relYPct = Math.max(0, Math.min(94, ((er.top - sr.top) / sr.height) * 100));
            ink.relWPct = Math.max(4, Math.min(100, (er.width / sr.width) * 100));
            ink.relHPct = Math.max(3, Math.min(100, (er.height / sr.height) * 100));
            ink.rot = parseFloat(markerEl.dataset.lbRot) || 0;
            onChange(ink);
        }
    });
}
function lbRenderInvisibleInks(rootEl, parentItem, isGM, uvActive, faceSide, opts) {
    opts = opts || {};
    if (!rootEl || !parentItem) return;
    rootEl.querySelectorAll('.lb-inv-ink-marker').forEach(n => n.remove());
    faceSide = faceSide || 'front';
    let inks = lbInksForFace(parentItem, faceSide);
    if (!inks.length) return;
    let host = lbInvElementHost(rootEl);
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    inks.forEach(ink => {
        let canEditInk = isGM || lbCanPlaceMagicInk();
        if (!canEditInk && !uvActive && !opts.showFrames) return;
        host.insertAdjacentHTML('beforeend', lbInvisibleInkOverlayHTML(ink, isGM, uvActive, false, !!opts.showFrames, !!opts.magicInkActive));
        if (canEditInk && opts.showFrames && typeof opts.onInkChange === 'function') {
            let marker = host.querySelector(`.lb-inv-ink-marker[data-ink-id="${ink.id}"]`);
            if (marker) lbBindMagicInkInspectMarker(marker, host, ink, opts.onInkChange);
        }
    });
}
window.lbInvPointToHostPct = lbInvPointToHostPct;
window.lbRenderInvisibleInks = lbRenderInvisibleInks;

function lbEnsureInvRadialCSS() { /* styles loaded via module.json */ }
window.lbSecretResolveRect = lbSecretResolveRect;
window.lbSecretPctFromElementRect = lbSecretPctFromElementRect;
window.lbSecretInspectOverlayHTML = lbSecretInspectOverlayHTML;