import { SCENE, sceneState } from "./scenes.js";
import { createMap } from "../world/levels/level1.js";
import { JumperEnemy, PatrolEnemy } from "../entities/enemy.js";
import { getLevelProgress, isLevelPlayable } from "../system/progress.js";

const TOTAL_LEVELS = 8;
const VISIBLE_LEVELS = 3;
const TILE = 64;

function _computeScale() {
    const REF_W = 960;
    const REF_H = 540;
    return Math.min(window.innerWidth / REF_W, window.innerHeight / REF_H, 1);
}

const BLOCK_IDS = [
    null,
    "block1",
    "block6",
    "block8",
    "block10",
    "block11",
    "block13",
    "block16",
    "block17",
    "block18",
];

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

export class LevelSelectScene {
    constructor(canvas) {
        this.canvas = canvas;

        this._t = 0;
        this._cards = [];
        this._backBtn = null;
        this._screenBtnRect = null;

        this._pageBackRect = null;
        this._pageNextRect = null;
        this._startLevelIndex = 0; // 0 => show 1,2,3

        this._panelImg = document.getElementById("levelSelectScreen");
        this._unlockedImg = document.getElementById("levelSheet0");
        this._lockedImg = document.getElementById("levelSheet1");
        this._bgImg = document.getElementById("bg");
        this._screenBtnImg = document.getElementById("screenBtn");

        this._pageBackImg = document.getElementById("levelPageBackBtn");
        this._pageNextImg = document.getElementById("levelPageNextBtn");

        this._map = createMap();
        this._decorEnemies = null;

        this._panelRect = null;

        this._isFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );

        this._onFSChange = () => {
            this._isFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            );
        };

        document.addEventListener("fullscreenchange", this._onFSChange);
        document.addEventListener("webkitfullscreenchange", this._onFSChange);
        document.addEventListener("mozfullscreenchange", this._onFSChange);
        document.addEventListener("MSFullscreenChange", this._onFSChange);

        window.addEventListener("resize", () => {
            this._decorEnemies = null;
        });
    }

    _toggleFullscreen() {
        const el = document.documentElement;
        if (!this._isFullscreen) {
            const req =
                el.requestFullscreen ||
                el.webkitRequestFullscreen ||
                el.mozRequestFullScreen ||
                el.msRequestFullscreen;
            if (req) req.call(el);
        } else {
            const exit =
                document.exitFullscreen ||
                document.webkitExitFullscreen ||
                document.mozCancelFullScreen ||
                document.msExitFullscreen;
            if (exit) exit.call(document);
        }
    }

    _initDecorEnemies(vw, vh) {
        if (this._decorEnemies) return;

        const stripH = Math.round(vh * 0.22);
        const scale = stripH / (3 * TILE);

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
            {
                speed: 1,
                patrolLeft: patrolCentreX - patrolRange,
                patrolRight: patrolCentreX + patrolRange
            }
        );

        this._enemyFakeMapBaseY = (fakeRows - 1) * TILE;

        const gfyJ = this._enemyFakeMapBaseY - this._jumper.height;
        const gfyP = this._enemyFakeMapBaseY - this._patrol.height;

        this._jumper.y = gfyJ;
        this._jumper.velY = 0;
        this._jumper.onGround = true;
        this._jumper.jumpTimer = 0;

        this._patrol.y = gfyP;
        this._patrol.velY = 0;
        this._patrol.onGround = true;
        this._patrol.dir = -1;

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
                this._jumper.y = gfyJ;
                this._jumper.velY = 0;
                this._jumper.onGround = true;
            } else {
                this._jumper.onGround = false;
            }
            this._jumper._animTimer++;
            if (this._jumper._animTimer >= this._jumper._animSpeed) {
                this._jumper._animTimer = 0;
                this._jumper._frame = 1 - this._jumper._frame;
            }
        };

        this._patrol.update = () => {
            if (this._patrol.dead) return;
            this._patrol.x += this._patrol.speed * this._patrol.dir;
            if (this._patrol.x <= this._patrol.patrolLeft) {
                this._patrol.x = this._patrol.patrolLeft;
                this._patrol.dir = 1;
            }
            if (this._patrol.x + this._patrol.width >= this._patrol.patrolRight) {
                this._patrol.x = this._patrol.patrolRight - this._patrol.width;
                this._patrol.dir = -1;
            }
            this._patrol.y = gfyP;
            this._patrol.velX = this._patrol.speed * this._patrol.dir;
            this._patrol.velY = 0;
            this._patrol.onGround = true;
            this._patrol._animTimer++;
            if (this._patrol._animTimer >= this._patrol._animSpeed) {
                this._patrol._animTimer = 0;
                this._patrol._frame = 1 - this._patrol._frame;
            }
        };

        this._decorEnemies = [this._jumper, this._patrol];
    }

    update() {
        this._t++;
        if (this._decorEnemies) this._decorEnemies.forEach(e => e.update());
    }

    draw(ctx, vw, vh) {
        const scale = _computeScale();
        const svw = vw / scale;
        const svh = vh / scale;

        ctx.save();
        ctx.scale(scale, scale);

        this._initDecorEnemies(svw, svh);
        this._drawBgTiles(ctx, svw, svh);
        this._drawGroundStrip(ctx, svw, svh);
        this._drawGroundDecorations(ctx, svw, svh);
        this._drawPanel(ctx, svw, svh);
        this._drawDecorEnemies(ctx, svw, svh);

        ctx.restore();

        this._drawBackBtn(ctx, vw, vh);
        this._drawScreenBtn(ctx, vw, vh);

        this._scale = scale;
    }

    _drawDecorEnemies(ctx, vw, vh) {
        if (!this._decorEnemies) return;

        const stripH = Math.round(vh * 0.22);
        const stripTop = vh - stripH;
        const scale = stripH / (3 * TILE);
        const tdH = TILE * scale;

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
        const stripTop = vh - stripH;
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

                ctx.drawImage(
                    img,
                    Math.round(baseX + ox),
                    Math.round(baseY + oy),
                    Math.round(dw),
                    Math.round(dh)
                );
            }
        }
    }

    _drawGroundDecorations(ctx, vw, vh) {
        const stripH = Math.round(vh * 0.22);
        const stripTop = vh - stripH;
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
            ctx.drawImage(
                img,
                Math.round(x),
                Math.round(y),
                Math.round(d.w * scale),
                Math.round(d.h * scale)
            );
        }
    }

    _drawPanel(ctx, vw, vh) {
        const groundStripH = vh * 0.22;
        const topClearance = vh * 0.10;
        const availH = vh - groundStripH - topClearance;

        const panelScale = Math.min(vw / 960, vh / 540, 1);

        const actualW = window.innerWidth;
        const mobileScale = actualW <= 768 ? 0.75 : 1;

        const panelW = Math.min(vw * 0.88, 1050 * panelScale) * mobileScale;
        const panelH = Math.min(availH * 0.92, 480 * panelScale) * mobileScale;

        const panelX = (vw - panelW) / 2;
        const panelY = topClearance + (availH - panelH) / 2;

        this._panelRect = { x: panelX, y: panelY, w: panelW, h: panelH };

        const panelImg = this._panelImg;
        if (panelImg && panelImg.complete && panelImg.naturalWidth) {
            ctx.drawImage(panelImg, panelX, panelY, panelW, panelH);
        } else {
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.3)";
            ctx.shadowBlur = 24;
            ctx.shadowOffsetY = 6;
            ctx.fillStyle = "#deb887";
            ctx.beginPath();
            ctx.roundRect(panelX, panelY, panelW, panelH, 22);
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = "#b8860b";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(panelX, panelY, panelW, panelH, 22);
            ctx.stroke();
        }

        this._drawCards(ctx, panelX, panelY, panelW, panelH);
        this._drawPageButtons(ctx, panelX, panelY, panelW, panelH);
    }

    _drawCards(ctx, panelX, panelY, panelW, panelH) {
        const firstLevel = this._startLevelIndex + 1;
        const lastLevel = Math.min(firstLevel + VISIBLE_LEVELS - 1, TOTAL_LEVELS);
        const visibleCount = lastLevel - firstLevel + 1;

        const sidePad = panelW * 0.12;
        const topPad = panelH * 0.24;
        const gapX = panelW * 0.045;

        const availableW = panelW - sidePad * 2;
        const cardW = (availableW - gapX * (VISIBLE_LEVELS - 1)) / VISIBLE_LEVELS;
        const cardH = panelH * 0.55;

        const startX = panelX + sidePad;
        const cy = panelY + topPad + 35;

        this._cards = [];

        for (let i = 0; i < visibleCount; i++) {
            const lvl = firstLevel + i;
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
                const frameCols = 2;
                const frameRows = 2;
                const frameW = (img.naturalWidth - 100) / frameCols;
                const frameH = (img.naturalHeight - 53) / frameRows;
                const frameIndex = Math.max(0, Math.min(3, stars));
                const frameCol = frameIndex % frameCols;
                const frameRow = Math.floor(frameIndex / frameCols);

                ctx.drawImage(
                    img,
                    frameCol * frameW, frameRow * frameH, frameW, frameH,
                    cx, cy, cw, ch
                );
            } else {
                ctx.drawImage(img, cx, cy, cw, ch);
            }
        } else {
            ctx.fillStyle = unlocked ? "#e8c97a" : "#b8b8b8";
            ctx.beginPath();
            ctx.roundRect(cx, cy, cw, ch, 18);
            ctx.fill();

            ctx.strokeStyle = unlocked ? "#8b6914" : "#777";
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }

        const fontSize = Math.max(16, Math.round(ch * 0.40));
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `bold ${fontSize}px 'Arial Black', 'Arial Bold', Arial, sans-serif`;
        ctx.fillStyle = unlocked ? "#ffffff" : "#f2f2f2";
        ctx.strokeStyle = "rgba(80,50,20,0.65)";
        ctx.lineWidth = Math.max(2, fontSize * 0.06);
        ctx.strokeText(String(level), cx + cw / 2, cy + ch * 0.42);
        ctx.fillText(String(level), cx + cw / 2, cy + ch * 0.42);

        ctx.restore();
    }

    _drawPageButtons(ctx, panelX, panelY, panelW, panelH) {
        const btnSize = Math.max(90, Math.round(panelH * 0.44));
        const btnY = panelY + panelH * 0.58 - btnSize / 2;

        const leftX = panelX - btnSize * 0.43;
        const rightX = panelX + panelW - btnSize * 0.54;

        const maxStartIndex = Math.max(0, TOTAL_LEVELS - VISIBLE_LEVELS);
        const canGoPrev = this._startLevelIndex > 0;
        const canGoNext = this._startLevelIndex < maxStartIndex;

        this._pageBackRect = canGoPrev ? { x: leftX, y: btnY, w: btnSize, h: btnSize } : null;
        this._pageNextRect = canGoNext ? { x: rightX, y: btnY, w: btnSize, h: btnSize } : null;

        if (canGoPrev) {
            this._drawPageBtn(ctx, this._pageBackImg, leftX, btnY, btnSize);
        }
        if (canGoNext) {
            this._drawPageBtn(ctx, this._pageNextImg, rightX, btnY, btnSize);
        }
    }

    _drawPageBtn(ctx, img, x, y, size) {
        if (img && img.complete && img.naturalWidth) {
            ctx.drawImage(img, x, y, size, size);
            return;
        }

        ctx.save();
        ctx.fillStyle = "rgba(255,180,40,0.95)";
        ctx.shadowColor = "rgba(0,0,0,0.25)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _drawBackBtn(ctx, vw, vh) {
        const scale = Math.min(vw / 1280, vh / 720);
        const bw = Math.round(Math.min(vw * 0.09, 110) * Math.max(scale, 0.65));
        const bh = Math.round(Math.min(vh * 0.055, 42) * Math.max(scale, 0.65));
        const bx = Math.round(vw * 0.022);
        const by = Math.round(vh * 0.028);

        this._backBtn = { x: bx, y: by, w: bw, h: bh };

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;

        const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
        grad.addColorStop(0, "#ff6b35");
        grad.addColorStop(1, "#c0390a");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, bh / 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#8b2000";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const fontSize = Math.max(10, Math.round(bh * 0.38));
        ctx.font = `bold ${fontSize}px 'Arial Black', Arial, sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 3;
        ctx.fillText("← Back", bx + bw / 2, by + bh / 2 + 1);

        ctx.restore();
    }

    _drawScreenBtn(ctx, vw, vh) {
        const hudScale = Math.max(0.6, Math.min(1.0, Math.min(vw / 960, vh / 540)));
        const btnSize = Math.round(52 * hudScale);
        const topMargin = Math.round(14 * hudScale);

        const bx = vw - topMargin - btnSize;
        const by = topMargin;

        this._screenBtnRect = { x: bx, y: by, w: btnSize, h: btnSize };

        const img = this._screenBtnImg;
        if (img && img.complete && img.naturalWidth) {
            const frameW = Math.floor(img.naturalWidth / 2);
            const frameH = img.naturalHeight;
            const srcCol = this._isFullscreen ? 0 : 1;

            ctx.drawImage(
                img,
                srcCol * frameW, 0, frameW, frameH,
                bx, by, btnSize, btnSize
            );
        } else {
            const cx = bx + btnSize / 2;
            const cy = by + btnSize / 2;
            const r = btnSize / 2;

            ctx.save();
            ctx.fillStyle = "#27ae60";
            ctx.shadowColor = "rgba(0,0,0,0.25)";
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2.5;
            const sc = btnSize / 52;
            const pad = 13 * sc;
            ctx.beginPath();

            if (!this._isFullscreen) {
                ctx.moveTo(bx + pad, by + pad + 8 * sc);
                ctx.lineTo(bx + pad, by + pad);
                ctx.lineTo(bx + pad + 8 * sc, by + pad);

                ctx.moveTo(bx + btnSize - pad, by + btnSize - pad - 8 * sc);
                ctx.lineTo(bx + btnSize - pad, by + btnSize - pad);
                ctx.lineTo(bx + btnSize - pad - 8 * sc, by + btnSize - pad);
            } else {
                ctx.moveTo(bx + pad + 8 * sc, by + pad);
                ctx.lineTo(bx + pad, by + pad);
                ctx.lineTo(bx + pad, by + pad + 8 * sc);

                ctx.moveTo(bx + btnSize - pad - 8 * sc, by + btnSize - pad);
                ctx.lineTo(bx + btnSize - pad, by + btnSize - pad);
                ctx.lineTo(bx + btnSize - pad, by + btnSize - pad - 8 * sc);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    handleClick(mx, my) {
        const sb = this._screenBtnRect;
        if (sb && mx >= sb.x && mx <= sb.x + sb.w && my >= sb.y && my <= sb.y + sb.h) {
            this._toggleFullscreen();
            return;
        }

        const b = this._backBtn;
        if (b && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
            sceneState.goto(SCENE.MAIN_MENU);
            return;
        }

        const s = this._scale || 1;
        const vmx = mx / s;
        const vmy = my / s;

        if (
            this._pageBackRect &&
            vmx >= this._pageBackRect.x && vmx <= this._pageBackRect.x + this._pageBackRect.w &&
            vmy >= this._pageBackRect.y && vmy <= this._pageBackRect.y + this._pageBackRect.h
        ) {
            this._startLevelIndex = Math.max(0, this._startLevelIndex - 1);
            return;
        }

        if (
            this._pageNextRect &&
            vmx >= this._pageNextRect.x && vmx <= this._pageNextRect.x + this._pageNextRect.w &&
            vmy >= this._pageNextRect.y && vmy <= this._pageNextRect.y + this._pageNextRect.h
        ) {
            const maxStartIndex = Math.max(0, TOTAL_LEVELS - VISIBLE_LEVELS);
            this._startLevelIndex = Math.min(maxStartIndex, this._startLevelIndex + 1);
            return;
        }

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