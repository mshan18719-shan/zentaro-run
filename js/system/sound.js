// * sound.js  –  Centralised audio manager for Mad Boy Adventure

const BASE = "assets/media/";

// * ── Sound catalogue ───────────────────────────────────────────
// ? key → { src, loop, volume, [category] }
const SOUND_DEFS = {
    // * Background music (looping)
    music:      { src: "grasslands theme.ogg", loop: true,  volume: 0.45, category: "music" },

    // Gameplay SFX
    coin:       { src: "coin2.ogg",            loop: false, volume: 0.75 },
    star:       { src: "collect-star.ogg",     loop: false, volume: 0.80 },
    damage:     { src: "die.ogg",          loop: false, volume: 0.85 },
    die:        { src: "lose.ogg",              loop: false, volume: 0.95 },
    stomp:      { src: "impact2.ogg",       loop: false, volume: 0.80 },
    win:        { src: "win.ogg",              loop: false, volume: 0.85 },
    // lose:       { src: "lose.ogg",             loop: false, volume: 0.99 },
};

// * ── Internal state ──────
const _audio  = {};    // key → HTMLAudioElement
let   _muted  = false;
let   _musicStarted = false;

// * ── Build Audio elements on module load ─────
for (const [key, def] of Object.entries(SOUND_DEFS)) {
    const el = new Audio(BASE + def.src);
    el.loop   = def.loop  ?? false;
    el.volume = def.volume ?? 1.0;
    el.preload = "auto";
    _audio[key] = el;
}

// todo ── Pause all audio when tab is hidden, resume music when back ─
let _pausedByVisibility = false;

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        // * Pause every currently-playing element
        _pausedByVisibility = false;
        for (const el of Object.values(_audio)) {
            if (!el.paused) {
                el.pause();
                _pausedByVisibility = true;   // at least one was running
            }
        }
    } else {
        // ! Only resume the looping music track; SFX one-shots should not restart
        if (_pausedByVisibility && _musicStarted && !_muted) {
            _audio.music.play().catch(() => {});
        }
        _pausedByVisibility = false;
    }
});

export const SoundManager = {

    // * ── Play a one-shot or music track ────────────────────────
    play(key) {
        const el = _audio[key];
        if (!el) return;
        if (_muted) return;

        if (el.loop) {
            // ? For looping music, start only if not already playing
            if (el.paused) el.play().catch(() => {});
        } else {
            // ? For SFX, clone so overlapping plays work (except when music would overlap)
            const clone = el.cloneNode();
            clone.volume = el.volume;
            clone.play().catch(() => {});
        }
    },

    // * ── Start background music (call once on PLAY button click) ──
    startMusic() {
        if (_musicStarted) return;
        _musicStarted = true;
        if (!_muted) {
            _audio.music.play().catch(() => {});
        }
    },

    // * ── Stop the background music ─────────────────────────────
    stopMusic() {
        _audio.music.pause();
        _audio.music.currentTime = 0;
        _musicStarted = false;
    },

    // * ── Pause / resume music (for pause menu) ─────────────────
    pauseMusic() {
        if (!_audio.music.paused) _audio.music.pause();
    },

    resumeMusic() {
        if (_muted) return;
        if (_audio.music.paused && _musicStarted) {
            _audio.music.play().catch(() => {});
        }
    },

    // * ── Mute / unmute (used by the HUD volume button) ─────────
    setMuted(muted) {
        _muted = muted;
        if (muted) {
            // * Silence all currently playing elements
            for (const el of Object.values(_audio)) el.volume = 0;
        } else {
            // * Restore volumes from catalogue
            for (const [key, def] of Object.entries(SOUND_DEFS)) {
                _audio[key].volume = def.volume ?? 1.0;
            }
            // * Resume music if it was started
            if (_musicStarted && _audio.music.paused) {
                _audio.music.play().catch(() => {});
            }
        }
    },

    isMuted() { return _muted; },
};