'use strict';
// LOREBOARD - Start button, load menu and boot hooks

const LB_LOGO = "modules/loreboard-deluxe/assets/graphics/LoreboardLogo.webp";
const LB_DS_LOGO = "modules/loreboard-deluxe/assets/graphics/DS_Logo.webp";
const LB_START_BTN_IMG = "modules/loreboard-deluxe/assets/graphics/LB_Start.webp";
const LB_START_BTN_POS_KEY = "myloreboard_v10_start_btn_pos";
const LB_CLASSIC_BOARDS = LB_CREATE_BOARD_CATALOG.find(c => c.id === "classic").boards.map(lbCreateBoardClassicFromEntry);

function lbRefreshFloatingStartButtonVisibility() {
    lbEnsureFloatingStartButton();
    let btn = $('#lb-floating-start-btn');
    if (!btn.length) return;
    if (game.user.isGM) {
        btn.addClass('lb-gm-start-btn');
        btn.css({ visibility: 'visible', pointerEvents: '', opacity: '' });
        return;
    }
    btn.removeClass('lb-gm-start-btn');
    let show = lbGmBoardIsAvailable();
    let wasHidden = btn.css('visibility') === 'hidden';
    btn.css({ visibility: show ? 'visible' : 'hidden', pointerEvents: show ? '' : 'none', opacity: show ? '' : '0' });
    if (show && wasHidden) {
        btn.addClass('lb-start-btn-pop');
        setTimeout(function() { btn.removeClass('lb-start-btn-pop'); }, 700);
    }
}
window.lbRefreshFloatingStartButtonVisibility = lbRefreshFloatingStartButtonVisibility;
function lbGetStartBtnPos() {
    try {
        let raw = localStorage.getItem(LB_START_BTN_POS_KEY);
        if (raw) {
            let p = JSON.parse(raw);
            if (p && typeof p.x === 'number' && typeof p.y === 'number') return p;
        }
    } catch (e) {}
    return { x: Math.round(window.innerWidth / 2 - 28), y: Math.round(window.innerHeight / 2 - 28) };
}
function lbSaveStartBtnPos(x, y) {
    try { localStorage.setItem(LB_START_BTN_POS_KEY, JSON.stringify({ x: Math.round(x), y: Math.round(y) })); } catch (e) {}
}
function lbRemoveFloatingStartButton() {
    $('#lb-floating-start-btn').off('.lbStartBtn');
    $('#lb-floating-start-btn').remove();
}
function lbToggleFoundrySidebar(btnEl) {
    let $right = $('#ui-right');
    $right.toggleClass('lb-sidebar-top');
    $('body').toggleClass('lb-foundry-bar-open', $right.hasClass('lb-sidebar-top'));
    let active = $right.hasClass('lb-sidebar-top');
    if (btnEl) {
        $(btnEl).toggleClass('active', active).css('color', active ? '#fff' : '#888');
    }
    $('#lb-global-sidebar-toggle').toggleClass('active', active);
}
function lbEnsureGlobalSidebarToggle() {
    if (document.getElementById('lb-global-sidebar-toggle')) return;
    let btn = $(`<button type="button" id="lb-global-sidebar-toggle" class="lb-global-sidebar-btn" title="Toggle Foundry Sidebar" aria-label="Toggle Foundry Sidebar"><i class="fas fa-bars"></i></button>`);
    $('body').append(btn);
    btn.on('click.lbGlobalSidebar', function() { lbToggleFoundrySidebar(this); });
}
function lbRefreshGlobalSidebarToggleVisibility() {
    lbEnsureGlobalSidebarToggle();
    let boardOpen = !!document.getElementById('lb-app-root');
    $('body').toggleClass('lb-board-open', boardOpen);
    let btn = $('#lb-global-sidebar-toggle');
    if (!btn.length) return;
    if (!boardOpen) btn.removeClass('active');
}
window.lbEnsureGlobalSidebarToggle = lbEnsureGlobalSidebarToggle;
window.lbRefreshGlobalSidebarToggleVisibility = lbRefreshGlobalSidebarToggleVisibility;
async function lbCloseBoardMode() {
    try { if (window.lbStopThemeAmbience) window.lbStopThemeAmbience(); } catch (e) {}
    if (typeof window.lbFlushBoardPersist === 'function') window.lbFlushBoardPersist();
    if (typeof window.lbStopMasterSyncBroadcast === 'function') window.lbStopMasterSyncBroadcast();
    if (game.user.isGM) {
        window.lbGmBoardLive = false;
        try {
            let data = storageEntity?.getFlag(FLAG_SCOPE, PREFIX + "data");
            if (data && storageEntity) {
                data.gmBoardPreloaded = false;
                await storageEntity.setFlag(FLAG_SCOPE, PREFIX + "data", data).catch(() => {});
            }
            lbEmitGmBoardStatus(false);
        } catch (e) {}
    }
    lbStopThemeMoodLighting(document.getElementById('lb-app-root'));
    Object.values(ui.windows).filter(w => w.element && w.element.hasClass && w.element.hasClass('lb-fullscreen')).forEach(w => { try { w.close(); } catch (e) {} });
    $('#lb-app-root').remove();
    $('body').removeClass('lb-board-open');
    lbRefreshGlobalSidebarToggleVisibility();
    lbEnsureFloatingStartButton();
}
window.lbCloseBoardMode = lbCloseBoardMode;
async function lbStartButtonPrimaryClick() {
    if (document.getElementById('lb-start-overlay')) return;
    if (game.user.isGM) {
        lbStartupMenu();
        return;
    }
    if (document.getElementById('lb-app-root')) return;
    if (!lbGmBoardIsAvailable()) {
        ui.notifications.warn(LB_GM_BOARD_MSG);
        return;
    }
    await lbOpenSceneBoard();
}
function lbEnsureFloatingStartButton() {
    if (!$('#lb-floating-start-btn').length) lbInitFloatingStartButton();
}
function lbInitFloatingStartButton() {
    if ($('#lb-floating-start-btn').length) return;
    let pos = lbGetStartBtnPos();
    if (!$('#lb-floating-start-btn-css').length) {
        $('head').append(`<style id="lb-floating-start-btn-css">
            #lb-floating-start-btn { position:fixed; z-index:1000005; width:56px; height:56px; cursor:grab; user-select:none; touch-action:none; transition:filter 0.25s ease, z-index 0s; filter:drop-shadow(0 2px 8px rgba(0,0,0,0.55)); }
            body.lb-board-open #lb-floating-start-btn { z-index:40; pointer-events:none; opacity:0.35; }
            body.lb-board-open #lb-floating-start-btn.lb-gm-start-btn { z-index:1000006; pointer-events:auto; opacity:1; }
            #lb-floating-start-btn img { display:block; width:100%; height:100%; object-fit:contain; pointer-events:none; border-radius:50%; }
            #lb-floating-start-btn:hover { animation:lbStartBtnPulse 1.6s ease-in-out infinite; filter:drop-shadow(0 0 14px rgba(212,175,55,0.95)) drop-shadow(0 0 28px rgba(212,175,55,0.55)); }
            #lb-floating-start-btn.lb-dragging { cursor:grabbing; animation:none; }
            @keyframes lbStartBtnPulse { 0%,100% { filter:drop-shadow(0 0 10px rgba(212,175,55,0.65)) drop-shadow(0 0 20px rgba(212,175,55,0.35)); } 50% { filter:drop-shadow(0 0 18px rgba(212,175,55,1)) drop-shadow(0 0 36px rgba(212,175,55,0.65)); } }
            @keyframes lbStartBtnPop { 0% { transform:scale(0.2); opacity:0; } 70% { transform:scale(1.12); opacity:1; } 100% { transform:scale(1); opacity:1; } }
            #lb-floating-start-btn.lb-start-btn-pop { animation:lbStartBtnPop 0.55s cubic-bezier(0.22,1.4,0.36,1) forwards; }
        </style>`);
    }
    let btn = $(`<div id="lb-floating-start-btn"${game.user.isGM ? ' class="lb-gm-start-btn"' : ''} title="Loreboard OS"><img src="${LB_START_BTN_IMG}" alt="Loreboard"></div>`);
    btn.css({ left: pos.x + 'px', top: pos.y + 'px' });
    $('body').append(btn);
    let dragging = false, moved = false, sx = 0, sy = 0, ox = pos.x, oy = pos.y;
    btn.on('pointerdown.lbStartBtn', function(e) {
        if (e.button !== 0) return;
        dragging = true; moved = false;
        sx = e.clientX; sy = e.clientY;
        ox = parseFloat(btn.css('left')) || pos.x;
        oy = parseFloat(btn.css('top')) || pos.y;
        btn.addClass('lb-dragging');
        btn[0].setPointerCapture(e.pointerId);
        e.preventDefault();
    });
    btn.on('pointermove.lbStartBtn', function(e) {
        if (!dragging) return;
        let dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
        let nx = Math.max(0, Math.min(window.innerWidth - 56, ox + dx));
        let ny = Math.max(0, Math.min(window.innerHeight - 56, oy + dy));
        btn.css({ left: nx + 'px', top: ny + 'px' });
    });
    btn.on('pointerup.lbStartBtn pointercancel.lbStartBtn', function(e) {
        if (!dragging) return;
        dragging = false;
        btn.removeClass('lb-dragging');
        let nx = parseFloat(btn.css('left')) || ox, ny = parseFloat(btn.css('top')) || oy;
        lbSaveStartBtnPos(nx, ny);
        if (!moved && e.button === 0) lbStartButtonPrimaryClick();
    });
    btn.on('contextmenu.lbStartBtn', function(e) { e.preventDefault(); });
    lbRefreshFloatingStartButtonVisibility();
}
window.lbInitFloatingStartButton = lbInitFloatingStartButton;
window.lbRemoveFloatingStartButton = lbRemoveFloatingStartButton;

function lbStartupMenu() {
    $('#lb-start-overlay').remove();
    let overlay = $(`
    <div id="lb-start-overlay">
        <div class="lb-start-root">
            <button type="button" id="lb-start-close" title="Close" aria-label="Close" style="position:absolute;top:12px;right:14px;z-index:5;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,0.14);background:rgba(0,0,0,0.45);color:#f0f0f4;font-size:18px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s,border-color 0.2s,box-shadow 0.2s;">&times;</button>
            <div class="lb-start-logo-wrap">
                <img class="lb-start-logo" src="${LB_LOGO}" alt="Loreboard">
                <div class="lb-start-shimmer"></div>
            </div>
            <div class="lb-start-menu">
                <div id="lb-start-craft" class="lb-start-item">CRAFT NEW BOARD</div>
                <div id="lb-start-use" class="lb-start-item">USE BOARD</div>
                <div id="lb-start-tutorial" class="lb-start-item">TUTORIAL</div>
            </div>
            <div class="lb-start-footer">
                <div class="lb-start-social">
                    <a id="lb-start-discord" class="lb-start-social-btn" href="${DISCORD_URL || '#'}" target="_blank" rel="noopener" title="Discord"><i class="fab fa-discord"></i></a>
                    <a id="lb-start-patreon" class="lb-start-social-btn" href="${PATREON_URL || '#'}" target="_blank" rel="noopener" title="Patreon"><i class="fab fa-patreon"></i></a>
                </div>
                <div class="lb-start-version">Version ${lbModuleVersion()}</div>
                <img class="lb-start-dslogo" src="${LB_DS_LOGO}" alt="DS">
            </div>
        </div>
    </div>
    <style>
        /* Floating overlay: the container is click-through so the map / Foundry UI stays visible & usable behind it. */
        #lb-start-overlay { position:fixed; inset:0; z-index:1000000; display:flex; align-items:center; justify-content:center; background:transparent; overflow:hidden; pointer-events:none; }
        .lb-start-root { pointer-events:auto; position:relative; display:flex; flex-direction:column; align-items:center; width:720px; height:540px; max-width:92vw; max-height:88vh; box-sizing:border-box; padding:34px 36px 16px 36px;
            background:radial-gradient(ellipse at 50% 18%, #1a1a1e 0%, #0b0b0d 55%, #050506 100%);
            border:1px solid rgba(255,255,255,0.06); border-radius:10px; overflow:hidden; box-shadow:0 30px 90px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,0,0,0.6); }
        .lb-start-root::before { content:''; position:absolute; inset:0; pointer-events:none;
            background:linear-gradient(180deg, rgba(255,255,255,0.04), transparent 30%); }
        .lb-start-logo-wrap { position:relative; width:78%; max-width:520px; margin-top:8px; border:none; outline:none; box-shadow:none; }
        .lb-start-logo { display:block; width:100%; height:auto; border:none; outline:none; box-shadow:none; filter:drop-shadow(0 6px 22px rgba(0,0,0,0.85)); }
        .lb-start-shimmer { position:absolute; inset:0; pointer-events:none; mix-blend-mode:screen;
            -webkit-mask-image:url('${LB_LOGO}'); mask-image:url('${LB_LOGO}');
            -webkit-mask-size:contain; mask-size:contain; -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat; -webkit-mask-position:center; mask-position:center;
            background:linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.0) 44%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.0) 56%, transparent 62%);
            background-size:260% 100%; background-position:160% 0; animation:lbShimmer 8s ease-in-out infinite; }
        @keyframes lbShimmer { 0% { background-position:160% 0; } 16% { background-position:-60% 0; } 100% { background-position:-60% 0; } }
        .lb-start-menu { flex:1; display:flex; flex-direction:column; justify-content:center; gap:14px; width:100%; max-width:380px; }
        .lb-start-item { text-align:center; color:#cfcfd4; font-family:'Cinzel', serif; font-weight:600; letter-spacing:4px; font-size:21px; cursor:pointer;
            padding:8px 4px; position:relative; transition:color 0.3s ease, letter-spacing 0.3s ease, text-shadow 0.3s ease; }
        .lb-start-item::after { content:''; position:absolute; left:50%; bottom:4px; width:0; height:1px; background:linear-gradient(90deg, transparent, #c9a24a, transparent); transform:translateX(-50%); transition:width 0.35s ease; }
        .lb-start-item:hover { color:#f4ead0; letter-spacing:6px; text-shadow:0 0 18px rgba(201,162,74,0.6); }
        .lb-start-item:hover::after { width:80%; }
        .lb-start-footer { position:relative; width:100%; display:flex; align-items:flex-end; justify-content:center; min-height:52px; padding-bottom:2px; }
        .lb-start-social { position:absolute; left:0; bottom:0; display:flex; gap:12px; }
        .lb-start-social-btn { display:flex; align-items:center; justify-content:center; width:42px; height:42px; border-radius:8px;
            color:#8a8a90; font-size:22px; text-decoration:none; border:1px solid rgba(255,255,255,0.08);
            background:rgba(255,255,255,0.03); transition:color 0.25s, box-shadow 0.25s, border-color 0.25s, transform 0.25s; }
        .lb-start-social-btn:hover { color:#f4ead0; border-color:rgba(201,162,74,0.55); box-shadow:0 0 22px rgba(201,162,74,0.55), 0 0 40px rgba(201,162,74,0.25); transform:translateY(-2px); }
        .lb-start-version { color:#6a6a70; font-family:'Courier New', monospace; font-size:11px; letter-spacing:2px; }
        .lb-start-dslogo { position:absolute; right:0; bottom:0; height:114px; width:auto; opacity:0.88; filter:drop-shadow(0 2px 8px rgba(0,0,0,0.85)); border:none; }
    </style>`);
    $('body').append(overlay);
    let close = () => overlay.fadeOut(200, async () => {
        overlay.remove();
        if (document.getElementById('lb-app-root')) await lbCloseBoardMode();
        else lbEnsureFloatingStartButton();
    });
    overlay.find('#lb-start-close').click(() => close());
    overlay.find('#lb-start-craft').click(() => { close(); lbOpenCreateMenu(); });
    overlay.find('#lb-start-use').click(() => { close(); lbOpenLoadMenu(); });
    overlay.find('#lb-start-tutorial').click(() => {
        new Dialog({
            title: "Tutorial",
            content: `<p style="text-align:center; color:#000; font-family:'Courier New', monospace; padding:10px;">The interactive tutorial is coming soon.</p>`,
            buttons: { ok: { label: "Close" } }
        }, { classes: ["dialog", "lb-modern-dialog"], width: 420, zIndex: 100001 }).render(true);
    });
    overlay.find('.lb-start-social-btn').click(function(e) {
        if (!$(this).attr('href') || $(this).attr('href') === '#') { e.preventDefault(); }
    });
}

function lbBootGmStartButtonImmediate() {
    try {
        if (typeof game === 'undefined' || !game.user?.isGM) return;
        if (!document.body) {
            requestAnimationFrame(lbBootGmStartButtonImmediate);
            return;
        }
        lbEnsureFloatingStartButton();
        lbRefreshFloatingStartButtonVisibility();
    } catch (e) {}
}

function lbBootLoreboardClient() {
    lbBindDocLockSocket();
    lbBootGmStartButtonImmediate();
    lbRefreshGlobalSidebarToggleVisibility();
    if (typeof lbInitMenuEyeCompanion === 'function') lbInitMenuEyeCompanion();
}

Hooks.once('ready', async () => {
    lbBootLoreboardClient();
    if (!game.user.isGM) lbSyncGmBoardLiveFromFlag();
    else if (canvas.scene) {
        let data = canvas.scene.getFlag(FLAG_SCOPE, PREFIX + "data");
        if (data?.gmBoardPreloaded) window.lbGmBoardLive = true;
    }
    lbRefreshFloatingStartButtonVisibility();
});
Hooks.on('updateScene', (scene, update) => {
    if (update.flags?.[FLAG_SCOPE]?.[PREFIX + "data"] !== undefined) {
        if (!game.user.isGM && scene.id === canvas.scene?.id) lbSyncGmBoardLiveFromFlag(scene);
        lbRefreshFloatingStartButtonVisibility();
    }
});
Hooks.on('canvasReady', () => {
    lbBootLoreboardClient();
    if (!game.user.isGM) lbSyncGmBoardLiveFromFlag();
    lbRefreshFloatingStartButtonVisibility();
    if (!game.user.isGM) {
        setTimeout(function() {
            try {
                game.socket.emit('module.loreboard-deluxe', {
                    type: 'lbRequestGmBoardStatus',
                    sceneId: canvas.scene?.id,
                    userId: game.user.id
                });
            } catch (e) {}
        }, 900);
    }
});