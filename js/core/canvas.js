const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const dpr = window.devicePixelRatio || 1;

// * ── Lock viewport (disables browser-level pinch-zoom on mobile) ──
(function _lockViewport() {
    let meta = document.querySelector("meta[name='viewport']");
    if (!meta) {
        meta = document.createElement("meta");
        meta.name = "viewport";
        document.head.appendChild(meta);
    }
    meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
})();

// * ── Block all zoom gestures ───────
window.addEventListener("wheel", e => {
    if (e.ctrlKey) e.preventDefault();
}, { passive: false });

window.addEventListener("keydown", e => {
    if (e.ctrlKey && (e.key === "+" || e.key === "-" || e.key === "=" || e.key === "0")) {
        e.preventDefault();
    }
}, { passive: false });

window.addEventListener("touchmove", e => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

let _lastTap = 0;
window.addEventListener("touchend", e => {
    const now = Date.now();
    if (now - _lastTap < 300) e.preventDefault();
    _lastTap = now;
}, { passive: false });

// ! Rotate-screen overlay
let _rotateOverlay = null;

function _isTouchDevice() {
    return navigator.maxTouchPoints > 0 || "ontouchstart" in window;
}

function _isPortrait() {
    if (screen && screen.orientation) {
        const type = screen.orientation.type || "";
        return type.startsWith("portrait");
    }
    return window.innerHeight > window.innerWidth;
}

function _ensureRotateOverlay() {
    if (_rotateOverlay) return;

    _rotateOverlay = document.createElement("div");
    _rotateOverlay.id = "rotateOverlay";

    Object.assign(_rotateOverlay.style, {
        position:         "fixed",
        inset:            "0",
        zIndex:           "99999",
        background:       "linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)",
        display:          "flex",
        flexDirection:    "column",
        alignItems:       "center",
        justifyContent:   "center",
        color:            "#fff",
        fontFamily:       "'Arial Rounded MT Bold', Arial, sans-serif",
        textAlign:        "center",
        padding:          "24px",
        boxSizing:        "border-box",
        userSelect:       "none",
        webkitUserSelect: "none",
    });

    // Animated rotating phone SVG
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 80 80");
    icon.setAttribute("width",  "96");
    icon.setAttribute("height", "96");
    icon.innerHTML = `
      <style>
        @keyframes rotatePhone {
          0%   { transform: rotate(0deg);  }
          40%  { transform: rotate(90deg); }
          60%  { transform: rotate(90deg); }
          100% { transform: rotate(0deg);  }
        }
        .ph { animation: rotatePhone 2.2s ease-in-out infinite;
              transform-origin: 40px 40px; }
      </style>
      <g class="ph">
        <rect x="22" y="10" width="36" height="60" rx="6" ry="6"
              fill="none" stroke="#f9a825" stroke-width="4"/>
        <rect x="30" y="14" width="20" height="10" rx="2"
              fill="#f9a825" opacity="0.35"/>
        <circle cx="40" cy="62" r="3" fill="#f9a825"/>
      </g>
    `;
    icon.style.marginBottom = "28px";
    icon.style.filter = "drop-shadow(0 0 12px rgba(249,168,37,.55))";

    const title = document.createElement("div");
    title.textContent = "Rotate Your Device";
    Object.assign(title.style, {
        fontSize:     "26px",
        fontWeight:   "bold",
        marginBottom: "12px",
        color:        "#f9a825",
        textShadow:   "0 2px 8px rgba(0,0,0,.5)",
    });

    const sub = document.createElement("div");
    sub.textContent = "Please rotate to landscape mode to play the game";
    Object.assign(sub.style, {
        fontSize:   "16px",
        opacity:    "0.82",
        maxWidth:   "280px",
        lineHeight: "1.5",
    });

    _rotateOverlay.appendChild(icon);
    _rotateOverlay.appendChild(title);
    _rotateOverlay.appendChild(sub);
    document.body.appendChild(_rotateOverlay);
}

function _updateRotateOverlay() {
    if (!_isTouchDevice()) {
        if (_rotateOverlay) _rotateOverlay.style.display = "none";
        return;
    }
    _ensureRotateOverlay();
    _rotateOverlay.style.display = _isPortrait() ? "flex" : "none";
}

window.addEventListener("resize",            _updateRotateOverlay);
window.addEventListener("orientationchange", _updateRotateOverlay);
if (screen && screen.orientation) {
    screen.orientation.addEventListener("change", _updateRotateOverlay);
}

// ── Logical (CSS pixel) dimensions ───────────────────────────
export let logicalW = window.innerWidth;
export let logicalH = window.innerHeight;

export let width  = logicalW;
export let height = logicalH;

function resizeCanvas() {
    logicalW = window.innerWidth;
    logicalH = window.innerHeight;
    width  = logicalW;
    height = logicalH;

    canvas.width  = logicalW * dpr;
    canvas.height = logicalH * dpr;

    canvas.style.width  = logicalW + "px";
    canvas.style.height = logicalH + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    _updateRotateOverlay();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

export function getLogical() {
    return { w: logicalW, h: logicalH };
}

export { canvas, ctx, dpr, resizeCanvas };