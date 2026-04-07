// ══════════════════════════════════════════════════════════════
//  levelSelectScene.js  –  Level Select screen (sprite-based)
//
//  Assets used (all already declared in index.html):
//    #levelSelectScreen  →  assets/levelselect-sheet0.png  (panel BG)
//    #levelSheet0        →  assets/level-sheet0.png        (unlocked card)
//    #levelSheet1        →  assets/level-sheet1.png        (locked card)
//    #bg                 →  assets/tiledbackground.png     (world BG)
// ══════════════════════════════════════════════════════════════

import { SCENE, sceneState } from "./scenes.js";
import { createMap } from "../world/map.js";
import { JumperEnemy, PatrolEnemy } from "../entities/enemy.js";
import { getLevelProgress, isLevelPlayable } from "../system/progress.js";

const TOTAL_LEVELS = 3;
const TILE = 64;

// ── Phase 13: responsive scale (matches Camera.computeScale) ──
// The scene was designed for a 960×540 reference viewport.
// On smaller screens we scale everything down proportionally.
function _computeScale() {
    const REF_W = 960;
    const REF_H = 540;
    return Math.min(window.innerWidth / REF_W, window.innerHeight / REF_H, 1);
}

// ── Tile-image IDs (mirrors map.js blockIds) ──────────────────
const BLOCK_IDS = [
    null,
    'block1',   // 1 groundgrass
    'block6',   // 6 cactus
    'block8',   // 8 ground
    'block10',  // 10 mushroom
    'block11',  // 11 mushroom1
    'block13',  // 13 crystalplants
    'block16',  // 16 grass
    'block17',  // 17 fence sheet0
    'block18',  // 18 fence sheet1
];

// Render overrides — same as map.js tileRenderSettings
const TILE_RENDER = {
    1: { w: 64, h: 80, ox: 0, oy: -10 },
    6: { w: 110, h: 130, ox: -14, oy: -12 },
    10: { w: 60, h: 80, ox: -9, oy: 40 },
    11: { w: 60, h: 80, ox: -9, oy: 40 },
    13: { w: 80, h: 80, ox: -30, oy: 38 },
    16: { w: 90, h: 90, ox: 0, oy: 28 },
    17: { w: 90, h: 90, ox: 0, oy: 32 },
    18: { w: 90, h: 90, ox: 0, oy: 32 },
};
const STRIP_GROUND_ONLY = new Set([1, 8]);

// ══════════════════════════════════════════════════════════════
//  LevelSelectScene
// ══════════════════════════════════════════════════════════════
export class LevelSelectScene {
    constructor(canvas) {
        this.canvas = canvas;

        this._t = 0;
        this._cards = [];   // [{x,y,w,h,level,unlocked}] — hit rects in logical px
        this._backBtn = null; // {x,y,w,h}

        this._panelImg = document.getElementById("levelSelectScreen");
        this._unlockedImg = document.getElementById("levelSheet0");
        this._lockedImg = document.getElementById("levelSheet1");
        this._bgImg = document.getElementById("bg");

        this._map = createMap();
        this._decorEnemies = null;

        // Reset enemies when viewport changes (rotation, resize) so
        // _initDecorEnemies recalculates positions for the new svw/svh.
        window.addEventListener("resize", () => {
            this._decorEnemies = null;
        });
    }

    // ── Build decorative enemies once we know viewport size ───
    _initDecorEnemies(vw, vh) {
        if (this._decorEnemies) return;

        const stripH = Math.round(vh * 0.22);
        const scale = stripH / (3 * TILE);
        const tdH = TILE * scale;
        const stripTop = vh - stripH;

        const jumperX = Math.round(vw * 0.28);
        const patrolCentreX = Math.round(vw * 0.73);
        const patrolRange = Math.round(vw * 0.10);

        const fakeRows = 2;
        const fakeCols = Math.ceil(vw / TILE) + 2;
        const fakeMap = Array.from({ length: fakeRows }, (_, r) =>
            Array.from({ length: fakeCols }, () => (r === fakeRows - 1 ? 1 : 0))
        );

        const fakeGroundY = fakeRows * TILE;

        this._jumper = new JumperEnemy(
            jumperX, fakeGroundY, fakeMap, TILE,
            { jumpForce: -13, jumpInterval: 100 }
        );
        this._patrol = new PatrolEnemy(
            patrolCentreX, fakeGroundY, fakeMap, TILE,
            { speed: 1, patrolLeft: patrolCentreX - patrolRange, patrolRight: patrolCentreX + patrolRange }
        );

        // NOTE: _enemyGroundScreenY is NOT cached here because svh/stripTop
        // changes across devices and on resize.  It is recomputed each frame
        // in _drawDecorEnemies so enemies always sit on the visible ground.
        this._enemyFakeMapBaseY = (fakeRows - 1) * TILE;

        const gfyJ = this._enemyFakeMapBaseY - this._jumper.height;
        const gfyP = this._enemyFakeMapBaseY - this._patrol.height;

        this._jumper.y = gfyJ; this._jumper.velY = 0; this._jumper.onGround = true; this._jumper.jumpTimer = 0;
        this._patrol.y = gfyP; this._patrol.velY = 0; this._patrol.onGround = true; this._patrol.dir = -1;

        // Patch jumper update (decorative — no map physics)
        this._jumper.update = () => {
            if (this._jumper.dead) return;
            if (this._jumper.onGround) {
                this._jumper.jumpTimer++;
                if (this._jumper.jumpTimer >= this._jumper.jumpInterval) {
                    this._jumper.velY = this._jumper.jumpForce;
                    this._jumper.onGround = false;
                    this._jumper.jumpTimer = 0;
                }
            }
            this._jumper.velY += this._jumper.gravity;
            if (this._jumper.velY > 18) this._jumper.velY = 18;
            this._jumper.y += this._jumper.velY;
            if (this._jumper.y >= gfyJ) {
                this._jumper.y = gfyJ; this._jumper.velY = 0; this._jumper.onGround = true;
            } else { this._jumper.onGround = false; }
            this._jumper._animTimer++;
            if (this._jumper._animTimer >= this._jumper._animSpeed) {
                this._jumper._animTimer = 0; this._jumper._frame = 1 - this._jumper._frame;
            }
        };

        // Patch patrol update
        this._patrol.update = () => {
            if (this._patrol.dead) return;
            this._patrol.x += this._patrol.speed * this._patrol.dir;
            if (this._patrol.x <= this._patrol.patrolLeft) { this._patrol.x = this._patrol.patrolLeft; this._patrol.dir = 1; }
            if (this._patrol.x + this._patrol.width >= this._patrol.patrolRight) { this._patrol.x = this._patrol.patrolRight - this._patrol.width; this._patrol.dir = -1; }
            this._patrol.y = gfyP; this._patrol.velX = this._patrol.speed * this._patrol.dir; this._patrol.velY = 0; this._patrol.onGround = true;
            this._patrol._animTimer++;
            if (this._patrol._animTimer >= this._patrol._animSpeed) {
                this._patrol._animTimer = 0; this._patrol._frame = 1 - this._patrol._frame;
            }
        };

        this._decorEnemies = [this._jumper, this._patrol];
    }

    update() {
        this._t++;
        if (this._decorEnemies) this._decorEnemies.forEach(e => e.update());
    }

    draw(ctx, vw, vh) {
        // Phase 13: scale entire scene so it fits small screens.
        // We pass virtual (world-space) dimensions to all sub-draws
        // so layout math stays identical — only the ctx transform shrinks it.
        const scale = _computeScale();
        const svw = vw / scale;   // virtual viewport width
        const svh = vh / scale;   // virtual viewport height

        ctx.save();
        ctx.scale(scale, scale);

        this._initDecorEnemies(svw, svh);
        this._drawBgTiles(ctx, svw, svh);
        this._drawGroundStrip(ctx, svw, svh);
        this._drawGroundDecorations(ctx, svw, svh);
        this._drawPanel(ctx, svw, svh);
        this._drawDecorEnemies(ctx, svw, svh);

        ctx.restore();

        // Back button drawn in screen-space (unscaled) so it's always tappable
        this._drawBackBtn(ctx, vw, vh);

        // Store scale so handleClick can unproject click coords
        this._scale = scale;
    }

    _drawDecorEnemies(ctx, vw, vh) {
        if (!this._decorEnemies) return;

        // Recompute ground position every frame so it stays correct on all
        // screen sizes and after resize — mirrors _drawGroundStrip exactly.
        const stripH       = Math.round(vh * 0.22);
        const stripTop     = vh - stripH - Math.round(vh * 0.04);
        const scale        = stripH / (3 * TILE);
        const tdH          = TILE * scale;

        // enemyGroundScreenY = Y coordinate (in virtual/world space) where
        // the top of the solid ground surface is — enemies should stand here.
        // stripTop + tdH is the bottom edge of the top ground tile, which is
        // the standing surface.  The small nudge (4 * scale) fine-tunes the
        // visual so feet touch the grass sprite consistently on every device.
        const enemyGroundScreenY = stripTop + tdH + 66 * scale;

        const fakeCamera = { x: 0, y: this._enemyFakeMapBaseY - enemyGroundScreenY };
        this._decorEnemies.forEach(e => e.draw(ctx, fakeCamera));
    }

    _drawBgTiles(ctx, vw, vh) {
        const img = this._bgImg;
        if (!img || !img.complete || !img.naturalWidth) return;
        ctx.drawImage(img, 0, 0, vw, vh);
    }

    _drawGroundStrip(ctx, vw, vh) {
        const map = this._map;
        const mapCols = map[0].length;
        const mapRows = map.length;
        const stripH = Math.round(vh * 0.22);
        // Push the strip up by 4% of vh so it stays fully visible on
        // mobile screens where bottom chrome can clip the canvas edge.
        const stripTop = vh - stripH - Math.round(vh * 0.04);
        const firstRow = mapRows - 3;
        const visRows = 3;
        const scale = stripH / (visRows * TILE);
        const tdW = TILE * scale;
        const tdH = TILE * scale;
        const visCols = Math.ceil(vw / tdW) + 2;

        for (let ci = 0; ci < visCols; ci++) {
            const col = ci % mapCols;
            for (let ri = 0; ri < visRows; ri++) {
                const row = firstRow + ri;
                const tileType = map[row][col];
                if (!STRIP_GROUND_ONLY.has(tileType)) continue;
                const img = document.getElementById(BLOCK_IDS[tileType]);
                if (!img || !img.complete || !img.naturalWidth) continue;
                const baseX = ci * tdW;
                const baseY = stripTop + ri * tdH;
                const cfg = TILE_RENDER[tileType];
                const dw = cfg ? cfg.w * scale : tdW;
                const dh = cfg ? cfg.h * scale : tdH;
                const ox = cfg ? cfg.ox * scale : 0;
                const oy = cfg ? cfg.oy * scale : 0;
                ctx.drawImage(img, Math.round(baseX + ox), Math.round(baseY + oy), Math.round(dw), Math.round(dh));
            }
        }
    }

    _drawGroundDecorations(ctx, vw, vh) {
        const stripH = Math.round(vh * 0.22);
        const stripTop = vh - stripH - Math.round(vh * 0.04);
        const scale = stripH / (3 * TILE);
        const tdW = TILE * scale;
        const tdH = TILE * scale;

        const decorations = [
            { imgId: "block6", col: 2, w: 100, h: 120, ox: 20, oy: -66 },
            { imgId: "block11", col: 9, w: 60, h: 70, ox: 0, oy: -15 },
            { imgId: "block16", col: 10, w: 65, h: 65, ox: 0, oy: -12 },
            { imgId: "block13", col: 12, w: 60, h: 60, ox: 0, oy: -8 },
            { imgId: "block17", col: 13, w: 80, h: 80, ox: 0, oy: -20 },
            { imgId: "block18", col: 14, w: 80, h: 80, ox: 0, oy: -20 },
            { imgId: "block13", col: 15, w: 60, h: 60, ox: 20, oy: -8 },
            { imgId: "block16", col: 17, w: 65, h: 65, ox: 0, oy: -12 },
            { imgId: "block10", col: 18, w: 60, h: 70, ox: 0, oy: -15 },
            { imgId: "block6", col: 25, w: 100, h: 120, ox: 20, oy: -66 },
        ];

        for (const d of decorations) {
            const img = document.getElementById(d.imgId);
            if (!img || !img.complete || !img.naturalWidth) continue;
            const x = d.col * tdW + d.ox * scale;
            const y = stripTop + tdH + d.oy * scale;
            ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(d.w * scale), Math.round(d.h * scale));
        }
    }

    // ── Panel ─────────────────────────────────────────────────
    _drawPanel(ctx, vw, vh) {
        // Ground strip occupies bottom 22% of vh + 4% offset nudge.
        // Back button occupies top ~8%.
        // Panel lives in the middle space.
        const groundStripH = vh * 0.22 + vh * 0.04;   // matches _drawGroundStrip offset
        const topClearance = vh * 0.10;                // room for back button
        const availH = vh - groundStripH - topClearance;

        // Scale factor relative to reference 960x540 so panel shrinks
        // proportionally on mobile without affecting desktop layout.
        const panelScale = Math.min(vw / 960, vh / 540, 1);

        // Extra shrink on small screens (mobile): reduce panel width/height
        // so it doesn't overflow on landscape phones and small tablets.
        const actualW = window.innerWidth;
        const mobileScale = actualW <= 480 ? 0.62
                          : actualW <= 768 ? 0.68
                          : 1;

        // Width: up to 80% of vw on mobile, 88% on desktop, capped at 1050px
        const maxWRatio = actualW <= 768 ? 0.80 : 0.88;
        const panelW = Math.min(vw * maxWRatio, 1050 * panelScale) * mobileScale;
        // Height: up to 92% of available space, never taller than 480px (scaled)
        const panelH = Math.min(availH * 0.92, 480 * panelScale) * mobileScale;

        const panelX = (vw - panelW) / 2;
        // Centre panel in the available space
        const panelY = topClearance + (availH - panelH) / 2;

        const panelImg = this._panelImg;
        if (panelImg && panelImg.complete && panelImg.naturalWidth) {
            ctx.drawImage(panelImg, panelX, panelY, panelW, panelH);
        } else {
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
            ctx.fillStyle = "#deb887";
            ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 22); ctx.fill();
            ctx.restore();
            ctx.strokeStyle = "#b8860b"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 22); ctx.stroke();
        }

        this._drawCards(ctx, panelX, panelY, panelW, panelH);
    }

    // ── Cards ─────────────────────────────────────────────────
    _drawCards(ctx, panelX, panelY, panelW, panelH) {
        const sidePad = panelW * 0.08;
        const topPad = panelH * 0.24;
        const gapX = panelW * 0.045;

        const availableW = panelW - sidePad * 2;
        const cardW = (availableW - gapX * (TOTAL_LEVELS - 1)) / TOTAL_LEVELS;
        const cardH = panelH * 0.55;

        const startX = panelX + sidePad;
        const cy = panelY + topPad + 35;

        this._cards = [];

        for (let i = 0; i < TOTAL_LEVELS; i++) {
            const lvl = i + 1;
            const cx = startX + i * (cardW + gapX);

            const levelProgress = getLevelProgress(lvl);
            const playable = isLevelPlayable(lvl);
            const unlocked = playable && !!levelProgress.unlocked;
            const stars = playable ? (levelProgress.stars || 0) : 0;

            this._cards.push({
                x: cx,
                y: cy,
                w: cardW,
                h: cardH,
                level: lvl,
                unlocked,
                playable
            });

            this._drawCard(ctx, cx, cy, cardW, cardH, lvl, unlocked, stars);
        }
    }

    _drawCard(ctx, cx, cy, cw, ch, level, unlocked, stars = 0) {
        ctx.save();
        const img = unlocked ? this._unlockedImg : this._lockedImg;

        if (img && img.complete && img.naturalWidth) {
            if (unlocked) {
                const frameCols = 2, frameRows = 2;
                const frameW = (img.naturalWidth - 100) / frameCols;
                const frameH = (img.naturalHeight - 53) / frameRows;
                const frameIndex = Math.max(0, Math.min(3, stars));
                const frameCol = frameIndex % frameCols;
                const frameRow = Math.floor(frameIndex / frameCols);
                ctx.drawImage(img, frameCol * frameW, frameRow * frameH, frameW, frameH, cx, cy, cw, ch);
            } else {
                ctx.drawImage(img, cx, cy, cw, ch);
            }
        } else {
            ctx.fillStyle = unlocked ? "#e8c97a" : "#b8b8b8";
            ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 18); ctx.fill();
            ctx.strokeStyle = unlocked ? "#8b6914" : "#777";
            ctx.lineWidth = 2.5; ctx.stroke();
        }

        const fontSize = Math.max(16, Math.round(ch * 0.40));
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `bold ${fontSize}px 'Arial Black', 'Arial Bold', Arial, sans-serif`;
        ctx.fillStyle = unlocked ? "#ffffff" : "#f2f2f2";
        ctx.strokeStyle = "rgba(80,50,20,0.65)";
        ctx.lineWidth = Math.max(2, fontSize * 0.06);
        ctx.strokeText(level, cx + cw / 2, cy + ch * 0.42);
        ctx.fillText(level, cx + cw / 2, cy + ch * 0.42);
        ctx.restore();
    }

    // ── Back button ───────────────────────────────────────────
    _drawBackBtn(ctx, vw, vh) {
        // Scale button so it's always visible but not too large
        const scale = Math.min(vw / 1280, vh / 720);
        const bw = Math.round(Math.min(vw * 0.09, 110) * Math.max(scale, 0.65));
        const bh = Math.round(Math.min(vh * 0.055, 42) * Math.max(scale, 0.65));
        const bx = Math.round(vw * 0.022);
        const by = Math.round(vh * 0.028);

        // Store in logical pixels for hit testing
        this._backBtn = { x: bx, y: by, w: bw, h: bh };

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
        const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
        grad.addColorStop(0, "#ff6b35"); grad.addColorStop(1, "#c0390a");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, bh / 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#8b2000"; ctx.lineWidth = 2; ctx.stroke();

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const fontSize = Math.max(10, Math.round(bh * 0.38));
        ctx.font = `bold ${fontSize}px 'Arial Black', Arial, sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 3;
        ctx.fillText("← Back", bx + bw / 2, by + bh / 2 + 1);
        ctx.restore();
    }

    // mx/my are LOGICAL (CSS) pixels from main.js click handler
    handleClick(mx, my) {
        // Back button is drawn in screen-space, test against raw coords
        const b = this._backBtn;
        if (b && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
            sceneState.goto(SCENE.MAIN_MENU);
            return;
        }

        // Level cards — coords are in virtual space, so unproject click by scale
        const s = this._scale || 1;
        const vmx = mx / s;
        const vmy = my / s;
        for (const card of this._cards) {
            if (
                card.playable &&
                card.unlocked &&
                vmx >= card.x && vmx <= card.x + card.w &&
                vmy >= card.y && vmy <= card.y + card.h
            ) {
                this.selectedLevel = card.level;
                sceneState.selectedLevel = card.level;
                sceneState.goto(SCENE.GAME_PLAYING);
                return;
            }
        }
    }
}