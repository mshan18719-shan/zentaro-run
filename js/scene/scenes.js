// ══════════════════════════════════════════════════════════════
//  scenes.js  –  All game scenes: MainMenu | LevelSelect | GamePlaying
// ══════════════════════════════════════════════════════════════

export const SCENE = {
    MAIN_MENU: "MAIN_MENU",
    LEVEL_SELECT: "LEVEL_SELECT",
    GAME_PLAYING: "GAME_PLAYING",
};

// ── Shared state ─────────────────────────────────────────────
export const sceneState = {
    current: SCENE.MAIN_MENU,
    selectedLevel: 1,

    // ── Read level stars from the same progress store used by progress.js ──
    // progress.js writes to "madboy_progress"; we read from there so that
    // completing a level (which calls completeLevel()) actually unlocks the next.
    get levelStars() {
        try {
            const raw = localStorage.getItem("madboy_progress");
            if (!raw) return [0, 0, 0];
            const data = JSON.parse(raw);
            // Build an array [stars_lvl1, stars_lvl2, stars_lvl3]
            return [1, 2, 3].map(lvl => (data.levels?.[lvl]?.stars ?? 0));
        } catch { return [0, 0, 0]; }
    },

    saveLevelStars() {
        // No-op: stars are saved by progress.js completeLevel()
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

// ══════════════════════════════════════════════════════════════
//  Helper – draw rounded rect path
// ══════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════
//  MainMenuScene
// ══════════════════════════════════════════════════════════════
export class MainMenuScene {
    constructor(canvas) {
        this.canvas   = canvas;
        this._playBtn = null;   // {x,y,w,h} — updated every frame, used for hit-test
        this._t       = 0;

        this._heroImg    = document.getElementById("mainScreen");
        this._playBtnImg = document.getElementById("mainPlayBtn");
    }

    // vw/vh are LOGICAL (CSS) pixels passed from main.js game loop
    update(vw, vh) {
        this._t++;
        this._playBtn = this._calcBtn(vw, vh);
    }

    draw(ctx, vw, vh) {
        // Background gradient
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

    // ── Single source of truth for button position/size ───────
    // Uses only viewport fractions so it is DPR-agnostic.
    _calcBtn(vw, vh) {
        const scale        = Math.min(vw / 1280, vh / 720);
        const clampedScale = Math.max(scale, 0.55);

        const btnW = Math.round(Math.min(vw * 0.20, 280) * clampedScale);
        const btnH = Math.round(btnW * 0.40);
        const btnX = Math.round(vw * 0.5 - btnW / 2);
        const btnY = Math.round(vh * 0.74 - btnH / 2);

        return { x: btnX, y: btnY, w: btnW, h: btnH };
    }

    _drawHero(ctx, vw, vh) {
        const img = this._heroImg;
        if (!img || !img.complete || !img.naturalWidth) return;

        const ar   = img.naturalWidth / img.naturalHeight;
        let drawW  = vw * 0.72;
        let drawH  = drawW / ar;
        if (drawH > vh) { drawH = vh; drawW = drawH * ar; }

        ctx.save();
        ctx.drawImage(img, 0, 0, drawW + 200, drawH + 70);
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

    // mx/my must be LOGICAL (CSS) pixels — ensured by main.js click handler
    handleClick(mx, my) {
        if (sceneState.current !== SCENE.MAIN_MENU) return;
        const b = this._playBtn;
        if (!b) return;
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
            sceneState.goto(SCENE.LEVEL_SELECT);
        }
    }
}