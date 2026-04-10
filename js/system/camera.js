// * camera.js  —  unchanged logic, minor cleanup

export class Camera {
    constructor(canvas, map, tileSize) {
        this.canvas   = canvas;
        this.map      = map;
        this.tileSize = tileSize;

        // ! ── Phase 13: Responsive scale ────────────────────────────
        // ! The game was designed for a ~960×540 "reference" viewport.
        // ! On smaller screens we scale down so the same number of tiles
        // ! remain visible — instead of tiles appearing huge.
        this.scale = Camera.computeScale();

        // * viewW/viewH are the WORLD-SPACE viewport dimensions
        // * (i.e. how many world pixels are visible, = screen / scale).
        this.viewW = window.innerWidth  / this.scale;
        this.viewH = window.innerHeight / this.scale;

        this.x = 0;
        this.y = 0;

        this.mapWidth  = map[0].length * tileSize;
        this.mapHeight = map.length    * tileSize;

        window.addEventListener("resize", () => {
            this.scale = Camera.computeScale();
            this.viewW = window.innerWidth  / this.scale;
            this.viewH = window.innerHeight / this.scale;
        });
    }

    // ! ── Static helper: returns a scale factor so the game always
    // !    shows at least REF_W × REF_H world pixels on screen.
    // !    REF dimensions match the desktop design.
    static computeScale() {
        const REF_W = 960;
        const REF_H = 540;
        const sw = window.innerWidth  / REF_W;
        const sh = window.innerHeight / REF_H;
        // ! Use the smaller ratio so the full reference viewport fits.
        // ! Clamp to 1 so we never upscale on large monitors (keeps desktop identical).
        return Math.min(sw, sh, 1);
    }

    update(player) {
        this.x = player.x + player.width  / 2 - this.viewW / 2;
        this.y = player.y + player.height / 2 - this.viewH / 2;

        const maxX = this.mapWidth - this.viewW;
        this.x = Math.max(0, Math.min(this.x, Math.max(0, maxX)));

        const maxY = this.mapHeight - this.viewH;
        this.y = maxY <= 0 ? maxY : Math.max(0, Math.min(this.y, maxY));
    }
}