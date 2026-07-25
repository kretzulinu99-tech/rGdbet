/* ═══════════════════════════════════════════════════════════════
   slots.js — Apex Virtual Slots Engine 3.0
   Independent Credits & Original Graphics
   v3.0 Sovereign Edition — Total Isolation
═══════════════════════════════════════════════════════════════ */
'use strict';

let SLOTS = {
    built: false,
    currentGame: 'shining',
    isSpinning: false,
    inGamble: false,
    lastWinAmount: 0,
    gambleAmount: 0,
    credits: 0,
    currentBet: 10,
    reels: [[], [], [], [], []],
    gambleHistory: [],
    symbols: {
        shining: [
            { id: 's7', char: '7', color: '#ff0000', val: 5000, img: '7' },
            { id: 'star', char: '⭐', color: '#ffcc00', val: 2000, scatter: true, img: 'star' },
            { id: 'dollar', char: '💵', color: '#00ff88', val: 1000, scatter: true, img: 'dollar' },
            { id: 'grapes', char: '🍇', color: '#bf5fff', val: 500, img: 'grapes' },
            { id: 'watermelon', char: '🍉', color: '#00ff88', val: 500, img: 'watermelon' },
            { id: 'bell', char: '🔔', color: '#ffcc00', val: 200, img: 'bell' },
            { id: 'cherry', char: '🍒', color: '#ff3366', val: 100, img: 'cherry' },
            { id: 'lemon', char: '🍋', color: '#ffff00', val: 100, img: 'lemon' },
            { id: 'plum', char: '🫐', color: '#bf5fff', val: 100, img: 'plum' },
            { id: 'orange', char: '🍊', color: '#ff9900', val: 100, img: 'orange' },
            { id: 'crown', char: '👑', color: '#ffcc00', val: 0, wild: true, img: 'crown' }
        ],
        burning: [
            { id: 'b7', char: '7', color: '#ff0000', val: 3000, img: '7' },
            { id: 'star', char: '⭐', color: '#ffcc00', val: 1500, scatter: true, img: 'star' },
            { id: 'dollar', char: '💵', color: '#00ff88', val: 800, scatter: true, img: 'dollar' },
            { id: 'grapes', char: '🍇', color: '#bf5fff', val: 400, img: 'grapes' },
            { id: 'watermelon', char: '🍉', color: '#00ff88', val: 400, img: 'watermelon' },
            { id: 'bell', char: '🔔', color: '#ffcc00', val: 150, img: 'bell' },
            { id: 'cherry', char: '🍒', color: '#ff3366', val: 80, img: 'cherry' },
            { id: 'lemon', char: '🍋', color: '#ffff00', val: 80, img: 'lemon' },
            { id: 'clover', char: '🍀', color: '#00ff88', val: 0, wild: true, img: 'clover' }
        ]
    }
};

const SYMBOL_SVG = {
    '7': '<svg viewBox="0 0 100 100"><text x="50%" y="75%" text-anchor="middle" font-size="80" font-weight="900" fill="#ff0000" stroke="#fff" stroke-width="2">7</text></svg>',
    'crown': '<svg viewBox="0 0 100 100"><path d="M10 80 L90 80 L80 30 L65 55 L50 20 L35 55 L20 30 Z" fill="#ffcc00" stroke="#fff" stroke-width="2"/></svg>',
    'star': '<svg viewBox="0 0 100 100"><polygon points="50,10 63,38 90,38 69,59 78,90 50,75 22,90 31,59 10,38 37,38" fill="#ffcc00" stroke="#fff" stroke-width="2"/></svg>',
    'dollar': '<svg viewBox="0 0 100 100"><text x="50%" y="70%" text-anchor="middle" font-size="60" fill="#00ff88" stroke="#fff" stroke-width="2" font-weight="900">$</text></svg>',
    'clover': '<svg viewBox="0 0 100 100"><path d="M50 50 Q70 20 90 50 T50 80 T10 50 Q30 20 50 50" fill="#00ff88" stroke="#fff" stroke-width="2"/><path d="M50 50 Q80 70 50 90 T20 50" fill="none" stroke="#fff" stroke-width="3"/></svg>',
    'grapes': '<text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="50">🍇</text>',
    'watermelon': '<text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="50">🍉</text>',
    'bell': '<text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="50">🔔</text>',
    'cherry': '<text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="50">🍒</text>',
    'lemon': '<text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="50">🍋</text>',
    'plum': '<text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="50">🫐</text>',
    'orange': '<text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="50">🍊</text>'
};

function buildSlotsPage() {
    const page = document.getElementById('page-slots');
    if (!page) return;

    SLOTS.built = true;
    loadSlotsCredits();

    page.innerHTML = `
        <div class="slots-main-wrapper ${SLOTS.currentGame}-theme">
            <div class="page-top-title">
                <i class="fa-solid fa-dice" style="color:var(--nb);"></i>
                <span>APEX SLOTS — INDEPENDENT</span>
                <button class="icon-btn" onclick="resetSlotsCredits()" style="margin-left:auto; border:none; background:none; color:var(--text3);"><i class="fa-solid fa-rotate-left"></i></button>
            </div>

            <div class="slots-game-selector">
                <button class="slots-game-btn ${SLOTS.currentGame === 'shining' ? 'active' : ''}" onclick="switchSlotGame('shining')">SHINING CROWN</button>
                <button class="slots-game-btn ${SLOTS.currentGame === 'burning' ? 'active' : ''}" onclick="switchSlotGame('burning')">BURNING HOT</button>
            </div>

            <div class="slots-container">
                <div class="slots-info-header">
                    <div class="info-box">
                        <span class="info-label">APEX CREDITS</span>
                        <span class="info-value" id="slots-balance">${SLOTS.credits.toFixed(2)}</span>
                    </div>
                    <div class="info-box win-box">
                        <span class="info-label">LAST WIN</span>
                        <span class="info-value highlight" id="slots-last-win">0.00</span>
                    </div>
                </div>

                <div class="reels-area" id="reels-area">
                    <div class="reel" id="reel-0"></div>
                    <div class="reel" id="reel-1"></div>
                    <div class="reel" id="reel-2"></div>
                    <div class="reel" id="reel-3"></div>
                    <div class="reel" id="reel-4"></div>
                    <div class="win-lines-overlay" id="win-lines"></div>
                </div>

                <div class="slots-footer-controls">
                    <div class="bet-control">
                        <button class="adj-btn" onclick="adjustBet(-5)">-</button>
                        <div class="bet-val-box">
                            <span class="info-label">BET</span>
                            <span class="info-value" id="slots-current-bet">${SLOTS.currentBet}</span>
                        </div>
                        <button class="adj-btn" onclick="adjustBet(5)">+</button>
                    </div>

                    <button class="spin-main-btn" id="spin-btn" onclick="triggerSpin()">
                        <div class="spin-inner">SPIN</div>
                    </button>

                    <div style="flex:1; display:flex; justify-content:center;">
                        <button class="gamble-trigger-btn" id="gamble-btn" style="display:none;" onclick="openGamble()">
                            GAMBLE
                        </button>
                    </div>
                </div>

                <div class="slots-notice">
                    <i class="fa-solid fa-circle-info"></i> Balanță independentă. Nu afectează bankroll-ul rGdbet.
                </div>
            </div>

            <!-- GAMBLE OVERLAY -->
            <div id="gamble-overlay" class="gamble-overlay" style="display:none;">
                <div class="gamble-box">
                    <div class="gamble-title">GAMBLE AMOUNT</div>
                    <div class="gamble-val" id="gamble-amount-val">0.00</div>

                    <div class="gamble-card-preview">
                        <div id="gamble-card" class="gamble-card-front">?</div>
                    </div>

                    <div class="gamble-history" id="gamble-history"></div>

                    <div class="gamble-actions">
                        <button class="g-btn g-red" onclick="playGamble('red')">RED</button>
                        <button class="g-btn g-black" onclick="playGamble('black')">BLACK</button>
                    </div>
                    <button class="g-take-btn" onclick="takeWin()" style="margin-top:20px;">TAKE WIN</button>
                </div>
            </div>
        </div>
    `;

    initReels();
}

function loadSlotsCredits() {
    const saved = localStorage.getItem('rgb_slots_credits');
    SLOTS.credits = saved ? parseFloat(saved) : 5000;
    saveSlotsCredits();
    updateSlotsDisplay();
}

function saveSlotsCredits() {
    localStorage.setItem('rgb_slots_credits', SLOTS.credits.toFixed(2));
}

function resetSlotsCredits() {
    if (confirm("Resetezi balanța de sloturi la 5000 Credits?")) {
        SLOTS.credits = 5000;
        saveSlotsCredits();
        updateSlotsDisplay();
    }
}

function updateSlotsDisplay() {
    const el = document.getElementById('slots-balance');
    if (el) el.textContent = SLOTS.credits.toFixed(2);
}

function switchSlotGame(game) {
    if (SLOTS.isSpinning || SLOTS.inGamble) return;
    SLOTS.currentGame = game;
    buildSlotsPage();
}

function initReels() {
    const symbols = SLOTS.symbols[SLOTS.currentGame];
    for (let i = 0; i < 5; i++) {
        const reel = document.getElementById(`reel-${i}`);
        if (!reel) continue;
        reel.innerHTML = '';
        for (let j = 0; j < 3; j++) {
            const sym = symbols[Math.floor(Math.random() * symbols.length)];
            reel.appendChild(createSymbolElement(sym));
        }
    }
}

function createSymbolElement(sym) {
    const div = document.createElement('div');
    div.className = 'slot-symbol-box';
    const svg = SYMBOL_SVG[sym.img] || `<text font-size="40">${sym.char}</text>`;
    div.innerHTML = `<div class="symbol-content">${svg}</div>`;
    div.dataset.id = sym.id;
    return div;
}

function adjustBet(amount) {
    if (SLOTS.isSpinning || SLOTS.inGamble) return;
    SLOTS.currentBet = Math.max(5, SLOTS.currentBet + amount);
    const betEl = document.getElementById('slots-current-bet');
    if (betEl) betEl.textContent = SLOTS.currentBet;
}

async function triggerSpin() {
    if (SLOTS.isSpinning || SLOTS.inGamble || SLOTS.credits < SLOTS.currentBet) {
        if (SLOTS.credits < SLOTS.currentBet) {
            if (typeof showMsgToast === 'function') showMsgToast('CREDITE INSUFICIENTE', 'error');
            else alert('CREDITE INSUFICIENTE');
        }
        return;
    }

    SLOTS.isSpinning = true;
    SLOTS.lastWinAmount = 0;

    // Deduct credits
    SLOTS.credits -= SLOTS.currentBet;
    saveSlotsCredits();
    updateSlotsDisplay();

    document.getElementById('spin-btn').classList.add('active-spin');
    document.getElementById('gamble-btn').style.display = 'none';
    document.getElementById('slots-last-win').textContent = '0.00';

    // Clear highlights
    document.querySelectorAll('.winning-symbol').forEach(s => s.classList.remove('winning-symbol'));
    document.querySelectorAll('.expanding-wild').forEach(r => r.classList.remove('expanding-wild'));

    const symbols = SLOTS.symbols[SLOTS.currentGame];
    const results = [];

    for (let i = 0; i < 5; i++) {
        const reel = document.getElementById(`reel-${i}`);
        reel.classList.add('reels-blur');

        const col = [];
        for (let j = 0; j < 3; j++) {
            col.push(symbols[Math.floor(Math.random() * symbols.length)]);
        }
        results.push(col);

        setTimeout(() => {
            reel.innerHTML = '';
            col.forEach(s => reel.appendChild(createSymbolElement(s)));
            reel.classList.remove('reels-blur');
            if (i === 4) evaluateResults(results);
        }, 300 + i * 120);
    }
}

function evaluateResults(results) {
    let win = 0;
    const paylines = [
        [0,0,0,0,0], [1,1,1,1,1], [2,2,2,2,2], // Rows
        [0,1,2,1,0], [2,1,0,1,2], // V shapes
        [0,0,1,2,2], [2,2,1,0,0]  // Diagonals
    ];

    paylines.forEach((line) => {
        const lineSyms = line.map((row, col) => results[col][row]);
        const first = lineSyms[0];
        if (first.wild || first.scatter) return;

        let matches = 1;
        for (let i = 1; i < 5; i++) {
            if (lineSyms[i].id === first.id || lineSyms[i].wild) matches++;
            else break;
        }

        if (matches >= 3) {
            const multiplier = (first.val / 100);
            win += SLOTS.currentBet * multiplier * (matches / 3);
            highlightWin(line, matches);
        }
    });

    if (SLOTS.currentGame === 'shining') {
        for (let col = 1; col <= 3; col++) {
            if (results[col].some(s => s.wild)) {
                document.getElementById(`reel-${col}`).classList.add('expanding-wild');
            }
        }
    }

    if (win > 0) {
        SLOTS.lastWinAmount = win;
        document.getElementById('slots-last-win').textContent = win.toFixed(2);
        document.getElementById('gamble-btn').style.display = 'block';
        triggerBigWinEffect();
    } else {
        SLOTS.isSpinning = false;
        document.getElementById('spin-btn').classList.remove('active-spin');
    }
}

function highlightWin(line, matches) {
    line.slice(0, matches).forEach((row, col) => {
        const reel = document.getElementById(`reel-${col}`);
        if (reel && reel.children[row]) {
            reel.children[row].classList.add('winning-symbol');
        }
    });
}

function openGamble() {
    if (SLOTS.lastWinAmount <= 0) return;
    SLOTS.inGamble = true;
    SLOTS.gambleAmount = SLOTS.lastWinAmount;
    document.getElementById('gamble-overlay').style.display = 'flex';
    document.getElementById('gamble-amount-val').textContent = SLOTS.gambleAmount.toFixed(2);
    document.getElementById('gamble-card').className = 'gamble-card-front';
    document.getElementById('gamble-card').textContent = '?';
    renderGambleHistory();
}

function playGamble(choice) {
    const isRed = Math.random() > 0.5;
    const result = isRed ? 'red' : 'black';
    const cardEl = document.getElementById('gamble-card');

    cardEl.className = `gamble-card-front ${result}`;
    cardEl.textContent = isRed ? '♦' : '♣';

    setTimeout(() => {
        if (choice === result) {
            SLOTS.gambleAmount *= 2;
            document.getElementById('gamble-amount-val').textContent = SLOTS.gambleAmount.toFixed(2);
            SLOTS.gambleHistory.unshift(result);
            if (SLOTS.gambleHistory.length > 10) SLOTS.gambleHistory.pop();
            renderGambleHistory();
            cardEl.className = 'gamble-card-front';
            cardEl.textContent = '?';
        } else {
            SLOTS.lastWinAmount = 0;
            SLOTS.gambleAmount = 0;
            closeGamble();
            SLOTS.isSpinning = false;
            document.getElementById('spin-btn').classList.remove('active-spin');
        }
    }, 800);
}

function takeWin() {
    const finalWin = SLOTS.gambleAmount > 0 ? SLOTS.gambleAmount : SLOTS.lastWinAmount;
    SLOTS.credits += finalWin;
    SLOTS.lastWinAmount = 0;
    SLOTS.gambleAmount = 0;
    saveSlotsCredits();
    updateSlotsDisplay();
    closeGamble();
    SLOTS.isSpinning = false;
    document.getElementById('spin-btn').classList.remove('active-spin');
}

function closeGamble() {
    SLOTS.inGamble = false;
    document.getElementById('gamble-overlay').style.display = 'none';
    document.getElementById('gamble-btn').style.display = 'none';
}

function renderGambleHistory() {
    const histEl = document.getElementById('gamble-history');
    if (histEl) histEl.innerHTML = SLOTS.gambleHistory.map(h => `<div class="hist-dot ${h}"></div>`).join('');
}

function triggerBigWinEffect() {
    if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 70, origin: { y: 0.7 } });
    if (window.Android && typeof Android.vibrate === 'function') Android.vibrate(500);
}

// Hook navigation
(function hookSlotsNav() {
    let tries = 0;
    const iv = setApexInterval(() => {
        tries++;
        if (typeof window.navigateTo === 'function' && !window._slotsNavHooked) {
            const origNav = window.navigateTo;
            window.navigateTo = function (pageId, btnEl) {
                if (pageId === 'slots') buildSlotsPage();
                return origNav.apply(this, arguments);
            };
            window._slotsNavHooked = true;
            clearInterval(iv);
        }
        if (tries > 40) clearInterval(iv);
    }, 150);
})();
