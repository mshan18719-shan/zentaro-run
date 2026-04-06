// ══════════════════════════════════════════════════════════════
//  input.js  –  Keyboard + touch controls + on-screen control UI
//  FIXES:
//   1. Buttons are large enough to tap comfortably on any phone.
//   2. HUD buttons (volume/pause/panels) now also respond to
//      touchstart — a shared tap-dispatcher fires canvas "click"
//      events so main.js click handler works on touch devices.
// ══════════════════════════════════════════════════════════════

const keys  = {};
const vKeys = { left: false, right: false, up: false };

const ctrlRects = {
    left:  { x: 0, y: 0, w: 0, h: 0 },
    right: { x: 0, y: 0, w: 0, h: 0 },
    jump:  { x: 0, y: 0, w: 0, h: 0 },
};

const touchMap = {};

function ensureCtrlImg(id, src) {
    let img = document.getElementById(id);
    if (!img) {
        img = document.createElement("img");
        img.id  = id;
        img.src = src;
        img.hidden = true;
        document.body.appendChild(img);
    }
    return img;
}

const ctrlImgs = {
    left:  ensureCtrlImg("ctrlLeft",  "assets/moveleft-sheet0.png"),
    right: ensureCtrlImg("ctrlRight", "assets/moveright-sheet0.png"),
    jump:  ensureCtrlImg("ctrlJump",  "assets/jump-sheet0.png"),
};

window.addEventListener("keydown", e => { keys[e.key] = true;  });
window.addEventListener("keyup",   e => { keys[e.key] = false; });

export function isKeyDown(key) {
    if (keys[key]) return true;
    switch (key) {
        case "ArrowLeft":  case "a": case "A": return !!vKeys.left;
        case "ArrowRight": case "d": case "D": return !!vKeys.right;
        case "ArrowUp": case "w": case "W": case " ": return !!vKeys.up;
    }
    return false;
}

export function resetVirtualKeys() {
    vKeys.left  = false;
    vKeys.right = false;
    vKeys.up    = false;
    for (const id in touchMap) delete touchMap[id];
}

// ══════════════════════════════════════════════════════════════
//  setupTouchControls
//  Also installs a touchstart→click bridge so that any tap NOT
//  captured by the movement buttons is re-dispatched as a click
//  event, enabling the HUD volume/pause/panel buttons to work on
//  touch screens (main.js only listens to "click").
// ══════════════════════════════════════════════════════════════
export function setupTouchControls(canvas, getSceneState, GAME_PLAYING_SCENE) {
    function inRect(x, y, r) {
        return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    function canvasXY(e) {
        const rect = canvas.getBoundingClientRect();
        const src  = e.changedTouches ? Array.from(e.changedTouches) : [e];
        return src.map(t => ({
            id: t.identifier ?? "mouse",
            x:  t.clientX - rect.left,
            y:  t.clientY - rect.top,
            // Keep original clientX/Y for synthetic click dispatch
            clientX: t.clientX,
            clientY: t.clientY,
        }));
    }

    function onDown(e) {
        e.preventDefault();

        // ── If not in game scene, every tap becomes a click ───────────
        if (getSceneState() !== GAME_PLAYING_SCENE) {
            const pts = canvasXY(e);
            if (pts.length > 0) _fireSyntheticClick(canvas, pts[0].clientX, pts[0].clientY);
            return;
        }

        // ── In game scene: check movement buttons first ───────────────
        let anyMovement = false;
        for (const p of canvasXY(e)) {
            let btn = null;
            if      (inRect(p.x, p.y, ctrlRects.left))  btn = "left";
            else if (inRect(p.x, p.y, ctrlRects.right)) btn = "right";
            else if (inRect(p.x, p.y, ctrlRects.jump))  btn = "up";

            if (btn) {
                touchMap[p.id] = btn;
                vKeys[btn]     = true;
                anyMovement    = true;
            }
        }

        // If the tap missed all movement buttons, fire as click
        // so HUD buttons (pause, volume, panel buttons) respond
        if (!anyMovement) {
            const pts = canvasXY(e);
            if (pts.length > 0) _fireSyntheticClick(canvas, pts[0].clientX, pts[0].clientY);
        }
    }

    function onUp(e) {
        e.preventDefault();
        if (getSceneState() !== GAME_PLAYING_SCENE) return;
        for (const p of canvasXY(e)) {
            const btn = touchMap[p.id];
            if (btn) { vKeys[btn] = false; delete touchMap[p.id]; }
        }
    }

    canvas.addEventListener("touchstart",  onDown, { passive: false });
    canvas.addEventListener("touchend",    onUp,   { passive: false });
    canvas.addEventListener("touchcancel", onUp,   { passive: false });
    canvas.addEventListener("mousedown",   onDown);
    canvas.addEventListener("mouseup",     onUp);
}

// Fire a real MouseEvent("click") at the given client position.
// This lets the existing click listener in main.js handle all HUD
// interaction without duplicating logic.
function _fireSyntheticClick(canvas, clientX, clientY) {
    const evt = new MouseEvent("click", {
        bubbles:    true,
        cancelable: true,
        view:       window,
        clientX,
        clientY,
    });
    canvas.dispatchEvent(evt);
}

// ══════════════════════════════════════════════════════════════
//  drawTouchControls
//  Button size rules (landscape phone / tablet):
//   • Base size = 18 % of the SHORTER viewport side (vh in
//     landscape), clamped between 70 px and 130 px.
//     This gives ~61 px on a 340 px-tall phone — comfortably
//     tappable — and caps at 130 px on large tablets.
//   • Jump button = 1.25 × base (bigger target is easier to hit).
//   • Safe bottom margin = max(20px, 5% of vh) — avoids the
//     home-indicator bar on iPhones.
//   • Left & Right sit side by side in the bottom-left corner.
//   • Jump sits in the bottom-right corner.
// ══════════════════════════════════════════════════════════════
export function drawTouchControls(ctx, vw, vh) {
    const shortSide = Math.min(vw, vh);

    // Bigger base: 18 % of shorter side, clamped 70–130 px
    const btnSize  = Math.round(Math.max(70, Math.min(130, shortSide * 0.18)));
    const jumpSize = Math.round(btnSize * 1.25);

    const safeLeft   = Math.max(18, Math.round(vw * 0.022));
    const safeBottom = Math.max(20, Math.round(vh * 0.05));
    const innerGap   = Math.round(btnSize * 0.15);

    const lx = safeLeft;
    const ly = vh - safeBottom - btnSize;

    const rx = lx + btnSize + innerGap;
    const ry = ly;

    const jx = vw - safeLeft - jumpSize;
    const jy = vh - safeBottom - jumpSize;

    ctrlRects.left  = { x: lx, y: ly, w: btnSize,  h: btnSize  };
    ctrlRects.right = { x: rx, y: ry, w: btnSize,  h: btnSize  };
    ctrlRects.jump  = { x: jx, y: jy, w: jumpSize, h: jumpSize };

    ctx.save();
    _drawCtrlBtn(ctx, ctrlImgs.left,  lx, ly, btnSize,  vKeys.left,  "◀");
    _drawCtrlBtn(ctx, ctrlImgs.right, rx, ry, btnSize,  vKeys.right, "▶");
    _drawCtrlBtn(ctx, ctrlImgs.jump,  jx, jy, jumpSize, vKeys.up,    "▲");
    ctx.restore();
}

function _drawCtrlBtn(ctx, img, x, y, size, pressed, fallback) {
    const cx = x + size / 2;
    const cy = y + size / 2;

    ctx.save();

    if (pressed) {
        ctx.translate(cx, cy);
        ctx.scale(0.88, 0.88);
        ctx.translate(-cx, -cy);
    }

    if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x, y, size, size);
    } else {
        ctx.fillStyle   = pressed ? "rgba(255,200,0,0.9)" : "rgba(0,0,0,0.5)";
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth   = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle    = "#fff";
        ctx.font         = `bold ${Math.round(size * 0.42)}px Arial`;
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(fallback, cx, cy + 2);
    }

    ctx.restore();
}