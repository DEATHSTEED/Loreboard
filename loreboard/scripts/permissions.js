'use strict';
// LOREBOARD - Permissions system

// ---------------------------------------------------------------------------
// PERMISSIONS MODULE — granular rights, role presets, per-player assignments
// ---------------------------------------------------------------------------
const LB_PERM_DENIED_MSG = 'You do not have the permission';
const LB_SECRET_REVEAL_HOLD_MS = 3000;
const LB_MAGIC_INK_PURPLE_CSS_FILTER = 'brightness(0) saturate(100%) invert(18%) sepia(99%) saturate(7500%) hue-rotate(271deg) brightness(95%) contrast(101%)';
const LB_PERM_KEYS = [
    'useLoupe', 'addText', 'addPaper', 'useBlueprint', 'useStamps', 'useSeals', 'uploadImages', 'uploadTapes',
    'draw', 'erase', 'moveOthers', 'editOthers', 'editOwnDocuments', 'deleteOthers', 'lockItems',
    'addNews', 'addEvidence', 'addLight', 'useArchive', 'flipDocuments', 'useJukebox', 'connectThreads',
    'placeMagicInk', 'useUVLamp'
];
const LB_PERM_ALIASES = {
    moveItems: 'moveOthers', editItems: 'editOthers', deleteItems: 'deleteOthers',
    archive: 'useArchive'
};
const LB_PERM_LABELS = {
    useLoupe: 'Investigation Mode', addText: 'Add Text Notes', addPaper: 'Create Documents',
    useBlueprint: 'Blueprint Designer', useStamps: 'Place Stamps', useSeals: 'Add Effects / Seals',
    uploadImages: 'Upload Images', uploadTapes: 'Upload Tapes (Jukebox)', draw: 'Draw on Board', erase: 'Erase Drawings',
    moveOthers: 'Move Others\' Items', editOthers: 'Edit Others\' Items', editOwnDocuments: 'Edit Own Documents',
    deleteOthers: 'Delete Others\' Items', lockItems: 'Lock / Unlock Items', addNews: 'Add Newspapers',
    addEvidence: 'Add Evidence Tags', addLight: 'Place Ambient Lights', useArchive: 'Use Archive',
    flipDocuments: 'Flip Documents', useJukebox: 'Use Jukebox / Music', connectThreads: 'Connect Thread Pins',
    placeMagicInk: 'Place Magic Ink', useUVLamp: 'Use UV Lamp / Magic'
};
const LB_PERM_TOOLTIPS = {
    useLoupe: 'Allows Investigation Mode — inspect documents with the magnifying-glass cursor.',
    addText: 'Allows creating text notes and post-its on the board.',
    addPaper: 'Allows creating new documents (letters, sheets, blueprints, etc.).',
    useBlueprint: 'Allows creating documents from saved blueprint templates.',
    useStamps: 'Allows placing stamps on documents and the board.',
    useSeals: 'Allows placing wax seals and effects on documents.',
    uploadImages: 'Allows uploading custom images in editors and documents.',
    uploadTapes: 'Allows uploading audio tapes in Jukebox mode.',
    draw: 'Allows freehand drawing on the board (pen tool).',
    erase: 'Allows erasing drawings with the eraser tool.',
    moveOthers: 'Allows moving items placed by other players.',
    editOthers: 'Allows editing documents and items owned by other players.',
    editOwnDocuments: 'Allows editing documents and items the player created themselves.',
    deleteOthers: 'Allows deleting items placed by other players.',
    lockItems: 'Allows locking and unlocking items against editing.',
    addNews: 'Allows creating newspaper clippings.',
    addEvidence: 'Allows creating and placing evidence tags.',
    addLight: 'Allows placing and editing ambient lights.',
    useArchive: 'Allows access to the archive tool.',
    flipDocuments: 'Allows flipping double-sided documents.',
    useJukebox: 'Allows using the jukebox / music mode.',
    connectThreads: 'Allows connecting pins with red thread lines.',
    placeMagicInk: 'Allows placing magic ink text and effects during Investigation Mode (GM tools).',
    useUVLamp: 'Allows using the UV Lamp or Detect Magic tool to reveal hidden ink.'
};
const LB_ROLE_PRESETS = {
    observer:      { label: 'Observer (Read-Only)', perms: { useLoupe: true, useJukebox: true } },
    notekeeper:    { label: 'Note Keeper (Light)', perms: { useLoupe: true, addText: true, addPaper: true, useStamps: true, draw: true, lockItems: true, useJukebox: true, editOwnDocuments: true } },
    investigator:  { label: 'Investigator (Standard)', perms: { useLoupe: true, addText: true, addPaper: true, useBlueprint: true, useStamps: true, useSeals: true, draw: true, lockItems: true, erase: true, moveOthers: true, editOthers: true, editOwnDocuments: true, addEvidence: true, flipDocuments: true, useJukebox: true, connectThreads: true, useUVLamp: true } },
    coarchivist:   { label: 'Co-Archivist (Trusted)', perms: { useLoupe: true, addText: true, addPaper: true, useBlueprint: true, useStamps: true, useSeals: true, draw: true, lockItems: true, erase: true, moveOthers: true, editOthers: true, editOwnDocuments: true, uploadImages: true, deleteOthers: true, addNews: true, addEvidence: true, addLight: true, useArchive: true, flipDocuments: true, useJukebox: true, connectThreads: true, useUVLamp: true, placeMagicInk: true } }
};
const LB_MF_GM_SECRET = '__lb_gm_secret__';
const LB_MF_PLAYERS_SHARED = '__lb_players_shared__';
const LB_MF_LOST_ARCHIVE = '__lb_lost_archive__';

// ---------------------------------------------------------------------------
// GM BOARD SESSION — players may only join when GM has a board open this session
// ---------------------------------------------------------------------------
window.lbGmBoardLive = false;
window.lbBoardActivationSnapshot = null;
const LB_GM_BOARD_MSG = 'The GM has not loaded a board yet.';

// ---------------------------------------------------------------------------
// CANVAS-SYNC — every client broadcasts ops directly to ALL others (Foundry
// socket fan-out). The sender already applied locally; everyone else applies
// immediately. GM additionally persists to the scene flag (debounced backup).
// No GM-only relay hop — that was dropping player→GM updates.
// ---------------------------------------------------------------------------
function lbCurrentSceneId() {
    return canvas?.scene?.id ?? storageEntity?.id ?? null;
}
window.lbCurrentSceneId = lbCurrentSceneId;
function lbBoardSceneMatches(data) {
    if (!data) return false;
    let sid = lbCurrentSceneId();
    if (data.sceneId && sid && data.sceneId !== sid) return false;
    return true;
}
// Broadcast a board op to every other connected client.
function lbEmitBoardSync(kind, payload, opts) {
    opts = opts || {};
    payload = payload || {};
    let sceneId = lbCurrentSceneId();
    if (!sceneId) return;
    let msg = {
        type: 'lbBoardSync',
        kind: kind,
        payload: payload,
        userId: game.user.id,
        sceneId: sceneId,
        revision: opts.revision != null ? opts.revision : (window.lbCurrentStore?.revision ?? null),
        ts: Date.now()
    };
    try { game.socket.emit('module.loreboard', msg); } catch (e) {}
}
window.lbEmitBoardSync = lbEmitBoardSync;
// Apply an incoming op from another client.
function lbHandleBoardSync(data) {
    if (!data || data.type !== 'lbBoardSync') return;
    if (!lbBoardSceneMatches(data)) return;
    if (data.userId === game.user.id) return;
    if (typeof window.lbApplyStoreLivePatch !== 'function') return;
    if (data.kind === 'boardRefresh') {
        window._lbBoardRefreshTs = window._lbBoardRefreshTs || 0;
        let ts = data.ts || 0;
        if (ts && ts <= window._lbBoardRefreshTs) return;
        if (ts) window._lbBoardRefreshTs = ts;
    }
    window.lbApplyStoreLivePatch(Object.assign({}, data, { forceApply: true }));
    if (game.user.isGM && typeof window.lbScheduleBoardPersist === 'function') {
        window.lbScheduleBoardPersist();
    }
}
window.lbHandleBoardSync = lbHandleBoardSync;
function lbEmitBoardForceSync() {
    if (!document.getElementById('lb-app-root')) return;
    let st = window.lbCurrentStore;
    if (!st) return;
    if (canvas.scene) {
        let flag = canvas.scene.getFlag(FLAG_SCOPE, PREFIX + "data");
        if (flag && (flag.revision || 0) > (st.revision || 0)) st = flag;
    }
    let payload = lbSerializeBoardSyncState(st, { includePlayerRoles: !!game.user?.isGM });
    lbEmitBoardSync('boardRefresh', payload, { revision: st.revision || 0 });
}
function lbRequestBoardForceSync() {
    if (!document.getElementById('lb-app-root')) return;
    lbEmitBoardForceSync();
    try {
        game.socket.emit('module.loreboard', {
            type: 'lbBoardSyncRequest',
            userId: game.user.id,
            sceneId: lbCurrentSceneId()
        });
    } catch (e) {}
}
window.lbEmitBoardForceSync = lbEmitBoardForceSync;
window.lbRequestBoardForceSync = lbRequestBoardForceSync;

function lbSceneHasBoardData(scene) {
    scene = scene || canvas?.scene || storageEntity;
    if (!scene) return false;
    let data = scene.getFlag(FLAG_SCOPE, PREFIX + "data");
    return !!(data && (data.gmBoardPreloaded || data.revision > 0 || data.boardName || (data.items && data.items.length) || (data.threads && data.threads.length) || (data.drawings && data.drawings.length)));
}
function lbGmBoardIsAvailable() {
    if (game.user.isGM) return true;
    if (window.lbGmBoardLive || window.lbBoardActivationSnapshot) return true;
    let data = lbActiveScene()?.getFlag(FLAG_SCOPE, PREFIX + "data");
    return !!(data && data.gmBoardPreloaded);
}
function lbResolveBoardStoreData() {
    let scene = lbActiveScene();
    if (!scene) return null;
    let flag = scene.getFlag(FLAG_SCOPE, PREFIX + "data");
    let snap = window.lbBoardActivationSnapshot;
    if (!snap) return flag ? lbDeserializeBoardState(flag) : null;
    if (!flag) return lbDeserializeBoardState(snap);
    let snapRev = snap.revision || 0;
    let flagRev = flag.revision || 0;
    return lbDeserializeBoardState(
        snapRev >= flagRev ? Object.assign({}, flag, snap) : Object.assign({}, snap, flag)
    );
}
window.lbResolveBoardStoreData = lbResolveBoardStoreData;
function lbApplyBoardActivationToClient(payload, revision, fromUserId) {
    if (game.user.isGM) return;
    window.lbGmBoardLive = true;
    if (payload) {
        window.lbBoardActivationSnapshot = payload;
        window.lbBoardStoreOverride = JSON.parse(JSON.stringify(payload));
    }
    lbEnsureFloatingStartButton();
    lbRefreshFloatingStartButtonVisibility();
    if (typeof window.lbApplyMasterSync === 'function' && document.getElementById('lb-app-root')) {
        window.lbApplyMasterSync(payload, revision != null ? revision : (payload?.revision || 0), {
            forceThemeReload: true,
            fromUserId: fromUserId
        });
    }
}
function lbSyncGmBoardLiveFromFlag(scene) {
    if (game.user.isGM) return;
    scene = scene || canvas?.scene || storageEntity;
    if (!scene) return;
    let data = scene.getFlag(FLAG_SCOPE, PREFIX + "data");
    if (data && (data.gmBoardPreloaded || lbSceneHasBoardData(scene))) {
        window.lbGmBoardLive = true;
        if (data.gmBoardPreloaded && typeof lbSerializeBoardSyncState === 'function') {
            window.lbBoardActivationSnapshot = lbSerializeBoardSyncState(data, { includePlayerRoles: true });
        }
    }
}
function lbEmitGmBoardStatus(active, payload, targetUserId) {
    try {
        game.socket.emit('module.loreboard', {
            type: 'lbGmBoardLive',
            active: !!active,
            payload: payload || null,
            sceneId: canvas.scene?.id || storageEntity?.id,
            userId: game.user.id,
            targetUserId: targetUserId || null
        });
    } catch (e) {}
}
async function lbSetGmBoardPreloaded(active, storeData) {
    window.lbGmBoardLive = !!active;
    if (!game.user.isGM || !canvas.scene) {
        lbRefreshFloatingStartButtonVisibility();
        return;
    }
    let data = storeData ? JSON.parse(JSON.stringify(storeData)) : (canvas.scene.getFlag(FLAG_SCOPE, PREFIX + "data") || { items: [], threads: [], drawings: [] });
    data.gmBoardPreloaded = !!active;
    await canvas.scene.setFlag(FLAG_SCOPE, PREFIX + "data", data).catch(() => {});
    lbEmitGmBoardStatus(active, active ? lbSerializeBoardSyncState(data, { includePlayerRoles: true }) : null);
    lbRefreshFloatingStartButtonVisibility();
}
window.lbGmBoardIsAvailable = lbGmBoardIsAvailable;
window.lbSceneHasBoardData = lbSceneHasBoardData;
window.lbSetGmBoardPreloaded = lbSetGmBoardPreloaded;

function lbIsClassicBoardStore(st) {
    return !!(st && st.classic && (st.classicBg || st.classicFg));
}
function lbClearClassicBoardFields(st) {
    if (!st) return st;
    st.classic = false;
    delete st.classicBg;
    delete st.classicBgFit;
    delete st.classicFg;
    delete st.classicBoardId;
    st.customBoard = false;
    return st;
}
function lbInitBoardFromStoreData(data) {
    if (!data) return;
    lbEnsureGlobalSidebarToggle();
    lbRefreshGlobalSidebarToggleVisibility();
    if (data.customBoard) lbEnsureCustomBoardFgDefaults(data);
    window.lbBoardStoreOverride = JSON.parse(JSON.stringify(data));
    let themeId = data.theme || 'noir';
    let themeObj = LB_THEMES.find(t => t.id === themeId) || LB_THEMES[0];
    if (lbIsClassicBoardStore(data)) {
        window.lbClassicActive = true;
        window.lbClassicBg = data.classicBg || "";
        initLoreBoard({ id: themeObj.id, bg: data.classicBg || "", fg: data.classicFg || "", files: "", classic: true });
    } else {
        window.lbClassicActive = false;
        window.lbClassicBg = null;
        initLoreBoard({ id: themeObj.id, bg: themeObj.bg, fg: themeObj.fg, files: themeObj.files, parallax: themeObj.parallax });
    }
}
window.lbIsClassicBoardStore = lbIsClassicBoardStore;
window.lbInitBoardFromStoreData = lbInitBoardFromStoreData;
function lbSerializeBoardState(st) {
    if (!st) return { items: [], threads: [], drawings: [] };
    let out = lbSerializeMasterState(st);
    out.revision = st.revision || 0;
    out.lastEditorId = st.lastEditorId || null;
    out.playerRoles = st.playerRoles || {};
    out.settings = st.settings;
    out.languageSkills = st.languageSkills;
    return JSON.parse(JSON.stringify(out));
}
function lbDeserializeBoardState(data) {
    if (!data || typeof data !== 'object') return { items: [], threads: [], drawings: [] };
    let store = JSON.parse(JSON.stringify(data));
    if (!Array.isArray(store.items)) store.items = [];
    else store.items = store.items.filter(i => i && i.type !== 'board-comment');
    if (!Array.isArray(store.threads)) store.threads = [];
    if (!Array.isArray(store.drawings)) store.drawings = [];
    if (store.boardTweaks) store.boardTweaks = lbNormalizeBoardTweaks(store.boardTweaks);
    if (store.revision == null) store.revision = 0;
    lbEnsureLanguageSkills(store);
    lbEnsureSystemMfFolders(store);
    return store;
}
window.lbSerializeBoardState = lbSerializeBoardState;
window.lbDeserializeBoardState = lbDeserializeBoardState;
function lbPersistSceneFlag(storeData) {
    if (!canvas.scene || !storeData) return;
    let payload = lbSerializeBoardState(storeData);
    if (game.user.isGM) {
        canvas.scene.setFlag(FLAG_SCOPE, PREFIX + "data", payload).catch(() => {});
        return;
    }
    try {
        game.socket.emit('module.loreboard', {
            type: 'lbStorePersist',
            data: storeData,
            sceneId: lbCurrentSceneId() || canvas.scene.id,
            userId: game.user.id
        });
    } catch (e) {}
}
window.lbBoardIsBusy = function() {
    // A reveal cinematic can only block syncs for a bounded time — a wedged reveal
    // (interrupted animation, missing element) must never freeze the sync pipeline.
    let revealBusy = window.lbRevealPlaying && (Date.now() - (window.lbRevealPlayingAt || 0) < 20000);
    return !!(document.querySelector('.lb-item.dragging') || window.lbIsDrawing || window.lbPlacingItem || window.lbPlacingCopy || window.lbIsDraggingPin || revealBusy || window.lbFlipAnimating);
};
function lbBindDocLockSocket() {
    if (window._lbDocLockSocketBound) return;
    window._lbDocLockSocketBound = true;
    game.socket.on('module.loreboard', (data) => {
        if (!data) return;
        // Direct canvas-style sync — apply ops from every other client immediately.
        if (data.type === 'lbBoardSync') {
            lbHandleBoardSync(data);
            return;
        }
        // Legacy aliases (older sessions) — treat identically.
        if (data.type === 'lbBoardEvent') {
            data.type = 'lbBoardSync';
            lbHandleBoardSync(data);
            return;
        }
        if (data.type === 'lbStorePersist' && game.user.isGM && data.data && data.sceneId) {
            if (!lbBoardSceneMatches(data)) return;
            lbHandleBoardSync({
                type: 'lbBoardSync',
                kind: 'boardRefresh',
                payload: lbSerializeBoardSyncState(data.data, { includePlayerRoles: true }),
                userId: data.userId,
                sceneId: data.sceneId,
                revision: data.data.revision
            });
            lbPersistSceneFlag(data.data);
            return;
        }
        if (data.type === 'lbBoardEventReq' && game.user.isGM) {
            if (!lbBoardSceneMatches(data)) return;
            lbHandleBoardSync({
                type: 'lbBoardSync',
                kind: data.kind,
                payload: data.payload,
                userId: data.userId,
                sceneId: data.sceneId
            });
            return;
        }
        if (data.type === 'lbRequestGmBoardStatus' && game.user.isGM) {
            let live = !!(window.lbGmBoardLive || document.getElementById('lb-app-root') || lbSceneHasBoardData());
            let payload = null;
            let d = window.lbCurrentStore || canvas.scene?.getFlag(FLAG_SCOPE, PREFIX + "data");
            if (live && d) payload = lbSerializeBoardSyncState(d, { includePlayerRoles: true });
            lbEmitGmBoardStatus(live, payload, data.userId);
            return;
        }
        if (data.type === 'lbGmBoardLive') {
            if (game.user.isGM) return;
            if (data.targetUserId && data.targetUserId !== game.user.id) return;
            if (!lbBoardSceneMatches(data)) return;
            window.lbGmBoardLive = !!data.active;
            if (data.active && data.payload) {
                window.lbBoardActivationSnapshot = data.payload;
                window.lbBoardStoreOverride = JSON.parse(JSON.stringify(data.payload));
            } else if (!data.active && !lbSceneHasBoardData()) {
                window.lbBoardActivationSnapshot = null;
                window.lbBoardStoreOverride = null;
            }
            lbEnsureFloatingStartButton();
            lbRefreshFloatingStartButtonVisibility();
            if (data.active && data.payload && document.getElementById('lb-app-root') && typeof window.lbApplyMasterSync === 'function') {
                window.lbApplyMasterSync(data.payload, data.payload.revision || 0, { fromUserId: data.userId });
            }
            return;
        }
        if (data.type === 'lbBoardSyncRequest') {
            if (!lbBoardSceneMatches(data)) return;
            if (data.userId === game.user.id) return;
            if (!document.getElementById('lb-app-root') || !window.lbCurrentStore) return;
            lbEmitBoardForceSync();
            return;
        }
        if (data.type === 'lbPermUpdate' && data.playerRoles && window.lbCurrentStore) {
            window.lbCurrentStore.playerRoles = data.playerRoles;
            if (typeof lbApplyToolbarVisibility === 'function') lbApplyToolbarVisibility($('#lb-app-root'));
            if (typeof window.lbApplyPermissionReactiveUI === 'function') window.lbApplyPermissionReactiveUI();
            return;
        }
        if (data.type === 'triggerReveal' && data.itemId && data.fromGM) {
            if (!lbBoardSceneMatches(data)) return;
            if (data.userId === game.user.id) return;
            let delay = Math.max(0, (data.syncAt || Date.now()) - Date.now());
            setTimeout(function() {
                if (typeof window.lbRunActorFileRevealCinematic === 'function') {
                    window.lbRunActorFileRevealCinematic(data.itemId, data.revealType, data.revealName, {
                        remote: data.userId !== game.user.id,
                        syncAt: data.syncAt
                    });
                }
            }, delay);
            return;
        }
        if (data.type === 'lbJukeboxSync') {
            return;
        }
        if (data.type === 'triggerFlip' && data.itemId) {
            if (!lbBoardSceneMatches(data)) return;
            let delay = Math.max(0, (data.syncAt || Date.now()) - Date.now());
            setTimeout(function() {
                if (typeof window.lbRunFlipAnimation === 'function') {
                    window.lbRunFlipAnimation(data.itemId, data.flipped, data.faceSide, data.userId === game.user.id);
                }
            }, delay);
            return;
        }
        if (data.type === 'lbOp' && typeof window.lbApplyBoardOp === 'function') {
            if (!lbBoardSceneMatches(data)) return;
            if (data.userId === game.user.id) return;
            window.lbApplyBoardOp(data.op, data.payload || {}, { remote: true, revision: data.revision });
            return;
        }
        if (data.type === 'lbBoardActivated' && data.payload) {
            if (!lbBoardSceneMatches(data)) return;
            if (data.userId === game.user.id) return;
            lbApplyBoardActivationToClient(data.payload, data.revision, data.userId);
            return;
        }
    });
}
function lbStopMasterSyncBroadcast() {
    if (window._lbMasterSyncTimer) {
        clearInterval(window._lbMasterSyncTimer);
        window._lbMasterSyncTimer = null;
    }
}
function lbSerializeMasterState(st) {
    if (!st) return {};
    return {
        items: st.items || [],
        threads: st.threads || [],
        drawings: st.drawings || [],
        playerRoles: st.playerRoles || {},
        revision: st.revision || 0,
        theme: st.theme,
        classic: st.classic,
        classicBg: st.classicBg,
        classicBgFit: st.classicBgFit,
        classicFg: st.classicFg,
        classicBoardId: st.classicBoardId,
        customBoard: st.customBoard,
        boardName: st.boardName,
        boardTweaks: st.boardTweaks,
        themeAmbience: st.themeAmbience,
        settings: st.settings,
        workspaceBounds: st.workspaceBounds,
        mfFolders: st.mfFolders,
        languageSkills: st.languageSkills,
        jukeboxTapes: st.jukeboxTapes,
        jukeboxEra: st.jukeboxEra,
        jukeboxDevice: st.jukeboxDevice,
        jukeboxHideoutView: st.jukeboxHideoutView,
        jukeboxSlumsView: st.jukeboxSlumsView,
        jukeboxGalacticView: st.jukeboxGalacticView,
        jukeboxCustomRadios: st.jukeboxCustomRadios,
        blueprints: st.blueprints,
        magicInkCustomEffects: st.magicInkCustomEffects,
        gmBoardPreloaded: st.gmBoardPreloaded
    };
}
// Shared board canvas only — excludes per-user UI (jukebox, settings).
// Blueprints MUST travel with the sync state: clients (including the persisting GM)
// replace their store from these payloads, so omitting blueprints here silently
// dropped every saved blueprint on the next refresh/persist cycle.
function lbSerializeBoardSyncState(st, opts) {
    opts = opts || {};
    if (!st) return {};
    let out = {
        items: st.items || [],
        threads: st.threads || [],
        drawings: st.drawings || [],
        revision: st.revision || 0,
        theme: st.theme,
        classic: st.classic,
        classicBg: st.classicBg,
        classicBgFit: st.classicBgFit,
        classicFg: st.classicFg,
        classicBoardId: st.classicBoardId,
        customBoard: st.customBoard,
        boardName: st.boardName,
        boardTweaks: st.boardTweaks,
        themeAmbience: st.themeAmbience,
        workspaceBounds: st.workspaceBounds,
        mfFolders: st.mfFolders,
        languageSkills: st.languageSkills,
        blueprints: st.blueprints,
        magicInkCustomEffects: st.magicInkCustomEffects
    };
    if (opts.includePlayerRoles && st.playerRoles) out.playerRoles = st.playerRoles;
    return out;
}
window.lbSerializeBoardSyncState = lbSerializeBoardSyncState;
function lbApplyBoardSyncPayload(store, p, opts) {
    opts = opts || {};
    if (!store || !p) return;
    if (p.items) store.items = p.items;
    if (p.threads) store.threads = p.threads;
    if (p.drawings) store.drawings = p.drawings;
    if (p.languageSkills) store.languageSkills = p.languageSkills;
    if (p.boardTweaks) store.boardTweaks = lbNormalizeBoardTweaks(p.boardTweaks);
    if (p.themeAmbience) store.themeAmbience = p.themeAmbience;
    if (p.workspaceBounds !== undefined) store.workspaceBounds = p.workspaceBounds;
    if (p.mfFolders) store.mfFolders = p.mfFolders;
    if (p.boardName !== undefined) store.boardName = p.boardName;
    if (p.blueprints) store.blueprints = p.blueprints;
    if (p.magicInkCustomEffects) store.magicInkCustomEffects = p.magicInkCustomEffects;
    if (p.theme !== undefined) store.theme = p.theme;
    if (p.classic === false) lbClearClassicBoardFields(store);
    else if (p.classic !== undefined) store.classic = p.classic;
    if (p.classicBg !== undefined) store.classicBg = p.classicBg;
    if (p.classicBgFit !== undefined) store.classicBgFit = p.classicBgFit;
    if (p.classicFg !== undefined) store.classicFg = p.classicFg;
    if (p.classicBoardId !== undefined) store.classicBoardId = p.classicBoardId;
    if (p.customBoard !== undefined) store.customBoard = p.customBoard;
    if (p.playerRoles) {
        if (opts.allowPlayerRoles) store.playerRoles = p.playerRoles;
        else if (opts.fromUserId) {
            let u = game.users?.get?.(opts.fromUserId);
            if (u?.isGM) store.playerRoles = p.playerRoles;
        }
    }
}
window.lbApplyBoardSyncPayload = lbApplyBoardSyncPayload;
window.lbStopMasterSyncBroadcast = lbStopMasterSyncBroadcast;
window.lbSerializeMasterState = lbSerializeMasterState;

function lbAllPermsTrue() {
    let o = {};
    LB_PERM_KEYS.forEach(k => { o[k] = true; });
    return o;
}
function lbDenyPermission() {
    if (typeof ui !== 'undefined' && ui.notifications) ui.notifications.warn(LB_PERM_DENIED_MSG);
}
function lbIsDetectMagicEnvironment(store, themeId) {
    if (themeId === 'cosytavern') return true;
    if (store && store.classic && lbDetectClassicBoardId(store) === 'wooden-board') return true;
    return false;
}
function lbPlayUvLampActivateSound(store, themeId) {
    if (lbIsDetectMagicEnvironment(store, themeId)) {
        if (!window.lbAudioPool.magicDetect) {
            lbPlaySound('magicDetect', { loop: true, volume: 0.52 });
        }
    } else {
        lbPlaySound('uvOn');
        if (!window.lbAudioPool.lamp) lbPlaySound('lamp', { loop: true, volume: 0.42 });
    }
}
function lbUvLampUsesMagicAudio(store, themeId) {
    return lbIsDetectMagicEnvironment(store, themeId);
}
function lbPermsFromPreset(presetId) {
    if (presetId === 'godmode') return lbPermsFromPreset('coarchivist');
    let p = LB_ROLE_PRESETS[presetId];
    if (!p) return lbPermsFromPreset('investigator');
    let out = {};
    LB_PERM_KEYS.forEach(k => { out[k] = !!(p.perms && p.perms[k]); });
    return out;
}
function lbUserHasPerm(action) {
    if (typeof game === 'undefined' || !game.user) return true;
    if (game.user.isGM) return true;
    let key = LB_PERM_ALIASES[action] || action;
    let st = window.lbCurrentStore || {};
    let role = (st.playerRoles || {})[game.user.id];
    let perms = (role && role.permissions) ? role.permissions : lbMigrateLegacyPermissions(st.permissions);
    if (!perms) return key === 'useLoupe';
    return !!perms[key];
}
function lbCanPlaceMagicInk() {
    if (typeof game === 'undefined' || !game.user) return false;
    return game.user.isGM || lbUserHasPerm('placeMagicInk');
}
function lbMigrateLegacyPermissions(legacy) {
    if (!legacy) return lbPermsFromPreset('investigator');
    if (legacy.useLoupe !== undefined && legacy.moveOthers === undefined && legacy.moveItems === undefined) {
        return Object.assign(lbPermsFromPreset('observer'), legacy);
    }
    let out = lbPermsFromPreset('observer');
    LB_PERM_KEYS.forEach(k => { out[k] = false; });
    let map = {
        useLoupe: 'useLoupe', addText: 'addText', addPaper: 'addPaper', draw: 'draw', erase: 'erase',
        addNews: 'addNews', addEvidence: 'addEvidence', addLight: 'addLight',
        moveOthers: 'moveItems', editOthers: 'editItems', deleteOthers: 'deleteItems',
        uploadImages: 'uploadImages', useArchive: 'archive'
    };
    LB_PERM_KEYS.forEach(k => {
        let src = map[k];
        if (legacy[src] !== false) out[k] = true;
    });
    out.useStamps = legacy.addPaper !== false;
    out.useSeals = legacy.addPaper !== false;
    out.lockItems = legacy.editItems !== false;
    out.uploadTapes = legacy.uploadImages !== false;
    return out;
}
function lbPermsMatchPreset(perms) {
    for (let id of Object.keys(LB_ROLE_PRESETS)) {
        if (id === 'custom') continue;
        let ref = lbPermsFromPreset(id);
        if (LB_PERM_KEYS.every(k => !!perms[k] === !!ref[k])) return id;
    }
    return 'custom';
}
function lbStampOwnership(item) {
    if (!item || item.ownerId) return item;
    item.ownerId = game.user.id;
    item.ownerColor = game.user.color || '#ffd700';
    item.isGM = !!game.user.isGM;
    return item;
}
function lbIsItemOwner(item) {
    if (!item) return false;
    if (game.user.isGM) return true;
    return item.ownerId === game.user.id;
}
function lbIsGmOwnedItem(item) {
    if (!item) return false;
    if (item.isGM) return true;
    if (item.ownerId) {
        let u = game.users.get(item.ownerId);
        return !!(u && u.isGM);
    }
    return false;
}
function lbIsGmItemLock(item) {
    if (!item || !item.locked) return false;
    if (item.lockedByGM) return true;
    if (item.lockedBy) {
        let u = game.users.get(item.lockedBy);
        return !!(u && u.isGM);
    }
    return lbIsGmOwnedItem(item);
}
function lbCanPlayerUnlockItem(item) {
    if (game.user.isGM) return true;
    if (!item || !item.locked) return true;
    return !lbIsGmItemLock(item);
}
function lbIsGmLockedForUser(item) {
    return !!(item && item.locked && lbIsGmItemLock(item) && !game.user.isGM);
}
window.lbIsGmLockedForUser = lbIsGmLockedForUser;
function lbIsGmThreadLock(th) {
    if (!th || !th.locked) return false;
    if (th.lockedByGM) return true;
    if (th.lockedBy) {
        let u = game.users.get(th.lockedBy);
        return !!(u && u.isGM);
    }
    return false;
}
function lbCanPlayerUnlockThread(th) {
    if (game.user.isGM) return true;
    if (!th || !th.locked) return true;
    return !lbIsGmThreadLock(th);
}
function lbMfCanSeeFolder(folder) {
    if (!folder) return false;
    if (game.user.isGM) return true;
    if (folder.gmOnly) return false;
    if (folder.shared || folder.system) return true;
    if (!folder.ownerId) return true;
    return folder.ownerId === game.user.id;
}
function lbMfCanSeeStoredItem(item, st) {
    if (!item || !item.stored) return false;
    if (game.user.isGM) return true;
    if (item.mfFolderId) {
        let folder = (st.mfFolders || []).find(f => f.id === item.mfFolderId);
        return lbMfCanSeeFolder(folder);
    }
    if (lbIsGmOwnedItem(item)) return false;
    return !item.ownerId || item.ownerId === game.user.id;
}
function lbCanDeleteItem(item) {
    if (!item) return false;
    if (game.user.isGM) return true;
    if (lbIsGmOwnedItem(item)) return false;
    if (lbIsItemOwner(item)) return true;
    return lbUserHasPerm('deleteOthers');
}
window.lbCanDeleteItem = lbCanDeleteItem;
function lbRandomAttachVariant() {
    return 1 + Math.floor(Math.random() * 3);
}
function lbDetectClassicBoardId(store) {
    if (!store || !store.classic) return null;
    if (store.classicBoardId) return store.classicBoardId;
    let bg = String(store.classicBg || '').toLowerCase();
    if (bg.includes('whiteboard')) return 'whiteboard';
    if (bg.includes('wood')) return 'wooden-board';
    if (bg.includes('metal')) return 'metal-board';
    if (bg.includes('cork')) return 'corkboard';
    if (bg.includes('neutralboard')) return 'the-board';
    return 'corkboard';
}
function lbGetBoardFastenerConfig(store, themeId) {
    if (store && store.customBoard) {
        return { tapeDesign: 'transparent', fastenerSet: 'officePin', defaultVariant: 1, allowedKinds: ['pin', 'magnet', 'nail'], allowTape: true, maxVariants: 7, allFasteners: true };
    }
    if (store && store.classic) {
        let cid = lbDetectClassicBoardId(store);
        return LB_BOARD_FASTENER_CONFIG[cid] || LB_BOARD_FASTENER_CONFIG.corkboard;
    }
    return LB_BOARD_FASTENER_CONFIG[themeId] || LB_BOARD_FASTENER_CONFIG.noir;
}
function lbTapeUrl(design, variant) {
    let d = LB_TAPE_DESIGNS[design] || LB_TAPE_DESIGNS.transparent;
    let v = Math.max(1, Math.min(3, parseInt(variant, 10) || lbRandomAttachVariant()));
    return LB_ASSET_BASE + '/' + d.prefix + v + '.webp';
}
function lbFastenerSetUrls(setKey) {
    return LB_FASTENER_SETS[setKey] || LB_PIN_URLS;
}
function lbGetBoardFastenerKind(store, themeId) {
    let cfg = lbGetBoardFastenerConfig(store, themeId);
    return (cfg.allowedKinds && cfg.allowedKinds[0]) || 'pin';
}
const LB_FASTENER_SET_GROUPS = { pin: ['officePin', 'metalPin'], magnet: ['officeMagnet', 'heavyMagnet'], nail: ['nail'] };
function lbFastenerUrls(kind, store, themeId, fastenerSet) {
    if (fastenerSet && LB_FASTENER_SETS[fastenerSet]) return lbFastenerSetUrls(fastenerSet);
    let cfg = lbGetBoardFastenerConfig(store, themeId);
    if (kind === 'nail') return lbFastenerSetUrls(cfg.fastenerSet || 'nail');
    if (kind === 'magnet') return lbFastenerSetUrls(cfg.fastenerSet || 'officeMagnet');
    if (kind === 'pin') return lbFastenerSetUrls(cfg.fastenerSet || 'officePin');
    return LB_PIN_URLS;
}
window.lbFastenerUrls = lbFastenerUrls;
function lbBoardMaxVariants(store, themeId) {
    let cfg = lbGetBoardFastenerConfig(store, themeId);
    return cfg.maxVariants || 3;
}
function lbEnsureTapeDefaults(item, themeId, store) {
    if (!item || item.attachType !== 'tape') return item;
    let cfg = lbGetBoardFastenerConfig(store, themeId);
    if (!item.tapeDesign && cfg.tapeDesign) item.tapeDesign = cfg.tapeDesign;
    if (!item.attachVariant) item.attachVariant = lbRandomAttachVariant();
    lbDefaultPinSize(item);
    return item;
}
function lbTapeImgSrc(item, themeId, store) {
    lbEnsureTapeDefaults(item, themeId, store);
    let cfg = lbGetBoardFastenerConfig(store, themeId);
    let design = item.tapeDesign || cfg.tapeDesign || 'transparent';
    let v = item.attachVariant || lbRandomAttachVariant();
    return lbTapeUrl(design, v);
}
function lbApplyBoardDefaultFastener(item, themeId, store) {
    if (!item) return item;
    let cfg = lbGetBoardFastenerConfig(store, themeId);
    if (item.attachType === 'tape' || (item.attachType && item.attachType !== 'none')) return lbEnsureTapeDefaults(item, themeId, store);
    return item;
}
function lbFastenerLabel(kind, variant) {
    if (variant) return lbFastenerKindLabel(kind) + ' ' + variant;
    return lbFastenerKindLabel(kind);
}
function lbFastenerKindLabel(kind) {
    return LB_FASTENER_LABELS[kind] || 'Pin';
}
function lbFastenerAssetNameFromUrl(url) {
    if (!url) return '';
    let m = String(url).match(/\/([^/?#]+)\.webp$/i);
    return m ? m[1] : '';
}
function lbFastenerOptionLabel(setKey, variant, kind) {
    let setLabels = {
        officePin: 'Office Pin', metalPin: 'Metal Pin', pin: 'Pin',
        officeMagnet: 'Office Magnet', heavyMagnet: 'Heavy Magnet', magnet: 'Magnet',
        nail: 'Nail'
    };
    let base = setLabels[setKey] || lbFastenerKindLabel(kind || 'pin');
    return base + ' ' + variant;
}
function lbFastenerSetLabel(store, themeId, variant) {
    let cfg = lbGetBoardFastenerConfig(store, themeId);
    let urls = lbFastenerSetUrls(cfg.fastenerSet);
    let v = Math.max(1, parseInt(variant, 10) || 1);
    return lbFastenerAssetNameFromUrl(urls[v - 1]) || (lbFastenerKindLabel(lbGetBoardFastenerKind(store, themeId)) + ' ' + v);
}
function lbTapeVariantLabel(store, themeId, variant) {
    let cfg = lbGetBoardFastenerConfig(store, themeId);
    let prefix = (LB_TAPE_DESIGNS[cfg.tapeDesign] || LB_TAPE_DESIGNS.transparent).prefix;
    return prefix + (parseInt(variant, 10) || 1);
}
function lbItemPixelClipRect(item) {
    if (!item) return { ix: 0, iy: 0, w: 1, h: 1 };
    let ix = 0, iy = 0;
    if (item.paperInsetFracX != null) ix = item.paperInsetFracX;
    else if (item.type === 'drag-text') ix = 0.05;
    else if (item.type === 'framed-image' && (item.imgMode || 'printed') !== 'original' && !item.transparent) ix = 0.05;
    if (item.paperInsetFracY != null) iy = item.paperInsetFracY;
    else if (item.type === 'drag-text') iy = 0.05;
    else if (item.type === 'framed-image' && (item.imgMode || 'printed') !== 'original' && !item.transparent) iy = 0.05;
    ix = Math.max(0, Math.min(0.45, ix));
    iy = Math.max(0, Math.min(0.45, iy));
    return { ix, iy, w: Math.max(0.1, 1 - ix * 2), h: Math.max(0.1, 1 - iy * 2) };
}
function lbItemPaperTopInset(item) {
    return lbItemPixelClipRect(item).iy;
}
function lbInitItemAttachDefaults(item, themeId, store) {
    if (!item || item.attachType === 'none') return item;
    item.attachX = 0.5;
    let cfg = lbGetBoardFastenerConfig(store, themeId);
    if (item.attachType === 'tape') {
        if (!item.tapeDesign && cfg.tapeDesign) item.tapeDesign = cfg.tapeDesign;
        if (!item.attachVariant) item.attachVariant = lbRandomAttachVariant();
    } else if (!item.attachVariant) {
        item.attachVariant = cfg.defaultVariant || lbDefaultAttachVariant(themeId, store);
    }
    lbEnsureAttachVariant(item, themeId, store);
    return item;
}
function lbBuildAttachSelectOptions(themeId, store, opts) {
    opts = Object.assign({
        includeNone: false, includeTape: true, forMidpin: false,
        curType: null, curVariant: null, item: null, threads: null
    }, opts || {});
    let item = opts.item;
    let itemType = (item && item.type) || 'drag-text';
    let cfg = lbGetBoardFastenerConfig(store, themeId);
    let kind = lbGetBoardFastenerKind(store, themeId);
    let maxV = lbBoardMaxVariants(store, themeId);
    let curType = opts.curType != null ? opts.curType : lbSanitizeAttachType(
        (item && item.attachType) || lbDefaultAttachType(itemType, themeId, store), themeId, store);
    let curVariant = parseInt(opts.curVariant != null ? opts.curVariant : ((item && item.attachVariant) || lbDefaultAttachVariant(themeId, store)), 10) || lbDefaultAttachVariant(themeId, store);
    let hasThread = opts.threads && item ? lbItemHasThread(item, opts.threads) : false;
    let o = '';
    if (opts.includeNone && !opts.forMidpin) {
        o += `<option value="none" ${curType === 'none' ? 'selected' : ''}>None</option>`;
    }
    if (opts.includeTape && !opts.forMidpin && !hasThread) {
        Object.keys(LB_TAPE_DESIGNS).forEach(designKey => {
            let design = LB_TAPE_DESIGNS[designKey];
            for (let n = 1; n <= 3; n++) {
                let itemDesign = (item && item.tapeDesign) || cfg.tapeDesign || 'transparent';
                let sel = curType === 'tape' && itemDesign === designKey && curVariant === n;
                o += `<option value="tape:${designKey}:${n}" ${sel ? 'selected' : ''}>${design.label} ${n}</option>`;
            }
        });
    }
    let appendKindSets = (attachKind) => {
        let sets = LB_FASTENER_SET_GROUPS[attachKind] || [attachKind];
        sets.forEach(setKey => {
            let urls = lbFastenerSetUrls(setKey);
            for (let n = 1; n <= urls.length; n++) {
                let val = setKey + ':' + n;
                let sel = (item && item.fastenerSet === setKey && curType === attachKind && curVariant === n)
                    || (!item?.fastenerSet && setKey === cfg.fastenerSet && curType === attachKind && curVariant === n && !cfg.allFasteners);
                o += `<option value="${val}" ${sel ? 'selected' : ''}>${lbFastenerOptionLabel(setKey, n, attachKind)}</option>`;
            }
        });
    };
    if (cfg.allFasteners) {
        ['pin', 'magnet', 'nail'].forEach(appendKindSets);
    } else if ((cfg.allowedKinds || []).includes(kind)) {
        appendKindSets(kind);
    }
    return o;
}
function lbAttachImgSrc(item, themeId, store) {
    if (item.attachType === 'tape') return lbTapeImgSrc(item, themeId, store);
    let v = item.attachVariant || 1;
    let maxV = lbBoardMaxVariants(store, themeId);
    v = Math.max(1, Math.min(maxV, parseInt(v, 10) || 1));
    let kind = lbGetBoardFastenerKind(store, themeId);
    let urls = lbFastenerUrls(kind, store, themeId, item.fastenerSet);
    return urls[v - 1] || urls[0];
}
function lbEnsureAttachVariant(item, themeId, store) {
    if (!item || item.attachType === 'none') return item;
    if (item.attachType === 'tape') return lbEnsureTapeDefaults(item, themeId, store);
    let kind = lbGetBoardFastenerKind(store, themeId);
    if (item.attachType === 'pin' || item.attachType === 'magnet' || item.attachType === 'nail') item.attachType = kind;
    if (!item.attachVariant) {
        let cfg = lbGetBoardFastenerConfig(store, themeId);
        item.attachVariant = cfg.defaultVariant || lbDefaultAttachVariant(themeId, store);
    }
    return item;
}
function lbEnsureSystemMfFolders(store) {
    if (!store.mfFolders) store.mfFolders = [];
    if (!store.mfFolders.find(f => f.id === LB_MF_GM_SECRET)) {
        store.mfFolders.unshift({ id: LB_MF_GM_SECRET, name: 'GM Only (Secret)', system: true, gmOnly: true, color: '#c0392b' });
    }
    if (!store.mfFolders.find(f => f.id === LB_MF_PLAYERS_SHARED)) {
        store.mfFolders.splice(1, 0, { id: LB_MF_PLAYERS_SHARED, name: 'Players (Shared)', system: true, shared: true, color: '#27ae60' });
    }
    if (!store.mfFolders.find(f => f.id === LB_MF_LOST_ARCHIVE)) {
        store.mfFolders.push({ id: LB_MF_LOST_ARCHIVE, name: 'Lost Archive', system: true, gmOnly: true, color: '#6c3483' });
    }
    return store;
}
window.lbStampOwnership = lbStampOwnership;
window.lbEnsureSystemMfFolders = lbEnsureSystemMfFolders;
window.lbMigrateLegacyPermissions = lbMigrateLegacyPermissions;
window.lbPermsFromPreset = lbPermsFromPreset;
window.lbROLE_PRESETS = LB_ROLE_PRESETS;
window.lbPERM_KEYS = LB_PERM_KEYS;
window.lbDenyPermission = lbDenyPermission;
window.lbIsDetectMagicEnvironment = lbIsDetectMagicEnvironment;
window.lbCanPlaceMagicInk = lbCanPlaceMagicInk;

window.lbAudioPool = window.lbAudioPool || {};
window.lbSoundFxVolume = 1;
function lbEffectiveSoundVolume(opts) {
    let base = opts && opts.volume !== undefined ? opts.volume : 0.55;
    let master = window.lbSoundFxVolume != null ? window.lbSoundFxVolume : 1;
    return Math.max(0, Math.min(1, base * master));
}
function lbPlaySound(key, opts) {
    opts = opts || {};
    // Sound Effects toggle (Settings): when OFF, suppress all board sound effects (paper/drag/print/etc).
    if (window.lbSoundFxOff) return null;
    let src = key === 'paper' ? LB_SOUNDS.paper[Math.floor(Math.random() * LB_SOUNDS.paper.length)] : LB_SOUNDS[key];
    if (!src) return null;
    try {
        if (opts.loop && window.lbAudioPool[key]) {
            try { window.lbAudioPool[key].loop = false; window.lbAudioPool[key].pause(); window.lbAudioPool[key].currentTime = 0; } catch (e) {}
            window.lbAudioPool[key] = null;
        }
        let a = new Audio(src);
        a.preload = 'auto';
        let offset = opts.startOffset != null ? opts.startOffset : (LB_SOUND_START_OFFSETS[key] || 0);
        let started = false;
        let doPlay = function() {
            if (started) return;
            started = true;
            a.volume = lbEffectiveSoundVolume(opts);
            if (offset > 0) {
                try {
                    let maxT = isFinite(a.duration) && a.duration > 0 ? a.duration - 0.001 : offset;
                    a.currentTime = Math.min(offset, Math.max(0, maxT));
                } catch (e) {}
            }
            if (opts.loop) { a.loop = true; window.lbAudioPool[key] = a; }
            a.play().catch(() => {});
        };
        if (a.readyState >= 1) doPlay();
        else a.addEventListener('loadedmetadata', doPlay, { once: true });
        doPlay();
        return a;
    } catch (e) { return null; }
}
function lbFadeOutSound(key, ms) {
    let a = window.lbAudioPool[key];
    if (!a) return;
    let steps = Math.max(1, Math.floor(ms / 50));
    let vol = a.volume;
    let i = 0;
    let fade = setInterval(() => {
        i++;
        a.volume = Math.max(0, vol * (1 - i / steps));
        if (i >= steps) {
            clearInterval(fade);
            try { a.loop = false; a.pause(); a.currentTime = 0; } catch (e) {}
            // Only release the pool slot if it still holds THIS audio: overlapping
            // play/fade cycles (e.g. two print-progress runs back to back) would
            // otherwise orphan the newer looping sound with no handle to stop it.
            if (window.lbAudioPool[key] === a) window.lbAudioPool[key] = null;
        }
    }, 50);
}
function lbStopAllLoopingSounds() {
    let pool = window.lbAudioPool || {};
    Object.keys(pool).forEach(function(key) {
        let a = pool[key];
        if (!a) return;
        try { a.loop = false; a.pause(); a.currentTime = 0; } catch (e) {}
        pool[key] = null;
    });
}
window.lbStopAllLoopingSounds = lbStopAllLoopingSounds;
function lbStopSound(key) {
    let a = window.lbAudioPool[key];
    if (!a) return;
    try { a.pause(); a.currentTime = 0; } catch (e) {}
    window.lbAudioPool[key] = null;
}
function lbPlayFastenerSound(attachType) {
    let t = attachType || 'pin';
    if (t === 'magnet') lbPlaySound('magnet');
    else if (t === 'nail') lbPlaySound('nail');
    else if (t === 'pin') lbPlaySound('pin');
}
window.lbPlayFastenerSound = lbPlayFastenerSound;
function lbSharpenBoardContent(zoom) {
    let root = document.getElementById('lb-interactable-areas') || document.getElementById('lb-canvas');
    if (!root) return;
    let z = Math.max(1, zoom || 1);
    root.querySelectorAll('.lb-ev-board-svg, .lb-evidence-tag, .lb-ev-text-inner, .lb-ev-text-field, .lb-board-text-render, .lb-bp-mod-baked, .lb-drop-comment-board-text, .lb-bp-mod-text, .lb-item-content img, .lb-inv-baked-snapshot, .lb-framed-image-baked svg').forEach(el => {
        el.style.imageRendering = 'auto';
        el.style.textRendering = 'geometricPrecision';
        el.style.webkitFontSmoothing = 'subpixel-antialiased';
        el.style.mozOsxFontSmoothing = 'auto';
        if (z > 1.05) el.style.transform = (el.style.transform && el.style.transform !== 'none' ? el.style.transform + ' ' : '') + 'translateZ(0)';
    });
}
function lbRefreshBoardDocumentSharpness() {
    if (typeof window.lbBoardIsBusy === 'function' && window.lbBoardIsBusy()) return;
    let zoom = window.boardZoom || 1;
    lbSharpenBoardContent(zoom);
    let items = (window.lbCurrentStore && window.lbCurrentStore.items) || [];
    items.forEach(function(item) {
        if (!item || item.stored) return;
        let el = document.getElementById(item.id);
        if (!el) return;
        if (item.type === 'framed-image') {
            delete item.framedImageBakedHtml;
            if (typeof lbCommitFramedImageBake === 'function') lbCommitFramedImageBake(item);
            let host = el.querySelector('.lb-framed-image-baked, .lb-item-content');
            if (host && item.framedImageBakedHtml) host.innerHTML = item.framedImageBakedHtml;
        }
        /* Blueprint baked HTML stays at fixed layout size — do not rebake on zoom/resize. */
    });
}
window.lbSharpenBoardContent = lbSharpenBoardContent;
window.lbRefreshBoardDocumentSharpness = lbRefreshBoardDocumentSharpness;
function lbIsPaperSoundType(type) {
    return ['add-paper','empty-sheet','noir-newspaper','polaroid','actor-file','evidence','framed-image','drag-text'].includes(type);
}

const LB_BOARD_PRESET_DETECTIVES = 'noir-detective';
const LB_BOARD_PRESET_RUNDOWN = 'slums-rundown';

function lbDetectBoardPresetId(store, themeId) {
    if (!store || store.classic) return null;
    if (store.boardPresetId) return store.boardPresetId;
    let name = String(store.boardName || '').toLowerCase();
    if (themeId === 'noir') {
        if (name.includes('detective') || name.includes('office')) return LB_BOARD_PRESET_DETECTIVES;
        return LB_BOARD_PRESET_DETECTIVES;
    }
    if (themeId === 'slums') {
        if (name.includes('rundown') || name.includes('hole')) return LB_BOARD_PRESET_RUNDOWN;
    }
    return null;
}

// Rain: immersive 1920 Noir (Detective's Office / NoirFront) only. Pipe drip: Rundown Hole only.
function lbRainEnabled(themeId, classicActive, store) {
    if (classicActive) return false;
    return themeId === 'noir';
}
function lbWindowDripEnabled(themeId, classicActive, store) {
    if (classicActive) return false;
    return lbDetectBoardPresetId(store, themeId) === LB_BOARD_PRESET_RUNDOWN;
}
function lbSealUsesBakedEmbed(item) {
    if (!item) return false;
    return !['midpin', 'player-pin', 'ambient-light', 'secret', 'board-comment'].includes(item.type);
}
function lbBakeSealIntoDocument(seal, item, faceSide) {
    if (!seal || !item) return;
    let dims = lbDocDisplayDims(item);
    seal.layoutW = dims.w;
    seal.layoutH = dims.h;
    seal.pxX = (seal.fx || 0.5) * dims.w;
    seal.pxY = (seal.fy || 0.5) * dims.h;
    seal.pxDia = (seal.scale || 0.32) * Math.min(dims.w, dims.h);
    seal.placed = true;
    seal.baked = true;
    seal.face = faceSide || seal.face || 'front';
}
window.lbBakeSealIntoDocument = lbBakeSealIntoDocument;
function lbEffectUsesRoundFrame(def) {
    def = def || {};
    if (def.effectKind === 'blood' || def.effectKind === 'ink') return false;
    return !!(def.wax || def.base);
}
function lbSteamEnabled(themeId) {
    return themeId === 'cosytavern';
}
function lbStartSteamSmoke(container) {
    if (!container || container.dataset.lbSteamInit === '1') return;
    container.dataset.lbSteamInit = '1';
    container.innerHTML = '<canvas class="lb-steam-canvas" aria-hidden="true"></canvas>';
    let canvas = container.querySelector('.lb-steam-canvas');
    if (!canvas) return;
    let ctx = canvas.getContext('2d');
    let puffs = [];
    let w = 320, h = 560;
    function resize() {
        w = Math.max(180, container.clientWidth || 320);
        h = Math.max(280, container.clientHeight || 560);
        canvas.width = w;
        canvas.height = h;
    }
    resize();
    function spawnPuff() {
        puffs.push({
            x: w * (0.18 + Math.random() * 0.52),
            y: h - 8 - Math.random() * 28,
            vx: (Math.random() - 0.5) * 0.35,
            vy: -(0.55 + Math.random() * 0.85),
            rx: 16 + Math.random() * 22,
            ry: 12 + Math.random() * 18,
            life: 0,
            maxLife: 140 + Math.random() * 120,
            rot: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 0.012,
            alpha: 0.18 + Math.random() * 0.22
        });
    }
    function drawPuff(p) {
        let t = p.life / p.maxLife;
        let fade = t < 0.12 ? t / 0.12 : (t > 0.72 ? (1 - t) / 0.28 : 1);
        let grow = 1 + t * 2.6;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        let g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(p.rx, p.ry) * grow);
        g.addColorStop(0, `rgba(245,245,250,${p.alpha * fade * 0.85})`);
        g.addColorStop(0.35, `rgba(210,210,220,${p.alpha * fade * 0.45})`);
        g.addColorStop(0.72, `rgba(180,180,190,${p.alpha * fade * 0.12})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.rx * grow, p.ry * grow, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    function tick() {
        if (!document.getElementById('lb-steam') || container.dataset.lbSteamInit !== '1') return;
        if (canvas.width !== (container.clientWidth || w) || canvas.height !== (container.clientHeight || h)) resize();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (Math.random() < 0.14) spawnPuff();
        for (let i = puffs.length - 1; i >= 0; i--) {
            let p = puffs[i];
            p.life++;
            p.x += p.vx + Math.sin(p.life * 0.035 + p.rot) * 0.45;
            p.y += p.vy;
            p.vy *= 0.998;
            p.rot += p.spin;
            drawPuff(p);
            if (p.life >= p.maxLife || p.y < -80) puffs.splice(i, 1);
        }
        requestAnimationFrame(tick);
    }
    for (let i = 0; i < 8; i++) spawnPuff();
    tick();
}
const LB_DOC_BOARD_SPAWN_SCALE = 0.5;
const LB_DOC_DEFAULT_FONT_SIZE = 16;
const LB_BP_A4_EDITOR_W = 380;
const LB_BP_A4_EDITOR_H = Math.round(LB_BP_A4_EDITOR_W * 1.414213562);
function lbBoardDimsFromAspect(aspectStr) {
    let parts = String(aspectStr || '4/3').split('/').map(Number);
    let aw = Math.max(1, parts[0] || 4), ah = Math.max(1, parts[1] || 3);
    let baseW = Math.round(LB_BP_A4_EDITOR_W * LB_DOC_BOARD_SPAWN_SCALE);
    let baseH = Math.round(LB_BP_A4_EDITOR_H * LB_DOC_BOARD_SPAWN_SCALE);
    let w = baseW, h = Math.round(w * ah / aw);
    if (h > baseH) { h = baseH; w = Math.round(h * aw / ah); }
    return { w: Math.max(8, w), h: Math.max(8, h) };
}
window.lbBoardDimsFromAspect = lbBoardDimsFromAspect;
function lbHostFaceForPlacement(hostEl, item) {
    if (!item) return 'front';
    if (hostEl && hostEl.classList && hostEl.classList.contains('lb-doc-showing-back')) return 'back';
    return lbGetItemFaceSide(item);
}
function lbHostContentRect(hostEl, item) {
    if (!hostEl) return { left: 0, top: 0, width: 1, height: 1 };
    if (item && lbIsFlippable(item) && lbHostFaceForPlacement(hostEl, item) === 'back') {
        let back = hostEl.querySelector('.lb-doc-flip-back .lb-item-content') || hostEl.querySelector('.lb-doc-flip-back');
        if (back) return back.getBoundingClientRect();
    }
    let content = hostEl.querySelector('.lb-doc-flip-front .lb-item-content') || hostEl.querySelector('.lb-item-content') || hostEl.querySelector('.lb-doc-flip-stage') || hostEl;
    return content.getBoundingClientRect();
}
function lbClickToDocFraction(hostEl, item, clientX, clientY) {
    let r = lbHostContentRect(hostEl, item);
    return {
        fx: Math.max(0, Math.min(1, (clientX - r.left) / Math.max(1, r.width))),
        fy: Math.max(0, Math.min(1, (clientY - r.top) / Math.max(1, r.height)))
    };
}
window.lbHostFaceForPlacement = lbHostFaceForPlacement;
window.lbHostContentRect = lbHostContentRect;
window.lbClickToDocFraction = lbClickToDocFraction;
function lbSharpenBlueprintPreview(root) {
    if (!root) return;
    root.querySelectorAll('.lb-bp-img-wrap img, .lb-bp-mod--image img, .lb-bp-img-fixed-wrap img').forEach(function(el) {
        el.style.imageRendering = 'auto';
        el.style.webkitFontSmoothing = 'subpixel-antialiased';
        el.style.transform = (el.style.transform && el.style.transform !== 'none' ? el.style.transform + ' ' : '') + 'translateZ(0)';
        el.decoding = 'sync';
        el.loading = 'eager';
    });
}
window.lbSharpenBlueprintPreview = lbSharpenBlueprintPreview;
function lbScaleDimsForBoard(w, h) {
    return {
        w: Math.max(8, Math.round((w || 300) * LB_DOC_BOARD_SPAWN_SCALE)),
        h: Math.max(8, Math.round((h || 400) * LB_DOC_BOARD_SPAWN_SCALE))
    };
}
function lbApplyBoardSpawnScale(item) {
    if (!item) return item;
    let srcW = item.w || item.originalW || 300;
    let srcH = item.h || item.originalH || 400;
    let scaled = lbScaleDimsForBoard(srcW, srcH);
    item.w = scaled.w;
    item.h = scaled.h;
    item.originalW = scaled.w;
    item.originalH = scaled.h;
    return item;
}
/** Editor stage size when re-opening a placed document (inverse of board spawn scale). */
function lbEditorStageDimsFromItem(item, defaultW, defaultH) {
    defaultW = defaultW || 300;
    defaultH = defaultH || 400;
    let w = item._editorW;
    let h = item._editorH;
    if (!w && item.w) {
        w = item._boardSpawnScaled ? Math.round(item.w / LB_DOC_BOARD_SPAWN_SCALE) : item.w;
    }
    if (!h && item.h) {
        h = item._boardSpawnScaled ? Math.round(item.h / LB_DOC_BOARD_SPAWN_SCALE) : item.h;
    }
    return { w: w || defaultW, h: h || defaultH };
}
function lbEditorFontSizeFromItem(item, defaultSize) {
    defaultSize = defaultSize || LB_DOC_DEFAULT_FONT_SIZE;
    if (item._editorFontSize) return item._editorFontSize;
    if (item.fontSize) {
        return Math.max(1, Math.round(item.fontSize / LB_DOC_BOARD_SPAWN_SCALE));
    }
    return defaultSize;
}
/** Commit editor canvas size → board pixels (idempotent when editor size unchanged). */
function lbCommitDocEditorDims(item, sz, opts) {
    opts = opts || {};
    let prevEw = item._editorW || 0;
    let prevEh = item._editorH || 0;
    let prevBw = item.originalW || item.w || 0;
    let prevBh = item.originalH || item.h || 0;
    sz.w = Math.max(1, Math.round(sz.w));
    sz.h = Math.max(1, Math.round(sz.h));
    item._editorW = sz.w;
    item._editorH = sz.h;
    item._boardSpawnScaled = true;
    let boardW, boardH;
    if (prevEw > 0 && prevEh > 0 && prevBw > 0 && prevBh > 0) {
        boardW = Math.round(sz.w * (prevBw / prevEw));
        boardH = Math.round(sz.h * (prevBh / prevEh));
    } else {
        boardW = Math.round(sz.w * LB_DOC_BOARD_SPAWN_SCALE);
        boardH = Math.round(sz.h * LB_DOC_BOARD_SPAWN_SCALE);
    }
    if (!opts.noPaper) {
        boardW = Math.max(120, Math.min(720, boardW));
        boardH = Math.max(68, boardH);
    } else {
        boardW = Math.max(24, boardW);
        boardH = Math.max(16, boardH);
    }
    item.w = boardW;
    item.h = boardH;
    item.originalW = boardW;
    item.originalH = boardH;
    return { boardW: boardW, boardH: boardH };
}
function lbCommitDocEditorFont(item, editorFontSize) {
    item._editorFontSize = Math.max(1, editorFontSize || LB_DOC_DEFAULT_FONT_SIZE);
    item.fontSize = Math.max(1, Math.round(item._editorFontSize * LB_DOC_BOARD_SPAWN_SCALE));
}
window.lbEditorStageDimsFromItem = lbEditorStageDimsFromItem;
window.lbEditorFontSizeFromItem = lbEditorFontSizeFromItem;
window.lbCommitDocEditorDims = lbCommitDocEditorDims;
window.lbCommitDocEditorFont = lbCommitDocEditorFont;
window.LB_DOC_DEFAULT_FONT_SIZE = LB_DOC_DEFAULT_FONT_SIZE;
window.lbScaleDimsForBoard = lbScaleDimsForBoard;
window.lbApplyBoardSpawnScale = lbApplyBoardSpawnScale;

const LB_PIN_SIZE_SCALE = { big: 1, medium: 0.8, small: 0.64 };
// All pin/tape fasteners share identical geometry (Classic Corkboard pin baseline).
function lbPinBaseSize() { return { w: 19.6, h: 26.6 }; }
function lbPinRenderScale(item) {
    let sizeKey = item.pinSize || 'medium';
    let base = LB_PIN_SIZE_SCALE[sizeKey] || LB_PIN_SIZE_SCALE.medium;
    let custom = item.pinScale || 1;
    let docScale = 1;
    if (item.originalW && item.w) docScale = Math.max(0.5, Math.min(1, item.w / item.originalW));
    return base * custom * 1.56 * docScale;
}
function lbDefaultPinSize(item) {
    if (!item.pinSize) item.pinSize = 'medium';
    if (item.pinScale == null) item.pinScale = 1;
    return item;
}
function lbIsNewspaperAttach(item) {
    return !!(item && (item.type === 'noir-newspaper' || item.type === 'newspaper'));
}
function lbTapePixelYOffset(item) {
    if (lbIsNewspaperAttach(item)) return 50;
    return -20;
}
function lbItemIsLandscape(item) {
    if (!item) return false;
    let w = item.w || item.originalW || 300;
    let h = item.h || item.originalH || 400;
    return w > h;
}
function lbPaperBgStyle(url, opts) {
    opts = opts || {};
    if (!url) return 'background:transparent; box-shadow:none; border:none;';
    if (opts.landscape) {
        let rot = 'rotate(90deg)';
        if (opts.mirrored) rot += ' scaleX(-1)';
        return `background:url('${url}') center/contain no-repeat; transform:${rot}; transform-origin:center center; width:100%; height:100%; box-shadow:none; border:none;`;
    }
    let mirror = opts.mirrored ? 'transform:scaleX(-1); transform-origin:center center;' : '';
    return `background:url('${url}') center/100% 100% no-repeat; box-shadow:none; border:none; ${mirror}`;
}
function lbAttachEdgeInset(item) {
    return LB_ATTACH_EDGE_INSET * 0.8;
}