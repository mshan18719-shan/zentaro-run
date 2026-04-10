const STORAGE_KEY = "madboy_progress";

// * Only these levels are actually implemented right now.
const PLAYABLE_LEVELS = new Set([1, 2, 3, 4, 5, 6, 7, 8]);

function defaultLevel() {
    return {
        unlocked: false,
        completed: false,
        stars: 0,
        bestScore: 0,
        checkpoint: {
            score: 0,
            health: 3,
            x: 100,
            y: 0,
            starsCollected: 0,
            doorActivated: false
        },
        world: {
            coins: [],
            stars: [],
            boxes: []
        }
    };
}

function defaultProgress() {
    return {
        currentLevel: 1,
        levels: {
            1: {
                ...defaultLevel(),
                unlocked: true
            }
        }
    };
}

export function getPlayableLevels() {
    return Array.from(PLAYABLE_LEVELS);
}

export function isLevelPlayable(level = 1) {
    return PLAYABLE_LEVELS.has(Number(level));
}

export function loadProgress() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            const data = defaultProgress();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return data;
        }

        const parsed = JSON.parse(raw);

        // todo ==> Safety merge so broken/old saves do not wipe required structure
        if (!parsed || typeof parsed !== "object") {
            const data = defaultProgress();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return data;
        }

        if (!parsed.levels || typeof parsed.levels !== "object") {
            parsed.levels = {};
        }

        if (!parsed.levels[1]) {
            parsed.levels[1] = {
                ...defaultLevel(),
                unlocked: true
            };
        } else {
            parsed.levels[1] = {
                ...defaultLevel(),
                ...parsed.levels[1],
                unlocked: true // level 1 must always stay unlocked
            };
        }

        return parsed;
    } catch (e) {
        const data = defaultProgress();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
    }
}

export function saveProgress(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getLevelProgress(level = 1) {
    const lvl = Number(level);
    const data = loadProgress();

    if (!data.levels[lvl]) {
        data.levels[lvl] = defaultLevel();

        // * only level 1 should default to unlocked
        if (lvl === 1) {
            data.levels[lvl].unlocked = true;
        }

        saveProgress(data);
    }

    return data.levels[lvl];
}

export function saveLevelCheckpoint(level, gameState) {
    const lvl = Number(level);
    const data = loadProgress();

    if (!data.levels[lvl]) {
        data.levels[lvl] = defaultLevel();
    }

    data.currentLevel = lvl;

    data.levels[lvl].checkpoint = {
        score: gameState.score ?? 0,
        health: gameState.health ?? 3,
        x: gameState.x ?? 100,
        y: gameState.y ?? 0,
        starsCollected: gameState.starsCollected ?? 0,
        doorActivated: !!gameState.doorActivated
    };

    data.levels[lvl].world = {
        coins: Array.isArray(gameState.coins) ? gameState.coins : [],
        stars: Array.isArray(gameState.stars) ? gameState.stars : [],
        boxes: Array.isArray(gameState.boxes) ? gameState.boxes : []
    };

    saveProgress(data);
}

export function loadLevelCheckpoint(level = 1) {
    const levelData = getLevelProgress(level);
    return levelData;
}

export function completeLevel(level, score, starsCollected) {
    const lvl = Number(level);
    const data = loadProgress();

    if (!data.levels[lvl]) {
        data.levels[lvl] = defaultLevel();
    }

    const levelData = data.levels[lvl];
    levelData.completed = true;
    levelData.stars = Math.max(0, Math.min(3, starsCollected || 0));
    levelData.bestScore = score || 0;

    const nextLevel = lvl + 1;

    // ! IMPORTANT: Unlock next level only if that level actually exists in game right now.
    if (PLAYABLE_LEVELS.has(nextLevel)) {
        if (!data.levels[nextLevel]) {
            data.levels[nextLevel] = defaultLevel();
        }
        data.levels[nextLevel].unlocked = true;
    }

    saveProgress(data);
}

export function clearLevelCheckpoint(level = 1) {
    const lvl = Number(level);
    const data = loadProgress();

    if (!data.levels[lvl]) {
        data.levels[lvl] = defaultLevel();
    }

    const stars = data.levels[lvl].stars || 0;
    const bestScore = data.levels[lvl].bestScore || 0;
    const unlocked = lvl === 1 ? true : !!data.levels[lvl].unlocked;
    const completed = !!data.levels[lvl].completed;

    data.levels[lvl] = {
        ...defaultLevel(),
        unlocked,
        completed,
        stars,
        bestScore
    };

    saveProgress(data);
}