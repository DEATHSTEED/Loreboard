'use strict';
// LOREBOARD - Floating eye and UI shell

function lbEyeHTML() { return lbRadialEyeHTML(); }

function lbEyeSpawnPop(clientX, clientY, color, count) {
    if (window.lbSpawnParticles) { window.lbSpawnParticles(clientX, clientY, color, count); return; }
    let col = color || '#d4af37';
    let n = count || 34;
    let container = document.createElement('div');
    container.style.cssText = `position:fixed;left:${clientX}px;top:${clientY}px;pointer-events:none;z-index:10000020;`;
    document.body.appendChild(container);
    for (let i = 0; i < n; i++) {
        let p = document.createElement('div');
        let size = Math.random() * 6 + 2;
        p.style.cssText = `width:${size}px;height:${size}px;background:${col};border-radius:50%;position:absolute;box-shadow:0 0 10px ${col},0 0 20px ${col};`;
        container.appendChild(p);
        let angle = Math.random() * Math.PI * 2;
        let velocity = Math.random() * 140 + 50;
        let dx = Math.cos(angle) * velocity;
        let dy = Math.sin(angle) * velocity;
        p.animate([
            { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
            { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(0)`, opacity: 0 }
        ], { duration: Math.random() * 500 + 350, easing: 'cubic-bezier(0.25,1,0.5,1)', fill: 'forwards' });
    }
    setTimeout(() => container.remove(), 1100);
}

function lbEyeSpawnSinglePop(clientX, clientY, color) {
    let col = color || '#d4af37';
    let p = document.createElement('div');
    p.style.cssText = `position:fixed;left:${clientX}px;top:${clientY}px;width:8px;height:8px;background:${col};border-radius:50%;pointer-events:none;z-index:10000020;transform:translate(-50%,-50%);box-shadow:0 0 6px ${col};`;
    document.body.appendChild(p);
    p.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: 'translate(-50%,-50%) scale(2.2)', opacity: 0 }
    ], { duration: 380, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'forwards' });
    setTimeout(() => p.remove(), 420);
}

function lbEnsureEyeCSS() { /* styles loaded via module.json */ }

function lbInitEyeRig(hostEl, opts) {
    opts = opts || {};
    lbEnsureEyeCSS();
    let accentRgb = opts.accentRgb || '212,175,55';
    let baseScale = opts.baseScale != null ? opts.baseScale : LB_EYE_SCALE_MENU;
    let EYE = hostEl.find('.lb-radial-eye').first();
    if (!EYE.length) {
        hostEl.append(`<div class="lb-eye-scaled lb-eye-hd${opts.investigation ? ' lb-eye-inv' : ''}" aria-hidden="true">${lbEyeHTML()}</div>`);
        EYE = hostEl.find('.lb-radial-eye').first();
    } else {
        hostEl.find('.lb-eye-scaled').first().addClass('lb-eye-hd');
    }
    hostEl.addClass('lb-eye-rig lb-eye-hd');
    let glowOnHoverOnly = !!opts.glowOnHoverOnly;
    let noAura = opts.noAura === true || opts.investigation || glowOnHoverOnly;
    if (noAura) hostEl.addClass('lb-eye-no-aura');
    hostEl[0].style.setProperty('--lb-accent-rgb', accentRgb);
    hostEl[0].style.setProperty('--lb-eye-scale', String(baseScale));
    let eyeFloat = EYE.find('.lb-radial-eye-float').first();
    let socket = EYE.find('.lb-radial-eye-socket');
    let iris = EYE.find('.lb-radial-eye-iris');
    let pupil = EYE.find('.lb-radial-eye-pupil');
    const MAX_IRIS = opts.maxIrisOffset || 18;
    const MAX_PUPIL = opts.maxPupilOffset || 8;
    let targetIx = 0, targetIy = 0, curIx = 0, curIy = 0;
    let targetPx = 0, targetPy = 0, curPx = 0, curPy = 0;
    let targetRx = 0, targetRy = 0, curRx = 0, curRy = 0;
    let hoverEngaged = false;
    let forceEngaged = false;
    let hoverEl = null;
    let frozen = false;
    let nervous = false;
    let allowFloat = opts.allowFloat !== false;
    let allowIdleGaze = opts.allowIdleGaze !== false;
    let suspended = false;
    let alive = true;
    let blinkTimer = null;
    let idleTimer = null;
    let rafId = null;
    let clientX = 0, clientY = 0;
    let idleSaccade = false;
    let idleLookUntil = 0;
    let floatPhase = Math.random() * Math.PI * 2;
    let externalFloatX = 0, externalFloatY = 0;
    let hoverScale = opts.hoverScale || 1.08;
    let invHoverScale = opts.invHoverScale != null ? opts.invHoverScale : LB_EYE_INV_HOVER_SCALE;
    let targetHoverScale = 1;
    let curHoverScale = 1;
    let hoverScaleEase = opts.hoverScaleEase || 0.14;

    function refreshEngagedVisuals() {
        let on = (hoverEngaged || forceEngaged) && !suspended;
        EYE.toggleClass('lb-radial-eye-engaged', on);
        EYE.toggleClass('lb-radial-eye-hover', false);
        socket.toggleClass('lb-radial-eye-engaged', on);
        hostEl.toggleClass('lb-eye-frozen', frozen && on);
        hostEl.toggleClass('lb-eye-hover-active', on && (glowOnHoverOnly || forceEngaged));
    }

    function aimAtPoint(px, py) {
        let anchor = lbRadialElCenter(socket.length ? socket[0] : EYE[0]);
        let dx = px - anchor.x;
        let dy = py - anchor.y;
        let angle = Math.atan2(dy, dx);
        let dist = Math.min(MAX_IRIS, Math.hypot(dx, dy) * 0.16);
        targetIx = Math.cos(angle) * dist;
        targetIy = Math.sin(angle) * dist;
        let pDist = Math.min(MAX_PUPIL, Math.hypot(dx, dy) * 0.06);
        targetPx = Math.cos(angle) * pDist;
        targetPy = Math.sin(angle) * pDist;
        targetRx = Math.max(-12, Math.min(12, dy * 0.04));
        targetRy = Math.max(-14, Math.min(14, -dx * 0.04));
        idleSaccade = false;
    }

    function aimAtElement(el) {
        if (!el) return;
        let c = lbRadialElCenter(el);
        aimAtPoint(c.x, c.y);
    }

    function triggerBlink(doubleBlink) {
        if (!alive || suspended) return;
        EYE.addClass('lb-radial-eye-blink');
        setTimeout(() => { if (alive) EYE.removeClass('lb-radial-eye-blink'); }, 280);
        if (doubleBlink) {
            setTimeout(() => {
                if (!alive || suspended) return;
                EYE.addClass('lb-radial-eye-blink');
                setTimeout(() => { if (alive) EYE.removeClass('lb-radial-eye-blink'); }, 220);
            }, 340);
        }
    }

    function triggerSquint(holdMs) {
        if (!alive || suspended) return;
        EYE.addClass('lb-radial-eye-squint');
        setTimeout(() => { if (alive) EYE.removeClass('lb-radial-eye-squint'); }, holdMs || 480);
    }

    function triggerSleep() {
        if (!alive || suspended) return;
        EYE.removeClass('lb-radial-eye-squint lb-radial-eye-blink');
        EYE.addClass('lb-radial-eye-sleep');
    }

    function wakeSleep() {
        if (!alive) return;
        EYE.removeClass('lb-radial-eye-sleep lb-radial-eye-drowsy lb-radial-eye-squint');
        EYE[0].style.setProperty('--lb-lid-close', '0');
    }

    function setLidClose(amount) {
        if (!alive) return;
        let t = Math.max(0, Math.min(1, amount || 0));
        EYE[0].style.setProperty('--lb-lid-close', String(t));
        if (t >= 0.98) {
            EYE.removeClass('lb-radial-eye-drowsy lb-radial-eye-squint lb-radial-eye-blink');
            EYE.addClass('lb-radial-eye-sleep');
        } else if (t > 0.02) {
            EYE.removeClass('lb-radial-eye-sleep lb-radial-eye-squint');
            EYE.addClass('lb-radial-eye-drowsy');
        } else {
            EYE.removeClass('lb-radial-eye-drowsy lb-radial-eye-sleep');
        }
    }

    function scheduleBlink() {
        if (!alive) return;
        let interval = opts.assistantMode ? (1800 + Math.random() * 3200) : (1400 + Math.random() * 3800);
        blinkTimer = setTimeout(() => {
            if (!alive) { scheduleBlink(); return; }
            if (!suspended && !EYE.hasClass('lb-radial-eye-sleep') && !EYE.hasClass('lb-radial-eye-drowsy')) {
                if (opts.assistantMode && Math.random() < 0.1) triggerSquint(280 + Math.random() * 320);
                else triggerBlink(Math.random() < 0.18);
            }
            scheduleBlink();
        }, interval);
    }

    function pickIdleGaze() {
        let angle = Math.random() * Math.PI * 2;
        let irisDist = idleSaccade ? (10 + Math.random() * 8) : (3 + Math.random() * 16);
        targetIx = Math.cos(angle) * irisDist;
        targetIy = Math.sin(angle) * irisDist;
        targetPx = Math.cos(angle) * (1 + Math.random() * (idleSaccade ? 6 : 7));
        targetPy = Math.sin(angle) * (1 + Math.random() * (idleSaccade ? 6 : 7));
        targetRx = (Math.random() - 0.5) * (idleSaccade ? 14 : 10);
        targetRy = (Math.random() - 0.5) * (idleSaccade ? 16 : 12);
        idleSaccade = !idleSaccade;
        idleLookUntil = performance.now() + (idleSaccade ? 520 : 780) + Math.random() * 640;
    }

    function scheduleIdleLook() {
        if (!alive || !allowIdleGaze) return;
        let delay = hoverEngaged
            ? (3200 + Math.random() * 3600)
            : (opts.assistantMode ? (500 + Math.random() * 1100) : (1200 + Math.random() * 2400));
        idleTimer = setTimeout(() => {
            if (!alive) { scheduleIdleLook(); return; }
            if (!suspended && !hoverEngaged && !frozen) pickIdleGaze();
            scheduleIdleLook();
        }, delay);
    }

    function tick() {
        if (!alive) return;
        if (!suspended) {
            if (hoverEngaged && hoverEl) aimAtElement(hoverEl);
            else if (!frozen) {
                if (opts.assistantMode) {
                    if (performance.now() >= idleLookUntil && !EYE.hasClass('lb-radial-eye-sleep') && !EYE.hasClass('lb-radial-eye-drowsy')) {
                        pickIdleGaze();
                    }
                } else if (performance.now() >= idleLookUntil) aimAtPoint(clientX, clientY);
            }
            let irisEase = opts.assistantMode ? (idleSaccade ? 0.3 : 0.24) : (idleSaccade ? 0.26 : 0.2);
            let pupilEase = opts.assistantMode ? (idleSaccade ? 0.34 : 0.28) : (idleSaccade ? 0.3 : 0.24);
            let tiltEase = 0.12;
            if (!frozen || !hoverEngaged) {
                curIx += (targetIx - curIx) * irisEase;
                curIy += (targetIy - curIy) * irisEase;
                curPx += (targetPx - curPx) * pupilEase;
                curPy += (targetPy - curPy) * pupilEase;
                curRx += (targetRx - curRx) * tiltEase;
                curRy += (targetRy - curRy) * tiltEase;
            }
            iris.css('transform', `translate3d(${curIx.toFixed(2)}px,${curIy.toFixed(2)}px,0)`);
            pupil.css('transform', `translate3d(${curPx.toFixed(2)}px,${curPy.toFixed(2)}px,0)`);
            let floatX = externalFloatX;
            let floatY = externalFloatY;
            if (allowFloat && !frozen) {
                floatPhase += nervous ? 0.028 : 0.018;
                floatX += Math.sin(floatPhase) * 4 + Math.sin(floatPhase * 0.47 + 1.2) * 1.5;
                floatY += Math.sin(floatPhase * 0.31 + 0.8) * 1.2;
            }
            curHoverScale += (targetHoverScale - curHoverScale) * hoverScaleEase;
            hostEl[0].style.setProperty('--lb-eye-hover-scale', curHoverScale.toFixed(4));
            hostEl[0].style.setProperty('--lb-eye-rx', curRx.toFixed(2) + 'deg');
            hostEl[0].style.setProperty('--lb-eye-ry', curRy.toFixed(2) + 'deg');
            let hoverScaleOut = curHoverScale;
            if (opts.investigation && hoverEngaged) {
                hoverScaleOut = curHoverScale * (1 + Math.sin(performance.now() * 0.0042) * 0.07);
            }
            eyeFloat.css('transform', `translate3d(${floatX.toFixed(2)}px,${floatY.toFixed(2)}px,0) rotateX(${curRx.toFixed(2)}deg) rotateY(${curRy.toFixed(2)}deg) scale(${hoverScaleOut.toFixed(4)})`);
        }
        rafId = requestAnimationFrame(tick);
    }

    function cleanup() {
        alive = false;
        if (rafId) cancelAnimationFrame(rafId);
        if (blinkTimer) clearTimeout(blinkTimer);
        if (idleTimer) clearTimeout(idleTimer);
    }

    scheduleBlink();
    scheduleIdleLook();
    tick();

    return {
        EYE: EYE,
        destroy: cleanup,
        setAccentRgb: (rgb) => { accentRgb = rgb; hostEl[0].style.setProperty('--lb-accent-rgb', rgb); },
        setBaseScale: (sc) => { baseScale = sc; hostEl[0].style.setProperty('--lb-eye-scale', String(sc)); },
        updateCursor: (x, y) => { clientX = x; clientY = y; },
        setHoverEl: (el, freezeOnHover) => {
            hoverEl = el || null;
            hoverEngaged = !!el;
            frozen = !!freezeOnHover && hoverEngaged;
            targetHoverScale = hoverEngaged ? (opts.investigation ? invHoverScale : hoverScale) : 1;
            if (opts.investigation && hoverEngaged) {
                hostEl.addClass('lb-eye-pupil-wide');
            } else if (opts.investigation) {
                hostEl.removeClass('lb-eye-pupil-wide');
            }
            refreshEngagedVisuals();
            if (el) aimAtElement(el);
        },
        setEngaged: (on) => {
            forceEngaged = !!on;
            refreshEngagedVisuals();
            if (forceEngaged) triggerBlink(Math.random() < 0.35);
        },
        setFrozen: (on) => { frozen = !!on; refreshEngagedVisuals(); },
        setNervous: (on) => { nervous = !!on; hostEl.toggleClass('lb-eye-nervous', nervous); },
        setExternalFloat: (x, y) => { externalFloatX = x || 0; externalFloatY = y || 0; },
        setAllowFloat: (on) => { allowFloat = !!on; },
        aimAtElement: aimAtElement,
        aimAtPoint: aimAtPoint,
        pickIdleGaze: pickIdleGaze,
        triggerBlink: triggerBlink,
        triggerSquint: triggerSquint,
        triggerSleep: triggerSleep,
        wakeSleep: wakeSleep,
        setLidClose: setLidClose,
        triggerFleeShrink: () => {
            hostEl.addClass('lb-eye-flee-shrink');
            triggerBlink(false);
        },
        clearFleeShrink: () => hostEl.removeClass('lb-eye-flee-shrink'),
        setPupilStyle: (style) => {
            hostEl.removeClass('lb-eye-pupil-wide lb-eye-pupil-narrow');
            if (style === 'wide') hostEl.addClass('lb-eye-pupil-wide');
            else if (style === 'narrow') hostEl.addClass('lb-eye-pupil-narrow');
        },
        setPupilProximity: (t) => {
            let clamped = Math.max(0, Math.min(1, t || 0));
            let base = 38, wide = 62;
            let sz = base + (wide - base) * clamped;
            let m = -sz / 2;
            pupil.css({ width: sz + 'px', height: sz + 'px', margin: `${m}px 0 0 ${m}px` });
        },
        getCenter: () => lbRadialElCenter(socket.length ? socket[0] : EYE[0]),
        suspend: () => { suspended = true; refreshEngagedVisuals(); },
        resume: () => { suspended = false; refreshEngagedVisuals(); }
    };
}

function lbEyeMenuSceneActive() {
    return !document.getElementById('lb-app-root') && (
        document.getElementById('lb-start-overlay') ||
        document.getElementById('lb-create-overlay') ||
        document.getElementById('lb-load-overlay')
    );
}

const LB_EYE_FLOAT = {
    logoONx: 0.199,
    logoONy: 0.502
};

function lbEyeGetLogoOCenter() {
    let img = document.querySelector('#lb-start-overlay .lb-start-logo');
    if (!img) return null;
    let r = img.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return {
        x: r.left + r.width * LB_EYE_FLOAT.logoONx,
        y: r.top + r.height * LB_EYE_FLOAT.logoONy
    };
}

function lbEyeStartMenuVisible() {
    return !!document.getElementById('lb-start-overlay');
}

function lbInspectIsImageFace(item, faceData) {
    if (!faceData) return false;
    if (faceData.faceFormat === 'image') return !!(faceData.customImg || faceData.imgSrc);
    if (item && (item.type === 'framed-image' || item.type === 'poster')) {
        return !!(faceData.customImg || faceData.imgSrc || item.customImg || item.imgSrc);
    }
    return false;
}

function lbInspectDocDims(item, faceData) {
    faceData = faceData || {};
    let bpFlag = !!(faceData.isBlueprint || (item && item.isBlueprint));
    let hasBakedBp = bpFlag && !!(faceData.blueprintBakedHtml);
    return hasBakedBp ? lbDocBakedViewDims(item, faceData) : lbDocDisplayDims(item);
}

function lbBuildInspectDocumentFaceHTML(item, faceData, mirrored, faceSide) {
    if (!item || !faceData) return '';
    let docDims = lbInspectDocDims(item, faceData);
    let iw = docDims.w, ih = docDims.h;
    faceSide = faceSide || (mirrored ? 'back' : 'front');
    let embeds = lbBuildDocEmbedsLayerHTML(item, faceSide, { iw, ih });
    if (mirrored && lbIsFlippable(item) && !item.doubleSided) {
        let frontPaper = item.faces.front.paper || item.paper || 1;
        let noPaper = frontPaper === 'transparent' || item.faces.front.noPaper || item.noPaper;
        let paperStyle = noPaper ? 'background:transparent;' : lbPaperFaceStyle({ paper: frontPaper }, true);
        return `<div style="width:100%;height:100%;position:relative;overflow:hidden;"><div class="lb-paper-only" style="width:100%;height:100%;${paperStyle}"></div></div>`;
    }
    if (lbInspectIsImageFace(item, faceData) && (faceData.customImg || faceData.imgSrc || item.customImg || item.imgSrc)) {
        let imgPseudo = lbFaceImageToPseudoItem(faceData, item);
        let imgSrc = faceData.customImg || faceData.imgSrc || item.customImg || item.imgSrc;
        let imgHtml = (window.lbBuildFramedImageBoardHTML ? window.lbBuildFramedImageBoardHTML(imgPseudo, imgSrc) : '');
        return `<div style="width:100%;height:100%;position:relative;overflow:hidden;transform:${mirrored ? 'scaleX(-1)' : 'none'};transform-origin:center center;">${imgHtml}${embeds}</div>`;
    }
    let dtFont = faceData.font || item.font || 'Courier New';
    let dtPlaceholder = `<span style="opacity:0.45;font-style:italic;">${faceData.placeholder || item.placeholder || 'Add Text'}</span>`;
    let dtHasText = (faceData.richText && faceData.richText.trim()) || (faceData.text && faceData.text.trim());
    let dtContent = dtHasText ? (faceData.richText || faceData.text.replace(/\n/g, '<br>')) : (item.dropComment ? '' : dtPlaceholder);
    let txPct = faceData.textXPct !== undefined ? faceData.textXPct : (item.dropComment ? 7.5 : 0);
    let tyPct = faceData.textYPct !== undefined ? faceData.textYPct : (item.dropComment ? 7.5 : 0);
    let twPct = faceData.textWPct !== undefined ? faceData.textWPct : (item.dropComment ? 85 : 100);
    let thPct = faceData.textHPct !== undefined ? faceData.textHPct : (item.dropComment ? 85 : 100);
    let dtExtra = item.dropComment ? 'outline:none !important;border:none !important;box-shadow:none !important;vertical-align:top;text-align:left;background:transparent !important;margin:0;' : '';
    let dtLang = faceData.documentLanguage || item.documentLanguage || '';
    let bpFlag = !!(faceData.isBlueprint || item.isBlueprint);
    let bpModules = faceData.blueprintModules || item.blueprintModules || [];
    let dtRender = item.dropComment && !bpFlag
        ? lbDropCommentBoardTextHTML(dtContent, { font: dtFont, fontSize: faceData.fontSize || item.fontSize || 16, color: faceData.color || item.color || '#111111', extraStyle: dtExtra, documentLanguage: dtLang, inkSeed: item.id, viewW: iw * 10, viewH: ih * 10 })
        : (!bpFlag ? lbBoardTextRenderHTML(dtContent, { font: dtFont, fontSize: faceData.fontSize || item.fontSize || 16, color: faceData.color || item.color || '#111', extraStyle: dtExtra, documentLanguage: dtLang, inkSeed: item.id, viewW: iw * 10, viewH: ih * 10 }) : '');
    let blueprintLayers = '';
    if (bpFlag && bpModules.length) {
        let bpScale = lbBPBoardFontScale(item, iw);
        let bpEditorFont = item._editorFontSize || Math.max(1, Math.round((faceData.fontSize || item.fontSize || 16) / (bpScale || 1)));
        let cached = faceData.blueprintBakedHtml;
        if (cached) {
            // Per-viewer language cipher on the shared bake (see lbResolveBlueprintBakedLayer).
            blueprintLayers = lbWrapBlueprintBakedLayer(dtLang ? lbMaybeCipherHtml(cached, dtLang) : cached, faceData.blueprintBakedW || iw, faceData.blueprintBakedH || ih);
        } else {
            blueprintLayers = lbResolveBlueprintBakedLayer(item, faceData, bpModules, iw, ih);
        }
    }
    let paperLayer = '';
    let paperNum = faceData.paper || item.paper || 1;
    if (item.dropComment) {
        if (paperNum !== 'transparent' && !faceData.noPaper && !item.noPaper) {
            let paperBg = lbGlobalPaperUrl(paperNum) || LB_PARCHMENT_MASK;
            let landscapePaper = iw > ih;
            let mirrorTf = mirrored ? (landscapePaper ? ' scaleX(-1)' : 'scaleX(-1)') : '';
            let paperImgStyle = landscapePaper
                ? `position:absolute;left:50%;top:50%;width:${ih}px;height:${iw}px;margin:0;padding:0;object-fit:fill;object-position:center;display:block;border:none;outline:none;box-shadow:none;transform:translate(-50%,-50%) rotate(90deg)${mirrorTf};transform-origin:center center;`
                : `position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;object-fit:fill;display:block;border:none;outline:none;box-shadow:none;${mirrored ? 'transform:scaleX(-1);transform-origin:center center;' : ''}`;
            paperLayer = `<div class="lb-drop-comment-paper" style="position:absolute;inset:0;margin:0;padding:0;overflow:hidden;box-sizing:border-box;pointer-events:none;z-index:1;border:none;outline:none;box-shadow:none;"><img src="${paperBg}" style="${paperImgStyle}" alt=""></div>`;
        }
    } else if (!item.textOnly) {
        let paperBg = lbInvPaperUrl(paperNum) || lbGlobalPaperUrl(paperNum) || '';
        if (paperBg) paperLayer = `<div style="position:absolute;inset:0;${lbPaperBgStyle(paperBg, { mirrored: !!mirrored, landscape: lbItemIsLandscape(item) })}"></div>`;
    }
    if (item.dropComment) {
        return `<div style="width:100%;height:100%;position:relative;box-sizing:border-box;border:none;outline:none;box-shadow:none;background:transparent;">
            ${paperLayer}${blueprintLayers}
            <div class="lb-board-text-slot lb-drop-comment-text-slot" style="position:absolute;left:${txPct}%;top:${tyPct}%;width:${twPct}%;height:${thPct}%;box-sizing:border-box;z-index:2;overflow:hidden;border:none;outline:none;box-shadow:none;${bpFlag ? 'display:none;' : ''}">${dtRender}</div>${embeds}</div>`;
    }
    return `<div style="width:100%;height:100%;position:relative;box-sizing:border-box;border:none;outline:none;box-shadow:none;background:transparent;">
        ${paperLayer}${blueprintLayers}
        <div class="lb-board-text-slot" style="position:absolute;left:${txPct}%;top:${tyPct}%;width:${twPct}%;height:${thPct}%;box-sizing:border-box;z-index:2;${bpFlag ? 'display:none;' : ''}">
        <div style="position:relative;z-index:2;width:100%;height:100%;border:none;outline:none;box-shadow:none;">${dtRender}</div></div>${embeds}</div>`;
}

/** #1 DocumentRenderer / Take a Look: bake entire document face into one fixed SVG layer (1:1 with 3D transform). */
function lbBuildInspectBakedLayersHTML(item, faceData, mirrored, iw, ih) {
    if (!item || !faceData) return '';
    iw = iw || lbDocDisplayDims(item).w;
    ih = ih || lbDocDisplayDims(item).h;
    if (mirrored && lbIsFlippable(item) && !item.doubleSided) {
        let frontPaper = item.faces.front.paper || item.paper || 1;
        let noPaper = frontPaper === 'transparent' || item.faces.front.noPaper || item.noPaper;
        let layers = [];
        if (!noPaper) {
            let paperBg = lbInvPaperUrl(frontPaper) || '';
            if (item.dropComment) {
                paperBg = lbInvPaperUrl(frontPaper) || LB_PARCHMENT_MASK;
                let landscapePaper = iw > ih;
                if (landscapePaper) {
                    let pw = ih, ph = iw;
                    layers.push(`<g transform="translate(${iw / 2},${ih / 2}) rotate(90) scale(-1,1) translate(${-pw / 2},${-ph / 2})"><image href="${paperBg}" x="0" y="0" width="${pw}" height="${ph}" preserveAspectRatio="none" style="pointer-events:none;"/></g>`);
                } else {
                    layers.push(`<g transform="scale(-1,1) translate(${-iw},0)"><image href="${paperBg}" x="0" y="0" width="${iw}" height="${ih}" preserveAspectRatio="none" style="pointer-events:none;"/></g>`);
                }
            } else if (paperBg) {
                layers.push(`<g transform="scale(-1,1) translate(${-iw},0)"><image href="${paperBg}" x="0" y="0" width="${iw}" height="${ih}" preserveAspectRatio="none" style="pointer-events:none;"/></g>`);
            }
        }
        return layers.join('');
    }
    if (lbInspectIsImageFace(item, faceData) && (faceData.customImg || faceData.imgSrc || item.customImg || item.imgSrc)) {
        let imgPseudo = lbFaceImageToPseudoItem(faceData, item);
        let imgSrc = faceData.customImg || faceData.imgSrc || item.customImg || item.imgSrc;
        let imgHtml = (window.lbBuildFramedImageBoardHTML ? window.lbBuildFramedImageBoardHTML(imgPseudo, imgSrc) : '');
        return `<foreignObject x="0" y="0" width="${iw}" height="${ih}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${iw}px;height:${ih}px;overflow:hidden;transform:${mirrored ? 'scaleX(-1)' : 'none'};transform-origin:center center;">${imgHtml}</div></foreignObject>`;
    }
    let layers = [];
    let dtFont = faceData.font || item.font || 'Courier New';
    let dtHasText = (faceData.richText && faceData.richText.trim()) || (faceData.text && faceData.text.trim());
    let dtContent = dtHasText ? (faceData.richText || faceData.text.replace(/\n/g, '<br>')) : '';
    let txPct = faceData.textXPct !== undefined ? faceData.textXPct : (item.dropComment ? 7.5 : 0);
    let tyPct = faceData.textYPct !== undefined ? faceData.textYPct : (item.dropComment ? 7.5 : 0);
    let twPct = faceData.textWPct !== undefined ? faceData.textWPct : (item.dropComment ? 85 : 100);
    let thPct = faceData.textHPct !== undefined ? faceData.textHPct : (item.dropComment ? 85 : 100);
    let txPx = Math.round((txPct / 100) * iw);
    let tyPx = Math.round((tyPct / 100) * ih);
    let twPx = Math.round((twPct / 100) * iw);
    let thPx = Math.round((thPct / 100) * ih);
    let dtSize = faceData.fontSize || item.fontSize || 16;
    let dtColor = faceData.color || item.color || '#111';
    let dtLang = faceData.documentLanguage || item.documentLanguage || '';
    if (dtLang && dtContent) dtContent = lbMaybeCipherHtml(dtContent, dtLang);
    let bpFlag = !!(faceData.isBlueprint || item.isBlueprint);
    let bpModules = faceData.blueprintModules || item.blueprintModules || [];
    let paperNum = faceData.paper || item.paper || 1;
    let noPaper = paperNum === 'transparent' || faceData.noPaper || item.noPaper;
    if (item.dropComment && !noPaper) {
        let paperBg = lbInvPaperUrl(paperNum) || LB_PARCHMENT_MASK;
        let landscapePaper = iw > ih;
        if (landscapePaper) {
            let pw = ih, ph = iw;
            let rotTf = mirrored ? ` rotate(90) scale(-1,1) translate(${-pw},0)` : ' rotate(90)';
            layers.push(`<g transform="translate(${iw / 2},${ih / 2})${rotTf} translate(${-pw / 2},${-ph / 2})"><image href="${paperBg}" x="0" y="0" width="${pw}" height="${ph}" preserveAspectRatio="none" style="pointer-events:none;"/></g>`);
        } else {
            let imgTf = mirrored ? ` transform="scale(-1,1) translate(${-iw},0)"` : '';
            layers.push(`<image href="${paperBg}" x="0" y="0" width="${iw}" height="${ih}" preserveAspectRatio="none"${imgTf}/>`);
        }
    } else if (!item.textOnly && !noPaper) {
        let paperBg = lbInvPaperUrl(paperNum) || '';
        if (paperBg) {
            let imgTf = mirrored ? ` transform="scale(-1,1) translate(${-iw},0)"` : '';
            layers.push(`<image href="${paperBg}" x="0" y="0" width="${iw}" height="${ih}" preserveAspectRatio="none"${imgTf}/>`);
        }
    }
    if (bpFlag && bpModules.length) {
        let cached = faceData.blueprintBakedHtml;
        let bpInner = cached || lbBakeBlueprintFaceHtml(item, faceData, bpModules, iw, ih);
        // Per-viewer language cipher on the shared bake (see lbResolveBlueprintBakedLayer).
        if (dtLang && bpInner) bpInner = lbMaybeCipherHtml(bpInner, dtLang);
        let layoutW = faceData.blueprintBakedW || iw;
        let layoutH = faceData.blueprintBakedH || ih;
        layers.push(`<foreignObject x="0" y="0" width="${layoutW}" height="${layoutH}"><div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${layoutW}px;height:${layoutH}px;overflow:hidden;pointer-events:none;">${bpInner}</div></foreignObject>`);
    }
    if (!bpFlag && dtContent) {
        let dtExtra = item.dropComment ? 'margin:0;padding:0;outline:none;border:none;background:transparent;' : '';
        layers.push(`<foreignObject x="${txPx}" y="${tyPx}" width="${twPx}" height="${thPx}"><div xmlns="http://www.w3.org/1999/xhtml" class="lb-inv-baked-text" style="width:${twPx}px;height:${thPx}px;overflow:hidden;box-sizing:border-box;font-family:${dtFont};font-size:${dtSize}px;color:${dtColor};line-height:1.45;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;${dtExtra}">${dtContent}</div></foreignObject>`);
    }
    return layers.join('');
}

function lbWrapInspectInnerAsSVG(inner, iw, ih) {
    iw = iw || 300; ih = ih || 400;
    return `<svg class="lb-inv-doc-svg" viewBox="0 0 ${iw} ${ih}" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" style="display:block;overflow:hidden;pointer-events:none;shape-rendering:geometricPrecision;text-rendering:geometricPrecision;">
        <foreignObject x="0" y="0" width="${iw}" height="${ih}" style="overflow:hidden;">
            <div xmlns="http://www.w3.org/1999/xhtml" class="lb-inv-doc-inner" style="width:${iw}px;height:${ih}px;overflow:hidden;box-sizing:border-box;transform:none;">${inner || ''}</div>
        </foreignObject>
    </svg>`;
}

function lbBuildInspectFaceSVG(item, faceSide, mirrored, store) {
    if (!item) return '';
    lbEnsureDualFaceItem(item);
    let faceData = lbGetFaceData(item, faceSide);
    let docDims = lbInspectDocDims(item, faceData);
    let iw = docDims.w, ih = docDims.h;
    if (item.type === 'actor-file') {
        let inner = faceSide === 'back' ? lbBuildActorFileBackHTML(item) : lbBuildActorFileFrontHTML(item, store);
        return lbWrapInspectInnerAsSVG(inner, iw, ih);
    }
    if (item.type === 'quest') {
        let faceItem = Object.assign({}, item, lbGetFaceData(item, faceSide));
        let inner = lbBuildQuestSVG(faceItem);
        let embeds = lbBuildDocEmbedsLayerHTML(item, faceSide, { iw, ih });
        return `<div class="lb-inv-quest-svg-host" style="width:100%;height:100%;position:relative;pointer-events:none;">${inner}${embeds}</div>`;
    }
    if (item.type === 'noir-newspaper' && window.lbBuildNewsStageHTML) {
        // WYSIWYG with the board render: same 400×300 stage space, same font/language,
        // and the same seals/stamps embeds layer — the inspect view previously dropped
        // all three (default fonts stretched the text; effects/stamps vanished).
        let inner = window.lbBuildNewsStageHTML({
            layout: item.layout, npPaper: item.npPaper || 'new',
            npName: item.npName || '', npDate: item.npDate || '',
            title: item.title || '', text1: item.text1 || '', text2: item.text2 || '',
            customImg: item.customImg || '', imgFilter: item.imgFilter || 'none',
            imgScale: item.imgScale || 1, imgPanX: item.imgPanX || 0, imgPanY: item.imgPanY || 0,
            npFont: item.npFont || '', documentLanguage: item.documentLanguage || ''
        }).replace(' id="np-stage"', '');
        let embeds = window.lbBuildDocEmbedsLayerHTML ? lbBuildDocEmbedsLayerHTML(item, faceSide, { iw: 400, ih: 300 }) : '';
        return lbWrapInspectInnerAsSVG(inner + embeds, 400, 300);
    }
    if (item.type === 'framed-image') {
        lbEnsureDualFaceItem(item);
        let faceData = lbGetFaceData(item, faceSide);
        if (mirrored && lbIsFlippable(item) && !item.doubleSided) {
            let faceInner = lbBuildInspectDocumentFaceHTML(item, faceData, mirrored, faceSide);
            return `<svg class="lb-inv-doc-svg lb-inv-doc-board" viewBox="0 0 ${iw} ${ih}" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" style="display:block;overflow:hidden;pointer-events:none;shape-rendering:geometricPrecision;text-rendering:geometricPrecision;transform:none;transform-origin:center center;">
                <foreignObject width="${iw}" height="${ih}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${iw}px;height:${ih}px;overflow:hidden;border:none;outline:none;box-shadow:none;background:transparent;">${faceInner}</div></foreignObject>
            </svg>`;
        }
        let pseudo = lbFaceImageToPseudoItem(faceData, item);
        let imgSrc = pseudo.customImg || pseudo.imgSrc || item.customImg || item.imgSrc;
        if (imgSrc && window.lbBuildFramedImageBoardHTML) {
            let inner = lbBuildFramedImageBoardHTML(pseudo, imgSrc);
            if (mirrored) inner = `<div style="width:100%;height:100%;transform:scaleX(-1);transform-origin:center center;">${inner}</div>`;
            return inner;
        }
    }
    if (item.type === 'poster' && (item.customImg || item.imgSrc)) {
        let inner = `<div style="width:100%;height:100%;padding:15px;box-sizing:border-box;"><img src="${item.customImg || item.imgSrc}" style="width:100%;height:100%;object-fit:${item.fit || 'cover'};filter:${item.imgFilter || 'none'};"></div>`;
        return lbWrapInspectInnerAsSVG(inner, iw, ih);
    }
    /* WYSIWYG: same HTML renderer as board — not a separate baked SVG path */
    let faceInner = lbBuildInspectDocumentFaceHTML(item, lbGetFaceData(item, faceSide), mirrored, faceSide);
    return `<svg class="lb-inv-doc-svg lb-inv-doc-board" viewBox="0 0 ${iw} ${ih}" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" style="display:block;overflow:hidden;pointer-events:none;shape-rendering:geometricPrecision;text-rendering:geometricPrecision;transform:none;transform-origin:center center;">
        <foreignObject width="${iw}" height="${ih}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${iw}px;height:${ih}px;overflow:hidden;border:none;outline:none;box-shadow:none;background:transparent;">${faceInner}</div></foreignObject>
    </svg>`;
}

function lbBpRadialInitials(name) {
    /* #2 Use Blueprint radial: first two letters of blueprint name (e.g. "Top Secret" -> "TO") */
    name = (name || '').trim();
    if (!name) return 'BP';
    return name.slice(0, 2).toUpperCase();
}

const lbEyeDocumentInspector = {
    prepareClone(clone) {
        if (!clone) return clone;
        clone.classList.add('lb-inspect-hd');
        let dpr = Math.min(4, Math.max(2, (window.devicePixelRatio || 2) * 1.15));
        clone.style.setProperty('--lb-inspect-dpr', String(dpr));
        clone.querySelectorAll('img[src]').forEach((img) => {
            img.loading = 'eager';
            img.decoding = 'sync';
            img.style.imageRendering = 'auto';
            img.style.backfaceVisibility = 'hidden';
            img.style.webkitBackfaceVisibility = 'hidden';
        });
        return clone;
    },
    sharpenImages(root) {
        if (!root) return;
        root.querySelectorAll('img').forEach((img) => {
            if (img.dataset.lbInspectHdBoost === '1') return;
            img.dataset.lbInspectHdBoost = '1';
            let natW = img.naturalWidth || 0;
            let natH = img.naturalHeight || 0;
            let boxW = img.getBoundingClientRect().width || parseFloat(img.style.width) || 0;
            if (natW > 0 && boxW > 0 && boxW * (window.devicePixelRatio || 2) > natW * 0.92) {
                img.style.imageRendering = 'auto';
                // Never replace a user-set filter (newspaper adjustments, style filters…) —
                // append the sharpen boost to whatever is already applied.
                let cur = img.style.filter || '';
                if (cur && cur !== 'none') img.style.filter = cur + ' contrast(1.02) saturate(1.03)';
                else img.style.filter = 'contrast(1.02) saturate(1.03)';
            }
        });
    },
    applyLayout(el, baseW, baseH, zoom, rotX, rotY, panX, panY, flipDeg) {
        if (!el) return;
        panX = panX || 0;
        panY = panY || 0;
        flipDeg = flipDeg || 0;
        let w = baseW * zoom;
        let h = baseH * zoom;
        el.style.width = w + 'px';
        el.style.height = h + 'px';
        el.style.left = ((window.innerWidth - w) * 0.5 + panX) + 'px';
        el.style.top = ((window.innerHeight - h) * 0.5 + panY) + 'px';
        el.style.willChange = 'transform, width, height';
        el.style.backfaceVisibility = 'hidden';
        el.style.webkitBackfaceVisibility = 'hidden';
        el.style.transformStyle = 'preserve-3d';
        let stage = el.querySelector('.lb-inv-flip-stage');
        let tiltZ = (Math.abs(rotX) + Math.abs(rotY)) > 0.5 ? 1 : 0;
        if (stage) {
            el.style.perspective = '1600px';
            el.style.perspectiveOrigin = '50% 50%';
            el.style.transform = 'translateZ(0)';
            stage.style.willChange = 'transform';
            stage.style.transformStyle = 'preserve-3d';
            stage.style.backfaceVisibility = 'hidden';
            stage.style.webkitBackfaceVisibility = 'hidden';
            stage.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${(flipDeg + rotY).toFixed(2)}deg) translateZ(${tiltZ}px)`;
        } else {
            el.style.perspective = '1600px';
            el.style.perspectiveOrigin = '50% 50%';
            el.style.transformStyle = 'preserve-3d';
            el.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${(flipDeg + rotY).toFixed(2)}deg) translateZ(${tiltZ}px)`;
        }
        el.querySelectorAll('.lb-inv-doc-svg').forEach(node => {
            node.style.shapeRendering = 'geometricPrecision';
            node.style.textRendering = 'geometricPrecision';
        });
        el.querySelectorAll('img, image, canvas').forEach(node => {
            node.style.imageRendering = 'auto';
            node.style.backfaceVisibility = 'hidden';
            node.style.webkitBackfaceVisibility = 'hidden';
        });
        this.sharpenImages(el);
    },
    createInspectElement(item, store, themeColor, isGM, srcEl) {
        if (!item) return null;
        let el = document.createElement('div');
        el.className = (srcEl ? srcEl.className : 'lb-item') + ' lb-inspect-floating lb-inv-baked-host';
        el.classList.remove('lb-inspect-source-hidden', 'lb-inv-eye-target');
        if (lbInvItemCanFlip(item)) {
            lbEnsureDualFaceItem(item);
            el.innerHTML = `<div class="lb-inv-flip-stage">
                <div class="lb-inv-flip-face lb-inv-flip-front lb-inv-baked-face">${lbBuildInspectFaceSVG(item, 'front', false, store)}</div>
                <div class="lb-inv-flip-face lb-inv-flip-back lb-inv-baked-face">${lbBuildInspectFaceSVG(item, 'back', true, store)}</div>
            </div>`;
            el.classList.add('lb-inv-flip-host');
        } else {
            el.innerHTML = `<div class="lb-inv-baked-face lb-inv-single-face">${lbBuildInspectFaceSVG(item, 'front', false, store)}</div>`;
        }
        this.prepareClone(el);
        if (lbInvItemCanFlip(item)) this.populateInspectBackFace(el, item, store, themeColor, isGM, false);
        return el;
    },
    wrapFlipFaces(clone, item) {
        if (!clone || clone.querySelector('.lb-inv-flip-stage')) return clone;
        if (!lbInvItemCanFlip(item)) return clone;
        let paperUrl = lbInvPaperUrlForItem(item);
        let stage = document.createElement('div');
        stage.className = 'lb-inv-flip-stage';
        let front = document.createElement('div');
        front.className = 'lb-inv-flip-face lb-inv-flip-front';
        while (clone.firstChild) front.appendChild(clone.firstChild);
        let back = document.createElement('div');
        back.className = 'lb-inv-flip-face lb-inv-flip-back';
        back.style.backgroundImage = `url('${paperUrl}')`;
        back.innerHTML = '<div class="lb-inv-back-host" style="position:absolute;inset:0;"></div>';
        stage.appendChild(front);
        stage.appendChild(back);
        clone.appendChild(stage);
        clone.classList.add('lb-inv-flip-host');
        return clone;
    },
    populateInspectBackFace(clone, item, store, themeColor, isGM, uvActive) {
        if (!clone || !item) return;
        let backFace = clone.querySelector('.lb-inv-flip-back');
        if (!backFace) return;
        lbEnsureDualFaceItem(item);
        backFace.innerHTML = lbBuildInspectFaceSVG(item, 'back', true, store);
        let shell = backFace.querySelector('.lb-inv-doc-inner');
        if (!shell) shell = backFace;
        lbRenderInvisibleInks(shell, item, isGM, uvActive, 'back');
        if (store && store.items) {
            lbSecretsForParentFace(store, item.id, 'back').forEach(sec => {
                shell.insertAdjacentHTML('beforeend', lbSecretInspectOverlayHTML(sec, themeColor, isGM));
            });
        }
    },
    bakeSnapshotFace(el, item, store, faceSide) {
        if (!el || !item) return Promise.resolve(el);
        faceSide = faceSide || (typeof lbGetItemFaceSide === 'function' ? lbGetItemFaceSide(item) : 'front') || 'front';
        let faceData = lbGetFaceData(item, faceSide);
        let docDims = lbInspectDocDims(item, faceData);
        let iw = docDims.w, ih = docDims.h;
        el.querySelectorAll('.lb-board-img-slot, .lb-bp-mod-image-empty, .lb-rmf-preview-field').forEach(function(n) {
            n.style.border = 'none';
            n.style.outline = 'none';
            n.style.boxShadow = 'none';
        });
        let svgInner = lbBuildInspectFaceSVG(item, faceSide, false, store);
        if (!svgInner) return Promise.resolve(el);
        let dpr = Math.min(5, Math.max(3, (window.devicePixelRatio || 2) * 2));
        let svgDoc = svgInner.trim().startsWith('<svg')
            ? svgInner.replace('<svg', `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(iw * dpr)}" height="${Math.round(ih * dpr)}"`)
            : `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(iw * dpr)}" height="${Math.round(ih * dpr)}" viewBox="0 0 ${iw} ${ih}">${svgInner}</svg>`;
        return new Promise((resolve) => {
            let img = new Image();
            img.crossOrigin = 'anonymous';
            let blobUrl = '';
            let finish = (dataUrl) => {
                if (dataUrl) {
                    let faceHost = el.querySelector('.lb-inv-flip-face.lb-inv-flip-front') || el.querySelector('.lb-inv-single-face') || el.querySelector('.lb-inv-baked-face') || el;
                    if (faceHost) {
                        faceHost.innerHTML = `<img class="lb-inv-baked-snapshot" src="${dataUrl}" draggable="false" style="width:100%;height:100%;display:block;object-fit:contain;object-position:center;image-rendering:auto;pointer-events:none;transform:none;backface-visibility:hidden;border:none;outline:none;box-shadow:none;" alt="">`;
                    }
                }
                if (blobUrl) URL.revokeObjectURL(blobUrl);
                resolve(el);
            };
            img.onload = () => {
                try {
                    let c = document.createElement('canvas');
                    c.width = Math.round(iw * dpr);
                    c.height = Math.round(ih * dpr);
                    let ctx = c.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, c.width, c.height);
                    finish(c.toDataURL('image/png'));
                } catch (e) { finish(null); }
            };
            img.onerror = () => finish(null);
            blobUrl = URL.createObjectURL(new Blob([svgDoc], { type: 'image/svg+xml;charset=utf-8' }));
            img.src = blobUrl;
        });
    }
};

function lbInitMenuEyeCompanion() {
    $('#lb-eye-companion-layer, #lb-eye-assistant').remove();
    $('.lb-eye-zzz-pop').remove();
    window.lbEyeCompanion = null;
    return null;
}

function lbEyeCompanionSync(mode) {
    mode = mode || 'sync';
    if (mode === 'overlay-open') {
        $('#lb-eye-assistant').addClass('lb-eye-assistant-paused').css({ visibility: 'hidden', pointerEvents: 'none' });
        return;
    }
    if (mode === 'overlay-close') {
        if (window.lbEyeHelpMode) {
            $('#lb-eye-assistant').removeClass('lb-eye-assistant-paused').css({ visibility: '', pointerEvents: '' });
            if (window.lbEyeAssistant && window.lbEyeAssistant.show) {
                window.lbEyeAssistant.show('btn-tool-eye-help');
            }
        }
        return;
    }
    if (mode === 'destroy') {
        $('#lb-eye-companion-layer, #lb-eye-assistant').remove();
        $('.lb-eye-zzz-pop').remove();
        window.lbEyeCompanion = null;
        if (window.lbEyeAssistant && window.lbEyeAssistant.destroy) window.lbEyeAssistant.destroy();
        window.lbEyeAssistant = null;
    }
}

function lbEyeDismissForBoard() {
    if (window.lbEyeCompanion) window.lbEyeCompanion.dismissWithPop();
}

window.lbEyeCompanionSync = lbEyeCompanionSync;
window.lbEyeDismissForBoard = lbEyeDismissForBoard;
window.lbEyeDocumentInspector = lbEyeDocumentInspector;

// ---------------------------------------------------------------------------
// INVESTIGATION MODE — viewport vignette, eye cursor, document inspect view
// States: inactive | browsing (investigation-active) | inspecting (investigation-inspect)
// ---------------------------------------------------------------------------
function lbIsInvestigationInspectableType(type) {
    return ['add-paper', 'empty-sheet', 'noir-newspaper', 'quest', 'letter', 'framed-image', 'poster', 'hidden-icon', 'drag-text'].includes(type);
}
function lbIsInvestigationImageItem(item) {
    if (!item || item.stored) return false;
    return item.type === 'framed-image';
}

function lbItemUsesPaperWebp(item) {
    if (!item || item.stored) return false;
    if (item.type === 'drag-text') {
        if (item.textOnly && !item.dropComment) return false;
        if (item.paper === 'transparent' || item.noPaper) return false;
        return true;
    }
    if (item.type === 'add-paper' || item.type === 'empty-sheet' || item.type === 'framed-image' || item.type === 'poster') {
        return item.paper !== 'transparent' && item.paper !== 'none';
    }
    if (item.type === 'noir-newspaper' || item.type === 'quest' || item.type === 'letter') return true;
    return lbIsInvestigationInspectableType(item.type);
}

function lbElementUsesPaperWebp(el) {
    if (!el || !el.querySelector) return false;
    if (el.matches && el.matches('.lb-newspaper, .lb-quest, .lb-letter, .lb-add-paper, .lb-empty-sheet, .lb-drop-comment-item')) return true;
    let paperRx = /Paper\d*\.webp/i;
    let nodes = el.querySelectorAll('[style*="Paper"], img[src*="Paper"], [style*="paper"]');
    for (let i = 0; i < nodes.length; i++) {
        let n = nodes[i];
        let src = n.getAttribute('src') || '';
        let style = n.getAttribute('style') || '';
        if (paperRx.test(src) || paperRx.test(style)) return true;
    }
    let ownStyle = el.getAttribute('style') || '';
    return paperRx.test(ownStyle);
}

function lbIsInvestigationDocItem(item) {
    if (!item || item.stored) return false;
    return lbItemUsesPaperWebp(item);
}

function lbIsInvestigationClosedExam(item) {
    if (!item || item.stored || !item.locked) return false;
    return lbItemUsesPaperWebp(item);
}

function lbInvestigationEyeHTML() {
    return `<div class="lb-eye-scaled lb-eye-hd lb-eye-inv" aria-hidden="true">${lbEyeHTML()}</div>`;
}

function lbMountInvestigationCursor() {
    lbEnsureEyeCSS();
    let layer = document.getElementById('lb-investigation-cursor-layer');
    if (!layer) {
        layer = document.createElement('div');
        layer.id = 'lb-investigation-cursor-layer';
        layer.setAttribute('aria-hidden', 'true');
        document.body.appendChild(layer);
    }
    let cursor = document.getElementById('lb-investigation-cursor');
    if (!cursor) return null;
    if (cursor.parentElement !== layer) layer.appendChild(cursor);
    let vignette = document.getElementById('lb-investigation-vignette');
    if (vignette && vignette.parentElement !== document.body) document.body.appendChild(vignette);
    return cursor;
}

function lbInitInvestigationEyeCursor(cursorEl, accentRgb) {
    lbMountInvestigationCursor();
    cursorEl = cursorEl && cursorEl.length ? cursorEl : $('#lb-investigation-cursor');
    if (!cursorEl.length) return { destroy: () => {}, updatePosition: () => {}, setHoverEl: () => {}, setProximity: () => {}, suspend: () => {}, resume: () => {} };
    cursorEl.addClass('lb-eye-hd');
    let rig = lbInitEyeRig(cursorEl, {
        accentRgb: accentRgb || '212,175,55',
        baseScale: LB_EYE_SCALE_INVESTIGATION,
        investigation: true,
        allowFloat: true,
        allowIdleGaze: true,
        glowOnHoverOnly: true,
        invHoverScale: LB_EYE_INV_HOVER_SCALE,
        hoverScaleEase: 0.14
    });
    return {
        destroy: () => rig.destroy(),
        updatePosition: (x, y) => rig.updateCursor(x, y),
        setHoverEl: (el, direct) => rig.setHoverEl(el, !!direct),
        setProximity: (t, el) => {
            rig.setPupilProximity(t);
            if (el && t > 0.15) rig.aimAtElement(el);
            else if (!el) rig.updateCursor(window.__lbInvLastMx || 0, window.__lbInvLastMy || 0);
        },
        suspend: () => rig.suspend(),
        resume: () => rig.resume()
    };
}

// ---------------------------------------------------------------------------
// FLOATING MENU TOOLTIPS — render above all layers, outside menu clipping
// ---------------------------------------------------------------------------
function lbInitFloatingMenuTooltips(html, themeColor, themeColorRgb) {
    $('#lb-menu-tooltip-layer').remove();
    let layer = $('<div id="lb-menu-tooltip-layer" aria-hidden="true"></div>');
    $('body').append(layer);
    let tipEl = null;
    let tipRaf = null;
    let alive = true;
    let hoverBtn = null;

    function hideTip() {
        if (tipRaf) { cancelAnimationFrame(tipRaf); tipRaf = null; }
        if (tipEl) {
            tipEl.removeClass('lb-menu-floating-tip-visible');
            let el = tipEl;
            tipEl = null;
            setTimeout(() => { if (el && el[0] && el[0].parentNode) el.remove(); }, 320);
        }
        hoverBtn = null;
        if (!layer.children().length) layer.css('display', 'none');
    }

    function showTip(btn, text) {
        if (!text || !alive) return;
        if (hoverBtn && hoverBtn[0] === btn && tipEl) return;
        hideTip();
        hoverBtn = $(btn);
        tipEl = $(`<div class="lb-menu-floating-tip">${text}</div>`);
        layer.append(tipEl).css('display', 'block');
        let r = btn.getBoundingClientRect();
        let isLeft = $(btn).closest('.lb-slide-left').length;
        let left, top;
        if (isLeft) {
            left = r.right + 12;
            top = r.top + r.height / 2;
            tipEl.css({ transformOrigin: 'left center' });
        } else {
            left = r.left + r.width / 2;
            top = r.bottom + 10;
            tipEl.css({ transformOrigin: 'top center' });
        }
        tipEl.css({ left: left + 'px', top: top + 'px' });
        requestAnimationFrame(() => {
            if (!tipEl) return;
            let tw = tipEl.outerWidth();
            let th = tipEl.outerHeight();
            if (isLeft) {
                left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
                top = Math.max(8, Math.min(top - th / 2, window.innerHeight - th - 8));
            } else {
                left = Math.max(8, Math.min(left - tw / 2, window.innerWidth - tw - 8));
                top = Math.max(8, Math.min(top, window.innerHeight - th - 8));
            }
            tipEl.css({ left: left + 'px', top: top + 'px' });
            tipEl.addClass('lb-menu-floating-tip-visible');
        });
    }

    html.on('mouseenter.lbFloatTip', '.lb-slide-menu .lb-circle-btn, #lb-top-header-tools .lb-header-tool', function() {
        let text = $(this).find('.lb-btn-tooltip').first().text().trim() || $(this).attr('title') || '';
        if (text) showTip(this, text);
    });
    html.on('mouseleave.lbFloatTip', '.lb-slide-menu .lb-circle-btn, #lb-top-header-tools .lb-header-tool', hideTip);

    let style = document.getElementById('lb-menu-tooltip-css');
    if (!style) {
        style = document.createElement('style');
        style.id = 'lb-menu-tooltip-css';
        document.head.appendChild(style);
    }
    style.textContent = `
    #lb-menu-tooltip-layer { position:fixed; inset:0; pointer-events:none; z-index:10000060; overflow:visible; }
    .lb-menu-floating-tip {
        position:fixed; background:rgba(10,10,14,0.9); backdrop-filter:blur(14px) saturate(150%); -webkit-backdrop-filter:blur(14px) saturate(150%);
        border:1px solid rgba(255,255,255,0.16); color:var(--board-primary-color,${themeColor || '#d4af37'}); padding:7px 14px; border-radius:12px;
        font-family:'Outfit','DM Sans',sans-serif; font-size:12px; font-weight:600; white-space:nowrap;
        box-shadow:0 10px 28px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35);
        text-shadow:0 0 2px #000,1px 1px 3px #000,-1px -1px 3px #000;
        max-width:min(92vw, 420px); overflow:hidden; text-overflow:ellipsis;
        opacity:0; transform:translate3d(-14px, -18px, 0) rotate(-3deg) scale(0.86);
        transition:opacity 0.42s cubic-bezier(0.22,1,0.36,1), transform 0.48s cubic-bezier(0.22,1,0.36,1);
        will-change:transform,opacity; backface-visibility:hidden; overflow:hidden;
    }
    .lb-menu-floating-tip::after {
        content:''; position:absolute; inset:-40% -60%; pointer-events:none;
        background:linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.22) 50%, transparent 62%);
        transform:translateX(-120%); opacity:0;
    }
    .lb-menu-floating-tip.lb-menu-floating-tip-visible {
        opacity:1; transform:translate3d(4px, 12px, 0) rotate(-1.5deg) scale(1);
        animation:lbMenuTipShimmer 2.8s ease-in-out 0.5s infinite;
    }
    .lb-menu-floating-tip.lb-menu-floating-tip-visible::after {
        opacity:1; animation:lbMenuTipShimmerSweep 2.8s ease-in-out 0.5s infinite;
    }
    @keyframes lbMenuTipShimmer { 0%,100% { box-shadow:0 10px 28px rgba(0,0,0,0.55), 0 0 0 rgba(255,255,255,0); } 50% { box-shadow:0 12px 32px rgba(0,0,0,0.6), 0 0 18px rgba(255,255,255,0.08); } }
    @keyframes lbMenuTipShimmerSweep { 0% { transform:translateX(-120%); } 45%,100% { transform:translateX(120%); } }
    .lb-slide-left .lb-menu-floating-tip { transform:translate3d(-16px, -14px, 0) rotate(3deg) scale(0.86); }
    .lb-slide-left .lb-menu-floating-tip.lb-menu-floating-tip-visible { transform:translate3d(6px, 10px, 0) rotate(1.5deg) scale(1); }
  `;

    return {
        destroy: () => {
            alive = false;
            hideTip();
            layer.remove();
            html.off('.lbFloatTip');
        },
        setAccent: (accent, rgb) => {
            if (accent) document.body.style.setProperty('--board-primary-color', accent);
            if (rgb) document.body.style.setProperty('--board-primary-rgb', rgb);
        }
    };
}

// ---------------------------------------------------------------------------
// EYE ASSISTANT — right-click help on toolbar icons (bottom-left companion)
// ---------------------------------------------------------------------------
const LB_EYE_HELP_TEXTS = {
    'btn-tool-eye-help': { title: 'Help Mode', text: 'Toggle help mode: when active, hover any toolbar icon to see what it does. The eye companion appears automatically with tips.' },
    'btn-tool-cursor': { title: 'Interaction', text: 'Interaction mode: move and manipulate objects on the board. Left-click to select; drag and drop to reposition.' },
    'btn-tool-copy': { title: 'Copy Tool', text: 'Copy tool: click an element to duplicate it, then drop the copy on the board. Or drag a selection box to copy everything inside — right-click to paste (even on other boards).' },
    'btn-tool-light': { title: 'Ambient Light', text: 'Light mode: left-click the board to place a light source. Move it in light mode with the left mouse button, or right-click a bulb to edit it. Hold left-click and scroll the mouse wheel to rotate; right-click and drag to resize the radius.' },
    'btn-tool-trash': { title: 'Delete', text: 'Delete: click elements to remove them permanently. Drag a selection box to delete groups, or send items to My Files.' },
    'btn-gm-customize': { title: 'Customize Board', text: 'Adjust saturation, contrast, filters and tint on back and front layers simultaneously.' },
    'btn-create-doc': { title: 'Creating Tools', text: 'Create documents, use blueprints, stamp mode, add effects, and more — all from one radial hub. Double right-click exits the hub.' },
    'btn-tool-pen': { title: 'Drawing Toos', text: 'Drawing tools: pen, shapes, text frames, and colors. Use the eraser for precise cleanup.' },
    'btn-add-pin': { title: 'Place Fastener', text: 'Drag this icon onto the board to place a fastener you can move or edit with right-click. Hold right-click or Shift and scroll the wheel to resize.' },
    'btn-stamp-mode': { title: 'Stamp Mode', text: 'Create custom stamps and stamp documents. Remove stamps with the Delete tool or eraser.' },
    'btn-seal-mode': { title: 'Add Effect', text: 'Pick an effect and double-click a document to print it. Double-click a placed effect to bake. Double right-click exits.' },
    'btn-gm-clear': { title: 'Clear Board', text: 'Remove all items from the board. Deleted items move to Lost Archive in My Files (GM only).' },
    'btn-add-secret': { title: 'Drag Secret', text: 'Place an invisible marker. When a player scans this spot with the magnifier, linked content unlocks.' },
    'btn-gm-ambience': { title: 'Theme Ambience', text: 'Loop custom audio on this board. Optionally mute Foundry playlist audio while active.' },
    'btn-gm-workspace': { title: 'Working Space', text: 'Draw a rectangle to limit the playable area. Items stay inside this boundary.' },
    'btn-gm-roster': { title: 'Board Roster', text: 'Publish multiple boards as a numbered deck. Switch via tabs bottom-right when board is open.' },
    'btn-gm-permissions': { title: 'Player Settings', text: 'Assign role presets or custom permissions per player. Expand each player to fine-tune rights.' },
    'btn-gm-foreign-lang': { title: 'Foreign Languages', text: 'Configure cipher fonts and which players speak each language. Click colored initials to toggle speakers.' },
    'btn-tool-archive': { title: 'Archive', text: 'Save snapshots or restore earlier board states from the archive.' },
    'btn-tool-loupe': { title: 'Magnifier', text: 'Scan the board closely. Hidden secrets may reveal themselves under the lens.' },
    'btn-tool-investigation': { title: 'Investigation Mode', text: 'Browse documents up close with the eye cursor. Left-click inspectable items to examine them in detail.' },
    'btn-tool-board-refresh': { title: 'Sync Board', text: 'Force a full board sync so GM and all players see the same state.' },
    'top-eraser-btn': { title: 'Eraser', text: 'Erase freehand drawings precisely. Adjust eraser size with the ERASER slider in the pen toolbar.' },
    'develop-actor-photo': { title: 'Develop Actor Photo', text: 'Drop an Actor or Item from Foundry, then pick a photo layout (Classic, Bulletin, Fullprint).' },
    'use-blueprint': { title: 'Blueprint Designer', text: 'Design a document layout on a blank sheet, then drop it on the board.' },
    'evidence': { title: 'Evidence Tag', text: 'Create a post-it style evidence label with custom tint, text, and WYSIWYG preview.' },
    'newspaper': { title: 'Newspaper', text: 'Add a noir newspaper clipping to the board with editable columns.' },
    'print-image': { title: 'Print Image', text: 'Import an image as raw print, on paper, or full-bleed fullprint.' },
    'stamp-mode-radial': { title: 'Stamp Mode', text: 'Open the stamp library. Click documents to stamp; double right-click exits placement.' },
    'add-effect-radial': { title: 'Add Effects', text: 'Pick wax seals and effects. Double-click a document to print; double right-click exits.' }
};

const LB_HELP_TIPS = Object.assign({}, LB_EYE_HELP_TEXTS, {
    'crop-aspect-presets': { title: 'Aspect Presets', text: 'Choose 1:1, 4:3, 16:9 or 9:16. Frame and Paper.webp background adjust together. Image stays a fixed baked graphic.' },
    'crop-img-mode': { title: 'Image on Paper', text: 'Original = no paper. Printed = Paper.webp frame. Fullprint = parchment mask fills the frame.' },
    'crop-paper-fx': { title: 'Paper Effects', text: 'Edge fade, soft blend, print and paint sliders simulate aged paper — preview only until you Print & Place.' },
    'bp-text-module': { title: 'Text Module', text: 'Drag the bar to move. Resize handles clamp to paper bounds. Text stays inside the module.' },
    'bp-image-module': { title: 'Image Module', text: 'Images bake as fixed SVG — resize the module frame without reflowing the graphic.' },
    'bp-attach': { title: 'Attachment', text: 'Drag pin or tape on the preview edge. Hitbox is small so text editing is not blocked.' },
    'inv-uv-lamp': { title: 'UV Lamp', text: 'Darkens the document. Hidden Magic Ink appears only under the lamp cone.' },
    'inv-magic-ink': { title: 'Magic Ink', text: 'Place invisible text or effects. GM sees effect graphics always — except in UV lamp mode. Right-click to edit font or tint.' },
    'open-board-save': { title: 'Save Board', text: 'Persists this board to the world. All players see the saved state on reload.' },
    'open-board-delete': { title: 'Delete Board', text: 'Permanently removes the board after double confirmation.' },
    'mf-drag': { title: 'MY Files', text: 'Drag files onto the board. Polaroids render 1:1. Folders organize your archive.' },
    'af-reveal': { title: 'Reveal', text: 'Spin reveal is 2× faster and 40% larger. GM must click End Reveal before players see the result.' },
    'perm-preset': { title: 'Role Presets', text: 'Quick-assign Observer, Player, or Co-GM rights. Expand a player for custom toggles.' }
});

function lbHelpTipHTML(id) {
    return `<span class="lb-help-tip" data-help-id="${id}" title="Help"><i class="fas fa-question-circle"></i></span>`;
}
window.lbHelpTipHTML = lbHelpTipHTML;
window.LB_HELP_TIPS = LB_HELP_TIPS;

function lbApplyImageAspectPreset(frameEl, paperAreaEl, aspectStr, imgModeVal, stageEl) {
    if (!frameEl) return aspectStr || '4/3';
    let parts = String(aspectStr || '4/3').split('/').map(Number);
    let aw = Math.max(1, parts[0] || 4), ah = Math.max(1, parts[1] || 3);
    frameEl.style.aspectRatio = aw + ' / ' + ah;
    frameEl.dataset.r = aspectStr;
    if (paperAreaEl) paperAreaEl.style.inset = (imgModeVal === 'printed') ? '20px' : '0';
    if (stageEl) {
        let sr = stageEl.getBoundingClientRect();
        let pad = 14;
        let maxW = Math.max(80, sr.width - pad * 2);
        let maxH = Math.max(80, sr.height - pad * 2);
        let ratio = aw / ah;
        let fitW = maxW, fitH = fitW / ratio;
        if (fitH > maxH) { fitH = maxH; fitW = fitH * ratio; }
        frameEl.style.width = Math.floor(fitW) + 'px';
        frameEl.style.height = Math.floor(fitH) + 'px';
        frameEl.style.maxWidth = '100%';
        frameEl.style.maxHeight = '100%';
    } else {
        frameEl.style.width = '72%';
        frameEl.style.height = 'auto';
        frameEl.style.maxHeight = '88%';
    }
    return aspectStr;
}
window.lbApplyImageAspectPreset = lbApplyImageAspectPreset;

function lbInitEyeAssistant(html, themeColorRgb) {
    lbEnsureEyeCSS();
    lbEnsureCreateBoardFonts();
    $('#lb-eye-assistant').remove();
    $('.lb-eye-zzz-pop').remove();
    let wrap = $(`<div id="lb-eye-assistant" aria-live="polite">
        <div class="lb-eye-assistant-eye-layer">
            <div class="lb-eye-assistant-eye" aria-hidden="true"></div>
        </div>
        <div class="lb-eye-assistant-bubble-layer">
            <div class="lb-eye-assistant-bubble">
                <span class="lb-eye-assistant-warning" aria-hidden="true">!</span>
                <div class="lb-eye-assistant-bubble-body"><strong></strong><span class="lb-eye-assistant-text"></span></div>
            </div>
        </div>
    </div>`);
    $('body').append(wrap);
    let eyeHost = wrap.find('.lb-eye-assistant-eye');
    eyeHost.append(`<div class="lb-eye-scaled lb-eye-hd" aria-hidden="true">${lbEyeHTML()}</div>`);
    let rig = lbInitEyeRig(eyeHost, {
        accentRgb: themeColorRgb || '212,175,55',
        baseScale: LB_EYE_SCALE_MENU * 1.3,
        allowFloat: true,
        allowIdleGaze: true,
        glowOnHoverOnly: false,
        assistantMode: true,
        maxIrisOffset: 22,
        maxPupilOffset: 10
    });
    let alive = true;
    let eyeWasVisible = false;
    let dismissing = false;
    let suppressDismissUntil = 0;
    let sleepPhase = 'awake';
    let pupilTimer = null, squintTimer = null, personalityTimer = null;
    let idleCheckTimer = null, zzzTimer = null, cursorFollowTimer = null;
    let curPupilT = 0.32;
    let lastTooltipAt = 0;
    let lastFullRepelAt = 0;
    const REPEL_RESET_MS = 20000;
    let lastMx = window.innerWidth * 0.5, lastMy = window.innerHeight * 0.5;
    let cursorFollowUntil = 0;
    rig.setPupilProximity(curPupilT);

    function clearTimers() {
        if (pupilTimer) clearTimeout(pupilTimer);
        if (squintTimer) clearTimeout(squintTimer);
        if (personalityTimer) clearTimeout(personalityTimer);
        if (idleCheckTimer) clearInterval(idleCheckTimer);
        if (zzzTimer) clearInterval(zzzTimer);
        if (cursorFollowTimer) clearInterval(cursorFollowTimer);
        pupilTimer = squintTimer = personalityTimer = idleCheckTimer = zzzTimer = cursorFollowTimer = null;
    }

    function clearZzzPops() { $('.lb-eye-zzz-pop').remove(); }

    function stopZzzLoop() {
        if (zzzTimer) clearInterval(zzzTimer);
        zzzTimer = null;
        clearZzzPops();
    }

    function spawnZzzPop() {
        if (sleepPhase !== 'sleeping' || !wrap.hasClass('lb-eye-assistant-visible')) return;
        let c = rig.getCenter();
        let count = Math.random() < 0.4 ? 2 : 1;
        for (let i = 0; i < count; i++) {
            let ch = Math.random() < 0.5 ? 'Z' : 'z';
            let dx = (Math.random() - 0.35) * 28;
            let el = document.createElement('span');
            el.className = 'lb-eye-zzz-pop';
            el.textContent = ch;
            el.style.fontSize = (24 + Math.random() * 16) + 'px';
            el.style.left = (c.x + dx) + 'px';
            el.style.top = (c.y - 34 - Math.random() * 18 - i * 12) + 'px';
            el.style.setProperty('--lb-zzz-dx', (8 + Math.random() * 14) + 'px');
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 2200);
        }
    }

    function startZzzLoop() {
        stopZzzLoop();
        spawnZzzPop();
        zzzTimer = setInterval(() => spawnZzzPop(), 850 + Math.random() * 550);
    }

    function resetIdleState() {
        lastTooltipAt = Date.now();
        sleepPhase = 'awake';
        rig.wakeSleep();
        rig.setLidClose(0);
        stopZzzLoop();
        wrap.removeClass('lb-eye-assistant-sleeping');
    }

    function beginDrowsy() {
        if (sleepPhase !== 'awake') return;
        sleepPhase = 'drowsy';
        animatePupilTo(0.88, 5500);
    }

    function enterFullSleep() {
        if (sleepPhase === 'sleeping') return;
        sleepPhase = 'sleeping';
        wrap.addClass('lb-eye-assistant-sleeping');
        rig.setLidClose(1);
        animatePupilTo(0.06, 500);
        startZzzLoop();
    }

    function tickIdle() {
        if (!alive || !wrap.hasClass('lb-eye-assistant-visible')) return;
        let idle = Date.now() - lastTooltipAt;
        if (idle >= 20000) {
            enterFullSleep();
            return;
        }
        if (idle >= 12000) {
            if (sleepPhase === 'awake') beginDrowsy();
            if (sleepPhase === 'drowsy') {
                let t = Math.min(1, (idle - 12000) / 8000);
                rig.setLidClose(t);
                if (t > 0.55) animatePupilTo(0.94 + t * 0.04, 700);
            }
        }
    }

    function startIdleMonitor() {
        if (idleCheckTimer) clearInterval(idleCheckTimer);
        idleCheckTimer = setInterval(tickIdle, 250);
    }

    function startCursorFollowCycle() {
        if (cursorFollowTimer) clearInterval(cursorFollowTimer);
        cursorFollowTimer = setInterval(() => {
            if (!alive || !wrap.hasClass('lb-eye-assistant-visible') || sleepPhase === 'sleeping') return;
            cursorFollowUntil = Date.now() + 2000;
        }, 8000);
        cursorFollowUntil = Date.now() + 2000;
    }

    function wakeFromSleepViolent() {
        if (sleepPhase === 'awake') { resetIdleState(); return; }
        sleepPhase = 'awake';
        stopZzzLoop();
        wrap.removeClass('lb-eye-assistant-sleeping');
        rig.wakeSleep();
        rig.setLidClose(0);
        eyeHost.addClass('lb-eye-assistant-shake');
        rig.triggerBlink(true);
        animatePupilTo(0.08, 160);
        setTimeout(() => { if (alive) animatePupilTo(0.28, 420); }, 200);
        lastTooltipAt = Date.now();
        setTimeout(() => { if (alive) eyeHost.removeClass('lb-eye-assistant-shake'); }, 540);
    }

    function wakeFromSleep() {
        wakeFromSleepViolent();
    }

    function spawnRepelGhost(clientX, clientY) {
        $('#lb-eye-repel-ghost').remove();
        let ghost = $('<div id="lb-eye-repel-ghost" aria-hidden="true"></div>');
        $('body').addClass('lb-eye-repel-cursor-hide').append(ghost);
        ghost.css({ left: clientX + 'px', top: clientY + 'px' });
        requestAnimationFrame(() => ghost.addClass('lb-eye-repel-fly'));
        setTimeout(() => {
            ghost.remove();
            $('body').removeClass('lb-eye-repel-cursor-hide');
        }, 420);
    }

    function triggerAnnoyedRepel() {
        eyeHost.removeClass('lb-eye-assistant-repel lb-eye-assistant-flash');
        void eyeHost[0].offsetWidth;
        eyeHost.addClass('lb-eye-assistant-annoyed');
        rig.setLidClose(0.42);
        animatePupilTo(0.1, 160);
        setTimeout(() => {
            if (!alive) return;
            eyeHost.removeClass('lb-eye-assistant-annoyed');
            rig.setLidClose(0.18);
            animatePupilTo(0.24, 380);
        }, 360);
    }

    function triggerFullRepel(e) {
        lastFullRepelAt = Date.now();
        eyeHost.removeClass('lb-eye-assistant-annoyed lb-eye-assistant-flash lb-eye-assistant-repel');
        wrap.removeClass('lb-eye-assistant-annoyed-lid lb-eye-assistant-warn');
        void eyeHost[0].offsetWidth;
        eyeHost.addClass('lb-eye-assistant-flash lb-eye-assistant-repel');
        wrap.addClass('lb-eye-assistant-warn');
        rig.triggerSquint(420);
        animatePupilTo(0.03, 90);
        rig.setLidClose(0.92);
        spawnRepelGhost(e.clientX, e.clientY);
        setTimeout(() => {
            if (!alive) return;
            rig.setLidClose(0.38);
            animatePupilTo(0.2, 520);
        }, 720);
        setTimeout(() => {
            if (!alive) return;
            eyeHost.removeClass('lb-eye-assistant-flash lb-eye-assistant-repel');
            wrap.removeClass('lb-eye-assistant-warn');
            rig.setLidClose(0.12);
        }, 1400);
    }

    function animatePupilTo(target, duration) {
        let start = curPupilT;
        let t0 = performance.now();
        let dur = duration || 900;
        function step(now) {
            if (!alive) return;
            let p = Math.min(1, (now - t0) / dur);
            let ease = p * (2 - p);
            curPupilT = start + (target - start) * ease;
            rig.setPupilProximity(curPupilT);
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function schedulePupilBreathe() {
        pupilTimer = setTimeout(() => {
            if (!alive) return;
            if (wrap.hasClass('lb-eye-assistant-visible') && sleepPhase === 'awake') {
                animatePupilTo(0.45 + Math.random() * 0.3, 750 + Math.random() * 400);
                setTimeout(() => {
                    if (alive && wrap.hasClass('lb-eye-assistant-visible') && sleepPhase === 'awake') animatePupilTo(0.14 + Math.random() * 0.22, 650 + Math.random() * 500);
                }, 1000 + Math.random() * 600);
            }
            schedulePupilBreathe();
        }, 2800 + Math.random() * 3000);
    }

    function scheduleSquint() {
        squintTimer = setTimeout(() => {
            if (!alive) return;
            if (wrap.hasClass('lb-eye-assistant-visible') && sleepPhase === 'awake' && Math.random() < 0.3) rig.triggerSquint(260 + Math.random() * 320);
            scheduleSquint();
        }, 9000 + Math.random() * 7000);
    }

    function schedulePersonality() {
        personalityTimer = setTimeout(() => {
            if (!alive) return;
            if (wrap.hasClass('lb-eye-assistant-visible') && sleepPhase !== 'sleeping') {
                if (Date.now() < cursorFollowUntil) rig.aimAtPoint(lastMx, lastMy);
                else if (sleepPhase === 'awake') rig.pickIdleGaze();
                if (sleepPhase === 'awake' && Math.random() < 0.1) rig.triggerBlink(Math.random() < 0.2);
            }
            schedulePersonality();
        }, 1600 + Math.random() * 2000);
    }

    let dismiss = () => {
        if (dismissing || !wrap.hasClass('lb-eye-assistant-visible')) return;
        dismissing = true;
        wrap.addClass('lb-eye-assistant-fading');
        wrap.removeClass('lb-eye-assistant-visible');
        stopZzzLoop();
        sleepPhase = 'awake';
        rig.wakeSleep();
        if (idleCheckTimer) { clearInterval(idleCheckTimer); idleCheckTimer = null; }
        setTimeout(() => {
            if (!alive) return;
            wrap.removeClass('lb-eye-assistant-fading lb-eye-assistant-pop lb-eye-assistant-swap lb-eye-assistant-sleeping');
            eyeWasVisible = false;
            dismissing = false;
            rig.suspend();
        }, 420);
    };

    let show = (btnId) => {
        let entry = LB_HELP_TIPS[btnId] || LB_EYE_HELP_TEXTS[btnId];
        if (!entry) return;
        let pinKind = window.lbGetBoardFastenerKind ? window.lbGetBoardFastenerKind(window.lbCurrentStore, window.lbCurrentThemeId) : 'pin';
        let title = entry.title;
        if (btnId === 'btn-add-pin' && window.lbFastenerLabel) title = 'Place ' + window.lbFastenerLabel(pinKind);

        dismissing = false;
        wrap.removeClass('lb-eye-assistant-fading');
        suppressDismissUntil = Date.now() + 450;

        let alreadyVisible = wrap.hasClass('lb-eye-assistant-visible') && eyeWasVisible;
        if (sleepPhase === 'sleeping') wakeFromSleepViolent();
        else if (sleepPhase === 'drowsy') { resetIdleState(); rig.triggerBlink(true); animatePupilTo(0.28, 350); }
        else resetIdleState();

        wrap.find('.lb-eye-assistant-bubble strong').text(title);
        wrap.find('.lb-eye-assistant-text').text(entry.text);
        rig.resume();

        if (!wrap.hasClass('lb-eye-assistant-visible')) {
            wrap.addClass('lb-eye-assistant-visible');
            eyeWasVisible = true;
            if (!idleCheckTimer) startIdleMonitor();
            if (!cursorFollowTimer) startCursorFollowCycle();
        }

        if (alreadyVisible) {
            wrap.removeClass('lb-eye-assistant-swap');
            void wrap[0].offsetWidth;
            wrap.addClass('lb-eye-assistant-swap');
            setTimeout(() => { if (alive) wrap.removeClass('lb-eye-assistant-swap'); }, 340);
            return;
        }

        wrap.removeClass('lb-eye-assistant-pop lb-eye-assistant-swap');
        void wrap[0].offsetWidth;
        requestAnimationFrame(() => {
            wrap.addClass('lb-eye-assistant-pop');
            rig.triggerBlink(true);
            animatePupilTo(0.72, 320);
            setTimeout(() => { if (alive) animatePupilTo(0.26, 580); }, 680);
            setTimeout(() => {
                if (!alive || !wrap.hasClass('lb-eye-assistant-visible')) return;
                let c = rig.getCenter();
                lbEyeSpawnPop(c.x, c.y - 6, '#d4af37', 36);
                lbEyeSpawnSinglePop(c.x, c.y - 2, 'rgba(212,175,55,0.85)');
            }, 120);
        });
    };

    eyeHost.on('click.lbEyeWake', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (sleepPhase === 'sleeping' || sleepPhase === 'drowsy') {
            wakeFromSleepViolent();
            return;
        }
        if (!wrap.hasClass('lb-eye-assistant-visible')) return;
        if (Date.now() - lastFullRepelAt > REPEL_RESET_MS) triggerFullRepel(e);
        else triggerAnnoyedRepel();
    });

    $(document).on('mousemove.lbEyeHelp', (e) => {
        lastMx = e.clientX;
        lastMy = e.clientY;
        rig.updateCursor(e.clientX, e.clientY);
        if (wrap.hasClass('lb-eye-assistant-visible') && sleepPhase !== 'sleeping' && Date.now() < cursorFollowUntil) rig.aimAtPoint(e.clientX, e.clientY);
    });

    html.on('mouseenter.lbEyeHelpHover', '.lb-slide-menu .lb-circle-btn, #lb-top-header-tools .lb-header-tool', function() {
        if (!window.lbEyeHelpMode) return;
        if (this.id === 'btn-tool-eye-help') return;
        show(this.id);
    });
    html.on('mouseleave.lbEyeHelpHover', '.lb-slide-menu .lb-circle-btn, #lb-top-header-tools .lb-header-tool', function() {
        if (!window.lbEyeHelpMode) return;
        if (Date.now() < suppressDismissUntil) return;
        dismiss();
    });

    $(document).on('mouseenter.lbEyeHelpTip', '.lb-help-tip', function() {
        if (!window.lbEyeHelpMode) return;
        let id = this.getAttribute('data-help-id');
        if (id) show(id);
    });
    $(document).on('mouseleave.lbEyeHelpTip', '.lb-help-tip', function() {
        if (!window.lbEyeHelpMode) return;
        if (Date.now() < suppressDismissUntil) return;
        dismiss();
    });

    let helpTipStyle = document.getElementById('lb-help-tip-css');
    if (!helpTipStyle) {
        helpTipStyle = document.createElement('style');
        helpTipStyle.id = 'lb-help-tip-css';
        document.head.appendChild(helpTipStyle);
    }
    helpTipStyle.textContent = `
    .lb-help-tip { display:inline-flex; align-items:center; justify-content:center; margin-left:5px; cursor:help; opacity:0.55; font-size:12px; vertical-align:middle; color:var(--board-primary-color,#d4af37); transition:opacity 0.2s ease; }
    .lb-help-tip:hover { opacity:1; }
    body:not(.lb-eye-help-active) .lb-help-tip { opacity:0.42; }
    `;

    schedulePupilBreathe();
    scheduleSquint();
    schedulePersonality();

    return {
        destroy: () => {
            alive = false;
            clearTimers();
            stopZzzLoop();
            rig.destroy();
            eyeHost.off('click.lbEyeWake');
            html.off('contextmenu.lbEyeHelp');
            html.off('click.lbEyeHelpDismiss');
            html.off('mouseenter.lbEyeHelpHover mouseleave.lbEyeHelpHover');
            $(document).off('contextmenu.lbEyeHelpDismiss mousemove.lbEyeHelp mouseenter.lbEyeHelpTip mouseleave.lbEyeHelpTip');
            wrap.remove();
            if (window.lbEyeAssistant && window.lbEyeAssistant.dismiss === dismiss) window.lbEyeAssistant = null;
        },
        dismiss: dismiss,
        show: show,
        setAccentRgb: (rgb, accent) => {
            if (rgb) {
                rig.setAccentRgb(rgb);
                wrap.css('--lb-accent-rgb', rgb);
            }
            if (accent) wrap.css('--lb-accent', accent);
        }
    };
}

// ---------------------------------------------------------------------------
// Actor File — Polaroid & Document Dropper (type: actor-file)
// ---------------------------------------------------------------------------
const LB_AF_GENDER_IMG = LB_ASSET + 'Gender.webp';
const LB_AF_CLASSIC_PAPER = 10;
const LB_AF_CLASSIC_PAPER_URL = LB_ASSET + 'Paper10.webp';
const LB_AF_LAYOUT_OPTS = [
    { id: 'classic', icon: 'fa-image', tip: 'Classic Polaroid' },
    { id: 'bulletin', icon: 'fa-paint-brush', tip: 'Bulletin' },
    { id: 'fullprint', icon: 'fa-expand', tip: 'Fullprint' }
];
function lbBuildImgFilterAdj(adj) {
    adj = adj || {};
    let b = adj.bright !== undefined ? adj.bright : (adj.imgBright !== undefined ? adj.imgBright : 100);
    let c = adj.cont !== undefined ? adj.cont : (adj.imgCont !== undefined ? adj.imgCont : 100);
    let s = adj.sat !== undefined ? adj.sat : (adj.imgSat !== undefined ? adj.imgSat : 100);
    let ex = adj.exposure !== undefined ? adj.exposure : (adj.imgExposure !== undefined ? adj.imgExposure : 100);
    let tint = adj.tint !== undefined ? adj.tint : (adj.imgTint !== undefined ? adj.imgTint : 0);
    let style = adj.style || adj.imgStyle || 'none';
    let f = `brightness(${(b * ex / 100).toFixed(1)}%) contrast(${c}%) saturate(${s}%) hue-rotate(${tint}deg)`;
    if (style === 'sepia') f += ' sepia(80%)';
    if (style === 'grayscale') f += ' grayscale(100%)';
    if (style === 'invert') f += ' invert(100%)';
    if (style === 'noir') f += ' grayscale(100%) sepia(40%) contrast(1.2)';
    return f;
}
function lbActorFilePaperUrl(paper) {
    if (!paper || paper === 'classic') return '';
    let n = parseInt(paper, 10) || 1;
    return LB_ASSET + 'Paper' + Math.max(1, Math.min(LB_PAPER_COUNT, n)) + '.webp';
}
function lbActorFileClassicPaperUrl(item) {
    if (!item || item.layoutMode !== 'classic') return lbActorFilePaperUrl(item && item.paper);
    let p = item.paper;
    if (p && p !== 'classic') {
        let url = lbActorFilePaperUrl(p);
        if (url) return url;
    }
    return LB_AF_CLASSIC_PAPER_URL;
}
function lbEnsureActorFileDefaults(store) {
    if (!store.actorFileDefaults) store.actorFileDefaults = {};
    return store.actorFileDefaults;
}
function lbActorFileLayoutSize(layoutMode) {
    if (layoutMode === 'classic') return { w: 150, h: 180 };
    return { w: 150, h: 190 };
}
function lbActorFileHiddenDisplayName(item) {
    if (item.placeholderName && String(item.placeholderName).trim()) return String(item.placeholderName).trim();
    return '???';
}
function lbActorFileSecretPhotoState(item) {
    let ss = item.secretStyle || 'silhouette';
    let imgSrc = item.realImg || item.img || '';
    let filter = item.filter || lbBuildImgFilterAdj(item);
    let genderIcon = '';
    if (ss === 'question') {
        return { questionMark: true, showPhoto: false, imgSrc, filter, genderIcon };
    }
    if (ss === 'custom' && item.customSilhouette) {
        return { questionMark: false, showPhoto: true, imgSrc: item.customSilhouette, filter: 'none', genderIcon };
    }
    imgSrc = LB_AF_GENDER_IMG;
    filter = 'grayscale(100%) brightness(0.6) contrast(1.5)';
    if (item.gender && item.gender !== 'none') {
        let sIcon = item.gender === 'male' ? 'fa-mars' : (item.gender === 'female' ? 'fa-venus' : 'fa-transgender-alt');
        genderIcon = `<i class="fas ${sIcon} lb-af-gender-icon"></i>`;
    }
    return { questionMark: false, showPhoto: true, imgSrc, filter, genderIcon };
}
function lbActorFileDefaultDraft(layoutMode, entity, store) {
    let defs = lbEnsureActorFileDefaults(store)[layoutMode] || {};
    let sz = lbActorFileLayoutSize(layoutMode);
    let draft = {
        type: 'actor-file',
        layoutMode: layoutMode,
        visibility: defs.visibility || 'open',
        uuid: entity.uuid,
        realName: entity.name,
        realImg: entity.img,
        img: entity.img,
        name: entity.name,
        placeholderName: defs.placeholderName || '',
        paper: defs.paper !== undefined ? defs.paper : (layoutMode === 'classic' ? LB_AF_CLASSIC_PAPER : 7),
        drawMask: defs.drawMask || 'draw1',
        drawMaskScale: defs.drawMaskScale !== undefined ? defs.drawMaskScale : 100,
        drawMaskXPct: defs.drawMaskXPct !== undefined ? defs.drawMaskXPct : 50,
        drawMaskYPct: defs.drawMaskYPct !== undefined ? defs.drawMaskYPct : 50,
        font: defs.font || (layoutMode === 'classic' ? 'Caveat' : layoutMode === 'bulletin' ? 'Uncial Antiqua' : 'Cutive Mono'),
        nameSize: defs.nameSize !== undefined ? defs.nameSize : (layoutMode === 'classic' ? 45 : layoutMode === 'bulletin' ? 30 : 18),
        nameBold: defs.nameBold !== undefined ? defs.nameBold : (layoutMode === 'classic'),
        nameItalic: defs.nameItalic || false,
        nameUnderline: defs.nameUnderline || false,
        nameColor: defs.nameColor || (layoutMode === 'fullprint' ? '#ffffff' : '#111111'),
        imgBright: defs.imgBright !== undefined ? defs.imgBright : 100,
        imgCont: defs.imgCont !== undefined ? defs.imgCont : 100,
        imgSat: defs.imgSat !== undefined ? defs.imgSat : 100,
        imgExposure: defs.imgExposure !== undefined ? defs.imgExposure : 100,
        imgTint: defs.imgTint !== undefined ? defs.imgTint : 0,
        imgStyle: defs.imgStyle || 'none',
        imgScale: defs.imgScale || 1,
        imgPanX: defs.imgPanX || 0,
        imgPanY: defs.imgPanY || 0,
        secretStyle: defs.secretStyle || 'silhouette',
        gender: defs.gender || 'none',
        customSilhouette: defs.customSilhouette || '',
        w: sz.w, h: sz.h,
        z: 250
    };
    if (draft.attachType === undefined && defs.attachType) draft.attachType = defs.attachType;
    draft.filter = lbBuildImgFilterAdj(draft);
    return draft;
}
function lbActorFileDisplayState(item) {
    let vis = item.visibility || 'open';
    let displayName = item.name || item.realName || '';
    let showPhoto = true;
    let imgSrc = item.realImg || item.img || '';
    let filter = item.filter || lbBuildImgFilterAdj(item);
    let questionMark = false;
    let genderIcon = '';
    if (vis === 'name-hidden' || vis === 'full-hidden') {
        displayName = lbActorFileHiddenDisplayName(item);
    }
    if (vis === 'photo-hidden' || vis === 'full-hidden') {
        let sec = lbActorFileSecretPhotoState(item);
        questionMark = sec.questionMark;
        showPhoto = sec.showPhoto;
        imgSrc = sec.imgSrc;
        filter = sec.filter;
        genderIcon = sec.genderIcon;
    } else {
        imgSrc = item.defaultImg || item.realImg || item.img || '';
    }
    return { displayName, showPhoto, imgSrc, filter, questionMark, genderIcon, vis };
}
function lbActorFileNameHTML(item, displayName, store) {
    if (!displayName || !String(displayName).trim()) return '';
    let defs = (store && store.actorFileDefaults && store.actorFileDefaults[item.layoutMode]) || {};
    let font = item.font || defs.font || 'Caveat';
    let size = item.nameSize || defs.nameSize || 45;
    let bold = item.nameBold !== undefined ? item.nameBold : (defs.nameBold !== undefined ? defs.nameBold : true);
    let italic = item.nameItalic !== undefined ? item.nameItalic : (defs.nameItalic || false);
    let underline = item.nameUnderline !== undefined ? item.nameUnderline : (defs.nameUnderline || false);
    let color = item.nameColor || defs.nameColor || '#111';
    let esc = String(displayName).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let lenAttr = displayName.length > 12 ? ` textLength="280" lengthAdjust="spacingAndGlyphs"` : '';
    if (item.layoutMode === 'fullprint') {
        let fpColor = item.nameColor || defs.nameColor || '#fff';
        let lenAttr = displayName.length > 6 ? ` textLength="260" lengthAdjust="spacingAndGlyphs"` : '';
        return `<div class="lb-af-fullprint-name"><svg viewBox="0 0 300 40" preserveAspectRatio="xMidYMid meet"><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="${fpColor}" font-family="${String(font).replace(/"/g, "'")}" font-size="${size}" font-weight="${bold ? 'bold' : 'normal'}" font-style="${italic ? 'italic' : 'normal'}" text-decoration="${underline ? 'underline' : 'none'}"${lenAttr}>${esc}</text></svg></div>`;
    }
    return `<div class="lb-af-namestrip"><svg viewBox="0 0 300 60" preserveAspectRatio="xMidYMid meet"><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="${color}" font-family="${String(font).replace(/"/g, "'")}" font-size="${size}" font-weight="${bold ? 'bold' : 'normal'}" font-style="${italic ? 'italic' : 'normal'}" text-decoration="${underline ? 'underline' : 'none'}"${lenAttr}>${esc}</text></svg></div>`;
}
function lbActorFilePhotoHTML(item, st) {
    let tr = `translate(calc(-50% + ${item.imgPanX || 0}px), calc(-50% + ${item.imgPanY || 0}px)) scale(${item.imgScale || 1})`;
    if (st.questionMark) {
        return `<div class="lb-af-photo lb-af-photo-q"><span class="lb-af-qmark">?</span></div>`;
    }
    if (!st.showPhoto) {
        return `<div class="lb-af-photo lb-af-photo-empty" aria-hidden="true"></div>`;
    }
    return `<div class="lb-af-photo"><img src="${st.imgSrc}" style="filter:${st.filter}; transform:${tr};" class="lb-af-photo-img">${st.genderIcon}</div>`;
}
function lbBuildActorFileFrontHTML(item, store) {
    let st = lbActorFileDisplayState(item);
    let namePart = lbActorFileNameHTML(item, st.displayName, store);
    let photoPart = lbActorFilePhotoHTML(item, st);
    let paperUrl = lbActorFilePaperUrl(item.paper);
    if (item.layoutMode === 'fullprint') {
        let pUrl = paperUrl || lbActorFilePaperUrl(7);
        return `<div class="lb-af-face lb-af-face-fullprint" style="background:url(${pUrl}) center/100% 100% no-repeat;">
            <div class="lb-af-fullprint-mask" style="-webkit-mask:url('${pUrl}') center/100% 100% no-repeat;mask:url('${pUrl}') center/100% 100% no-repeat;-webkit-mask-size:100% 100%;mask-size:100% 100%;">${photoPart}</div>${namePart}</div>`;
    }
    if (item.layoutMode === 'bulletin') {
        let maskUrl = lbDrawMaskUrl(item.drawMask || 'draw1');
        let mScale = Math.max(50, Math.min(200, item.drawMaskScale !== undefined ? item.drawMaskScale : 100));
        let maskSize = mScale + '% ' + mScale + '%';
        let maskX = item.drawMaskXPct !== undefined ? item.drawMaskXPct : 50;
        let maskY = item.drawMaskYPct !== undefined ? item.drawMaskYPct : 50;
        let bg = paperUrl ? `background:url(${paperUrl}) center/100% 100% no-repeat;` : '';
        return `<div class="lb-af-face lb-af-face-bulletin" style="${bg}">
            <div class="lb-af-bulletin-body"><div class="lb-af-photo-wrap lb-af-bulletin-mask" style="-webkit-mask:url('${maskUrl}') ${maskX}% ${maskY}%/${maskSize} no-repeat;mask:url('${maskUrl}') ${maskX}% ${maskY}%/${maskSize} no-repeat;-webkit-mask-size:${maskSize};mask-size:${maskSize};">${photoPart}</div>${namePart}</div></div>`;
    }
    let paperUrlClassic = lbActorFileClassicPaperUrl(item);
    let maskStyle = `-webkit-mask:url('${paperUrlClassic}') center/100% 100% no-repeat;mask:url('${paperUrlClassic}') center/100% 100% no-repeat;-webkit-mask-size:100% 100%;mask-size:100% 100%;`;
    return `<div class="lb-af-face lb-af-face-classic" style="background:url(${paperUrlClassic}) center/100% 100% no-repeat;${maskStyle}">
        <div class="lb-af-inner lb-af-classic-inner"><div class="lb-af-photo-slot">${photoPart}</div>${namePart}</div></div>`;
}
function lbBuildActorFileBackHTML(item) {
    let paperUrl = item.layoutMode === 'classic' ? '' : lbActorFilePaperUrl(item.paper);
    if (item.layoutMode === 'classic') {
        let paperUrlClassic = lbActorFileClassicPaperUrl(item);
        return `<div class="lb-af-face lb-af-face-back lb-af-back-classic" style="background:url(${paperUrlClassic}) center/100% 100% no-repeat;border:none;box-shadow:none;"></div>`;
    }
    let pUrl = paperUrl || lbActorFilePaperUrl(item.layoutMode === 'classic' ? 7 : item.paper || 7);
    return `<div class="lb-af-face lb-af-face-back" style="background:url(${pUrl}) center/100% 100% no-repeat;"></div>`;
}
function lbActorFileCanReveal(item, type) {
    if (!item) return false;
    let vis = item.visibility || 'open';
    if (type === 'name') return vis === 'name-hidden' || vis === 'full-hidden';
    if (type === 'photo') return vis === 'photo-hidden' || vis === 'full-hidden';
    if (type === 'complete') return vis !== 'open';
    return false;
}
function lbActorFileApplyReveal(item, type, revealName) {
    if (!item) return;
    let vis = item.visibility || 'open';
    if (type === 'name') {
        if (vis === 'full-hidden') item.visibility = 'photo-hidden';
        else item.visibility = 'open';
        if (revealName) item.name = revealName;
    } else if (type === 'photo') {
        if (vis === 'full-hidden') item.visibility = 'name-hidden';
        else item.visibility = 'open';
    } else {
        item.visibility = 'open';
        if (revealName) item.name = revealName;
    }
}
function lbOpenActorFileRevealDialog(item, ctx) {
    if (!item) return;
    let opts = [];
    if (lbActorFileCanReveal(item, 'name')) opts.push({ id: 'name', label: "<i class='fas fa-font'></i> Name Only", icon: 'fa-font' });
    if (lbActorFileCanReveal(item, 'photo')) opts.push({ id: 'photo', label: "<i class='fas fa-portrait'></i> Photo Only", icon: 'fa-portrait' });
    if (lbActorFileCanReveal(item, 'complete')) opts.push({ id: 'complete', label: "<i class='fas fa-user'></i> Complete Reveal", icon: 'fa-user' });
    if (!opts.length) { ui.notifications.info('Nothing left to reveal on this card.'); return; }
    let buttons = {};
    opts.forEach(o => {
        buttons[o.id] = { label: o.label, callback: () => {
            let proceed = (revealName) => {
                if (typeof window.lbTriggerActorFileReveal === 'function') {
                    window.lbTriggerActorFileReveal(item.id, o.id, revealName, ctx);
                }
            };
            if (o.id === 'name' || o.id === 'complete') {
                new Dialog({
                    title: 'Name for Players',
                    content: `<div class="lb-modal-form"><p class="theme-heading" style="text-align:center;">Which name should appear on the card?</p><input type="text" id="lb-af-reveal-name" value="${String(item.revealName || item.realName || item.name || '').replace(/"/g, '&quot;')}" style="width:100%;"></div>`,
                    buttons: { ok: { label: "<i class='fas fa-check'></i> Reveal", callback: (dHtml) => {
                        proceed(String(dHtml.find('#lb-af-reveal-name').val() || item.realName || item.name || '').trim());
                    }}}
                }, { classes: ['dialog', 'lb-modern-dialog'], width: 380, zIndex: 100002 }).render(true);
            } else proceed();
        }};
    });
    new Dialog({
        title: 'Reveal',
        content: `<p style="text-align:center;color:#ccc;line-height:1.5;">What should be revealed?</p>`,
        buttons: buttons
    }, { classes: ['dialog', 'lb-modern-dialog'], width: 400, zIndex: 100001 }).render(true);
}
function lbOpenActorFileRadial(ctx, onPick) {
    ctx = ctx || {};
    lbEnsureCreateBoardFonts();
    lbEnsureOverlayCSS();
    $('#lb-af-overlay').remove();
    let liveTheme = lbGetLiveBoardThemeColors(ctx.themeColor, ctx.themeColorRgb);
    let themeColor = liveTheme.accent;
    let themeColorRgb = liveTheme.rgb;
    let radius = 168;
    let count = LB_AF_LAYOUT_OPTS.length;
    let nodes = LB_AF_LAYOUT_OPTS.map((o, i) => {
        let angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        let x = Math.round(Math.cos(angle) * radius);
        let y = Math.round(Math.sin(angle) * radius);
        return `<button type="button" class="lb-af-node lb-af-node--${o.id}" data-id="${o.id}" data-tip="${lbRadialTipText(o)}" title="${lbRadialTipText(o)}" style="--lb-x:${x}px;--lb-y:${y}px;--lb-i:${i};"><span class="lb-af-node-glow"></span><span class="lb-af-node-icon"><i class="fas ${o.icon}"></i></span></button>`;
    }).join('');
    let boardHoverColor = liveTheme.hover;
    let ov = $(`
    <div id="lb-af-overlay" class="lb-af-overlay" style="--lb-accent:${themeColor};--lb-accent-rgb:${themeColorRgb};--board-hover-color:${boardHoverColor};--board-primary-color:${themeColor};--board-primary-rgb:${themeColorRgb};">
        <div class="lb-af-backdrop"></div>
        <div class="lb-af-scene">
            <div class="lb-af-orbit-ring"></div>
            <div class="lb-af-orbit-ring lb-af-orbit-ring-2"></div>
            <div class="lb-af-hub"><div class="lb-radial-eye-wrap">${lbRadialEyeHTML()}</div></div>
            <div class="lb-af-orbit">${nodes}</div>
        </div>
    </div>`);
    $('body').append(ov);
    let radialUi = lbInitRadialHubInteraction(ov, { sceneSel: '.lb-af-scene', accentRgb: themeColorRgb, chainMode: false });
    let closing = false;
    let dismiss = (runDismissCb) => {
        if (closing) return;
        closing = true;
        radialUi.destroy();
        ov.addClass('lb-af-closing');
        setTimeout(() => {
            ov.remove();
            if (runDismissCb && ctx.onDismiss) ctx.onDismiss();
        }, 280);
    };
    ov.on('click', function(e) {
        if ($(e.target).closest('.lb-af-scene').length) return;
        dismiss(true);
    });
    ov.find('.lb-af-node').on('click', function(e) {
        e.stopPropagation();
        let id = $(this).data('id');
        dismiss(false);
        if (onPick) onPick(id);
    });
    return ov;
}
function lbOpenActorFileEditor(draft, ctx) {
    if (!draft || !ctx) return;
    lbEnsureOverlayCSS();
    draft = foundry.utils.deepClone(draft);
    let themeColor = ctx.themeColor || '#d4af37';
    let aB = draft.imgBright !== undefined ? draft.imgBright : 100;
    let aC = draft.imgCont !== undefined ? draft.imgCont : 100;
    let aS = draft.imgSat !== undefined ? draft.imgSat : 100;
    let aE = draft.imgExposure !== undefined ? draft.imgExposure : 100;
    let aT = draft.imgTint !== undefined ? draft.imgTint : 0;
    let aSt = draft.imgStyle || 'none';
    let iScale = draft.imgScale || 1, iPanX = draft.imgPanX || 0, iPanY = draft.imgPanY || 0;
    let initF = lbBuildImgFilterAdj(draft);
    let initAttach = lbSanitizeAttachType(draft.attachType || lbDefaultAttachType('actor-file', ctx.theme.id, ctx.store), ctx.theme.id, ctx.store);
    let pSlider = (id, label, min, max, val, step) => `<div class="lb-af-slider"><label class="theme-heading">${label}: <span id="${id}-val">${val}</span></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step || 1}" value="${val}"></div>`;
    let layoutTabs = LB_AF_LAYOUT_OPTS.map(o => `<button type="button" class="lb-af-tab${draft.layoutMode === o.id ? ' active' : ''}" data-mode="${o.id}">${o.tip}</button>`).join('');
    let visOpts = [
        { v: 'open', l: 'Open' },
        { v: 'name-hidden', l: 'Name Hidden' },
        { v: 'photo-hidden', l: 'Photo Hidden' },
        { v: 'full-hidden', l: 'Full Hidden' }
    ];
    let visSelect = visOpts.map(o => `<option value="${o.v}"${draft.visibility === o.v ? ' selected' : ''}>${o.l}</option>`).join('');
    let secretPanel = `<div id="af-secret-panel" class="lb-af-secret-panel" style="${(draft.visibility === 'photo-hidden' || draft.visibility === 'full-hidden') ? '' : 'display:none;'}">
        <p class="theme-heading" style="font-size:11px;margin:0 0 6px;">Secret Mode</p>
        <select id="af-secret-style">
            <option value="silhouette"${draft.secretStyle === 'silhouette' ? ' selected' : ''}>Silhouette</option>
            <option value="question"${draft.secretStyle === 'question' ? ' selected' : ''}>Question Mark</option>
            <option value="custom"${draft.secretStyle === 'custom' ? ' selected' : ''}>Custom Upload</option>
        </select>
        <div id="af-gender-row" style="margin-top:8px;${draft.secretStyle === 'silhouette' ? '' : 'display:none;'}">
            <label class="theme-heading" style="font-size:11px;">Gender hint:</label>
            <select id="af-gender">
                <option value="none"${draft.gender === 'none' ? ' selected' : ''}>None</option>
                <option value="male"${draft.gender === 'male' ? ' selected' : ''}>♂</option>
                <option value="female"${draft.gender === 'female' ? ' selected' : ''}>♀</option>
                <option value="diverse"${draft.gender === 'diverse' ? ' selected' : ''}>⚧</option>
            </select>
        </div>
        <div id="af-custom-upload" style="margin-top:8px;${draft.secretStyle === 'custom' ? '' : 'display:none;'}">
            <button type="button" id="af-upload-secret" class="lb-af-btn-sm"><i class="fas fa-upload"></i> Upload</button>
            <span id="af-custom-label" style="font-size:10px;margin-left:6px;">${draft.customSilhouette ? 'Set' : 'None'}</span>
        </div>
    </div>`;
    let showPlaceholder = draft.visibility === 'name-hidden' || draft.visibility === 'full-hidden';
    let placeholderRow = `<div id="af-placeholder-row" class="lb-af-placeholder-row" style="${showPlaceholder ? '' : 'display:none;'}">
        <label class="theme-heading" style="font-size:11px;">Placeholder Name</label>
        <input type="text" id="af-placeholder-name" value="${String(draft.placeholderName || '').replace(/"/g, '&quot;')}" placeholder="???" style="width:100%;">
    </div>`;
    let paperDefault = draft.layoutMode === 'classic' ? LB_AF_CLASSIC_PAPER : 7;
    let paperPicker = ctx.lbPaperPickerHTML ? ctx.lbPaperPickerHTML(draft.paper || paperDefault, 'af-paper-picker', true) : `<select id="af-paper-picker"><option value="10">Paper10</option></select>`;
    let drawMaskVal = draft.drawMask || 'draw1';
    let drawMaskScale = draft.drawMaskScale !== undefined ? draft.drawMaskScale : 100;
    let drawControl = `<div id="af-draw-control" class="lb-af-draw-control" style="${draft.layoutMode === 'bulletin' ? '' : 'display:none;'}">
        <label class="theme-heading" style="font-size:11px;">Draw Effect</label>
        ${lbDrawMaskPickerHTML(drawMaskVal, 'af-draw-mask')}
        <div class="lb-af-slider"><label class="theme-heading">Draw Scale: <span id="af-draw-scale-val">${drawMaskScale}</span>%</label><input type="range" id="af-draw-scale" min="50" max="200" step="1" value="${drawMaskScale}"></div>
    </div>`;
    let afNameColor = draft.nameColor || (draft.layoutMode === 'fullprint' ? '#ffffff' : '#111111');
    let content = `
    <div class="lb-af-editor">
        <div class="lb-af-tabs">${layoutTabs}</div>
        <div class="lb-af-editor-body">
            <div class="lb-af-col lb-af-col-img">
                <p class="theme-heading lb-af-col-title"><i class="fas fa-image"></i> Image</p>
                <p class="theme-heading" style="font-size:10px;text-align:center;margin:0;opacity:0.75;">Scroll to zoom · Drag to pan</p>
                <div class="lb-af-crop-stage" id="af-crop-stage">
                    <div id="af-crop-frame" class="lb-af-crop-frame">
                        <img id="af-crop-img" src="${draft.img || draft.realImg}" style="filter:${initF}; transform:translate(calc(-50% + ${iPanX}px), calc(-50% + ${iPanY}px)) scale(${iScale});">
                        <div id="af-crop-qmark" class="lb-af-crop-qmark" style="display:none;"><span>?</span></div>
                    </div>
                </div>
                ${pSlider('af-bright', 'Brightness', 0, 200, aB)}
                ${pSlider('af-cont', 'Contrast', 0, 200, aC)}
                ${pSlider('af-sat', 'Saturation', 0, 200, aS)}
                ${pSlider('af-exp', 'Exposure', 20, 200, aE)}
                ${pSlider('af-tint', 'Tint', -180, 180, aT)}
                <label class="theme-heading" style="font-size:11px;">Style Filter</label>
                <select id="af-style">
                    <option value="none"${aSt === 'none' ? ' selected' : ''}>Normal</option>
                    <option value="sepia"${aSt === 'sepia' ? ' selected' : ''}>Sepia</option>
                    <option value="grayscale"${aSt === 'grayscale' ? ' selected' : ''}>Grayscale</option>
                    <option value="invert"${aSt === 'invert' ? ' selected' : ''}>Inverted</option>
                    <option value="noir"${aSt === 'noir' ? ' selected' : ''}>Noir</option>
                </select>
            </div>
            <div class="lb-af-col lb-af-col-preview">
                <p class="theme-heading lb-af-col-title">Live Preview</p>
                <div class="lb-af-preview-wrap">
                    <div class="lb-af-preview-controls">
                        <div id="af-paper-control" class="lb-af-paper-control">
                            <label class="theme-heading" style="font-size:11px;">Paper</label>
                            ${paperPicker}
                        </div>
                        ${drawControl}
                    </div>
                    <div id="af-live-preview" class="lb-af-preview-stage"></div>
                </div>
                <label class="theme-heading" style="font-size:11px;">Visibility</label>
                <select id="af-visibility">${visSelect}</select>
                ${placeholderRow}
                ${secretPanel}
                <label class="theme-heading" style="font-size:11px;margin-top:6px;">Attachment</label>
                ${lbEditorAttachSelectHTML(ctx.theme.id, Object.assign({}, draft, { attachType: initAttach }), 'af-attach', ctx.store.threads, ctx.store)}
            </div>
            <div class="lb-af-col lb-af-col-type">
                <p class="theme-heading lb-af-col-title"><i class="fas fa-font"></i> Name</p>
                <input type="text" id="af-name" value="${String((draft.name || draft.realName || '').replace(/"/g, '&quot;'))}" placeholder="Actor name">
                <label class="theme-heading" style="font-size:11px;">Font</label>
                <select id="af-font">${ctx.lbFontOptionsHTML ? ctx.lbFontOptionsHTML(lbFontPickerSelectedValue(draft.font || 'Caveat', draft.documentLanguage), ctx.store) : ''}</select>
                <div style="display:flex;gap:8px;">
                    <div style="flex:1;"><label class="theme-heading" style="font-size:11px;">Size</label><input type="number" id="af-size" value="${draft.nameSize || 45}" min="12" max="90" style="width:100%;"></div>
                    <div style="flex:1;"><label class="theme-heading" style="font-size:11px;">Color</label><input type="color" id="af-color" value="${afNameColor}" style="width:100%;height:36px;"></div>
                </div>
                <div class="lb-af-type-style">
                    <label><input type="checkbox" id="af-bold" ${draft.nameBold ? 'checked' : ''}> Bold</label>
                    <label><input type="checkbox" id="af-italic" ${draft.nameItalic ? 'checked' : ''}> Italic</label>
                    <label><input type="checkbox" id="af-underline" ${draft.nameUnderline ? 'checked' : ''}> Underline</label>
                </div>
            </div>
        </div>
    </div>`;
    window.lbAFEditorDraft = draft;
    window.lbAFEditorStore = ctx.store;
    window.lbAFEditorThemeId = ctx.theme.id;
    delete window.lbAFEditorRefresh;
    delete window.lbAFEditorMounted;
    delete window.lbAFEditorBound;
    delete window.lbAFEditorSyncCrop;
    window.lbAFEditorAttachSetup = ctx.lbEditorAttachPreviewSetup ? function(stage, d) {
        ctx.lbEditorAttachPreviewSetup(stage, d, ctx.theme.id, ctx.store, { selectId: 'af-attach' });
    } : null;
    let isEdit = !!ctx._editItemId;
    let editItem = isEdit && ctx.store && ctx.store.items ? ctx.store.items.find(i => i.id === ctx._editItemId) : null;
    let dialogButtons = {
            cancel: { label: 'Cancel', callback: () => {
                lbActorFileEditorTeardownAll();
            }}
        };
    if (editItem && (lbActorFileCanReveal(editItem, 'name') || lbActorFileCanReveal(editItem, 'photo') || lbActorFileCanReveal(editItem, 'complete'))) {
        dialogButtons.reveal = { label: "<i class='fas fa-eye'></i> Reveal", callback: () => {
            lbActorFileEditorTeardownAll();
            lbOpenActorFileRevealDialog(editItem, ctx);
        }};
    }
    dialogButtons.blueprint = { label: "<i class='fas fa-drafting-compass'></i> Save as Blueprint", callback: () => {
                if (window.lbAFEditorRefresh) window.lbAFEditorRefresh();
                lbActorFileCommitDraftFromEditor(window.lbAFEditorDraft || draft, ctx, true);
                ctx.saveStore();
                ui.notifications.info('Actor file defaults saved for ' + (window.lbAFEditorDraft || draft).layoutMode + '.');
            }};
    dialogButtons.pin = { label: isEdit ? "<i class='fas fa-check'></i> Apply" : "<i class='fas fa-thumbtack'></i> Pin to Board", callback: () => {
                if (window.lbAFEditorRefresh) window.lbAFEditorRefresh();
                let finalDraft = window.lbAFEditorDraft || draft;
                lbActorFileCommitDraftFromEditor(finalDraft, ctx, false);
                finalDraft.defaultImg = finalDraft.img || finalDraft.realImg || finalDraft.defaultImg || '';
                if (isEdit) {
                    let item = ctx.store.items.find(i => i.id === ctx._editItemId);
                    if (item) {
                        Object.assign(item, foundry.utils.deepClone(finalDraft));
                        item.id = ctx._editItemId;
                        ctx.saveStore();
                        window.loadBoard(false);
                    }
                } else {
                    window.lbPlacingItem = foundry.utils.deepClone(finalDraft);
                    if (ctx.generateCursorPreview) ctx.generateCursorPreview();
                }
                lbActorFileEditorTeardownAll();
            }};
    let dlg = new Dialog({
        title: (isEdit ? 'Edit Actor File — ' : 'Actor File — ') + (draft.realName || draft.name || 'Profile'),
        content: content,
        buttons: dialogButtons
    }, { classes: ['dialog', 'lb-modern-dialog', 'lb-af-editor-dialog'], width: 920, height: 'auto', zIndex: 100001 });
    dlg.render(true);
    window.lbAFEditorDialog = dlg;
    window.lbAFEditorCtx = ctx;
    setTimeout(function() {
        lbActorFileEditorSyncRevealBtn(dlg, draft, ctx);
    }, 40);
    setTimeout(function() {
        let el = dlg.element && dlg.element[0] ? dlg.element[0] : null;
        if (!el) return;
        let wc = el.querySelector('.window-content');
        let dc = el.querySelector('.dialog-content');
        if (wc) { wc.style.overflow = 'visible'; wc.style.maxHeight = 'none'; }
        if (dc) { dc.style.overflow = 'visible'; }
    }, 20);
    let cropInit = { iScale: iScale, iPanX: iPanX, iPanY: iPanY };
    [30, 120, 300].forEach(function(ms) {
        setTimeout(function() { lbActorFileEditorWireDialog(dlg, cropInit); }, ms);
    });
}
function lbActorFileCommitDraftFromEditor(draft, ctx, asBlueprint) {
    if (!draft) return;
    let attDraft = window.lbAFAttachDraft || {};
    if (attDraft.attachX != null) draft.attachX = attDraft.attachX;
    if (attDraft.attachY != null) draft.attachY = attDraft.attachY;
    if (asBlueprint) {
        let defs = lbEnsureActorFileDefaults(ctx.store);
        defs[draft.layoutMode] = {
            visibility: draft.visibility, paper: draft.paper, font: draft.font, nameSize: draft.nameSize,
            nameBold: draft.nameBold, nameItalic: draft.nameItalic, nameUnderline: draft.nameUnderline, nameColor: draft.nameColor,
            imgBright: draft.imgBright, imgCont: draft.imgCont, imgSat: draft.imgSat, imgExposure: draft.imgExposure, imgTint: draft.imgTint, imgStyle: draft.imgStyle,
            secretStyle: draft.secretStyle, gender: draft.gender, customSilhouette: draft.customSilhouette, attachType: draft.attachType,
            drawMask: draft.drawMask, drawMaskScale: draft.drawMaskScale, drawMaskXPct: draft.drawMaskXPct, drawMaskYPct: draft.drawMaskYPct, placeholderName: draft.placeholderName
        };
    }
}
window.lbBuildActorFileFrontHTML = lbBuildActorFileFrontHTML;
window.lbBuildActorFileBackHTML = lbBuildActorFileBackHTML;
window.lbBuildImgFilterAdj = lbBuildImgFilterAdj;
window.lbActorFileLayoutSize = lbActorFileLayoutSize;
window.lbOpenActorFileRadial = lbOpenActorFileRadial;
window.lbOpenActorFileEditor = lbOpenActorFileEditor;
window.lbActorFileDefaultDraft = lbActorFileDefaultDraft;

function lbActorFileEditorSyncRevealBtn(dlg, draft, ctx) {
    if (!dlg || !dlg.element || !draft) return;
    let canReveal = lbActorFileCanReveal(draft, 'name') || lbActorFileCanReveal(draft, 'photo') || lbActorFileCanReveal(draft, 'complete');
    let $footer = dlg.element.find('.dialog-buttons');
    if (!$footer.length) return;
    let $existing = $footer.find('[data-button="reveal"]');
    if (canReveal && !$existing.length) {
        let $btn = $('<button type="button" data-button="reveal"><i class="fas fa-eye"></i> Reveal</button>');
        $btn.on('click', function() {
            lbActorFileEditorTeardownAll();
            dlg.close();
            lbOpenActorFileRevealDialog(draft, ctx);
        });
        $footer.prepend($btn);
    } else if (!canReveal && $existing.length) {
        $existing.remove();
    }
}
window.lbActorFileEditorSyncRevealBtn = lbActorFileEditorSyncRevealBtn;
function lbActorFileEditorTeardownAll() {
    $(document).off('.lbAfCrop').off('.click.lbAfDdOutside').off('.mousedown.lbAfDdOutside').off('.lbAfMaskDrag');
    document.querySelectorAll('body > .lb-paper-embed-panel').forEach(function(panel) {
        if (panel._lbAfOrigParent) {
            panel._lbAfOrigParent.appendChild(panel);
            delete panel._lbAfOrigParent;
        }
    });
    $('.lb-af-editor .lb-paper-embed').each(function() {
        $(this).removeData('lbAfWired lbAfRevertFn')
            .find('.lb-paper-embed-trigger, .lb-paper-embed-row').off('.lbAfDd');
    });
    window.lbAFEditorBound = false;
    window.lbAFEditorMounted = false;
    delete window.lbAFEditorRefresh;
    delete window.lbAFEditorSyncCrop;
    if (window.lbClosePaperDropdown) window.lbClosePaperDropdown();
}
function lbActorFilePaperLabel(val) {
    if (val === 'transparent') return 'No Paper';
    return 'Paper' + val;
}
function lbActorFileEditorGetRoot(dlg) {
    let cropSel = '#af-crop-stage, .lb-af-crop-stage, #af-crop-frame';
    if (dlg && dlg.element) {
        let $el = dlg.element instanceof jQuery ? dlg.element : $(dlg.element);
        if ($el.find(cropSel).length) return $el;
        let $inner = $el.find('.window-content, .dialog-content').first();
        if ($inner.find(cropSel).length) return $inner;
    }
    let $fallback = $('.app.window-app').has('#af-crop-stage, #af-crop-frame').last();
    if ($fallback.length) return $fallback;
    return $('#af-crop-stage, #af-crop-frame').closest('.app.window-app, .dialog');
}
function lbActorFileEditorUnwireDropdowns($root) {
    $root.find('.lb-paper-embed').removeData('lbAfWired lbAfRevertFn')
        .find('.lb-paper-embed-trigger, .lb-paper-embed-row').off('.lbAfDd');
}
function lbActorFileEditorWireCropPan($root, initial) {
    initial = initial || {};
    let $stage = $root.find('#af-crop-stage');
    if (!$stage.length) $stage = $root.find('.lb-af-crop-stage').first();
    if (!$stage.length) return false;
    $(document).off('mousemove.lbAfCrop mouseup.lbAfCrop');
    $stage.off('.lbAfCrop');
    let cScale = initial.iScale !== undefined ? initial.iScale : (window.lbAFCropScale || 1);
    let cPanX = initial.iPanX !== undefined ? initial.iPanX : (window.lbAFCropPanX || 0);
    let cPanY = initial.iPanY !== undefined ? initial.iPanY : (window.lbAFCropPanY || 0);
    window.lbAFCropScale = cScale;
    window.lbAFCropPanX = cPanX;
    window.lbAFCropPanY = cPanY;
    let dragging = false, sX = 0, sY = 0;
    function applyTransform() {
        let $img = $root.find('#af-crop-img');
        if ($img.length && $img.css('display') !== 'none') {
            $img.css('transform', 'translate(calc(-50% + ' + window.lbAFCropPanX + 'px), calc(-50% + ' + window.lbAFCropPanY + 'px)) scale(' + window.lbAFCropScale + ')');
        }
        if (window.lbAFEditorSyncCrop) window.lbAFEditorSyncCrop();
        else if (window.lbAFEditorRefresh) window.lbAFEditorRefresh();
    }
    $stage.on('mousedown.lbAfCrop', function(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        dragging = true;
        sX = e.clientX - window.lbAFCropPanX;
        sY = e.clientY - window.lbAFCropPanY;
        $stage.css('cursor', 'grabbing');
    });
    $stage.on('wheel.lbAfCrop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        let prev = window.lbAFCropScale;
        let dy = (e.originalEvent && e.originalEvent.deltaY !== undefined) ? e.originalEvent.deltaY : e.deltaY;
        let ns = Math.max(0.5, Math.min(window.lbAFCropScale * Math.exp(-dy * 0.0015), 6));
        let r = $stage[0].getBoundingClientRect();
        let ox = e.clientX - r.left - r.width / 2;
        let oy = e.clientY - r.top - r.height / 2;
        let ratio = ns / prev;
        window.lbAFCropPanX = ox - (ox - window.lbAFCropPanX) * ratio;
        window.lbAFCropPanY = oy - (oy - window.lbAFCropPanY) * ratio;
        window.lbAFCropScale = ns;
        applyTransform();
    });
    $(document).on('mousemove.lbAfCrop', function(e) {
        if (!dragging) return;
        window.lbAFCropPanX = e.clientX - sX;
        window.lbAFCropPanY = e.clientY - sY;
        applyTransform();
    }).on('mouseup.lbAfCrop', function() {
        if (!dragging) return;
        dragging = false;
        $stage.css('cursor', 'grab');
    });
    return true;
}
function lbActorFileEditorWireEmbedDropdown($root, pickerId, labelFn, onPreview) {
    let $embed = $root.find('#' + pickerId + '-embed');
    if (!$embed.length) return false;
    if ($embed.data('lbAfWired')) return true;
    $embed.data('lbAfWired', true);
    let $sel = $root.find('#' + pickerId);
    let $trigger = $root.find('#' + pickerId + '-trigger');
    let $panel = $root.find('#' + pickerId + '-panel');
    let $label = $trigger.find('.lb-paper-embed-label');
    let labelFor = typeof labelFn === 'function' ? labelFn : lbActorFilePaperLabel;
    let savedVal = $sel.val();
    let revertFn = null;
    function resetPanelStyle() {
        if (panel[0]._lbAfOrigParent && panel[0].parentElement === document.body) {
            panel[0]._lbAfOrigParent.appendChild(panel[0]);
            delete panel[0]._lbAfOrigParent;
        }
        $panel.css({ position: '', left: '', top: '', width: '', maxHeight: '', zIndex: '' });
    }
    function positionPanel() {
        if (panel[0].parentElement !== document.body) {
            panel[0]._lbAfOrigParent = panel[0].parentElement;
            document.body.appendChild(panel[0]);
        }
        if (window.lbPositionEmbedPanelFixed) {
            window.lbPositionEmbedPanelFixed($trigger[0], $panel[0]);
            $panel.css('zIndex', pickerId === 'af-paper-picker' ? '100000012' : '100000011');
        } else {
            let r = $trigger[0].getBoundingClientRect();
            $panel.css({
                position: 'fixed',
                left: Math.max(8, r.left) + 'px',
                top: (r.bottom + 4) + 'px',
                zIndex: pickerId === 'af-paper-picker' ? '100000012' : '100000011',
                width: Math.max(r.width, 190) + 'px',
                maxHeight: '',
                overflow: 'visible'
            });
            $panel.find('.lb-paper-embed-list').css({ maxHeight: 'calc(5 * 34px)', overflowY: 'auto' });
        }
    }
    function closePanel(revert) {
        if (revert && revertFn) revertFn();
        $panel.prop('hidden', true);
        $trigger.attr('aria-expanded', 'false');
        resetPanelStyle();
        $embed.removeData('lbAfRevertFn');
        revertFn = null;
    }
    function pick(val) {
        $sel.val(val).attr('data-selected', val);
        $label.text(labelFor(val));
        $panel.find('.lb-paper-embed-row').removeClass('lb-pd-active')
            .filter('[data-val="' + val + '"]').addClass('lb-pd-active');
        revertFn = null;
        $embed.removeData('lbAfRevertFn');
        $panel.prop('hidden', true);
        $trigger.attr('aria-expanded', 'false');
        resetPanelStyle();
        if (onPreview) onPreview(val);
    }
    $trigger.on('click.lbAfDd', function(e) {
        e.preventDefault();
        e.stopPropagation();
        let willOpen = $panel.prop('hidden');
        $root.find('.lb-paper-embed-panel').not($panel).each(function() {
            let $p = $(this);
            $p.prop('hidden', true).css({ position: '', left: '', top: '', width: '', maxHeight: '', zIndex: '' });
        });
        $root.find('.lb-paper-embed-trigger').not($trigger).attr('aria-expanded', 'false');
        if (willOpen) {
            savedVal = $sel.val();
            revertFn = onPreview ? function() {
                $sel.val(savedVal);
                $label.text(labelFor(savedVal));
                if (onPreview) onPreview(savedVal);
            } : null;
            $embed.data('lbAfRevertFn', revertFn);
            $panel.prop('hidden', false);
            $trigger.attr('aria-expanded', 'true');
            positionPanel();
        } else {
            closePanel(true);
        }
    });
    $panel.find('.lb-paper-embed-row').on('mouseenter.lbAfDd', function() {
        let val = String($(this).data('val'));
        $panel.find('.lb-paper-embed-row').removeClass('lb-pd-active');
        $(this).addClass('lb-pd-active');
        $sel.val(val);
        if (onPreview) onPreview(val);
    }).on('mousedown.lbAfDd', function(e) {
        e.preventDefault();
        e.stopPropagation();
        pick(String($(this).data('val')));
    });
    return true;
}
function lbActorFileEditorWireDropdownOutside($root) {
    $(document).off('click.lbAfDdOutside mousedown.lbAfDdOutside').on('mousedown.lbAfDdOutside', function(e) {
        if ($(e.target).closest('.lb-paper-embed-trigger, .lb-paper-embed-panel, .lb-paper-embed-row').length) return;
        if (!$root.find('#af-crop-stage, .lb-af-crop-stage, #af-crop-frame').length) return;
        $('.lb-paper-embed-panel').not('[hidden]').each(function() {
            let $p = $(this);
            let pickerId = ($p.attr('id') || '').replace('-panel', '');
            let $embed = $('#' + pickerId + '-embed');
            if (!$embed.length) $embed = $root.find('#' + pickerId + '-embed');
            let revertFn = $embed.data('lbAfRevertFn');
            if (typeof revertFn === 'function') revertFn();
            $embed.removeData('lbAfRevertFn');
            $p.prop('hidden', true).css({ position: '', left: '', top: '', width: '', maxHeight: '', zIndex: '' });
            if (this._lbAfOrigParent && this.parentElement === document.body) {
                this._lbAfOrigParent.appendChild(this);
                delete this._lbAfOrigParent;
            }
            $('#' + pickerId + '-trigger').attr('aria-expanded', 'false');
        });
    });
}
function lbActorFileEditorWireDrawMaskDrag($root) {
    let $stage = $root.find('#af-live-preview .lb-af-preview-card').first();
    if (!$stage.length) $stage = $root.find('#af-live-preview');
    if (!$stage.length || $stage.data('lbAfMaskWired')) return false;
    $stage.data('lbAfMaskWired', true);
    $(document).off('mousemove.lbAfMaskDrag mouseup.lbAfMaskDrag');
    let dragging = false, sX = 0, sY = 0, startXPct = 50, startYPct = 50;
    function syncOverlay() {
        let draft = window.lbAFEditorDraft;
        if (!draft || draft.layoutMode !== 'bulletin') {
            $stage.find('.lb-af-draw-mask-drag').remove();
            return;
        }
        let card = $stage[0];
        if (!card) return;
        let w = card.offsetWidth || draft.w || 150;
        let h = card.offsetHeight || draft.h || 190;
        let mScale = Math.max(50, Math.min(200, draft.drawMaskScale !== undefined ? draft.drawMaskScale : 100)) / 100;
        let maskW = w * 0.72 * mScale;
        let maskH = h * 0.58 * mScale;
        let mx = draft.drawMaskXPct !== undefined ? draft.drawMaskXPct : 50;
        let my = draft.drawMaskYPct !== undefined ? draft.drawMaskYPct : 50;
        let left = (mx / 100) * w - maskW / 2;
        let top = (my / 100) * h - maskH / 2;
        let $drag = $stage.find('.lb-af-draw-mask-drag');
        if (!$drag.length) {
            $stage.append('<div class="lb-af-draw-mask-drag" title="Drag to position draw mask"></div>');
            $drag = $stage.find('.lb-af-draw-mask-drag');
        }
        $drag.css({ left: left + 'px', top: top + 'px', width: maskW + 'px', height: maskH + 'px' });
    }
    $stage.on('mousedown.lbAfMaskDrag', '.lb-af-draw-mask-drag', function(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        let draft = window.lbAFEditorDraft;
        if (!draft) return;
        dragging = true;
        sX = e.clientX;
        sY = e.clientY;
        startXPct = draft.drawMaskXPct !== undefined ? draft.drawMaskXPct : 50;
        startYPct = draft.drawMaskYPct !== undefined ? draft.drawMaskYPct : 50;
        $(this).css('cursor', 'grabbing');
    });
    $(document).on('mousemove.lbAfMaskDrag', function(e) {
        if (!dragging) return;
        let draft = window.lbAFEditorDraft;
        let card = $stage.find('.lb-af-preview-card')[0] || $stage[0];
        if (!draft || !card) return;
        let r = card.getBoundingClientRect();
        if (!r.width || !r.height) return;
        let dx = ((e.clientX - sX) / r.width) * 100;
        let dy = ((e.clientY - sY) / r.height) * 100;
        draft.drawMaskXPct = Math.max(8, Math.min(92, startXPct + dx));
        draft.drawMaskYPct = Math.max(8, Math.min(92, startYPct + dy));
        if (!window.lbAfMaskRefreshPending) {
            window.lbAfMaskRefreshPending = true;
            requestAnimationFrame(function() {
                window.lbAfMaskRefreshPending = false;
                if (window.lbAFEditorRefresh) window.lbAFEditorRefresh();
            });
        }
    }).on('mouseup.lbAfMaskDrag', function() {
        if (!dragging) return;
        dragging = false;
        $stage.find('.lb-af-draw-mask-drag').css('cursor', 'move');
        if (window.lbAFEditorRefresh) window.lbAFEditorRefresh();
    });
    window.lbAFSyncDrawMaskOverlay = syncOverlay;
    syncOverlay();
    return true;
}
function lbActorFileEditorWireDialog(dlg, cropInit) {
    let $root = lbActorFileEditorGetRoot(dlg);
    if (!$root.length || !$root.find('#af-crop-stage, .lb-af-crop-stage, #af-crop-frame').length) return false;
    lbActorFileEditorMount(cropInit);
    lbActorFileEditorWireCropPan($root, cropInit);
    lbActorFileEditorUnwireDropdowns($root);
    let refresh = function() {
        if (window.lbAFEditorRefresh) window.lbAFEditorRefresh();
    };
    lbActorFileEditorWireEmbedDropdown($root, 'af-paper-picker', lbActorFilePaperLabel, refresh);
    lbActorFileEditorWireEmbedDropdown($root, 'af-draw-mask', lbDrawMaskLabel, refresh);
    lbActorFileEditorWireDropdownOutside($root);
    lbActorFileEditorWireDrawMaskDrag($root);
    refresh();
    return true;
}

function lbActorFileEditorMount(initial) {
    initial = initial || {};
    if (window.lbAFEditorMounted && window.lbAFEditorRefresh) return true;
    if (!document.getElementById('af-bright')) return false;
    window.lbAFEditorMounted = true;
    try {
        (new Function(lbActorFileEditorScriptBody(initial)))();
    } catch (err) {
        console.error('Loreboard actor file editor mount failed', err);
        window.lbAFEditorMounted = false;
    }
    if (!window.lbAFEditorRefresh) window.lbAFEditorMounted = false;
    return !!window.lbAFEditorRefresh;
}
function lbActorFileEditorScriptBody(initial) {
    initial = initial || {};
    return `(function(){
    if (window.lbAFEditorBound) return;
    var draft = window.lbAFEditorDraft;
    if (!draft) return;
    window.lbAFEditorBound = true;
    var store = window.lbAFEditorStore || {};
    var cScale = ${initial.iScale || 1}, cPanX = ${initial.iPanX || 0}, cPanY = ${initial.iPanY || 0};
    window.lbAFCropScale = cScale;
    window.lbAFCropPanX = cPanX;
    window.lbAFCropPanY = cPanY;
    function g(id) { return document.getElementById(id); }
    function filtAdj(d) {
        return window.lbBuildImgFilterAdj ? window.lbBuildImgFilterAdj(d) : 'none';
    }
    function readUI() {
        var b = g('af-bright');
        if (!b) return false;
        draft.imgBright = +b.value;
        draft.imgCont = +g('af-cont').value;
        draft.imgSat = +g('af-sat').value;
        draft.imgExposure = +g('af-exp').value;
        draft.imgTint = +g('af-tint').value;
        draft.imgStyle = g('af-style').value;
        draft.filter = filtAdj(draft);
        draft.imgScale = window.lbAFCropScale;
        draft.imgPanX = window.lbAFCropPanX;
        draft.imgPanY = window.lbAFCropPanY;
        draft.visibility = g('af-visibility').value;
        draft.secretStyle = g('af-secret-style').value;
        draft.gender = g('af-gender').value;
        var ph = g('af-placeholder-name');
        draft.placeholderName = ph ? ph.value : '';
        var dm = g('af-draw-mask');
        if (dm) draft.drawMask = dm.value;
        var dms = g('af-draw-scale');
        if (dms) draft.drawMaskScale = +dms.value;
        if (draft.drawMaskXPct === undefined) draft.drawMaskXPct = 50;
        if (draft.drawMaskYPct === undefined) draft.drawMaskYPct = 50;
        var paperSel = g('af-paper-picker');
        if (paperSel && paperSel.value) draft.paper = paperSel.value;
        var fontEl = g('af-font');
        if (fontEl) {
            let resolved = lbResolveFontPickerValue(fontEl.value, store);
            draft.font = resolved.font;
            draft.documentLanguage = resolved.documentLanguage;
        }
        draft.nameSize = parseInt(g('af-size').value, 10) || 45;
        draft.nameBold = g('af-bold').checked;
        draft.nameItalic = g('af-italic').checked;
        draft.nameUnderline = g('af-underline').checked;
        draft.nameColor = g('af-color').value;
        draft.name = g('af-name').value;
        var att = g('af-attach');
        if (att && att.value && window.lbParseAttachSelect && window.lbApplyParsedAttach && window.lbAFEditorThemeId) {
            var parsed = window.lbParseAttachSelect(att.value, window.lbAFEditorThemeId, store);
            window.lbApplyParsedAttach(draft, parsed, window.lbAFEditorThemeId, store);
        }
        var sz = window.lbActorFileLayoutSize(draft.layoutMode || 'classic');
        draft.w = sz.w;
        draft.h = sz.h;
        return true;
    }
    function syncCropUI() {
        var b = +g('af-bright').value, c = +g('af-cont').value, s = +g('af-sat').value;
        var ex = +g('af-exp').value, t = +g('af-tint').value, st = g('af-style').value;
        var bv = g('af-bright-val'); if (bv) bv.textContent = b;
        bv = g('af-cont-val'); if (bv) bv.textContent = c;
        bv = g('af-sat-val'); if (bv) bv.textContent = s;
        bv = g('af-exp-val'); if (bv) bv.textContent = ex;
        bv = g('af-tint-val'); if (bv) bv.textContent = t;
        var dsv = g('af-draw-scale-val');
        var dms = g('af-draw-scale');
        if (dsv && dms) dsv.textContent = dms.value;
        var visEl = g('af-visibility');
        var vis = visEl ? visEl.value : (draft.visibility || 'open');
        var secEl = g('af-secret-style');
        var sec = secEl ? secEl.value : (draft.secretStyle || 'silhouette');
        var img = g('af-crop-img');
        var qm = g('af-crop-qmark');
        var tr = 'translate(calc(-50% + ' + window.lbAFCropPanX + 'px), calc(-50% + ' + window.lbAFCropPanY + 'px)) scale(' + window.lbAFCropScale + ')';
        var showSecret = (vis === 'photo-hidden' || vis === 'full-hidden');
        if (showSecret && sec === 'question') {
            if (img) img.style.display = 'none';
            if (qm) qm.style.display = '';
        } else if (img) {
            img.style.display = '';
            if (qm) qm.style.display = 'none';
            var src = draft.realImg || draft.img || '';
            var f = filtAdj({ imgBright: b, imgCont: c, imgSat: s, imgExposure: ex, imgTint: t, imgStyle: st });
            if (showSecret && sec === 'custom' && draft.customSilhouette) {
                src = draft.customSilhouette;
                f = 'none';
            } else if (showSecret && sec === 'silhouette') {
                src = '${LB_AF_GENDER_IMG}';
                f = 'grayscale(100%) brightness(0.6) contrast(1.5)';
            }
            img.src = src;
            img.style.filter = f;
            img.style.transform = tr;
        }
    }
    function refreshPreview() {
        if (!readUI()) return;
        syncCropUI();
        var prev = g('af-live-preview');
        if (!prev || !window.lbBuildActorFileFrontHTML) return;
        var sz = window.lbActorFileLayoutSize(draft.layoutMode || 'classic');
        var w = draft.w || sz.w, h = draft.h || sz.h;
        prev.style.width = w + 'px';
        prev.style.height = h + 'px';
        prev.innerHTML = '<div class="lb-af-preview-card" style="width:' + w + 'px;height:' + h + 'px;position:relative;overflow:visible;">'
            + window.lbBuildActorFileFrontHTML(draft, store) + '</div>';
        var dc = g('af-draw-control');
        if (dc) dc.style.display = (draft.layoutMode === 'bulletin') ? '' : 'none';
        if (window.lbAFEditorAttachSetup) {
            var card = prev.querySelector('.lb-af-preview-card');
            if (card) {
                window.lbAFAttachDraft = Object.assign({}, draft, { w: w, h: h });
                window.lbAFEditorAttachSetup(card, window.lbAFAttachDraft);
            }
        }
        if (window.lbAFSyncDrawMaskOverlay) window.lbAFSyncDrawMaskOverlay();
    }
    function onInput() { refreshPreview(); }
    ['af-bright','af-cont','af-sat','af-exp','af-tint','af-style','af-visibility','af-secret-style','af-gender','af-font','af-size','af-color','af-name','af-attach','af-draw-mask','af-draw-scale','af-placeholder-name'].forEach(function(id) {
        var el = g(id);
        if (el) { el.addEventListener('input', onInput); el.addEventListener('change', onInput); }
    });
    ['af-bold','af-italic','af-underline'].forEach(function(id) {
        var el = g(id);
        if (el) el.addEventListener('change', onInput);
    });
    var visEl = g('af-visibility');
    if (visEl) visEl.addEventListener('change', function() {
        var sp = g('af-secret-panel');
        if (sp) sp.style.display = (this.value === 'photo-hidden' || this.value === 'full-hidden') ? '' : 'none';
        var pr = g('af-placeholder-row');
        if (pr) pr.style.display = (this.value === 'name-hidden' || this.value === 'full-hidden') ? '' : 'none';
        draft.visibility = this.value;
        onInput();
        if (window.lbAFEditorDialog && window.lbActorFileEditorSyncRevealBtn) {
            window.lbActorFileEditorSyncRevealBtn(window.lbAFEditorDialog, draft, window.lbAFEditorCtx || {});
        }
    });
    var secEl = g('af-secret-style');
    if (secEl) secEl.addEventListener('change', function() {
        var gr = g('af-gender-row'), cu = g('af-custom-upload');
        if (gr) gr.style.display = (this.value === 'silhouette') ? '' : 'none';
        if (cu) cu.style.display = (this.value === 'custom') ? '' : 'none';
        onInput();
    });
    var upBtn = g('af-upload-secret');
    if (upBtn) upBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!window.lbOpenFilePicker) return;
        window.lbOpenFilePicker({
            type: 'image',
            callback: function(path) {
                if (!path) return;
                draft.customSilhouette = path;
                var lab = g('af-custom-label');
                if (lab) lab.textContent = 'Set';
                refreshPreview();
            }
        });
    });
    document.querySelectorAll('.lb-af-tab').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var mode = btn.getAttribute('data-mode');
            if (!mode || mode === draft.layoutMode) return;
            draft.layoutMode = mode;
            var sz = window.lbActorFileLayoutSize(mode);
            draft.w = sz.w;
            draft.h = sz.h;
            if (mode === 'classic') draft.paper = ${LB_AF_CLASSIC_PAPER};
            else if (draft.paper === 'classic' || String(draft.paper) === '10') draft.paper = 7;
            if (mode === 'fullprint') {
                var colEl = g('af-color');
                if (colEl && (!draft.nameColor || String(draft.nameColor).toLowerCase() === '#111111')) {
                    colEl.value = '#ffffff';
                    draft.nameColor = '#ffffff';
                }
            }
            document.querySelectorAll('.lb-af-tab').forEach(function(t) {
                t.classList.toggle('active', t.getAttribute('data-mode') === mode);
            });
            var dc = g('af-draw-control');
            if (dc) dc.style.display = (mode === 'bulletin') ? '' : 'none';
            refreshPreview();
        });
    });
    window.lbAFEditorSyncCrop = function() { syncCropUI(); refreshPreview(); };
    window.lbAFEditorRefresh = refreshPreview;
    setTimeout(refreshPreview, 30);
    setTimeout(refreshPreview, 150);
})();`;
}

function lbOpenCreateDocumentHub(docOpts, themeColor, themeColorRgb, onPick, hubOpts) {
    hubOpts = hubOpts || {};
    let liveTheme = lbGetLiveBoardThemeColors(themeColor, themeColorRgb);
    themeColor = liveTheme.accent;
    themeColorRgb = liveTheme.rgb;
    lbEnsureCreateBoardFonts();
    lbEnsureOverlayCSS();
    $('#lb-cd-overlay').remove();
    let radius = 172;
    let count = docOpts.length;
    const PRINT_IMAGE_MODES = [
        { id: 'original', icon: 'fa-file-image', tip: 'Original (No Paper)' },
        { id: 'printed', icon: 'fa-scroll', tip: 'Printed on Paper' },
        { id: 'fullprint', icon: 'fa-expand', tip: 'Fullprint' }
    ];
    const L2_DIST = 108;
    const L2_BP_HUB_OFFSET_X = 0;
    const L2_BP_DIST = 118;
    const ARC_SPAN = Math.PI * 0.82;
    let boardHoverColor = liveTheme.hover;
    let nodes = docOpts.map((o, i) => {
        let angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        let x = Math.round(Math.cos(angle) * radius);
        let y = Math.round(Math.sin(angle) * radius);
        return `<button type="button" class="lb-cd-node lb-cd-node--${o.id}" data-id="${o.id}" data-tip="${lbRadialTipText(o)}" title="${lbRadialTipText(o)}" style="--lb-x:${x}px;--lb-y:${y}px;--lb-i:${i};"><span class="lb-cd-node-glow"></span><span class="lb-cd-node-icon"><i class="fas ${o.icon}"></i></span></button>`;
    }).join('');
    let ov = $(`
    <div id="lb-cd-overlay" class="lb-cd-overlay" style="--lb-accent:${themeColor};--lb-accent-rgb:${themeColorRgb};--board-hover-color:${boardHoverColor};--board-primary-color:${themeColor};--board-primary-rgb:${themeColorRgb};">
        <div class="lb-cd-backdrop"></div>
        <div class="lb-cd-scene">
            <div class="lb-cd-orbit-ring"></div>
            <div class="lb-cd-orbit-ring lb-cd-orbit-ring-2"></div>
            <div class="lb-cd-hub"><div class="lb-radial-eye-wrap" id="lb-cd-eye-wrap">${lbRadialEyeHTML()}</div></div>
            <div class="lb-cd-orbit" id="lb-cd-orbit">${nodes}</div>
        </div>
    </div>`);
    $('body').append(ov);
    let radialUi = lbInitRadialHubInteraction(ov, { sceneSel: '.lb-cd-scene', accentRgb: themeColorRgb, chainMode: true });
    let closing = false;
    let chainButtons = [];
    let fanChildPositions = (parentPx, parentPy, childCount, dist) => {
        let outward = Math.atan2(parentPy, parentPx);
        let start = outward - ARC_SPAN / 2;
        let positions = [];
        for (let j = 0; j < childCount; j++) {
            let t = childCount === 1 ? 0.5 : j / (childCount - 1);
            let a = start + t * ARC_SPAN;
            positions.push({ px: Math.round(parentPx + Math.cos(a) * dist), py: Math.round(parentPy + Math.sin(a) * dist), angle: a });
        }
        return positions;
    };
    let rebuildRadialChain = () => {
        let nodesEl = chainButtons.filter((el) => el && document.body.contains(el));
        let built = lbRadialBuildHoverOnlyChain(nodesEl);
        radialUi.setChain(built.chainList, built.segments);
        if (built.chainList[0]) radialUi.lockDirectionTo(built.chainList[0]);
        radialUi.refreshLasers();
    };
    let clearPrintImageChildren = () => {
        ov.find('.lb-cd-print-mode-node, .lb-cd-blueprint-node').remove();
        chainButtons = [];
        ov.find('.lb-cd-node').removeClass('lb-cd-selected lb-cf-dimmed');
        ov.find('#lb-cd-eye-wrap').removeClass('lb-radial-eye-hidden');
        radialUi.setChain([], []);
        radialUi.unlockDirection();
    };
    let dismiss = (runDismissCb) => {
        if (closing) return;
        closing = true;
        radialUi.destroy();
        ov.addClass('lb-cd-closing');
        setTimeout(() => {
            ov.remove();
            if (runDismissCb && hubOpts.onDismiss) hubOpts.onDismiss();
        }, 280);
    };
    let spawnPrintImageModes = (printBtn) => {
        clearPrintImageChildren();
        ov.find('.lb-cd-node').not(printBtn).addClass('lb-cf-dimmed');
        printBtn.addClass('lb-cd-selected');
        let px = parseFloat(printBtn.css('--lb-x')) || parseFloat(printBtn[0].style.getPropertyValue('--lb-x')) || 0;
        let py = parseFloat(printBtn.css('--lb-y')) || parseFloat(printBtn[0].style.getPropertyValue('--lb-y')) || 0;
        if (!px && printBtn[0]) {
            let m = (printBtn.attr('style') || '').match(/--lb-x:\s*(-?\d+)px/);
            if (m) px = parseInt(m[1], 10);
            m = (printBtn.attr('style') || '').match(/--lb-y:\s*(-?\d+)px/);
            if (m) py = parseInt(m[1], 10);
        }
        chainButtons = [printBtn[0]];
        let positions = fanChildPositions(px, py, PRINT_IMAGE_MODES.length, L2_DIST);
        PRINT_IMAGE_MODES.forEach((mode, j) => {
            let pos = positions[j];
            let node = $(`<button type="button" class="lb-cd-node lb-cd-print-mode-node lb-cf-sub-node" data-print-mode="${mode.id}" data-tip="${lbRadialTipText(mode)}" style="--lb-x:${pos.px}px;--lb-y:${pos.py}px;--lb-j:${j};"><span class="lb-cd-node-glow"></span><span class="lb-cd-node-icon"><i class="fas ${mode.icon}"></i></span></button>`);
            node.on('click', function(e) {
                e.stopPropagation();
                ov.addClass('lb-cd-upload-suspended');
                radialUi.suspend();
                if (hubOpts.onPrintImage) hubOpts.onPrintImage(mode.id, ov[0]);
            });
            ov.find('#lb-cd-orbit').append(node);
            chainButtons.push(node[0]);
        });
        rebuildRadialChain();
    };
    let spawnBlueprintPicker = (parentBtn) => {
        clearPrintImageChildren();
        ov.find('.lb-cd-blueprint-node').remove();
        ov.find('.lb-cd-node').not(parentBtn).addClass('lb-cf-dimmed');
        parentBtn.addClass('lb-cd-selected');
        let px = parseFloat(parentBtn.css('--lb-x')) || 0;
        let py = parseFloat(parentBtn.css('--lb-y')) || 0;
        if (!px && parentBtn[0]) {
            let m = (parentBtn.attr('style') || '').match(/--lb-x:\s*(-?\d+)px/);
            if (m) px = parseInt(m[1], 10);
            m = (parentBtn.attr('style') || '').match(/--lb-y:\s*(-?\d+)px/);
            if (m) py = parseInt(m[1], 10);
        }
        let pickerItems = [{ id: '__blank__', name: 'Blank Sheet' }];
        let positions = fanChildPositions(px, py, pickerItems.length, L2_BP_DIST);
        chainButtons = [parentBtn[0]];
        pickerItems.forEach(function(bp, j) {
            let pos = positions[j];
            let tip = (bp.name || 'Blueprint').replace(/"/g, '&quot;');
            let initials = 'BS';
            let node = $(`<button type="button" class="lb-cd-node lb-cd-blueprint-node lb-cf-sub-node" data-bp-id="${bp.id}" data-tip="${tip}" style="--lb-x:${pos.px}px;--lb-y:${pos.py}px;--lb-j:${j};"><span class="lb-cd-node-glow"></span><span class="lb-cd-node-icon lb-cd-node-initials">${initials}</span></button>`);
            node.on('click', function(e) {
                e.stopPropagation();
                dismiss(false);
                if (onPick) onPick('use-blueprint', null);
            });
            ov.find('#lb-cd-orbit').append(node);
            chainButtons.push(node[0]);
        });
        rebuildRadialChain();
    };
    ov.on('click', function(e) {
        if ($(e.target).closest('.lb-cd-scene').length) return;
        dismiss(true);
    });
    let cdTierDepth = 0;
    let cdHandleRmbBack = () => {
        let hasTier2 = ov.find('.lb-cf-sub-node').length > 0;
        if (hasTier2) {
            clearPrintImageChildren();
            cdTierDepth = 0;
            return true;
        }
        let hasTier1Sel = ov.find('.lb-cd-selected').length > 0;
        if (hasTier1Sel || cdTierDepth > 0) {
            clearPrintImageChildren();
            cdTierDepth = 0;
            return true;
        }
        dismiss(true);
        return true;
    };
    ov.on('contextmenu', function(e) {
        e.preventDefault();
        cdHandleRmbBack();
    });
    ov.on('contextmenu', '.lb-cd-print-mode-node, .lb-cd-blueprint-node', function(e) {
        e.preventDefault();
        e.stopPropagation();
        cdHandleRmbBack();
    });
    ov.find('.lb-cd-node').on('click', function(e) {
        if ($(this).hasClass('lb-cd-print-mode-node') || $(this).hasClass('lb-cd-blueprint-node')) return;
        let id = $(this).data('id');
        if (id === 'print-image') {
            e.stopPropagation();
            cdTierDepth = 1;
            spawnPrintImageModes($(this));
            return;
        }
        if (id === 'use-blueprint') {
            e.stopPropagation();
            dismiss(false);
            if (onPick) onPick('use-blueprint', null);
            return;
        }
        dismiss(false);
        if (onPick) onPick(id);
    });
    return ov;
}

// Animated upload progress — waits for real upload completion before hitting 100%.
async function lbOverlayPrintProgress(ov, onComplete) {
    let prog = ov.find('.lb-ov-progress'), bar = ov.find('.lb-ov-progress-bar');
    prog.css('display', 'flex'); bar.css({ width: '0%' });
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

function lbCreateThemeBoard(themeObj, boardPresetId, defaultName) {
    let presetLabel = defaultName || themeObj.name;
    let name = (presetLabel || themeObj.name || 'New Board').trim();
    let emptyStore = { items: [], threads: [], drawings: [], permissions: null, boardName: name, theme: themeObj.id, classic: false, boardPresetId: boardPresetId || null };
    lbClearClassicBoardFields(emptyStore);
    return lbSaveHiddenSnap(name, themeObj.id, emptyStore).then(function(entry) {
        emptyStore.savedSnapId = entry.id;
        return lbActivateBoard(themeObj.id, emptyStore, name, { savedSnapId: entry.id });
    });
}

async function lbOpenCreateMenu() {
    let cfg = await lbReadConfig();
    lbEnsureCreateBoardFonts();
    lbOpenOverlay({
        id: 'lb-create-overlay',
        title: 'CREATE BOARD',
        width: 1600,
        panelClass: 'lb-ov-panel-create',
        bodyStyle: 'padding:12px 35px 22px 35px; overflow:visible;',
        bodyHtml: `<div class="lb-create-shell">${lbCreateBoardNavHTML()}</div>`,
        onRender: (ov, close) => lbCreateBoardBindEvents(ov, close, cfg)
    });
}

// #15 Custom board upload overlay — glass UI; minimizes create menu while open.
// The preview is interactive: drag to position, mouse wheel to zoom. The chosen
// fit is stored as { zoom, x, y } and applied 1:1 to the board background layer.
function lbCustomBoardFitBgSize(fit) {
    let zoom = fit && fit.zoom > 1 ? fit.zoom : 1;
    return zoom > 1 ? (zoom * 100).toFixed(1) + '% auto' : 'cover';
}
function lbCustomBoardFitBgPos(fit) {
    let x = fit && fit.x != null ? fit.x : 50;
    let y = fit && fit.y != null ? fit.y : 50;
    return x.toFixed(1) + '% ' + y.toFixed(1) + '%';
}
window.lbCustomBoardFitBgSize = lbCustomBoardFitBgSize;
window.lbCustomBoardFitBgPos = lbCustomBoardFitBgPos;
function lbOpenCustomBoardUploadOverlay(opts) {
    opts = opts || {};
    let existing = opts.existing;
    let parentOv = opts.parentOv;
    let onDone = opts.onDone;
    let picked = { bg: existing ? null : '', name: existing ? existing.name : 'Custom Board', bgFit: existing && existing.bgFit ? Object.assign({ zoom: 1, x: 50, y: 50 }, existing.bgFit) : { zoom: 1, x: 50, y: 50 } };
    let curBg = existing ? (existing.bg || '') : '';
    let safeName = (picked.name || 'Custom Board').replace(/"/g, '&quot;');
    if (parentOv && parentOv.length) parentOv.addClass('lb-create-overlay-suspended');
    $('#lb-custom-board-upload').remove();
    let slotHTML = (which, label, val) => `
        <div class="lb-custom-board-slot" data-which="${which}">
            <label class="theme-heading lb-custom-board-slot-label">${label}</label>
            <div class="lb-custom-board-slot-prev" id="lb-cbu-${which}-prev" style="background:${val ? `url('${val}') ${lbCustomBoardFitBgPos(picked.bgFit)}/${lbCustomBoardFitBgSize(picked.bgFit)} no-repeat` : 'rgba(0,0,0,0.35)'};cursor:${val ? 'grab' : 'default'};">${val ? '' : '<span>No image</span>'}</div>
            <small class="theme-heading lb-custom-board-fit-hint" id="lb-cbu-fit-hint" style="${val ? '' : 'display:none;'}opacity:0.7;font-size:10px;">Drag to position · Scroll to zoom</small>
            <div class="lb-custom-board-slot-actions">
                <button type="button" class="lb-ed-btn lb-cbu-pick" data-which="${which}"><i class="fas fa-folder-open"></i> Upload</button>
                <button type="button" class="lb-ed-btn lb-cbu-clear" data-which="${which}" title="Remove"><i class="fas fa-times"></i></button>
            </div>
        </div>`;
    let upload = $(`
        <div class="lb-custom-board-upload-overlay" id="lb-custom-board-upload">
            <div class="lb-custom-board-upload-backdrop"></div>
            <div class="lb-custom-board-upload-panel lb-glass-surface">
                <div class="lb-custom-board-upload-head">
                    <span class="lb-custom-board-upload-title">${existing ? 'Edit Custom Board' : 'Upload Custom Board'}</span>
                    <button type="button" class="lb-custom-board-upload-close" title="Cancel"><i class="fas fa-times"></i></button>
                </div>
                <div class="lb-custom-board-upload-body">
                    <label class="theme-heading">Board Name</label>
                    <input type="text" id="lb-cbu-name" class="lb-custom-board-name-input" value="${safeName}" autocomplete="off">
                    <div class="lb-custom-board-slots">
                        ${slotHTML('bg', 'Board Graphic', curBg)}
                    </div>
                    <p class="theme-heading lb-custom-board-hint">A single fullscreen graphic for your custom board.</p>
                </div>
                <div class="lb-custom-board-upload-foot">
                    <button type="button" id="lb-cbu-done" class="lb-custom-board-fertig-btn"><i class="fas fa-check"></i> Done</button>
                </div>
            </div>
        </div>`);
    $('body').append(upload);
    let closeUpload = () => {
        upload.fadeOut(160, () => upload.remove());
        if (parentOv && parentOv.length) parentOv.removeClass('lb-create-overlay-suspended lb-create-overlay-picker-open');
    };
    upload.find('.lb-custom-board-upload-close, .lb-custom-board-upload-backdrop').on('click', closeUpload);
    let suspendForFilePicker = () => {
        upload.addClass('lb-custom-board-upload-suspended');
        if (parentOv && parentOv.length) parentOv.addClass('lb-create-overlay-picker-open');
    };
    let restoreFromFilePicker = () => {
        upload.removeClass('lb-custom-board-upload-suspended');
        if (parentOv && parentOv.length) parentOv.removeClass('lb-create-overlay-picker-open');
    };
    let prevEl = upload.find('#lb-cbu-bg-prev');
    let applyFitToPreview = () => {
        let src = picked.bg !== null && picked.bg !== '' ? picked.bg : curBg;
        if (!src) return;
        prevEl.css({ background: `url('${src}') ${lbCustomBoardFitBgPos(picked.bgFit)}/${lbCustomBoardFitBgSize(picked.bgFit)} no-repeat`, cursor: 'grab' }).empty();
        upload.find('#lb-cbu-fit-hint').show();
    };
    // Drag to position — background-position percentages, clamped to 0..100.
    let dragState = null;
    prevEl.on('pointerdown', function(e) {
        let src = picked.bg !== null && picked.bg !== '' ? picked.bg : curBg;
        if (!src || e.button !== 0) return;
        e.preventDefault();
        dragState = { sx: e.clientX, sy: e.clientY, x: picked.bgFit.x, y: picked.bgFit.y };
        prevEl.css('cursor', 'grabbing');
        try { this.setPointerCapture(e.pointerId); } catch (err) {}
    });
    prevEl.on('pointermove', function(e) {
        if (!dragState) return;
        let r = this.getBoundingClientRect();
        let z = Math.max(1, picked.bgFit.zoom || 1);
        // Dragging moves the visible window over the image; sensitivity grows with zoom headroom.
        let fx = (e.clientX - dragState.sx) / Math.max(1, r.width) * 100;
        let fy = (e.clientY - dragState.sy) / Math.max(1, r.height) * 100;
        let sens = 1 + 1 / Math.max(0.25, z - 0.75);
        picked.bgFit.x = Math.max(0, Math.min(100, dragState.x - fx * sens));
        picked.bgFit.y = Math.max(0, Math.min(100, dragState.y - fy * sens));
        applyFitToPreview();
    });
    prevEl.on('pointerup pointercancel pointerleave', function() {
        if (!dragState) return;
        dragState = null;
        prevEl.css('cursor', 'grab');
    });
    // Wheel to zoom (1× = cover fit, up to 4×).
    prevEl.on('wheel', function(e) {
        let src = picked.bg !== null && picked.bg !== '' ? picked.bg : curBg;
        if (!src) return;
        e.preventDefault();
        let dy = e.originalEvent ? e.originalEvent.deltaY : e.deltaY;
        let z = Math.max(1, picked.bgFit.zoom || 1);
        picked.bgFit.zoom = Math.max(1, Math.min(4, z * Math.exp(-dy * 0.0012)));
        applyFitToPreview();
    });
    upload.find('.lb-cbu-pick').on('click', function() {
        let which = this.getAttribute('data-which');
        suspendForFilePicker();
        try {
            lbOpenFilePicker({
                type: 'image',
                jukeboxUpload: true,
                onShellMinimize: suspendForFilePicker,
                onShellRestore: restoreFromFilePicker,
                anchorEl: upload.find('.lb-custom-board-upload-panel')[0],
                callback: (path) => {
                    restoreFromFilePicker();
                    if (!path) return;
                    picked[which] = path;
                    picked.bgFit = { zoom: 1, x: 50, y: 50 };
                    applyFitToPreview();
                }
            });
        } catch (e) {
            // Never leave the UI stuck in the hidden "picker open" state.
            restoreFromFilePicker();
            console.error('Loreboard | custom board file picker failed', e);
            ui.notifications.error('The file browser could not be opened.');
        }
    });
    upload.find('.lb-cbu-clear').on('click', function() {
        let which = this.getAttribute('data-which');
        picked[which] = '';
        picked.bgFit = { zoom: 1, x: 50, y: 50 };
        upload.find('#lb-cbu-' + which + '-prev').css({ background: 'rgba(0,0,0,0.35)', cursor: 'default' }).html('<span>No image</span>');
        upload.find('#lb-cbu-fit-hint').hide();
    });
    upload.find('#lb-cbu-done').on('click', async () => {
        picked.name = (upload.find('#lb-cbu-name').val() || 'Custom Board').trim();
        if (!existing && !picked.bg) {
            ui.notifications.warn('Please choose a board graphic first.');
            return;
        }
        closeUpload();
        if (onDone) {
            try {
                await onDone(picked);
            } catch (e) {
                console.error('Loreboard | saving custom board failed', e);
                ui.notifications.error('The custom board could not be saved.');
            }
        }
    });
}

function lbOpenCustomBoardDialog(existing, onDone, parentOv) {
    lbOpenCustomBoardUploadOverlay({ existing, onDone, parentOv: parentOv || $('#lb-create-overlay') });
}

async function lbOpenLoadMenu() {
    let boards = await lbReadSavedBoards();
    lbOpenOverlay({
        id: 'lb-load-overlay',
        title: 'OPEN A SAVED BOARD',
        width: 820,
        bodyStyle: 'max-height:74vh;',
        bodyHtml: `<div id="lb-open-grid" class="lb-tile-grid" style="align-content:start;"></div>`,
        onRender: (ov, close) => {
            let grid = ov.find('#lb-open-grid');
            if (!boards.length) { grid.html(`<p style="grid-column:1/-1; text-align:center; color:#888; font-family:'Courier New', monospace; margin-top:40px;">No saved boards yet. Create one first.</p>`); return; }
            boards.forEach(b => {
                let card = $(`<div class="lb-open-card" style="cursor:pointer; border-radius:10px; overflow:hidden; border:2px solid rgba(255,255,255,0.08); background:#111; transition:transform 0.2s, border-color 0.2s; position:relative;">
                    <div class="lb-open-thumb" style="aspect-ratio:16/9; background:#0a0a0c;"></div>
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:#1c1c22; color:#eee; font-family:'Courier New', monospace; font-size:13px;">
                        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${b.name}</span>
                        <i class="fas fa-trash lb-open-del" title="Delete" style="color:#d9534f; cursor:pointer; margin-left:8px; flex-shrink:0;"></i>
                    </div>
                </div>`);
                card.find('.lb-open-thumb').append(lbBuildThumb(b.store, b.theme, 360));
                card.find('.lb-open-del').click(async function(e) {
                    e.stopPropagation();
                    let ok = await lbConfirmDeleteBoard(b.name);
                    if (!ok) return;
                    if (b.legacyJournal && b.journal) {
                        let j = game.journal.get(b.journal.id);
                        if (j) await j.delete();
                    } else if (b.id) {
                        await lbDeleteHiddenSnap(b.id);
                    }
                    close(); lbOpenLoadMenu();
                });
                card.click(async function() {
                    close();
                    let loadedStore = foundry.utils.deepClone(b.store || {});
                    lbActivateBoard(b.theme, loadedStore, b.name, { savedSnapId: b.id });
                });
                card.hover(function(){ $(this).css({transform:'translateY(-3px)', borderColor:'#fff'}); }, function(){ $(this).css({transform:'none', borderColor:'rgba(255,255,255,0.08)'}); });
                grid.append(card);
            });
        }
    });
}