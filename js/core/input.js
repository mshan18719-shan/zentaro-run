// ══════════════════════════════════════════════════════════════
//  input.js  –  Keyboard + touch controls + on-screen control UI
//  FIXES:
//   1. Buttons are large enough to tap comfortably on any phone.
//   2. HUD buttons (volume/pause/panels) now also respond to
//      touchstart — a shared tap-dispatcher fires canvas "click"
//      events so main.js click handler works on touch devices.
// ══════════════════════════════════════════════════════════════

const keys = {};
const vKeys = { left: false, right: false, up: false };

const ctrlRects = {
    left: { x: 0, y: 0, w: 0, h: 0 },
    right: { x: 0, y: 0, w: 0, h: 0 },
    jump: { x: 0, y: 0, w: 0, h: 0 },
};

const touchMap = {};

function ensureCtrlImg(id, src) {
    let img = document.getElementById(id);
    if (!img) {
        img = document.createElement("img");
        img.id = id;
        img.src = src;
        img.hidden = true;
        document.body.appendChild(img);
    }
    return img;
}

const ctrlImgs = {
    left: ensureCtrlImg("ctrlLeft", "assets/moveleft-sheet0.png"),
    right: ensureCtrlImg("ctrlRight", "assets/moveright-sheet0.png"),
    jump: ensureCtrlImg("ctrlJump", "assets/jump-sheet0.png"),
};

window.addEventListener("keydown", e => { keys[e.key] = true; });
window.addEventListener("keyup", e => { keys[e.key] = false; });

export function isKeyDown(key) {
    if (keys[key]) return true;
    switch (key) {
        case "ArrowLeft": case "a": case "A": return !!vKeys.left;
        case "ArrowRight": case "d": case "D": return !!vKeys.right;
        case "ArrowUp": case "w": case "W": case " ": return !!vKeys.up;
    }
    return false;
}

export function resetVirtualKeys() {
    vKeys.left = false;
    vKeys.right = false;
    vKeys.up = false;
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
        const src = e.changedTouches ? Array.from(e.changedTouches) : [e];
        return src.map(t => ({
            id: t.identifier ?? "mouse",
            x: t.clientX - rect.left,
            y: t.clientY - rect.top,
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
            if (inRect(p.x, p.y, ctrlRects.left)) btn = "left";
            else if (inRect(p.x, p.y, ctrlRects.right)) btn = "right";
            else if (inRect(p.x, p.y, ctrlRects.jump)) btn = "up";

            if (btn) {
                touchMap[p.id] = btn;
                vKeys[btn] = true;
                anyMovement = true;
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

    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchend", onUp, { passive: false });
    canvas.addEventListener("touchcancel", onUp, { passive: false });
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mouseup", onUp);
}

// Fire a real MouseEvent("click") at the given client position.
// This lets the existing click listener in main.js handle all HUD
// interaction without duplicating logic.
function _fireSyntheticClick(canvas, clientX, clientY) {
    const evt = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY,
    });
    canvas.dispatchEvent(evt);
}

// ══════════════════════════════════════════════════════════════
//  drawTouchControls
//  Button size rules (landscape phone / tablet):
//   • Base size = 22 % of the SHORTER viewport side (vh in
//     landscape), clamped between 85 px and 150 px.
//     Larger than before for easier tapping on small phones.
//   • Jump button = 1.25 × base (bigger target is easier to hit).
//   • Safe bottom margin is computed so the TALLEST button (jump)
//     always stays fully on screen — floor is anchored from the
//     bottom edge of the jump button, not its top.
//   • Left & Right sit side by side in the bottom-left corner,
//     vertically centred on the jump button's centre.
//   • Jump sits in the bottom-right corner.
// ══════════════════════════════════════════════════════════════
export function drawTouchControls(ctx, vw, vh) {
    const shortSide = Math.min(vw, vh);

    // Your large sizes
    const btnSize = Math.round(Math.max(130, Math.min(300, shortSide * 1.67)));
    const jumpSize = Math.round(Math.max(140, Math.min(400, shortSide * 1.99)));

    // Fixed layout anchors
    const safeLeft = Math.max(24, Math.round(vw * 0.03));
    const safeRight = Math.max(24, Math.round(vw * 0.03));
    const safeBottom = Math.max(30, Math.round(vh * 0.065));
    const innerGap = Math.round(btnSize * 0.22);

    // Base sizes used only to lock original positions
    const baseBtnSize = 130;
    const baseJumpSize = 140;

    // Fixed centers for buttons
    const leftCX = safeLeft + baseBtnSize / 2;
    const leftCY = vh - safeBottom - baseBtnSize / 2;

    const rightCX = safeLeft + baseBtnSize + innerGap + baseBtnSize / 2;
    const rightCY = leftCY;

    const jumpCX = vw - safeRight - baseJumpSize / 2;
    const jumpCY = vh - safeBottom - baseJumpSize / 2;

    // Real positions derived from fixed centers
    const lx = Math.round(leftCX - btnSize / 2);
    const ly = Math.round(leftCY - btnSize / 2);

    const rx = Math.round(rightCX - btnSize / 2);
    const ry = Math.round(rightCY - btnSize / 2);

    const jx = Math.round(jumpCX - jumpSize / 2);
    const jy = Math.round(jumpCY - jumpSize / 2);

    ctrlRects.left = { x: lx, y: ly, w: btnSize, h: btnSize };
    ctrlRects.right = { x: rx, y: ry, w: btnSize, h: btnSize };
    ctrlRects.jump = { x: jx, y: jy, w: jumpSize, h: jumpSize };

    ctx.save();
    _drawCtrlBtn(ctx, ctrlImgs.left, lx, ly, btnSize, vKeys.left, "◀");
    _drawCtrlBtn(ctx, ctrlImgs.right, rx, ry, btnSize, vKeys.right, "▶");
    _drawCtrlBtn(ctx, ctrlImgs.jump, jx, jy, jumpSize, vKeys.up, "▲");
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
        ctx.fillStyle = pressed ? "rgba(255,200,0,0.9)" : "rgba(0,0,0,0.5)";
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.round(size * 0.42)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(fallback, cx, cy + 2);
    }

    ctx.restore();
}