// hud.js  —  Fully responsive for desktop + mobile landscape
// Expected <img> IDs in HTML:
//   coinsSheet2      → assets/coins2-sheet0.png
//   livesSheet0      → assets/lives-sheet0.png
//   pauseBtn         → assets/pausebtn-sheet0.png
//   playBtn          → assets/playbtn-sheet0.png
//   restartBtn       → assets/restartbtn-sheet0.png
//   menuBtn          → assets/menubtn-sheet0.png
//   pausePanel       → assets/pausepanel-sheet0.png
//   volumeBtn0       → assets/volumebtn-sheet0.png  (sound ON)
//   volumeBtn1       → assets/volumebtn-sheet1.png  (sound OFF)
//   gameOver         → assets/gameover panel image
//   gameStop         → assets/stop/menu button in game-over
//   gameContinue     → assets/restart button in game-over
//   levelClear       → assets/levelcleared panel image
//   emptyStar        → assets/empty star
//   shiningStar      → assets/shining star
//   facebook         → assets/facebook share button
//   nextBtn          → assets/next level button

export class HUD {
    constructor() {
        // Panel icons
        this.coinImg  = document.getElementById("coinsSheet2");
        this.heartImg = document.getElementById("livesSheet0");

        // Coin animation
        this.coinFrame      = 0;
        this.coinAnimTick   = 0;
        this.coinAnimSpeed  = 20;

        // Top-right button images
        this.pauseImg  = document.getElementById("pauseBtn");
        this.playImg   = document.getElementById("playBtn");
        this.volOnImg  = document.getElementById("volumeBtn0");
        this.volOffImg = document.getElementById("volumeBtn1");

        // Pause-panel assets
        this.pausePanel = document.getElementById("pausePanel");
        this.restartImg = document.getElementById("restartBtn");
        this.menuImg    = document.getElementById("menuBtn");

        // Game Over assets
        this.gameOverImg  = document.getElementById("gameOver");
        this.stopGame     = document.getElementById("gameStop");
        this.continueGame = document.getElementById("gameContinue");

        // Level Cleared assets
        this.levelClearImg  = document.getElementById("levelClear");
        this.emptyStarImg   = document.getElementById("emptyStar");
        this.shiningStarImg = document.getElementById("shiningStar");
        this.facebookImg    = document.getElementById("facebook");
        this.nextImg        = document.getElementById("nextBtn");

        // Game Over modal state
        this.gameOver         = false;
        this.gameOverSlide    = 0;
        this.gameOverAnimDir  = 0;
        this.GAMEOVER_SLIDE_SPEED = 0.075;

        this._gameOverRestartBtn = { x: 0, y: 0, w: 0, h: 0 };
        this._gameOverMenuBtn    = { x: 0, y: 0, w: 0, h: 0 };

        // Level Cleared modal state
        this.levelCleared        = false;
        this.levelClearedSlide   = 0;
        this.levelClearedAnimDir = 0;
        this.LEVELCLEARED_SLIDE_SPEED = 0.07;
        this._lcRestartBtn = { x: 0, y: 0, w: 0, h: 0 };
        this._lcMenuBtn    = { x: 0, y: 0, w: 0, h: 0 };
        this._lcNextBtn    = { x: 0, y: 0, w: 0, h: 0 };

        this.soundOn = true;
        this.paused  = false;

        // Pause panel slide state
        this.panelSlide   = 0;
        this.panelAnimDir = 0;
        this.SLIDE_SPEED  = 0.075;

        // Callbacks (set from main.js)
        this.onRestart   = null;
        this.onMenu      = null;
        this.onMainMenu  = null;
        this.onNextLevel = null;

        // Hit-rects (updated every draw)
        this.soundBtn     = { x: 0, y: 0, w: 52, h: 52 };
        this.pauseBtn     = { x: 0, y: 0, w: 52, h: 52 };
        this.screenBtnRect = { x: 0, y: 0, w: 52, h: 52 };

        // Fullscreen state
        this.isFullscreen = false;
        this._onFSChange  = () => {
            this.isFullscreen = !!(
                document.fullscreenElement       ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement    ||
                document.msFullscreenElement
            );
        };
        document.addEventListener("fullscreenchange",       this._onFSChange);
        document.addEventListener("webkitfullscreenchange", this._onFSChange);
        document.addEventListener("mozfullscreenchange",    this._onFSChange);
        document.addEventListener("MSFullscreenChange",     this._onFSChange);

        // Pause-panel inner buttons
        this._panelPlayBtn    = { x: 0, y: 0, w: 0, h: 0 };
        this._panelRestartBtn = { x: 0, y: 0, w: 0, h: 0 };
        this._panelMenuBtn    = { x: 0, y: 0, w: 0, h: 0 };
    }


    // ── Toggle pause ─────────────────────────────────────────────────────
    _togglePause() {
        this.paused = !this.paused;
        this.panelAnimDir = this.paused ? 1 : -1;
    }

    // ── Trigger Level Cleared panel ──────────────────────────────────────
    showLevelCleared(score, starsCollected, totalStars) {
        if (this.levelCleared) return;
        this.levelCleared            = true;
        this.levelClearedScore       = score;
        this.levelClearedStars       = starsCollected;
        this.levelClearedTotalStars  = totalStars;
        this.levelClearedAnimDir     = 1;
        this.paused                  = true;
        this._lcStarTimers           = [0, 0, 0];
    }

    // ── Click handling ───────────────────────────────────────────────────
    handleClick(mx, my) {
        // Volume button always works
        if (this._inRect(mx, my, this.soundBtn)) {
            this.soundOn = !this.soundOn;
            return "sound";
        }

        // Level Cleared panel buttons
        if (this.levelCleared && this.levelClearedSlide > 0.05) {
            if (this._inRect(mx, my, this._lcMenuBtn)) {
                this.levelCleared = false; this.levelClearedSlide = 0;
                this.levelClearedAnimDir = 0; this.paused = false;
                if (this.onMenu) this.onMenu();
                return "menu";
            }
            if (this._inRect(mx, my, this._lcRestartBtn)) {
                this.levelCleared = false; this.levelClearedSlide = 0;
                this.levelClearedAnimDir = 0; this.paused = false;
                if (this.onRestart) this.onRestart();
                return "restart";
            }
            if (this._inRect(mx, my, this._lcNextBtn)) {
                this.levelCleared = false; this.levelClearedSlide = 0;
                this.levelClearedAnimDir = 0; this.paused = false;
                if (this.onNextLevel) this.onNextLevel();
                else if (this.onMenu) this.onMenu();
                return "next";
            }
            return null;
        }

        // Game Over panel buttons
        if (this.gameOver && this.gameOverSlide > 0.05) {
            if (this._inRect(mx, my, this._gameOverRestartBtn)) {
                this.gameOver = false; this.gameOverSlide = 0;
                this.gameOverAnimDir = 0;
                if (this.onRestart) this.onRestart();
                return "restart";
            }
            if (this._inRect(mx, my, this._gameOverMenuBtn)) {
                this.gameOver = false; this.gameOverSlide = 0;
                this.gameOverAnimDir = 0;
                if (this.onMainMenu) this.onMainMenu();
                return "mainMenu";
            }
            return null;
        }

        // Pause panel inner buttons
        if (this.panelSlide > 0.05) {
            if (this._inRect(mx, my, this._panelPlayBtn)) {
                this._togglePause(); return "play";
            }
            if (this._inRect(mx, my, this._panelRestartBtn)) {
                this.paused = false; this.panelAnimDir = -1;
                if (this.onRestart) this.onRestart(); return "restart";
            }
            if (this._inRect(mx, my, this._panelMenuBtn)) {
                if (this.onMenu) this.onMenu(); return "menu";
            }
            return null;
        }

        // Pause button (top-right)
        if (this._inRect(mx, my, this.pauseBtn)) {
            this._togglePause(); return "pause";
        }

        return null;
    }

    _inRect(mx, my, r) {
        return mx >= r.x && mx <= r.x + r.w &&
               my >= r.y && my <= r.y + r.h;
    }

    // ── Animation steppers ───────────────────────────────────────────────
    _stepAnim() {
        if (this.panelAnimDir === 0) return;
        this.panelSlide += this.panelAnimDir * this.SLIDE_SPEED;
        this.panelSlide = Math.max(0, Math.min(1, this.panelSlide));
        if (this.panelSlide === 0 || this.panelSlide === 1) this.panelAnimDir = 0;
    }

    _stepGameOverAnim() {
        if (this.gameOverAnimDir === 0) return;
        this.gameOverSlide += this.gameOverAnimDir * this.GAMEOVER_SLIDE_SPEED;
        this.gameOverSlide = Math.max(0, Math.min(1, this.gameOverSlide));
        if (this.gameOverSlide === 0 || this.gameOverSlide === 1) this.gameOverAnimDir = 0;
    }

    _stepLevelClearedAnim() {
        if (this.levelClearedAnimDir === 0) return;
        this.levelClearedSlide += this.levelClearedAnimDir * this.LEVELCLEARED_SLIDE_SPEED;
        this.levelClearedSlide = Math.max(0, Math.min(1, this.levelClearedSlide));
        if (this.levelClearedSlide === 0 || this.levelClearedSlide === 1) this.levelClearedAnimDir = 0;
    }

    _stepCoinAnim() {
        this.coinAnimTick++;
        if (this.coinAnimTick >= this.coinAnimSpeed) {
            this.coinAnimTick = 0;
            this.coinFrame = (this.coinFrame + 1) % 6;
        }
    }

    // ════════════════════════════════════════════════════════════════════
    //  Main draw — all measurements relative to viewW / viewH
    // ════════════════════════════════════════════════════════════════════
    draw(ctx, viewW, viewH, score, health, maxHealth = 3) {
        this._stepAnim();
        this._stepCoinAnim();

        // Auto-trigger Game Over
        if (health <= 0 && !this.gameOver && !this.levelCleared) {
            this.gameOver       = true;
            this.gameOverAnimDir = 1;
            this.paused          = false;
        }

        this._stepGameOverAnim();
        this._stepLevelClearedAnim();

        // ── Responsive HUD scale factor ────────────────────────────────
        // viewW/viewH are now virtual dimensions (real screen / camera.scale).
        // Reference is 960×540 — same as Camera.computeScale().
        // On mobile the virtual viewport IS ~960×540, so hudScale ≈ 1.0.
        // On a large desktop (1920×1080 real → still capped to 960×540 virtual)
        // hudScale is also ~1.0. This keeps panels consistently sized.
        const hudScale = Math.max(0.6, Math.min(1.0,
            Math.min(viewW / 960, viewH / 540)
        ));

        // ── TOP-LEFT: coin icon + score + hearts ───────────────────────
        ctx.save();

        const margin  = Math.round(14 * hudScale);
        const panelX  = margin;
        const panelY  = margin;
        const coinSize = Math.round(50 * hudScale);

        if (this.coinImg) {
            const frameW = 39, frameH = 39, cols = 3;
            const sx = (this.coinFrame % cols) * frameW;
            const sy = Math.floor(this.coinFrame / cols) * frameH;
            ctx.drawImage(
                this.coinImg,
                sx + 2, sy + 1.5, frameW, frameH,
                panelX + Math.round(10 * hudScale),
                panelY + Math.round(10 * hudScale),
                coinSize, coinSize
            );
        } else {
            ctx.fillStyle = "#f1c40f";
            ctx.beginPath();
            ctx.arc(panelX + coinSize, panelY + coinSize, coinSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Score text
        const scoreFontSize = Math.round(60 * hudScale);
        ctx.fillStyle    = "#1a1a2e";
        ctx.font         = `bold ${scoreFontSize}px 'Arial Rounded MT Bold', Arial, sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillText(
            String(score).padStart(3, "0"),
            panelX + Math.round(70 * hudScale),
            panelY + Math.round(8  * hudScale)
        );

        // Hearts
        const heartSize = Math.round(50 * hudScale);
        const heartGap  = Math.round(6  * hudScale);
        for (let i = 0; i < maxHealth; i++) {
            const hx = panelX + Math.round(10 * hudScale) + i * (heartSize + heartGap);
            const hy = panelY + Math.round(70 * hudScale);
            if (this.heartImg) {
                ctx.save();
                if (i >= health) ctx.globalAlpha = 0.28;
                ctx.drawImage(this.heartImg, 0, 0, 54, 48, hx, hy, heartSize, heartSize);
                ctx.restore();
            } else {
                ctx.fillStyle = i < health ? "#e74c3c" : "#bdc3c7";
                ctx.beginPath();
                this._heart(ctx,
                    hx + heartSize / 2,
                    hy + heartSize / 2 - 2,
                    heartSize / 2);
                ctx.fill();
            }
        }

        ctx.restore();

        // ── TOP-RIGHT: volume + pause buttons ─────────────────────────
        const topBtnSize = Math.round(52 * hudScale);
        const topMargin  = Math.round(14 * hudScale);
        const topBtnY    = topMargin;

        const pauseX = viewW - topMargin - topBtnSize;
        this.pauseBtn = { x: pauseX, y: topBtnY, w: topBtnSize, h: topBtnSize };

        this._drawCircleBtn(ctx,
            pauseX + topBtnSize / 2, topBtnY + topBtnSize / 2,
            topBtnSize / 2 + 2, "rgba(0,0,0,0.18)");
        const pauseImgSrc = this.pauseImg;
        if (pauseImgSrc && pauseImgSrc.complete && pauseImgSrc.naturalWidth) {
            ctx.drawImage(pauseImgSrc,
                0, 0, pauseImgSrc.naturalWidth, pauseImgSrc.naturalHeight,
                pauseX, topBtnY, topBtnSize, topBtnSize);
        } else {
            this._drawCircleBtn(ctx,
                pauseX + topBtnSize / 2, topBtnY + topBtnSize / 2,
                topBtnSize / 2, "#f39c12");
            ctx.fillStyle = "#fff";
            const pb = topBtnSize / 52; // local scale
            if (this.paused) {
                ctx.beginPath();
                ctx.moveTo(pauseX + 18 * pb, topBtnY + 14 * pb);
                ctx.lineTo(pauseX + 40 * pb, topBtnY + 26 * pb);
                ctx.lineTo(pauseX + 18 * pb, topBtnY + 38 * pb);
                ctx.closePath(); ctx.fill();
            } else {
                ctx.fillRect(pauseX + 15 * pb, topBtnY + 14 * pb, 8 * pb, 24 * pb);
                ctx.fillRect(pauseX + 29 * pb, topBtnY + 14 * pb, 8 * pb, 24 * pb);
            }
        }

        const soundX = viewW - topMargin - topBtnSize * 2 - Math.round(12 * hudScale);
        this.soundBtn = { x: soundX, y: topBtnY, w: topBtnSize, h: topBtnSize };

        this._drawCircleBtn(ctx,
            soundX + topBtnSize / 2, topBtnY + topBtnSize / 2,
            topBtnSize / 2 + 2, "rgba(0,0,0,0.18)");
        const volImgSrc = this.soundOn ? this.volOnImg : this.volOffImg;
        if (volImgSrc && volImgSrc.complete && volImgSrc.naturalWidth) {
            ctx.drawImage(volImgSrc,
                0, 0, volImgSrc.naturalWidth, volImgSrc.naturalHeight,
                soundX, topBtnY, topBtnSize, topBtnSize);
        } else {
            this._drawCircleBtn(ctx,
                soundX + topBtnSize / 2, topBtnY + topBtnSize / 2,
                topBtnSize / 2, "#f39c12");
            ctx.fillStyle = "#fff";
            const sb = topBtnSize / 52;
            ctx.beginPath();
            ctx.moveTo(soundX + 12 * sb, topBtnY + 18 * sb);
            ctx.lineTo(soundX + 20 * sb, topBtnY + 18 * sb);
            ctx.lineTo(soundX + 30 * sb, topBtnY + 11 * sb);
            ctx.lineTo(soundX + 30 * sb, topBtnY + 41 * sb);
            ctx.lineTo(soundX + 20 * sb, topBtnY + 34 * sb);
            ctx.lineTo(soundX + 12 * sb, topBtnY + 34 * sb);
            ctx.closePath(); ctx.fill();
            if (!this.soundOn) {
                ctx.save();
                ctx.strokeStyle = "#e74c3c";
                ctx.lineWidth   = 3;
                ctx.beginPath();
                ctx.moveTo(soundX + 33 * sb, topBtnY + 17 * sb);
                ctx.lineTo(soundX + 44 * sb, topBtnY + 35 * sb);
                ctx.moveTo(soundX + 44 * sb, topBtnY + 17 * sb);
                ctx.lineTo(soundX + 33 * sb, topBtnY + 35 * sb);
                ctx.stroke();
                ctx.restore();
            }
        }

        // ── Pause / Game-Over / Level-Cleared panels ───────────────────
        if (this.panelSlide > 0) {
            this._drawPausePanel(ctx, viewW, viewH);
        }
        if (this.gameOver && this.gameOverSlide > 0) {
            this._drawGameOverPanel(ctx, viewW, viewH);
        }
        if (this.levelCleared && this.levelClearedSlide > 0) {
            this._drawLevelClearedPanel(ctx, viewW, viewH);
        }
    }

    // ════════════════════════════════════════════════════════════════════
    //  PAUSE PANEL
    // ════════════════════════════════════════════════════════════════════
    _drawPausePanel(ctx, viewW, viewH) {
        const t = 1 - Math.pow(1 - this.panelSlide, 3);

        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${0.48 * this.panelSlide})`;
        ctx.fillRect(0, 0, viewW, viewH);
        ctx.restore();

        // Panel dimensions — fit inside the viewport with padding
        const PW = Math.min(380, viewW * 0.55);
        const PH = Math.min(190, viewH * 0.42);
        const px = (viewW - PW) / 2;
        const targetY = (viewH - PH) / 2 - 10;
        const startY  = -PH - 40;
        const py = startY + (targetY - startY) * t;

        ctx.save();

        if (this.pausePanel && this.pausePanel.complete && this.pausePanel.naturalWidth) {
            ctx.drawImage(this.pausePanel,
                0, 0, this.pausePanel.naturalWidth, this.pausePanel.naturalHeight,
                px, py, PW, PH);
        } else {
            const g = ctx.createLinearGradient(px, py, px, py + PH);
            g.addColorStop(0, "#fceabb"); g.addColorStop(1, "#e8c040");
            ctx.fillStyle = g;
            ctx.strokeStyle = "#b87e10"; ctx.lineWidth = 4;
            this._roundRect(ctx, px, py + 36, PW, PH - 36, 20);
            ctx.fill(); ctx.stroke();
        }

        // Three buttons: Play | Restart | Menu — scaled to fit panel
        const btnD    = Math.min(80, Math.round(PH * 0.55));
        const gap     = Math.round(btnD * 0.32);
        const totalW  = btnD * 3 + gap * 2;
        const bx0     = (viewW - totalW) / 2;
        const by      = py + PH / 2 - btnD / 2 + PH * 0.09;

        const btnDefs = [
            { img: this.playImg,    rect: "_panelPlayBtn",    label: "▶" },
            { img: this.restartImg, rect: "_panelRestartBtn", label: "↺" },
            { img: this.menuImg,    rect: "_panelMenuBtn",    label: "☰" },
        ];

        btnDefs.forEach((b, i) => {
            const bx = bx0 + i * (btnD + gap);
            const cx = bx + btnD / 2;
            const cy = by + btnD / 2;

            this[b.rect] = { x: bx, y: by, w: btnD, h: btnD };

            ctx.save();
            ctx.fillStyle = "rgba(0,0,0,0.22)";
            ctx.beginPath();
            ctx.ellipse(cx, by + btnD + 5, btnD / 2 - 6, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            if (b.img && b.img.complete && b.img.naturalWidth) {
                ctx.drawImage(b.img,
                    0, 0, b.img.naturalWidth, b.img.naturalHeight,
                    bx, by, btnD, btnD);
            } else {
                const r  = btnD / 2;
                const bg = ctx.createRadialGradient(cx, cy - r * 0.25, r * 0.05, cx, cy, r);
                bg.addColorStop(0, "#ffdd55"); bg.addColorStop(1, "#e09000");
                ctx.fillStyle = bg; ctx.strokeStyle = "#9a5f00"; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = "#fff";
                ctx.font = `bold ${Math.round(btnD * 0.38)}px Arial`;
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 3;
                ctx.fillText(b.label, cx, cy + 2);
                ctx.shadowBlur = 0;
            }
        });

        ctx.restore();
    }

    // ════════════════════════════════════════════════════════════════════
    //  GAME OVER PANEL
    // ════════════════════════════════════════════════════════════════════
    _drawGameOverPanel(ctx, viewW, viewH) {
        const t = 1 - Math.pow(1 - this.gameOverSlide, 3);

        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${0.65 * this.gameOverSlide})`;
        ctx.fillRect(0, 0, viewW, viewH);
        ctx.restore();

        // Scale panel to fit current viewport
        const PW = Math.min(480, viewW * 0.60);
        const PH = Math.min(280, viewH * 0.65);
        const px = (viewW - PW) / 2;
        const targetY = (viewH - PH) / 2 - 20;
        const startY  = -PH - 60;
        const py = startY + (targetY - startY) * t;

        ctx.save();

        if (this.gameOverImg && this.gameOverImg.complete && this.gameOverImg.naturalWidth) {
            ctx.drawImage(this.gameOverImg,
                0, 0, this.gameOverImg.naturalWidth, this.gameOverImg.naturalHeight,
                px, py, PW, PH);
        } else {
            const g = ctx.createLinearGradient(px, py, px, py + PH);
            g.addColorStop(0, "#ff6b6b"); g.addColorStop(1, "#b82e2e");
            ctx.fillStyle = g; ctx.strokeStyle = "#4a0f0f"; ctx.lineWidth = 8;
            this._roundRect(ctx, px, py, PW, PH, 25);
            ctx.fill(); ctx.stroke();
        }

        // Two buttons: Stop | Continue — centred, scaled
        const btnD   = Math.min(80, Math.round(PH * 0.35));
        const gap    = Math.round(btnD * 0.5);
        const totalW = btnD * 2 + gap;
        const bx0    = (viewW - totalW) / 2;
        // Place buttons in the lower ~60% of the panel
        const by     = py + PH * 0.80;

        const btnDefs = [
            { img: this.stopGame,     rect: "_gameOverMenuBtn",    label: "☰" },
            { img: this.continueGame, rect: "_gameOverRestartBtn", label: "↺" },
        ];

        btnDefs.forEach((b, i) => {
            const bx = bx0 + i * (btnD + gap);
            const cx = bx + btnD / 2;
            const cy = by + btnD / 2;

            this[b.rect] = { x: bx, y: by, w: btnD, h: btnD };

            if (b.img && b.img.complete && b.img.naturalWidth) {
                ctx.drawImage(b.img,
                    0, 0, b.img.naturalWidth, b.img.naturalHeight,
                    bx, by, btnD, btnD);
            } else {
                const r  = btnD / 2;
                const bg = ctx.createRadialGradient(cx, cy - r * 0.25, r * 0.05, cx, cy, r);
                bg.addColorStop(0, "#ffdd55"); bg.addColorStop(1, "#e09000");
                ctx.fillStyle = bg; ctx.strokeStyle = "#9a5f00"; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = "#fff";
                ctx.font = `bold ${Math.round(btnD * 0.38)}px Arial`;
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 3;
                ctx.fillText(b.label, cx, cy + 2);
                ctx.shadowBlur = 0;
            }
        });

        ctx.restore();
    }

    // ════════════════════════════════════════════════════════════════════
    //  LEVEL CLEARED PANEL
    // ════════════════════════════════════════════════════════════════════
    _drawLevelClearedPanel(ctx, viewW, viewH) {
        const t = 1 - Math.pow(1 - this.levelClearedSlide, 3);

        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${0.55 * this.levelClearedSlide})`;
        ctx.fillRect(0, 0, viewW, viewH);
        ctx.restore();

        // Scale panel: allow up to 88 % of width, 92 % of height
        const PW = Math.min(440, viewW * 0.60);
        const PH = Math.min(430, viewH * 0.88);
        const px = (viewW - PW) / 2;
        const targetY = (viewH - PH) / 2 - 10;
        const startY  = -PH - 60;
        const py = startY + (targetY - startY) * t;

        ctx.save();

        // Panel background
        if (this.levelClearImg && this.levelClearImg.complete && this.levelClearImg.naturalWidth) {
            ctx.drawImage(this.levelClearImg,
                0, 0, this.levelClearImg.naturalWidth, this.levelClearImg.naturalHeight,
                px, py, PW, PH);
        } else {
            const g = ctx.createLinearGradient(px, py, px, py + PH);
            g.addColorStop(0, "#fdf6c3"); g.addColorStop(1, "#e8c040");
            ctx.fillStyle = g; ctx.strokeStyle = "#8B5E0A"; ctx.lineWidth = 6;
            this._roundRect(ctx, px, py, PW, PH, 28);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#3dc43a"; ctx.strokeStyle = "#1e7a1c"; ctx.lineWidth = 3;
            this._roundRect(ctx, px + 60, py - 18, PW - 120, 52, 26);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#fff";
            ctx.font = "bold 26px Arial";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("Level Cleared!", viewW / 2, py + 8);
        }

        // ── Stars ────────────────────────────────────────────────────────
        const numStars  = this.levelClearedTotalStars || 3;
        const collected = this.levelClearedStars || 0;

        if (!this._lcStarTimers) this._lcStarTimers = [0, 0, 0];
        for (let i = 0; i < numStars; i++) {
            if (this.levelClearedSlide > 0.55) {
                this._lcStarTimers[i] = Math.min(1,
                    (this._lcStarTimers[i] || 0) + 0.055 - i * 0.012);
            }
        }

        // Scale star sizes relative to panel width
        const starBase   = Math.round(PW * 0.145);
        const starBigger = Math.round(PW * 0.19);
        const starSizes  = [starBase, starBigger, starBase];
        const starYOff   = [
            Math.round(PH * 0.08),
            Math.round(PH * 0.03),
            Math.round(PH * 0.08),
        ];
        const starRowBaseline = py + PH * 0.28;

        const totalGroupW = starSizes[0] + 12 + starSizes[1] + 12 + starSizes[2];
        const groupStartX = viewW / 2 - totalGroupW / 2;
        const starCX = [
            groupStartX + starSizes[0] / 2,
            groupStartX + starSizes[0] + 12 + starSizes[1] / 2,
            groupStartX + starSizes[0] + 12 + starSizes[1] + 12 + starSizes[2] / 2,
        ];

        for (let i = 0; i < numStars; i++) {
            const sz   = starSizes[i];
            const cx   = starCX[i];
            const cy   = starRowBaseline + starYOff[i];
            const pop  = this._lcStarTimers[i] || 0;
            const scale = pop < 1 ? 0.2 + pop * 0.8 : 1;
            const isCollected = i < collected;
            const starImg = isCollected ? this.shiningStarImg : this.emptyStarImg;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scale, scale);
            if (starImg && starImg.complete && starImg.naturalWidth) {
                ctx.drawImage(starImg,
                    0, 0, starImg.naturalWidth, starImg.naturalHeight,
                    -sz / 2, -sz / 2, sz, sz);
            } else {
                this._drawCanvasStar(ctx, 0, 0, sz / 2 - 4,
                    isCollected ? "#f5c518" : "#a0875a");
            }
            ctx.restore();
        }

        // ── Score text ────────────────────────────────────────────────────
        const scoreY    = py + PH * 0.58;
        const scoreFsz  = Math.round(Math.min(60, PW * 0.13));
        ctx.fillStyle   = "#ffffff";
        ctx.strokeStyle = "#111111";
        ctx.lineWidth   = Math.max(3, scoreFsz * 0.1);
        ctx.font        = `bold ${scoreFsz}px 'Arial Rounded MT Bold', Arial, sans-serif`;
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.strokeText(`Score: ${this.levelClearedScore || 0}`, viewW / 2, scoreY);
        ctx.fillText(`Score: ${this.levelClearedScore || 0}`, viewW / 2, scoreY);

        // ── Facebook share button ─────────────────────────────────────────
        const fbW = PW - Math.round(PW * 0.17);
        const fbAR = this.facebookImg && this.facebookImg.naturalWidth
            ? this.facebookImg.naturalWidth / this.facebookImg.naturalHeight
            : 5.5;
        const fbH = fbW / fbAR;
        const fbX = px + (PW - fbW) / 2;
        const fbY = py + PH * 0.67;

        if (this.facebookImg && this.facebookImg.complete && this.facebookImg.naturalWidth) {
            ctx.drawImage(this.facebookImg,
                0, 0, this.facebookImg.naturalWidth, this.facebookImg.naturalHeight,
                fbX, fbY, fbW, fbH);
        } else {
            const fbGrad = ctx.createLinearGradient(fbX, fbY, fbX, fbY + 50);
            fbGrad.addColorStop(0, "#4a90d9"); fbGrad.addColorStop(1, "#2d6cbf");
            ctx.fillStyle = fbGrad; ctx.strokeStyle = "#1a4f9e"; ctx.lineWidth = 3;
            this._roundRect(ctx, fbX, fbY, fbW, Math.max(36, fbH), 12);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#fff";
            ctx.font = `bold ${Math.round(Math.min(18, fbW * 0.045))}px Arial`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("f  Share your Record", viewW / 2, fbY + Math.max(18, fbH / 2));
        }

        // ── Three bottom buttons: Menu | Restart | Next ───────────────────
        const btnD   = Math.min(74, Math.round(PW * 0.16));
        const btnGap = Math.round(btnD * 0.3);
        const totalBtnW = btnD * 3 + btnGap * 2;
        const bx0 = (viewW - totalBtnW) / 2;
        const by  = py + PH - btnD - Math.round(PH * -0.05);

        const btnDefs = [
            { rect: "_lcMenuBtn",    img: this.menuImg    },
            { rect: "_lcRestartBtn", img: this.restartImg },
            { rect: "_lcNextBtn",    img: this.nextImg    },
        ];

        btnDefs.forEach((b, i) => {
            const bx = bx0 + i * (btnD + btnGap);
            const cx = bx + btnD / 2;
            const cy = by + btnD / 2;

            this[b.rect] = { x: bx, y: by, w: btnD, h: btnD };

            if (b.img && b.img.complete && b.img.naturalWidth) {
                ctx.drawImage(b.img,
                    0, 0, b.img.naturalWidth, b.img.naturalHeight,
                    bx, by, btnD, btnD);
            } else {
                const r  = btnD / 2;
                const bg = ctx.createRadialGradient(cx, cy - r * 0.25, r * 0.05, cx, cy, r);
                bg.addColorStop(0, "#ffdd55"); bg.addColorStop(1, "#e09000");
                ctx.fillStyle = bg; ctx.strokeStyle = "#9a5f00"; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
                const labels = ["☰", "↺", "▶▶"];
                ctx.fillStyle = "#fff";
                ctx.font = `bold ${Math.round(btnD * 0.32)}px Arial`;
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText(labels[i], cx, cy + 2);
            }
        });

        ctx.restore();
    }

    // ── Canvas star shape (fallback) ──────────────────────────────────────
    _drawCanvasStar(ctx, cx, cy, r, color) {
        const spikes = 5, outerR = r, innerR = r * 0.42;
        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const angle = (i * Math.PI) / spikes - Math.PI / 2;
            const rad = i % 2 === 0 ? outerR : innerR;
            const x = cx + Math.cos(angle) * rad;
            const y = cy + Math.sin(angle) * rad;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    _drawCircleBtn(ctx, cx, cy, r, color) {
        ctx.save();
        ctx.fillStyle   = color;
        ctx.shadowColor = "rgba(0,0,0,0.25)";
        ctx.shadowBlur  = 8;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _roundRect(ctx, x, y, w, h, r) {
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

    _heart(ctx, cx, cy, size) {
        const s = size * 0.7;
        ctx.moveTo(cx, cy + s * 0.6);
        ctx.bezierCurveTo(cx, cy, cx - s, cy, cx - s, cy - s * 0.4);
        ctx.bezierCurveTo(cx - s, cy - s, cx, cy - s, cx, cy - s * 0.4);
        ctx.bezierCurveTo(cx, cy - s, cx + s, cy - s, cx + s, cy - s * 0.4);
        ctx.bezierCurveTo(cx + s, cy, cx, cy, cx, cy + s * 0.6);
    }
}