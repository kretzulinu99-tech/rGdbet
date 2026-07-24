/* ═══════════════════════════════════════════════════════════════
   dna-engine.js — AI Apex DNA 4.0: Quantum Intelligence Engine
   Analiză Multi-Ligă, Volatilitate, Time-Session & 3D Neural Helix.
   v4.0 Apex Intelligence — Cyber-Neural Masterpiece
═══════════════════════════════════════════════════════════════ */
'use strict';

let DNA = {
    built: false,
    analysis: null,
    radarChart: null,
    helixAnimReq: null,
    config: {
        powerSave: false,
        particleCount: 80
    }
};

/**
 * Construiește interfața paginii DNA 4.0
 */
function buildDnaPage() {
    const page = document.getElementById('page-dna');
    if (!page) return;

    DNA.built = true;

    // Reset eventuale animații anterioare
    if (DNA.helixAnimReq) cancelAnimationFrame(DNA.helixAnimReq);

    page.innerHTML = `
        <div class="page-top-title">
            <i class="fa-solid fa-atom fa-spin" style="color:var(--np);"></i>
            <span>APEX DNA 4.0 — QUANTUM COMMAND</span>
            <button class="icon-btn" onclick="runDnaAnalysis()" style="margin-left:auto; border:none; background:none; color:var(--text3);"><i class="fa-solid fa-rotate-right"></i></button>
        </div>

        <div class="dna-crt-overlay"></div>
        <canvas id="dnaQuantumCanvas" style="position:fixed; inset:0; z-index:-1; pointer-events:none;"></canvas>
        <div class="dna-cyber-bg"></div>

        <!-- ── QUANTUM RADAR MAP ── -->
        <div class="dna-radar-container" style="position:relative; overflow:visible;">
            <canvas id="dnaRadarCanvas"></canvas>
            <div class="dna-glitch-label" id="dna-glitch-rank">INITIALIZING...</div>
        </div>

        <div class="dna-header-card dna-card-neon" style="margin-top:-20px; z-index:10; background:rgba(6,9,16,0.8) !important;">
            <div class="dna-score-wrap">
                <div class="dna-score-label">QUANTUM EFFICIENCY</div>
                <div class="dna-score-val" id="dna-score">--</div>
            </div>
            <div style="flex:1; text-align:right;">
                <div id="behavior-status"></div>
                <div style="font-size:9px; color:var(--text3); opacity:0.5; font-family:Syncopate; margin-top:5px;">VOLATILITY: <span id="vol-idx">--</span></div>
            </div>
        </div>

        <div id="dna-content">
            <div class="dna-loading">
                <i class="fa-solid fa-circle-nodes fa-spin"></i>
                <span>Quantum Core Synchronization...</span>
            </div>
        </div>
    `;

    setTimeout(() => {
        runDnaAnalysis();
        startQuantumHelix();
    }, 400);
}

/**
 * 3D Particle Helix Canvas Animation
 */
function startQuantumHelix() {
    const canvas = document.getElementById('dnaQuantumCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const particles = [];
    const count = DNA.config.particleCount;
    let angle = 0;

    function animate() {
        if (!document.getElementById('page-dna').classList.contains('active')) return;

        ctx.clearRect(0, 0, width, height);
        angle += 0.015;

        for (let i = 0; i < count; i++) {
            const t = (i / count) * Math.PI * 2 * 3; // 3 loops
            const y = (i / count) * height;

            // Helix 1 (Violet)
            drawParticle(
                width / 2 + Math.sin(t + angle) * 60,
                y,
                Math.cos(t + angle),
                'rgba(191, 95, 255,'
            );

            // Helix 2 (Cyan)
            drawParticle(
                width / 2 + Math.sin(t + angle + Math.PI) * 60,
                y,
                Math.cos(t + angle + Math.PI),
                'rgba(0, 200, 255,'
            );
        }

        function drawParticle(x, y, z, colorBase) {
            const size = (z + 1.5) * 2;
            const alpha = (z + 1.2) / 2;
            ctx.fillStyle = colorBase + alpha + ')';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();

            if (z > 0.8) { // Add glow to front particles
                ctx.shadowBlur = 15;
                ctx.shadowColor = ctx.fillStyle;
            } else {
                ctx.shadowBlur = 0;
            }
        }

        DNA.helixAnimReq = requestAnimationFrame(animate);
    }
    animate();
}

/**
 * Motorul de analiză Quantum 4.0
 */
function runDnaAnalysis() {
    try {
        const bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]');
        const settled = bets.filter(b => b && (b.status === 'win' || b.status === 'loss' || b.status === 'cashout'));

        if (settled.length < 5) {
            renderDnaEmpty(settled.length);
            return;
        }

        const stats = {
            roi: 0, discipline: 0, consistency: 0, specialization: 0,
            volatility: 0,
            leagues: {},      // ROI per Ligă
            sessions: { day: {s:0,p:0}, night: {s:0,p:0} }, // Sesiuni zi vs noapte
            accVsSingle: { acc: {s:0,p:0}, single: {s:0,p:0} },
            behavior: { revenge: false, euphoria: false, tiltRisk: 0 },
            raw: {
                totalStake: 0, totalProfit: 0,
                confMatch: { count: 0, points: 0 },
                dayDistribution: {},
                oddsBuckets: { low: { s:0, p:0 }, mid: { s:0, p:0 }, high: { s:0, p:0 } },
                stakes: [],
                lastResults: []
            }
        };

        settled.forEach(b => {
            const stake = parseFloat(b.stake) || 0;
            const odds = parseFloat(b.odds) || 1;
            const conf = parseInt(b.confidence) || 1;
            const date = b.date ? new Date(b.date) : new Date(parseInt(b.id) || Date.now());
            const hour = date.getHours();
            let profit = (b.status === 'win') ? (stake * odds) - stake : (b.status === 'loss' ? -stake : (parseFloat(b.cashoutAmount) || 0) - stake);

            stats.raw.totalStake += stake;
            stats.raw.totalProfit += profit;
            stats.raw.stakes.push(stake);
            stats.raw.lastResults.push({ status: b.status, stake, profit });

            // 1. League Analytics
            const league = (b.events && b.events[0]?.league) ? b.events[0].league : 'Others';
            if (!stats.leagues[league]) stats.leagues[league] = { s:0, p:0, c:0 };
            stats.leagues[league].s += stake;
            stats.leagues[league].p += profit;
            stats.leagues[league].c++;

            // 2. Session Analytics (Noapte = 22:00 - 06:00)
            const isNight = hour >= 22 || hour <= 6;
            const sessionKey = isNight ? 'night' : 'day';
            stats.sessions[sessionKey].s += stake;
            stats.sessions[sessionKey].p += profit;

            // 3. Acc vs Single
            const isAcc = (b.events && b.events.length > 1);
            const accKey = isAcc ? 'acc' : 'single';
            stats.accVsSingle[accKey].s += stake;
            stats.accVsSingle[accKey].p += profit;

            // Odds & Discipline (Same logic as 3.0 but tuned)
            let range = odds < 1.6 ? 'low' : (odds <= 2.8 ? 'mid' : 'high');
            stats.raw.oddsBuckets[range].s += stake;
            stats.raw.oddsBuckets[range].p += profit;

            if (conf >= 4) {
                if (b.status === 'win' || b.status === 'cashout') stats.raw.confMatch.points += 10;
                else stats.raw.confMatch.points -= 8;
            }
        });

        // ── QUANTUM METRICS CALC ──

        // Volatility Index (Standard Deviation of Stakes / Mean)
        const avgStake = stats.raw.totalStake / settled.length;
        const squareDiffs = stats.raw.stakes.map(s => Math.pow(s - avgStake, 2));
        const variance = squareDiffs.reduce((a, b) => a + b, 0) / settled.length;
        stats.volatility = (Math.sqrt(variance) / avgStake) * 100;

        // Pillars
        const globalROI = (stats.raw.totalProfit / stats.raw.totalStake) * 100;
        stats.roi = Math.min(100, Math.max(0, 50 + globalROI * 3));
        stats.discipline = Math.min(100, Math.max(0, 50 + (stats.raw.confMatch.points / settled.length) * 15));
        stats.consistency = Math.max(0, 100 - (stats.volatility / 2)); // High volatility = low consistency

        let maxEdge = 0;
        Object.values(stats.leagues).forEach(l => {
            const lROI = (l.p / l.s) * 100;
            if (l.c >= 2 && lROI > maxEdge) maxEdge = lROI;
        });
        stats.specialization = Math.min(100, Math.max(0, 40 + maxEdge * 2.5));

        const finalScore = Math.round(stats.roi * 0.25 + stats.discipline * 0.35 + stats.consistency * 0.2 + stats.specialization * 0.2);

        renderDnaResultsV4(stats, finalScore);
    } catch (err) { console.error("[DNA 4.0] Error:", err); }
}

function renderDnaResultsV4(stats, score) {
    const content = document.getElementById('dna-content');
    if (!content) return;

    // Update Header
    document.getElementById('dna-score').textContent = score;
    document.getElementById('vol-idx').textContent = stats.volatility.toFixed(1) + '%';

    const rankEl = document.getElementById('dna-glitch-rank');
    rankEl.textContent = score > 85 ? "QUANTUM PREDATOR" : (score > 65 ? "NEURAL MASTER" : (score > 45 ? "STOCHASTIC ANALYST" : "DATA VULNERABLE"));
    rankEl.className = 'dna-glitch-label ' + (score > 65 ? 'glitch-green' : 'glitch-red');

    // Behavior Badge
    const bhEl = document.getElementById('behavior-status');
    const isTilt = stats.volatility > 80 || stats.roi < 40;
    bhEl.innerHTML = `<div class="dna-behavior-badge ${isTilt ? 'behavior-critical' : 'behavior-stable'}">
        <i class="fa-solid ${isTilt ? 'fa-radiation' : 'fa-atom'}"></i> ${isTilt ? 'TILT CRITICAL' : 'CORE STABLE'}
    </div>`;

    renderRadarChart(stats);

    // Quantum Insights
    const insights = [];
    // League Insight
    let bestL = 'None', maxLROI = -Infinity;
    Object.keys(stats.leagues).forEach(l => {
        const roi = (stats.leagues[l].p / stats.leagues[l].s) * 100;
        if (stats.leagues[l].c >= 2 && roi > maxLROI) { maxLROI = roi; bestL = l; }
    });
    if (maxLROI > 15) insights.push({ type:'positive', title:'LEAGUE DOMINANCE', text: `DNA-ul tău neural este programat pentru succes în **${bestL}** (+${maxLROI.toFixed(1)}% ROI). Concentrează-te pe această ligă.`, action: 'Vezi meciurile' });

    // Night Session Insight
    const nightROI = (stats.sessions.night.p / stats.sessions.night.s) * 100;
    if (stats.sessions.night.c > 2 && nightROI < -20) insights.push({ type:'negative', title:'NOCTURNAL BLINDSPOT', text: 'Performanța ta scade drastic după ora 22:00. Algoritmul detectează oboseală decizională.', action: 'Dezactivează noaptea' });

    // Volatility Insight
    if (stats.volatility > 70) insights.push({ type:'warning', title:'STAKE VOLATILITY', text: 'Mizele tale variază prea mult. Această instabilitate indică un comportament impulsiv.' });

    // Wisdom Nuggets (v9.0 Engagement)
    const nuggets = [
        "Pariorii de elită petrec mai mult timp analizând în LAB decât plasând bilete.",
        "ADN-ul tău se regenerează după fiecare bilet analizat corect.",
        "Socializează cu pariorii din Social pentru a-ți rafina intuiția.",
        "Cele mai profitabile bilete sunt cele plasate cu un Nivel de Încredere de minim 4 stele."
    ];
    insights.push({ type: 'warning', title: 'APEX WISDOM', text: nuggets[Math.floor(Math.random() * nuggets.length)] });

    content.innerHTML = `
        <div class="dna-insights-grid">
            ${insights.map((i, idx) => `
                <div class="dna-insight-card dna-insight-${i.type} dna-card-neon stagger-in" style="animation: slideDownFast 0.4s ease ${idx*0.15}s;">
                    <div class="dna-insight-header">
                        <i class="fa-solid ${i.type==='positive'?'fa-bolt-lightning':i.type==='negative'?'fa-biohazard':'fa-triangle-exclamation'}"></i>
                        <span>${i.title}</span>
                    </div>
                    <div class="dna-insight-text">${i.text}</div>
                    ${i.action ? `<button class="dna-action-btn-small" onclick="showMsgToast('Se analizează ligile...','info')">${i.action}</button>` : ''}
                </div>
            `).join('')}
        </div>

        <!-- ── CYBER HEATMAP (Mock for Visual) ── -->
        <div class="dna-stats-section dna-card-neon" style="padding:16px;">
            <div class="dna-sec-title">NEURAL HEATMAP — HOURLY ROI</div>
            <div style="display:grid; grid-template-columns:repeat(12, 1fr); gap:4px; height:40px;">
                ${Array(24).fill(0).map((_, h) => {
                    const opacity = Math.random() * 0.8 + 0.1;
                    const color = Math.random() > 0.5 ? 'var(--ng)' : 'var(--danger)';
                    return `<div style="background:${color}; opacity:${opacity}; border-radius:2px;" title="${h}:00"></div>`;
                }).slice(0, 12).join('')}
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:5px; font-size:7px; font-family:Syncopate; opacity:0.4;">
                <span>00:00</span><span>12:00</span><span>23:00</span>
            </div>
        </div>

        <div class="dna-pillar-grid">
            ${renderPillarV4('ROI STABILITY', stats.roi, 'var(--ng)', 'effect-roi-pulse')}
            ${renderPillarV4('DISCIPLINE CORE', stats.discipline, 'var(--nb)', 'effect-discipline-scan')}
            ${renderPillarV4('VOLATILITY CTRL', stats.consistency, 'var(--np)', 'effect-volatility-liquid')}
            ${renderPillarV4('LEAGUE EDGE', stats.specialization, 'var(--gold)', 'effect-edge-glimmer')}
        </div>
    `;
}

function renderPillarV4(label, val, color, effectClass = '') {
    return `
        <div class="dna-pillar-card dna-card-neon ${effectClass}">
            <div class="dna-pillar-head">
                <span class="dna-pillar-label">${label}</span>
                <span class="dna-pillar-val" style="color:${color}">${Math.round(val)}%</span>
            </div>
            <div class="dna-plasma-bar">
                <div class="dna-plasma-fill" style="width:${val}%; background:${color}; box-shadow: 0 0 15px ${color}"></div>
            </div>
        </div>
    `;
}

function renderRadarChart(stats) {
    const ctx = document.getElementById('dnaRadarCanvas');
    if (!ctx || typeof Chart === 'undefined') return;
    if (DNA.radarChart) DNA.radarChart.destroy();

    DNA.radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['ROI', 'DISCIPLINE', 'VOLATILITY', 'EDGE'],
            datasets: [{
                data: [stats.roi, stats.discipline, stats.consistency, stats.specialization],
                backgroundColor: 'rgba(0, 255, 136, 0.2)',
                borderColor: '#00ff88',
                pointBackgroundColor: '#00ff88',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { r: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                angleLines: { color: 'rgba(255, 255, 255, 0.05)' },
                pointLabels: { color: '#aabbcc', font: { family: 'Syncopate', size: 7 } },
                ticks: { display: false }, suggestedMin: 0, suggestedMax: 100
            }},
            plugins: { legend: { display: false } }
        }
    });
}

function renderDnaEmpty(count) {
    const content = document.getElementById('dna-content');
    if (!content) return;
    content.innerHTML = `
        <div class="dna-empty dna-card-neon" style="margin:20px; padding:40px;">
            <i class="fa-solid fa-atom fa-spin" style="font-size:48px; color:var(--np);"></i>
            <p style="font-family:Syncopate; font-size:12px; margin-top:20px; color:#fff;">QUANTUM DATA INSUFFICIENT (${count}/5)</p>
            <span style="font-family:Rajdhani; font-size:14px; opacity:0.6;">Sistemul Quantum are nevoie de o bază de date extinsă pentru a genera pattern-uri de eficiență.</span>
            <button class="main-btn" onclick="navigateTo('addbet', null)" style="margin-top:25px; width:auto; padding:12px 30px;">INITIATE SYNC</button>
        </div>
    `;
}

(function hookDnaNav() {
    let tries = 0;
    const iv = setInterval(() => {
        tries++;
        if (typeof window.navigateTo === 'function' && !window._dnaNavHooked) {
            const origNav = window.navigateTo;
            window.navigateTo = function (pageId, btnEl) {
                if (pageId === 'dna') buildDnaPage();
                return origNav.apply(this, arguments);
            };
            window._dnaNavHooked = true;
            clearInterval(iv);
        }
        if (tries > 40) clearInterval(iv);
    }, 150);
})();
