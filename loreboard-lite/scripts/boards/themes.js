'use strict';
// LOREBOARD - Themes, mood lighting and board creation

const LB_THEMES = [
    // #2 Order: Row1 Cosy Tavern + Galactic, Row2 Shadowpunk + Slums, then the rest (2-col grid).
    { id: "cosytavern", name: "The Cozy Tavern", bg: "modules/loreboard-lite/assets/graphics/CosyTavern.webp", fg: "", files: "", accent: "#e0822e" },
    // #1 Galactic: GalaxyBack stays fixed fullscreen (never zoom/pan); GalaxyFront is the zoom/pan board surface → parallax.
    { id: "galactic", name: "Galactic", bg: LB_GALAXY_BACK, fg: "modules/loreboard-lite/assets/graphics/GalaxyFront.webp", files: "", accent: "#4ea8ff", parallax: true },
    { id: "shadowpunk", name: "Shadowpunk", bg: "modules/loreboard-lite/assets/graphics/Shadowpunk.webp", fg: "", files: "modules/loreboard-lite/assets/graphics/ShadowpunkFile.webp", accent: "#ff00ff" },
    { id: "slums", name: "Slums", bg: "modules/loreboard-lite/assets/graphics/SlumsBack.webp", fg: "", files: "", accent: "#8a9a5b" },
    { id: "noir", name: "1920 Noir", bg: "modules/loreboard-lite/assets/graphics/Noir.webp", fg: "modules/loreboard-lite/assets/graphics/NoirFront.webp", files: "modules/loreboard-lite/assets/graphics/BoardNoirFiles.webp", accent: "#d4af37" },
    { id: "modern", name: "Modern Office", bg: "modules/loreboard-lite/assets/graphics/ModernOfficeBack.webp", fg: "modules/loreboard-lite/assets/graphics/ModernOfficeFront.webp", files: "modules/loreboard-lite/assets/graphics/ModernOfficeFile.webp", accent: "#4a90d9" }
];

// ---------------------------------------------------------------------------
// THEME MOOD LIGHTING — JavaScript-driven ambient illumination per board theme
// Procedural radial / conic lights with real-time flicker, pulse & colour wash.
// ---------------------------------------------------------------------------
const LB_THEME_MOOD_PROFILES = {
    noir: {
        blend: 'soft-light',
        ambient: {
            gradient: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(212,175,55,0.07) 0%, transparent 55%), radial-gradient(ellipse 50% 80% at 15% 50%, rgba(70,90,140,0.14) 0%, transparent 50%), linear-gradient(180deg, rgba(8,6,4,0.35) 0%, rgba(20,14,8,0.12) 100%)'
        },
        lights: [
            { xPct: 78, yPct: 16, radius: 340, color: '#ffc860', opacity: 0.28, lum: 105, sat: 110, sha: 55, anim: 'flicker', animSpeed: 0.9, bulbIcon: 'fas fa-lightbulb' },
            { xPct: 22, yPct: 38, radius: 420, color: '#506890', opacity: 0.14, lum: 75, sat: 80, sha: 20, anim: 'none' },
            { xPct: 55, yPct: 72, radius: 380, color: '#d4af37', opacity: 0.1, lum: 90, anim: 'pulse', animSpeed: 5.5 },
            { xPct: 88, yPct: 55, radius: 180, color: '#ff4060', opacity: 0.06, lum: 120, sat: 140, anim: 'flicker', animSpeed: 1.4 }
        ]
    },
    cosytavern: {
        blend: 'soft-light',
        ambient: {
            gradient: 'radial-gradient(ellipse 70% 55% at 18% 88%, rgba(224,130,46,0.18) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 75% 30%, rgba(255,200,120,0.08) 0%, transparent 45%), linear-gradient(180deg, rgba(40,22,8,0.25) 0%, rgba(60,35,12,0.08) 100%)'
        },
        lights: [
            { xPct: 12, yPct: 82, radius: 460, color: '#e0822e', opacity: 0.32, lum: 110, sat: 115, sha: 45, anim: 'pulse', animSpeed: 3.2 },
            { xPct: 68, yPct: 42, radius: 220, color: '#ffd080', opacity: 0.22, lum: 115, sha: 35, anim: 'flicker', animSpeed: 0.65 },
            { xPct: 42, yPct: 58, radius: 300, color: '#ffb040', opacity: 0.12, lum: 100, anim: 'irregular', animSpeed: 2.1 },
            { xPct: 85, yPct: 78, radius: 160, color: '#ff9040', opacity: 0.08, lum: 95, anim: 'flicker', animSpeed: 0.5 }
        ]
    },
    galactic: {
        blend: 'screen',
        ambient: {
            gradient: 'radial-gradient(ellipse 90% 70% at 50% 20%, rgba(78,168,255,0.1) 0%, transparent 55%), radial-gradient(ellipse 50% 60% at 85% 75%, rgba(120,60,255,0.08) 0%, transparent 50%), linear-gradient(180deg, rgba(4,8,24,0.4) 0%, rgba(8,12,32,0.15) 100%)'
        },
        lights: [
            { xPct: 50, yPct: 12, radius: 500, color: '#4ea8ff', opacity: 0.18, lum: 115, sat: 130, sha: 60, anim: 'pulse', animSpeed: 4.5 },
            { xPct: 82, yPct: 68, radius: 360, color: '#8844ff', opacity: 0.14, lum: 105, sat: 120, sha: 50, anim: 'pulse', animSpeed: 6.2 },
            { xPct: 18, yPct: 35, radius: 280, color: '#00d4ff', opacity: 0.1, lum: 120, sha: 40, anim: 'pulse', animSpeed: 3.8 },
            { xPct: 65, yPct: 22, radius: 140, color: '#ffffff', opacity: 0.08, lum: 130, anim: 'irregular', animSpeed: 1.8 }
        ]
    },
    shadowpunk: {
        blend: 'screen',
        ambient: {
            gradient: 'radial-gradient(ellipse 55% 80% at 8% 50%, rgba(255,0,255,0.1) 0%, transparent 45%), radial-gradient(ellipse 50% 70% at 92% 45%, rgba(0,255,255,0.08) 0%, transparent 45%), linear-gradient(180deg, rgba(12,4,18,0.45) 0%, rgba(6,2,10,0.2) 100%)'
        },
        lights: [
            { xPct: 8, yPct: 48, radius: 400, color: '#ff00ff', opacity: 0.2, lum: 120, sat: 150, sha: 65, anim: 'irregular', animSpeed: 1.6 },
            { xPct: 92, yPct: 42, radius: 380, color: '#00ffff', opacity: 0.16, lum: 115, sat: 140, sha: 55, anim: 'flicker', animSpeed: 1.1 },
            { xPct: 50, yPct: 8, radius: 260, color: '#ff44aa', opacity: 0.08, lum: 110, anim: 'pulse', animSpeed: 2.8 },
            { xPct: 35, yPct: 85, radius: 200, color: '#6600cc', opacity: 0.1, lum: 90, sat: 120, anim: 'irregular', animSpeed: 2.4 }
        ]
    },
    slums: {
        blend: 'soft-light',
        ambient: {
            gradient: 'radial-gradient(ellipse 60% 40% at 50% 8%, rgba(200,180,64,0.1) 0%, transparent 50%), radial-gradient(ellipse 80% 60% at 50% 100%, rgba(40,50,30,0.2) 0%, transparent 55%), linear-gradient(180deg, rgba(18,20,12,0.35) 0%, rgba(30,32,20,0.15) 100%)'
        },
        lights: [
            { xPct: 50, yPct: 10, radius: 320, color: '#c8b040', opacity: 0.22, lum: 95, sat: 90, sha: 30, anim: 'flicker', animSpeed: 0.75 },
            { xPct: 15, yPct: 65, radius: 280, color: '#8a9a5b', opacity: 0.12, lum: 80, sat: 85, anim: 'irregular', animSpeed: 1.9 },
            { xPct: 88, yPct: 28, radius: 180, color: '#cc3333', opacity: 0.1, lum: 110, sat: 130, sha: 25, anim: 'pulse', animSpeed: 4.0 },
            { xPct: 72, yPct: 78, radius: 240, color: '#607040', opacity: 0.08, lum: 70, anim: 'none' }
        ]
    },
    modern: {
        blend: 'soft-light',
        ambient: {
            gradient: 'radial-gradient(ellipse 70% 50% at 20% 30%, rgba(200,220,255,0.12) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(74,144,217,0.08) 0%, transparent 45%), linear-gradient(180deg, rgba(240,245,252,0.06) 0%, rgba(200,210,230,0.04) 100%)'
        },
        lights: [
            { xPct: 18, yPct: 28, radius: 480, color: '#e8f0ff', opacity: 0.16, lum: 108, sat: 90, sha: 15, anim: 'none' },
            { xPct: 72, yPct: 38, radius: 300, color: '#4a90d9', opacity: 0.1, lum: 105, sat: 110, sha: 20, anim: 'pulse', animSpeed: 8.0 },
            { xPct: 50, yPct: 8, radius: 600, color: '#ffffff', opacity: 0.08, lum: 112, anim: 'none' },
            { xPct: 55, yPct: 70, radius: 220, color: '#b0c8e8', opacity: 0.06, lum: 100, anim: 'pulse', animSpeed: 6.5 }
        ]
    }
};

function lbMoodHexToRgb(hex) {
    let m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#ffffff');
    return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : '255, 255, 255';
}

/** Apply radial/conic gradient styling to a mood-light core element (shared with ambient-light renderer). */
function lbApplyMoodLightCoreStyle(coreEl, def) {
    if (!coreEl || !def) return;
    let r = def.radius || 300;
    let c = def.color || '#ffaa00';
    let op = def.opacity != null ? def.opacity : 0.5;
    let angle = def.angle != null ? def.angle : 360;
    let rotation = def.rotation || 0;
    let sat = def.sat != null ? def.sat : 100;
    let lum = def.lum != null ? def.lum : 100;
    let cont = def.cont != null ? def.cont : 100;
    let sha = def.sha != null ? def.sha : 0;
    let rgb = lbMoodHexToRgb(c);
    let bgStyle;
    if (angle >= 360) {
        bgStyle = `radial-gradient(circle, rgba(${rgb}, ${op}) 0%, rgba(${rgb}, 0) 72%)`;
    } else {
        let half = angle / 2;
        let start = rotation - half;
        bgStyle = `conic-gradient(from ${start}deg, rgba(${rgb}, 0) 0deg, rgba(${rgb}, ${op}) 5deg, rgba(${rgb}, ${op}) ${angle - 5}deg, rgba(${rgb}, 0) ${angle}deg, transparent ${angle}deg)`;
    }
    coreEl.style.width = '100%';
    coreEl.style.height = '100%';
    coreEl.style.borderRadius = '50%';
    coreEl.style.background = bgStyle;
    coreEl.style.filter = `saturate(${sat}%) brightness(${lum}%) contrast(${cont}%) drop-shadow(0 0 ${sha}px ${c})`;
    coreEl.style.transformOrigin = 'center center';
    coreEl.dataset.baseOpacity = String(op);
    if (angle < 360) {
        coreEl.style.webkitMaskImage = 'radial-gradient(circle, black 0%, transparent 72%)';
        coreEl.style.maskImage = 'radial-gradient(circle, black 0%, transparent 72%)';
    } else {
        coreEl.style.webkitMaskImage = 'none';
        coreEl.style.maskImage = 'none';
    }
}

function lbStopThemeMoodLighting(rootEl) {
    rootEl = rootEl && rootEl.jquery ? rootEl[0] : rootEl;
    if (!rootEl) rootEl = document.getElementById('lb-app-root');
    if (!rootEl) return;
    let layerEl = rootEl.querySelector('#lb-theme-mood-layer');
    if (layerEl && layerEl._lbMoodAnimFrame) {
        cancelAnimationFrame(layerEl._lbMoodAnimFrame);
        layerEl._lbMoodAnimFrame = null;
    }
}

function lbStartMoodLightAnimation(layerEl, lightDefs) {
    if (!layerEl) return;
    if (layerEl._lbMoodAnimFrame) cancelAnimationFrame(layerEl._lbMoodAnimFrame);
    let animated = (lightDefs || []).some(d => d && d.anim && d.anim !== 'none');
    if (!animated) return;
    let t0 = performance.now();
    function tick(now) {
        layerEl.querySelectorAll('.lb-theme-mood-light').forEach(el => {
            let idx = parseInt(el.dataset.moodIdx, 10);
            let def = lightDefs[idx];
            let core = el.querySelector('.lb-mood-light-core');
            if (!def || !core || !def.anim || def.anim === 'none') return;
            let base = parseFloat(core.dataset.baseOpacity) || def.opacity || 0.5;
            let t = (now - t0) / 1000;
            let speed = def.animSpeed || 1;
            let mod = 1;
            if (def.anim === 'flicker') {
                mod = 0.78 + 0.22 * Math.abs(Math.sin(t * 14 * speed)) * (0.6 + 0.4 * Math.sin(t * 37 * speed));
            } else if (def.anim === 'irregular') {
                mod = 0.65 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.9 * speed) * Math.sin(t * 9.7 * speed + 1.3));
            } else if (def.anim === 'pulse') {
                mod = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin((t / speed) * Math.PI * 2));
            }
            core.style.opacity = String(Math.max(0.02, Math.min(1, base * mod)));
        });
        layerEl._lbMoodAnimFrame = requestAnimationFrame(tick);
    }
    layerEl._lbMoodAnimFrame = requestAnimationFrame(tick);
}

function lbRenderThemeMoodLighting(rootEl, themeId) {
    rootEl = rootEl && rootEl.jquery ? rootEl[0] : rootEl;
    if (!rootEl) rootEl = document.getElementById('lb-app-root');
    if (!rootEl) return;
    lbStopThemeMoodLighting(rootEl);
    let ambEl = rootEl.querySelector('#lb-theme-mood-ambient');
    let layerEl = rootEl.querySelector('#lb-theme-mood-layer');
    if (ambEl) { ambEl.style.display = 'none'; ambEl.style.background = 'transparent'; }
    if (layerEl) { layerEl.innerHTML = ''; layerEl.style.display = 'none'; }
}
window.lbRenderThemeMoodLighting = lbRenderThemeMoodLighting;
window.lbStopThemeMoodLighting = lbStopThemeMoodLighting;

const LB_CREATE_BOARD_CATALOG = [
    {
        id: "classic",
        label: "Classic Board",
        tierHtml: "For BASIC and DELUXE",
        type: "classic",
        boards: [
            {
                id: "corkboard",
                title: "Corkboard",
                image: "modules/loreboard-lite/assets/graphics/classiccorkthumb.webp",
                description: "The most classic pinboard imaginable. Simple wooden frame, heavily used cork, tense atmosphere. This corkboard makes every investigator's heart beat faster. Red threads stretch like spiderwebs between blurry crime scene photos, hastily scribbled notes, and yellowed newspaper clippings. You can literally feel the cold coffee and cigarette smoke in the neon light of the office. This is where large-scale conspiracies are uncovered, cultists are exposed, and serial killers are hunted down.",
                systems: ["Call of Cthulhu (7th Edition)", "Vampire: The Masquerade (V5)", "Monster of the Week", "Delta Green", "Vaesen"]
            },
            {
                id: "whiteboard",
                title: "Whiteboard",
                image: "modules/loreboard-lite/assets/graphics/classicwhiteboardthumb.webp",
                description: "No matter where you are in the world, the whiteboard is the absolute classic among planning tools. Here, individual elements can be moved around even faster than on a corkboard. And the best part: It's magnetic and easy to wipe clean! Grab a blue or red marker (virtually, of course) and draw floor plans, escape routes, or organizational charts of corrupt megacorporations. Sticky notes in bright neon colors cling to the edges, while the big heist is planned in the middle. Clean, modern, and absolutely functional – the control center for real professionals.",
                systems: ["Cyberpunk RED", "Shadowrun (5E / 6E)", "Blades in the Dark", "Savage Worlds (SWADE)", "GURPS"]
            },
            {
                id: "metal-board",
                title: "Rusty Metal Board",
                image: "modules/loreboard-lite/assets/graphics/classicmetalthumb.webp",
                description: "Sometimes it doesn't matter where you are – after all, life often plays against you anyway. This rusty, heavily worn metal board could just as well hang in a dystopian steampunk world as in the cargo hold of a scrapped spaceship at the edge of the galaxy. The only important thing is: It's damn practical and survives even the hardest impact or acid rain. Deep scratches in the metal tell stories of past battles, and documents are attached with heavy industrial magnets or thick duct tape. When the rust peels and the neon tube flickers above it, you know: This is about pure survival.",
                systems: ["Alien RPG", "Fallout: The Roleplaying Game", "Starfinder", "Warhammer 40,000: Wrath & Glory", "Mutant: Year Zero"]
            },
            {
                id: "wooden-board",
                title: "Wooden Board",
                image: "modules/loreboard-lite/assets/graphics/classicwoodthumb.webp",
                description: "Adventurers gather round, the Wooden Board is right in front of you! Browse through the desperate quest requests of common folk, read highly official announcements from the king, snatch up a lucrative bounty poster, or simply declare the end of the world – no party of heroes can pass by this true classic. This is the starting point of your epic journey!",
                systems: ["Dungeons & Dragons (5e)", "Pathfinder (2e)", "The Dark Eye (DSA 5)", "Warhammer Fantasy Roleplay (4e)", "The One Ring"]
            },
            {
                id: "the-board",
                title: "THE Board",
                image: LB_NEUTRAL_BOARD_THUMB,
                description: "This board is the very epitome of neutrality. Black, sleek, unobtrusive, and perfectly organized. It could hang literally anywhere, in any corner of the multiverse. Whether you are plotting a high-fantasy tavern brawl, mapping out a corporate espionage run in Neo-Tokyo, or just trying to keep track of exactly which NPC betrayed your party last session, this dark canvas adapts to your needs without ever stealing the spotlight. Maybe it is a little bit boring, but it is built for true purists who just want clear, concise information without any distracting bells and whistles. You asked for it, you got it. The ultimate blank slate – THE Board!",
                systems: ["Homebrew Systems!", "E.V.E.R.Y.T.H.I.N.G", "Dungeons & Neutrals", "Call of Everyone", "Okay, okay... I'll stop now..."]
            }
        ]
    },
    {
        id: "immersive",
        label: "Immersive Board",
        tierHtml: "Loreboard DELUXE only",
        type: "immersive",
        boards: [
            {
                id: "cozy-tavern",
                title: "The Cozy Tavern",
                themeId: "cosytavern",
                image: "modules/loreboard-lite/assets/graphics/CosyTavernthumb.webp",
                description: "The Sleeping Cat? Was that the name of this dive? It doesn't really matter. All that matters is that you get a warm stew here, a bed to sleep in, something decent to drink, and an oversized bulletin board that tells you exactly what you want to know: Where is the next job? Who is wanted? Who has the worst handwriting, and why on earth does everyone always want us to slay rats in the cellar? Welcome to the tavern you trust, my friends!",
                systems: ["Dungeons & Dragons 5e (dnd5e)", "Pathfinder 2nd Edition (pf2e)", "Warhammer Fantasy Roleplay 4e (wfrp4e)", "The Dark Eye 5 / Das Schwarze Auge (dsa5)", "Dragonbane (dragonbane)"]
            },
            {
                id: "noir-detective",
                title: "Detective's Office",
                themeId: "noir",
                image: "modules/loreboard-lite/assets/graphics/Noirthumb.webp",
                description: "It stinks of old paper and cold cigarette smoke. Welcome to your new office, Detective! Outside, the rain patters against the blind windows; inside, the shadows of the streetlamps twitch. Hastily developed black-and-white photos and notes are pinned to your corkboard, connected by a tangled web of red threads. Here, between the distant wailing of sirens and a glass of bourbon, you piece together the puzzle of madness before the city swallows you alive.",
                systems: ["Call of Cthulhu (7th Edition)", "City of Mist", "Vampire: The Masquerade (V5)", "Gumshoe (e.g., Trail of Cthulhu / Mutant City Blues)", "Delta Green"]
            },
            {
                id: "shadowpunk-hideout",
                title: "The Hideout",
                themeId: "shadowpunk",
                image: "modules/loreboard-lite/assets/graphics/Shadowpunkthumb.webp",
                description: "Somewhere in a massive concrete block, you have established your hideout. This is where you store your (cyber) weapons and plan the next heist or the downfall of a megacorporation on a worn-out whiteboard. A broken neon sign bathes the room in flickering pink and blue, while the hum of your servers drowns out the noise of the drone swarms outside. Digital floor plans and hasty access codes glow on the board. There are no rules here, only the next job.",
                systems: ["Cyberpunk RED", "Shadowrun (5E / 6E)", "The Sprawl", "Blades in the Dark", "Altered Carbon RPG"]
            },
            {
                id: "slums-rundown",
                title: "Rundown Hole",
                themeId: "slums",
                image: "modules/loreboard-lite/assets/graphics/SlumsBackthumb.webp",
                description: "A place so dirty and secluded that no one would ever look for you here. You don't have much, but what you do have is iron determination. The damp wallpaper is torn off, revealing a porous old wall – perfect for pinning your plans, mugshots, and chaotic drawings directly to the bare masonry with rusty nails. The sparse light of a single lightbulb casts restless shadows on your targets. This is the place for those who have nothing left to lose.",
                systems: ["Mörk Borg", "Kult: Divinity Lost", "Mutant: Year Zero", "Hunter: The Reckoning (H5)", "Warhammer Fantasy Roleplay (4e)"]
            },
            {
                id: "modern-office",
                title: "The Office",
                themeId: "modern",
                image: "modules/loreboard-lite/assets/graphics/ModernOfficeBackthumb.webp",
                description: "A tidy office is half the battle! Heavy files line the walls, the scent of fresh espresso is in the air, and blinds filter the daylight. Here, the dignified investigator or analyst finds everything they need: a good lamp, clean paper, and above all, absolute silence. The large board is just waiting to be filled with sterile precision. No chaos, no dust – only razor-sharp analyses and the certainty of always being two steps ahead of the target.",
                systems: ["Night's Black Agents", "Rivers of London", "Vaesen", "Spycraft", "Delta Green"]
            },
            {
                id: "galactic-station",
                title: "The Space Station",
                themeId: "galactic",
                image: LB_GALAXY_THUMB,
                description: "In the digital age, it is important to focus. Just you, a solid metal wall, and your irrepressible will to visualize the essentials. Star maps, pictures of unknown aliens, and risky route plans hang securely fastened here. Through the bulletproof glass windows, you have an excellent view of the orbit, while the rhythmic thumping of the reactor pulses in the background. Whether it's an alien threat or a hyperdrive failure – this is your command center in the cold of space.",
                systems: ["Alien RPG", "Mothership", "The Expanse Roleplaying Game", "Star Trek Adventures", "Coriolis - The Third Horizon"]
            }
        ]
    },
    {
        id: "custom",
        label: "Custom Board",
        tierHtml: 'Loreboard DELUXE + Secret Code (<span class="lb-tier-gold">Patreon Gold Tier</span>)',
        type: "custom",
        boards: [
            {
                id: "custom-placeholder",
                title: "[Placeholder: Custom Board Title]",
                placeholder: true,
                description: "[Placeholder: Description text for the custom board. Here, the user can define their own atmosphere, backgrounds, or materials.]",
                systems: ["[Placeholder System 1]", "[Placeholder System 2]", "[Placeholder System 3]", "[Placeholder System 4]", "[Placeholder System 5]"]
            }
        ]
    }
];

function lbCreateBoardFullImageUrl(url) {
    if (!url) return "";
    return url.replace(/thumb\.webp$/i, ".webp");
}

function lbCreateBoardClassicFromEntry(entry) {
    return { id: entry.id, name: entry.title, bg: lbCreateBoardFullImageUrl(entry.image || ""), fg: lbCreateBoardFullImageUrl(entry.imageFg || "") };
}

function lbCreateBoardPreviewLayersHTML(board, opts) {
    opts = opts || {};
    let actions = board.customBoard ? `<div class="lb-create-custom-actions"><button type="button" class="lb-create-custom-edit" data-cid="${board.id}" title="Edit Background / Foreground"><i class="fas fa-cog"></i></button></div>` : "";
    if (board.placeholder && opts.locked) {
        return `<div class="lb-create-golden-qmark" aria-hidden="true"><span class="lb-create-qmark-char">?</span></div>`;
    }
    if (board.placeholder) {
        return actions + `<div class="lb-create-upload-zone" id="lb-create-upload-zone">
            <div class="lb-create-upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
            <div class="lb-create-upload-label">Upload Background &amp; / or Foreground</div>
            <small class="lb-create-upload-hint">16:9, min. 1920×1080</small>
        </div>`;
    }
    if (board.imageBack && board.imageFg) {
        return actions + `<img class="lb-create-preview-back" src="${board.imageBack}" alt="">
            <img class="lb-create-preview-fg" src="${board.imageFg}" alt="">`;
    }
    if (board.imageFg) {
        return actions + `<img class="lb-create-preview-bg" src="${board.image}" alt="">
            <img class="lb-create-preview-fg" src="${board.imageFg}" alt="">`;
    }
    let src = board.image || board.imageBg || "";
    return actions + (src ? `<img class="lb-create-preview-single" src="${src}" alt="">` : "");
}

function lbCreateBoardCustomLeftHTML(cfg, board) {
    if (!cfg.goldUnlocked) {
        return `
            <div class="lb-create-unlock-panel">
                <p class="lb-create-unlock-promo">Use your personal GOLD Code we sent you in Patreon and unlock the Custom Feature now! Don´t have Gold membership yet? Subscribe now and create your own Boards. Come in Discord and we will help you with planning your own boards, too!</p>
                <input type="text" id="lb-create-gold-code" class="lb-create-gold-code-input" placeholder="Enter your Secret Code" autocomplete="off" spellcheck="false">
                <p id="lb-create-gold-err" class="lb-create-gold-err" style="display:none;"></p>
                <button type="button" id="lb-create-gold-submit" class="lb-create-gold-submit-btn"><i class="fas fa-unlock"></i> Unlock Custom Boards</button>
            </div>`;
    }
    let listItems = (cfg.customBoards || []).map(cb => `
        <li class="lb-create-custom-list-item" data-cid="${cb.id}">
            <span class="lb-create-custom-list-name">${(cb.name || 'Custom Board').replace(/</g, '&lt;')}</span>
            <button type="button" class="lb-create-custom-delete" data-cid="${cb.id}" title="Delete board"><i class="fas fa-times"></i></button>
        </li>`).join('');
    return `
        <h2 class="lb-create-board-title">${(board && board.title) ? board.title.replace(/</g, '&lt;') : 'Custom Board'}</h2>
        <p class="lb-create-board-desc">${board && board.description ? board.description : 'Your own custom board with independently uploaded background and foreground layers.'}</p>
        <button type="button" id="lb-create-upload-btn" class="lb-create-upload-custom-btn"><i class="fas fa-cloud-upload-alt"></i> Upload Custom Board</button>
        <div class="lb-create-custom-list-wrap">
            <h3 class="lb-create-custom-list-head">Upload New Board</h3>
            <ul class="lb-create-custom-list">${listItems || '<li class="lb-create-custom-list-empty">No custom boards yet — upload your first board above.</li>'}</ul>
        </div>`;
}

function lbCreateBoardTriggerUnlockFX(ov, originEl) {
    let shell = ov.find('.lb-create-shell');
    shell.addClass('lb-create-unlock-vibrate');
    setTimeout(() => shell.removeClass('lb-create-unlock-vibrate'), 520);
    let flash = $('<div class="lb-create-gold-flash"></div>');
    $('body').append(flash);
    if (originEl && originEl.getBoundingClientRect) {
        let r = originEl.getBoundingClientRect();
        flash.css({ '--lb-flash-x': ((r.left + r.width / 2) / window.innerWidth * 100) + '%', '--lb-flash-y': ((r.top + r.height / 2) / window.innerHeight * 100) + '%' });
    }
    requestAnimationFrame(() => flash.addClass('lb-create-gold-flash-active'));
    setTimeout(() => flash.remove(), 900);
}

// Lite ships the classic boards only; immersive themes and custom uploads are Deluxe.
function lbAvailableBoardCatalog() {
    if (lbHasFeature('themed-boards')) return LB_CREATE_BOARD_CATALOG;
    return LB_CREATE_BOARD_CATALOG.filter(c => c.id === 'classic');
}

function lbCreateBoardResolveList(categoryId, cfg) {
    let cat = lbAvailableBoardCatalog().find(c => c.id === categoryId);
    if (!cat) return [];
    if (categoryId !== "custom") return cat.boards.slice();
    let userBoards = (cfg.customBoards || []).map(cb => ({
        id: cb.id,
        title: cb.name,
        image: cb.bg || "",
        imageFg: cb.fg || "",
        customBoard: true,
        customData: cb,
        description: "Your own custom board with independently uploaded background and foreground layers.",
        systems: ["Any system or scenario you choose"]
    }));
    if (!cfg.goldUnlocked) return cat.boards.filter(b => b.placeholder);
    return userBoards;
}

function lbCreateBoardNavHTML() {
    let tabs = lbAvailableBoardCatalog().map((cat, i) => `
        <button type="button" class="lb-create-tab${i === 0 ? ' active' : ''}" data-cat="${cat.id}">
            <span class="lb-create-tab-label">${cat.label}</span>
            <small class="lb-create-tab-tier">${cat.tierHtml}</small>
        </button>`).join('');
    return `
        <nav class="lb-create-nav"><div class="lb-create-nav-track">${tabs}</div></nav>
        <div class="lb-create-stage">
            <div class="lb-create-columns">
                <div class="lb-create-info">
                    <div class="lb-create-info-accent"></div>
                    <div class="lb-create-info-inner">
                        <h2 class="lb-create-board-title"></h2>
                        <p class="lb-create-board-desc"></p>
                        <div class="lb-create-systems-wrap">
                            <h3 class="lb-create-systems-head">Recommended Systems &amp; Scenarios</h3>
                            <ul class="lb-create-systems-list"></ul>
                        </div>
                    </div>
                </div>
                <div class="lb-create-preview">
                    <div class="lb-create-preview-frame">
                        <button type="button" class="lb-create-arrow lb-create-arrow-prev" title="Previous theme" aria-label="Previous theme"><i class="fas fa-chevron-left"></i></button>
                        <div class="lb-create-preview-viewport">
                            <div class="lb-create-preview-track"></div>
                        </div>
                        <button type="button" class="lb-create-arrow lb-create-arrow-next" title="Next theme" aria-label="Next theme"><i class="fas fa-chevron-right"></i></button>
                    </div>
                    <div class="lb-create-preview-counter"></div>
                </div>
            </div>
        </div>
        <div class="lb-create-footer">
            <button type="button" class="lb-create-confirm-btn" id="lb-create-confirm"><span class="lb-create-confirm-shine"></span><span class="lb-create-confirm-text"><i class="fas fa-folder-plus"></i> Create</span></button>
        </div>`;
}

function lbCreateBoardFillPreviewSlide(board, opts) {
    opts = opts || {};
    let slide = $('<div class="lb-create-preview-slide"></div>');
    slide.html(lbCreateBoardPreviewLayersHTML(board, opts));
    return slide;
}

function lbCreateBoardEnsureInfoStructure(ov, categoryId) {
    let inner = ov.find('.lb-create-info-inner');
    if (categoryId === 'custom') return;
    if (!inner.find('.lb-create-systems-list').length) {
        inner.html(`<h2 class="lb-create-board-title"></h2>
            <p class="lb-create-board-desc"></p>
            <div class="lb-create-systems-wrap">
                <h3 class="lb-create-systems-head">Recommended Systems &amp; Scenarios</h3>
                <ul class="lb-create-systems-list"></ul>
            </div>`);
    }
}

function lbCreateBoardUpdateInfo(ov, board, animating, state) {
    state = state || {};
    lbCreateBoardEnsureInfoStructure(ov, state.categoryId);
    let inner = ov.find('.lb-create-info-inner');
    if (state.categoryId === 'custom') {
        inner.html(lbCreateBoardCustomLeftHTML(state.cfg || { goldUnlocked: false, customBoards: [] }, board));
        inner.find('.lb-create-board-title, .lb-create-board-desc, .lb-create-custom-list-item').css({ opacity: 1 });
        return;
    }
    let title = ov.find('.lb-create-board-title');
    let desc = ov.find('.lb-create-board-desc');
    let list = ov.find('.lb-create-systems-list');
    let apply = () => {
        title.text(board.title || "");
        desc.text(board.description || "");
        list.empty();
        (board.systems || []).forEach((s, i) => list.append(`<li style="animation-delay:${i * 56}ms">${s}</li>`));
    };
    apply();
    title.add(desc).add(list).css({ opacity: 1, visibility: 'visible', display: '' });
    if (animating) {
        let blocks = title.add(desc).add(list.find('li'));
        blocks.removeClass('lb-create-text-in');
        void ov.find('.lb-create-info')[0].offsetWidth;
        blocks.addClass('lb-create-text-in');
    }
}

function lbCreateBoardUpdateCounter(ov, index, total) {
    ov.find('.lb-create-preview-counter').text(total ? `${index + 1} / ${total}` : "");
}

function lbCreateBoardApplyCarousel(ov, boards, activeIndex, animate, direction, opts) {
    opts = opts || {};
    let track = ov.find('.lb-create-preview-track');
    let viewport = ov.find('.lb-create-preview-viewport');
    if (!boards.length) { track.empty(); ov.find('.lb-create-preview-counter').text(''); return; }
    if (track.children().length !== boards.length) {
        track.empty();
        boards.forEach((board, i) => {
            let slide = lbCreateBoardFillPreviewSlide(board, { locked: !!opts.customLocked });
            slide.addClass('lb-create-carousel-slide').attr('data-index', i);
            if (opts.customUnlocked) slide.addClass('lb-create-custom-thumb-lg');
            track.append(slide);
        });
    }
    let vw = viewport.innerWidth() || 800;
    let gap = vw * 0.54;
    let dur = animate ? '340ms' : '0ms';
    let ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
    let half = Math.floor(boards.length / 2);
    track.find('.lb-create-carousel-slide').each(function() {
        let idx = parseInt(this.dataset.index, 10);
        let offset = ((idx - activeIndex + boards.length + half) % boards.length) - half;
        let abs = Math.abs(offset);
        let scale = offset === 0 ? 1 : (abs === 1 ? 0.86 : 0.72);
        let opacity = offset === 0 ? 1 : (abs === 1 ? 0.42 : 0.12);
        let z = offset === 0 ? 30 : (abs === 1 ? 20 : 5);
        let blur = offset === 0 ? 0 : (abs === 1 ? 0.6 : 1.2);
        let tx = offset * gap;
        let el = this;
        el.style.transition = animate ? `transform ${dur} ${ease}, opacity ${dur} ${ease}, filter ${dur} ${ease}` : 'none';
        el.style.zIndex = String(z);
        el.style.opacity = String(opacity);
        el.style.filter = blur > 0 ? `blur(${blur}px)` : 'none';
        el.style.transform = `translateX(${tx}px) translateZ(0) scale(${scale})`;
        el.classList.toggle('is-active', offset === 0);
        el.classList.toggle('is-neighbor', abs === 1);
        el.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');
    });
    if (animate) {
        setTimeout(() => {
            track.find('.lb-create-carousel-slide').each(function() { this.style.transition = ''; });
        }, 360);
    }
}

function lbCreateBoardRenderSlide(ov, boards, index, direction, uiState) {
    uiState = uiState || {};
    if (!boards || !boards.length) {
        ov.find('.lb-create-preview-track').empty();
        lbCreateBoardUpdateInfo(ov, null, false, uiState);
        ov.find('.lb-create-preview-counter').text('');
        return;
    }
    let board = boards[index] || boards[0];
    let track = ov.find('.lb-create-preview-track');
    let needsBuild = track.children().length !== boards.length;
    let carouselOpts = {
        customLocked: uiState.categoryId === 'custom' && uiState.cfg && !uiState.cfg.goldUnlocked,
        customUnlocked: uiState.categoryId === 'custom' && uiState.cfg && uiState.cfg.goldUnlocked
    };
    lbCreateBoardApplyCarousel(ov, boards, index, !!direction && !needsBuild, direction, carouselOpts);
    lbCreateBoardUpdateInfo(ov, board, !!direction, uiState);
}

function lbCreateBoardSyncCategoryUI(ov, uiState) {
    let shell = ov.find('.lb-create-shell');
    shell.toggleClass('lb-create-cat-custom', uiState.categoryId === 'custom');
    shell.toggleClass('lb-create-custom-locked', uiState.categoryId === 'custom' && uiState.cfg && !uiState.cfg.goldUnlocked);
    shell.toggleClass('lb-create-custom-unlocked', uiState.categoryId === 'custom' && uiState.cfg && uiState.cfg.goldUnlocked);
}

function lbCreateBoardBindEvents(ov, close, cfg) {
    let state = { categoryId: "classic", index: 0, animating: false, cfg: cfg };

    let getBoards = () => lbCreateBoardResolveList(state.categoryId, cfg);
    let getBoard = () => { let b = getBoards(); return b[state.index] || b[0]; };

    let render = (direction) => {
        lbCreateBoardSyncCategoryUI(ov, state);
        let boards = getBoards();
        if (!boards.length && state.categoryId === 'custom') {
            lbCreateBoardRenderSlide(ov, [], 0, direction, state);
            return;
        }
        if (!boards.length) return;
        state.index = Math.max(0, Math.min(state.index, boards.length - 1));
        lbCreateBoardRenderSlide(ov, boards, state.index, direction, state);
        lbCreateBoardUpdateCounter(ov, state.index, boards.length);
    };

    let openCustomUpload = () => {
        lbOpenCustomBoardUploadOverlay({
            parentOv: ov,
            onDone: async (res) => {
                if (!res.bg) return;
                cfg.customBoards.push({ id: foundry.utils.randomID(), name: res.name || "Custom Board", bg: res.bg || "", fg: "" });
                await lbWriteConfig(cfg);
                state.index = 0;
                render(null);
            }
        });
    };

    let tryGoldUnlock = (code, btnEl) => {
        if (!lbHasFeature('premium-boards')) {
            ov.find('#lb-create-gold-err').text(game.i18n.localize('LOREBOARD.Notifications.DeluxeOnly')).show();
            return;
        }
        if (!lbValidateGoldUnlockCode(code)) {
            ov.find('#lb-create-gold-err').text('Invalid unlock code. Please check your Patreon message.').show();
            return;
        }
        cfg.goldUnlocked = true;
        lbWriteConfig(cfg).then(() => {
            lbCreateBoardTriggerUnlockFX(ov, btnEl && btnEl[0] ? btnEl[0] : btnEl);
            setTimeout(() => render(null), 280);
        });
    };

    let navigate = (delta) => {
        if (state.animating) return;
        let boards = getBoards();
        if (boards.length <= 1) return;
        state.animating = true;
        state.index = (state.index + delta + boards.length) % boards.length;
        render(delta);
        setTimeout(() => { state.animating = false; }, 380);
    };

    ov.on('keydown.lbCreateCarousel', function(e) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1); }
    });
    ov.attr('tabindex', '0');

    let touchStartX = null;
    ov.find('.lb-create-preview-viewport').on('touchstart.lbCarousel', function(e) {
        if (e.touches.length === 1) touchStartX = e.touches[0].clientX;
    }).on('touchend.lbCarousel', function(e) {
        if (touchStartX == null || !e.changedTouches.length) return;
        let dx = e.changedTouches[0].clientX - touchStartX;
        touchStartX = null;
        if (Math.abs(dx) < 40) return;
        navigate(dx < 0 ? 1 : -1);
    });

    ov.find('.lb-create-tab').on('click', function() {
        if (state.animating) return;
        let cat = $(this).data('cat');
        if (cat === state.categoryId) return;
        state.categoryId = cat;
        state.index = 0;
        ov.find('.lb-create-tab').removeClass('active');
        $(this).addClass('active');
        render(null);
    });

    ov.find('.lb-create-arrow-prev').on('click', () => navigate(-1));
    ov.find('.lb-create-arrow-next').on('click', () => navigate(1));

    ov.on('click', '#lb-create-upload-zone', function(e) {
        e.stopPropagation();
        if (!cfg.goldUnlocked) return;
        openCustomUpload();
    });

    ov.on('click', '#lb-create-upload-btn', function(e) {
        e.stopPropagation();
        if (!cfg.goldUnlocked) return;
        openCustomUpload();
    });

    ov.on('click', '#lb-create-gold-submit', function(e) {
        e.stopPropagation();
        tryGoldUnlock(ov.find('#lb-create-gold-code').val(), $(this));
    });

    ov.on('keydown', '#lb-create-gold-code', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); ov.find('#lb-create-gold-submit').click(); }
    });

    ov.on('click', '.lb-create-custom-delete', function(e) {
        e.stopPropagation();
        let cid = $(this).data('cid');
        let cb = cfg.customBoards.find(c => c.id === cid);
        if (!cb) return;
        Dialog.confirm({
            title: 'Delete Custom Board',
            content: '<p style="text-align:center;color:#ececf0;">Are you sure you want to delete this board?</p>',
            yes: async () => {
                cfg.customBoards = cfg.customBoards.filter(c => c.id !== cid);
                await lbWriteConfig(cfg);
                state.index = 0;
                render(null);
            },
            no: () => {},
            defaultYes: false
        });
    });

    ov.on('click', '.lb-create-custom-list-item', function(e) {
        if ($(e.target).closest('.lb-create-custom-delete').length) return;
        let cid = $(this).data('cid');
        let boards = getBoards();
        let idx = boards.findIndex(b => b.id === cid);
        if (idx >= 0) { state.index = idx; render(null); }
    });

    ov.on('click', '.lb-create-custom-edit', function(e) {
        e.stopPropagation();
        let cid = $(this).data('cid');
        let cb = cfg.customBoards.find(c => c.id === cid);
        if (!cb || !cfg.goldUnlocked) return;
        lbOpenCustomBoardUploadOverlay({
            parentOv: ov,
            existing: cb,
            onDone: async (res) => {
                if (res.bg !== null) cb.bg = res.bg;
                if (res.fg !== null) cb.fg = res.fg;
                if (res.name) cb.name = res.name;
                await lbWriteConfig(cfg);
                render(null);
            }
        });
    });

    ov.find('#lb-create-confirm').on('click', async () => {
        let board = getBoard();
        if (!board) return;
        if (state.categoryId === "custom") {
            if (!cfg.goldUnlocked) {
                tryGoldUnlock(ov.find('#lb-create-gold-code').val(), ov.find('#lb-create-gold-submit')[0] || ov.find('#lb-create-confirm')[0]);
                return;
            }
            if (!board.customBoard) { openCustomUpload(); return; }
        }
        let defaultName = board.title || (board.customData && board.customData.name) || 'New Board';
        let cat = state.categoryId;
        let classicEntry = cat === 'classic' ? lbCreateBoardClassicFromEntry(board) : null;
        let themeObj = cat === 'immersive' ? LB_THEMES.find(t => t.id === board.themeId) : null;
        let customClassic = board.customBoard && board.customData
            ? { name: board.customData.name, bg: board.customData.bg || "", fg: board.customData.fg || LB_CUSTOM_BOARD_DEFAULT_FG_URL, customBoard: true }
            : null;
        let presetId = board.id;
        $('#lb-custom-board-upload').remove();
        close();
        await new Promise(r => setTimeout(r, 220));
        await lbRunCreateBoardFromMenu(cat, classicEntry, themeObj, presetId, customClassic, defaultName);
    });

    render(null);
    ov.find('.lb-create-shell').addClass('lb-create-enter');
    ov.find('.lb-create-preview-viewport').on('mouseenter', function() { $(this).closest('.lb-create-preview-frame').addClass('is-hovered'); })
        .on('mouseleave', function() { $(this).closest('.lb-create-preview-frame').removeClass('is-hovered'); });
}