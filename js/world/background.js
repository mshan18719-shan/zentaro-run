// * Phase 12 optimizations:
//  *  • bg image cached at module level (no getElementById every frame)
//  * • Uses camera.viewW / camera.viewH (logical px) instead of
//  *    ctx.canvas.width (physical DPR-scaled px) — fixes retina overdraw

let _bg = null;

export function drawBackground(ctx, camera) {
    if (!_bg) _bg = document.getElementById("bg");
    if (!_bg)  return;

    // * Draw at world-space size (viewW/viewH are already in world units,
    // * and ctx is already scaled by camera.scale, so this fills the screen).
    ctx.drawImage(_bg, 0, 0, camera.viewW, camera.viewH);
}