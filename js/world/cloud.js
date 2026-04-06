// ══════════════════════════════════════════════════════════════
//  cloud.js
//  Phase 12 optimizations:
//    • globalAlpha set once before cloud batch in draw loop (main.js pattern)
//    • ctx.save/restore removed from individual Cloud.draw()
//    • Cloud img cached at module level (one DOM lookup)
// ══════════════════════════════════════════════════════════════

const CLOUD_PARALLAX = 0.25;

// Phase 12: single DOM lookup shared across all clouds
let _cloudImg = null;
function getCloudImg() {
    if (!_cloudImg) _cloudImg = document.getElementById("cloudSheet0");
    return _cloudImg;
}

class Cloud {
    constructor(x, y, scale, speed) {
        this.x     = x;
        this.y     = y;
        this.scale = scale;
        this.speed = speed;

        this.srcW  = 128;
        this.srcH  = 64;
        this.drawW = Math.round(this.srcW * scale);
        this.drawH = Math.round(this.srcH * scale);
    }

    update(camX, viewW) {
        this.x -= this.speed;
        const screenX = this.x - camX * CLOUD_PARALLAX;
        if (screenX + this.drawW < -50) {
            this.x += viewW + this.drawW + 100;
        } else if (screenX > viewW + 50) {
            this.x -= viewW + this.drawW + 100;
        }
    }

    // Phase 12: no ctx.save/restore — caller sets globalAlpha once for all clouds
    draw(ctx, camX) {
        const img = getCloudImg();
        if (!img) return;

        const screenX = Math.round(this.x - camX * CLOUD_PARALLAX);
        const screenY = Math.round(this.y);

        ctx.drawImage(img, 0, 0, this.srcW, this.srcH, screenX, screenY, this.drawW, this.drawH);
    }
}

export function createClouds(mapCols, tileSize) {
    const defs = [
        [  200,  90, 2.2, 0.18],
        [  800,  86, 2.4, 0.14],
        [ 1500,  79, 2.0, 0.20],
        [ 2200,  90, 2.6, 0.12],
        [ 3000,  93, 2.1, 0.17],
        [ 3700,  79, 2.3, 0.15],
        [ 4500,  86, 2.0, 0.19],
        [ 5200,  88, 2.5, 0.13],
        [ 5900,  93, 2.2, 0.16],
        [ 6500,  79, 2.4, 0.14],
    ];
    return defs.map(([x, y, scale, speed]) => new Cloud(x, y, scale, speed));
}

// ── Batch draw helper used by main.js ─────────────────────────
// Call this instead of iterating clouds manually to get the
// single-globalAlpha optimisation automatically.
export function drawClouds(ctx, clouds, camX) {
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = 0.82;
    for (let i = 0; i < clouds.length; i++) clouds[i].draw(ctx, camX);
    ctx.globalAlpha = prevAlpha;
}