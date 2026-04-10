// * scenes.js  –  All game scenes: MainMenu | LevelSelect | GamePlaying

export const SCENE = {
    MAIN_MENU: "MAIN_MENU",
    LEVEL_SELECT: "LEVEL_SELECT",
    GAME_PLAYING: "GAME_PLAYING",
};

// * ── Shared state ──────
export const sceneState = {
    current: SCENE.MAIN_MENU,
    selectedLevel: 1,

    // * ── Read level stars from the same progress store used by progress.js ──
    get levelStars() {
        try {
            const raw = localStorage.getItem("madboy_progress");
            if (!raw) return [0, 0, 0];
            const data = JSON.parse(raw);
            // ? Build an array [stars_lvl1, stars_lvl2, stars_lvl3]
            return [1, 2, 3].map(lvl => (data.levels?.[lvl]?.stars ?? 0));
        } catch { return [0, 0, 0]; }
    },

    saveLevelStars() {
        // ! No-op: stars are saved by progress.js completeLevel()
    },

    isLevelUnlocked(lvl) {
        if (lvl === 1) return true;
        try {
            const raw = localStorage.getItem("madboy_progress");
            if (!raw) return false;
            const data = JSON.parse(raw);
            return !!(data.levels?.[lvl]?.unlocked);
        } catch { return false; }
    },

    goto(scene) {
        this.current = scene;
    },
};

// * Helper – draw rounded rect path
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// * MainMenuScene
export class MainMenuScene {
    constructor(canvas) {
        this.canvas   = canvas;
        this._playBtn = null;   // {x,y,w,h} — updated every frame, used for hit-test
        this._t       = 0;

        this._heroImg    = document.getElementById("mainScreen");
        this._playBtnImg = document.getElementById("mainPlayBtn");
    }

    // ? vw/vh are LOGICAL (CSS) pixels passed from main.js game loop
    update(vw, vh) {
        this._t++;
        this._playBtn = this._calcBtn(vw, vh);
    }

    draw(ctx, vw, vh) {
        // ? Background gradient
        const grad = ctx.createRadialGradient(
            vw * 0.5, vh * 0.38, 0,
            vw * 0.5, vh * 0.38, Math.max(vw, vh) * 0.9
        );
        grad.addColorStop(0,   "#ffb347");
        grad.addColorStop(0.5, "#e8621a");
        grad.addColorStop(1,   "#c0390a");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, vw, vh);

        this._drawHero(ctx, vw, vh);
        this._drawPlayBtn(ctx, vw, vh);
    }

    // ! ── Layout helper: computes a single scale for responsiveness
    _layoutScale(vw, vh) {
        return Math.min(vw / 1280, vh / 720);
    }

    // * ── Single source of truth for button position/size ───────
    _calcBtn(vw, vh) {
        // * shrink proportionally and the button stays below the hero image.
        const s = this._layoutScale(vw, vh);

        // * Reference button size at 1280×720
        const REF_W = 220;
        const REF_H = 88;

        const btnW = Math.round(REF_W * s);
        const btnH = Math.round(REF_H * s);

        // * Horizontal: centred in the middle third of the screen
        const btnX = Math.round(vw * 0.5 - btnW / 2);

        // * Vertical: sit at 74 % of vh — identical to the original desktop
        const btnY = Math.round(vh * 0.74 - btnH / 2);

        return { x: btnX, y: btnY, w: btnW, h: btnH };
    }

    _drawHero(ctx, vw, vh) {
        const img = this._heroImg;
        if (!img || !img.complete || !img.naturalWidth) return;

        const s  = this._layoutScale(vw, vh);
        const ar = img.naturalWidth / img.naturalHeight;

        // * ── Reference draw size at 1280 × 720 ────────────────────
        // * At the desktop reference the image was drawn as:
        //   drawW = vw * 0.72  →  1280 * 0.72 ≈ 922  (+200 = 1122)
        //   drawH = drawW / ar                        (+70)
        // * We replicate that reference size and scale it down uniformly
        // * with the same layout scale used by the button.  No hardcoded
        // * pixel offsets — those were the root cause of the overflow.
        const REF_VW  = 1280;
        const REF_VH  = 720;
        const refDrawW = REF_VW * 0.96 + 200;   // ≈ 1122  (original desktop intent)
        const refDrawH = (REF_VW * 0.83) / ar + 70;

        const drawW = refDrawW * s;
        const drawH = refDrawH * s;

        // * Always anchored to the top-left corner, same as the original.
        ctx.save();
        ctx.drawImage(img, 22, 0, drawW, drawH);
        ctx.restore();
    }

    _drawPlayBtn(ctx, vw, vh) {
        const btn = this._calcBtn(vw, vh);
        this._playBtn = btn;   // keep in sync every draw frame

        const img = this._playBtnImg;
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, btn.x, btn.y, btn.w, btn.h);
        } else {
            ctx.save();
            ctx.fillStyle = "#4caf50";
            roundRect(ctx, btn.x, btn.y, btn.w, btn.h, btn.h * 0.3);
            ctx.fill();
            ctx.strokeStyle = "#2e7d32";
            ctx.lineWidth   = 3;
            ctx.stroke();
            ctx.fillStyle    = "#fff";
            ctx.font         = `bold ${Math.round(btn.h * 0.45)}px Arial`;
            ctx.textAlign    = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("PLAY", btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
            ctx.restore();
        }
    }

    // ! mx/my must be LOGICAL (CSS) pixels — ensured by main.js click handler
    handleClick(mx, my) {
        if (sceneState.current !== SCENE.MAIN_MENU) return;
        const b = this._playBtn;
        if (!b) return;
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
            sceneState.goto(SCENE.LEVEL_SELECT);
        }
    }
}