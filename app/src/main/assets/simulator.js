/* ═══════════════════════════════════════════════════════════════
   rGdbet SIMULATOR — LABORATOR STATISTIC + SIMULARE MECI
   Modele: Dixon-Coles · Negative Binomial · Monte Carlo (10k)
           Inflație 0-0 · Formă · xG · Raport EV · DSS Engine
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────
   1. MATH UTILITIES
───────────────────────────────────────────── */

// Factorial (cached)
const _factCache = [1];
function factorial(n) {
  if (n < 0) return 0;
  if (_factCache[n] !== undefined) return _factCache[n];
  for (let i = _factCache.length; i <= n; i++) _factCache[i] = _factCache[i-1] * i;
  return _factCache[n];
}

// Poisson PMF: P(X=k | λ)
function poissonPMF(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}

// Negative Binomial PMF: P(X=k | r, p)  — overdispersion model
// Mean = r*(1-p)/p,  Var = r*(1-p)/p^2
function negBinPMF(k, r, p) {
  // r = dispersion, p = success prob
  const logCoeff = logGamma(r + k) - logGamma(r) - logGamma(k + 1);
  return Math.exp(logCoeff + r * Math.log(p) + k * Math.log(1 - p));
}

// Log-Gamma via Lanczos approximation
function logGamma(z) {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// Dixon-Coles τ correction for low scores (0,0), (1,0), (0,1), (1,1)
function dcTau(hg, ag, lambdaH, lambdaA, rho) {
  if (hg === 0 && ag === 0) return 1 - lambdaH * lambdaA * rho;
  if (hg === 1 && ag === 0) return 1 + lambdaA * rho;
  if (hg === 0 && ag === 1) return 1 + lambdaH * rho;
  if (hg === 1 && ag === 1) return 1 - rho;
  return 1;
}

// Gamma random variate (Marsaglia-Tsang)
function randGamma(shape) {
  if (shape < 1) return randGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  const d = shape - 1 / 3;
  const c2 = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do { x = randn(); v = 1 + c2 * x; } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

// Standard normal via Box-Muller
function randn() {
  return Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
}

// Poisson random variate (Knuth for small λ, PA for large)
function randPoisson(lambda) {
  if (lambda <= 0) return 0;
  if (lambda < 30) {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  }
  // Normal approximation for large λ
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * randn()));
}

// Negative Binomial random variate: NB(r,p) = Poisson(Gamma(r,(1-p)/p))
function randNegBin(r, p) {
  const lambda = randGamma(r) * (1 - p) / p;
  return randPoisson(lambda);
}

/* ─────────────────────────────────────────────
   2. SCORE MATRIX (up to MAX_G goals each)
───────────────────────────────────────────── */
const MAX_G = 10;

function buildScoreMatrix(lambdaH, lambdaA, rho, useNB, dispersion) {
  const matrix = [];
  let total = 0;
  for (let h = 0; h <= MAX_G; h++) {
    matrix[h] = [];
    for (let a = 0; a <= MAX_G; a++) {
      let pH, pA;
      if (useNB) {
        // NB: mean = lambda, var = lambda + lambda²/r  =>  r = lambda²/(var-lambda)
        // We model var = lambda * (1 + lambda/dispersion)
        const r = dispersion;
        const p = r / (r + lambdaH);
        const rA = dispersion;
        const pA2 = rA / (rA + lambdaA);
        pH = negBinPMF(h, r, p);
        pA = negBinPMF(a, rA, pA2);
      } else {
        pH = poissonPMF(h, lambdaH);
        pA = poissonPMF(a, lambdaA);
      }
      const tau = dcTau(h, a, lambdaH, lambdaA, rho);
      const val = pH * pA * tau;
      matrix[h][a] = val;
      total += val;
    }
  }
  // Normalize
  for (let h = 0; h <= MAX_G; h++)
    for (let a = 0; a <= MAX_G; a++)
      matrix[h][a] /= total;
  return matrix;
}

/* ─────────────────────────────────────────────
   3. MARKET PROBABILITIES from matrix
───────────────────────────────────────────── */

function getMarketProbs(matrix) {
  let pH = 0, pD = 0, pA = 0;
  let pOver15 = 0, pOver25 = 0, pOver35 = 0;
  let pBTTS = 0;
  const correctScores = {};

  for (let h = 0; h <= MAX_G; h++) {
    for (let a = 0; a <= MAX_G; a++) {
      const p = matrix[h][a];
      if (h > a) pH += p;
      else if (h === a) pD += p;
      else pA += p;

      const total = h + a;
      if (total > 1.5) pOver15 += p;
      if (total > 2.5) pOver25 += p;
      if (total > 3.5) pOver35 += p;
      if (h > 0 && a > 0) pBTTS += p;

      const key = `${h}-${a}`;
      if (h <= 4 && a <= 4) correctScores[key] = (correctScores[key] || 0) + p;
    }
  }

  // Sort correct scores by probability
  const topScores = Object.entries(correctScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return { pH, pD, pA, pOver15, pOver25, pOver35, pBTTS, topScores };
}

/* ─────────────────────────────────────────────
   4. MONTE CARLO SIMULATION (10 000 iterații)
───────────────────────────────────────────── */

function monteCarloSim(lambdaH, lambdaA, rho, useNB, dispersion, N = 10000) {
  const results = { HW: 0, D: 0, AW: 0, BTTS: 0, O15: 0, O25: 0, O35: 0, goals: [] };

  for (let i = 0; i < N; i++) {
    let hg, ag;
    if (useNB) {
      const rH = dispersion, pH2 = rH / (rH + lambdaH);
      const rA = dispersion, pA2 = rA / (rA + lambdaA);
      hg = randNegBin(rH, pH2);
      ag = randNegBin(rA, pA2);
    } else {
      hg = randPoisson(lambdaH);
      ag = randPoisson(lambdaA);
    }

    // Apply Dixon-Coles correction: we use matrix-based MC (monteCarloFromMatrix) anyway

    const tot = hg + ag;
    results.goals.push(tot);
    if (hg > ag) results.HW++;
    else if (hg === ag) results.D++;
    else results.AW++;
    if (hg > 0 && ag > 0) results.BTTS++;
    if (tot > 1) results.O15++;
    if (tot > 2) results.O25++;
    if (tot > 3) results.O35++;
  }

  return {
    pHW: results.HW / N,
    pD:  results.D  / N,
    pAW: results.AW / N,
    pBTTS: results.BTTS / N,
    pO15:  results.O15  / N,
    pO25:  results.O25  / N,
    pO35:  results.O35  / N,
    avgGoals: results.goals.reduce((a, b) => a + b, 0) / N,
    goalsDist: results.goals
  };
}

// Better MC: sample directly from the score matrix CDF
function monteCarloFromMatrix(matrix, N = 10000) {
  // Build flat CDF
  const flat = [];
  for (let h = 0; h <= MAX_G; h++)
    for (let a = 0; a <= MAX_G; a++)
      flat.push({ h, a, p: matrix[h][a] });
  flat.sort((x, y) => y.p - x.p);

  // Cumulative
  let cum = 0;
  const cdf = flat.map(f => { cum += f.p; return { ...f, cum }; });

  const results = { HW: 0, D: 0, AW: 0, BTTS: 0, O15: 0, O25: 0, O35: 0, goals: [], scoreCounts: {} };

  for (let i = 0; i < N; i++) {
    const r = Math.random();
    const idx = cdf.findIndex(c => c.cum >= r);
    const { h, a } = cdf[Math.max(0, idx)];
    const tot = h + a;
    results.goals.push(tot);
    if (h > a) results.HW++;
    else if (h === a) results.D++;
    else results.AW++;
    if (h > 0 && a > 0) results.BTTS++;
    if (tot > 1) results.O15++;
    if (tot > 2) results.O25++;
    if (tot > 3) results.O35++;
    const key = `${h}-${a}`;
    results.scoreCounts[key] = (results.scoreCounts[key] || 0) + 1;
  }

  const avgG = results.goals.reduce((a, b) => a + b, 0) / N;

  // Goals distribution 0-6+
  const goalsDist = Array(7).fill(0);
  results.goals.forEach(g => { goalsDist[Math.min(g, 6)]++; });

  return {
    pHW: results.HW / N, pD: results.D / N, pAW: results.AW / N,
    pBTTS: results.BTTS / N, pO15: results.O15 / N,
    pO25: results.O25 / N, pO35: results.O35 / N,
    avgGoals: avgG, goalsDist: goalsDist.map(x => x / N),
    scoreCounts: results.scoreCounts
  };
}

/* ─────────────────────────────────────────────
   5. EXPECTED VALUE & KELLY
───────────────────────────────────────────── */

function calcEV(prob, odds, stake) {
  // EV = prob * (odds-1) * stake - (1-prob) * stake
  return prob * (odds - 1) * stake - (1 - prob) * stake;
}

function kellyFraction(prob, odds) {
  // Kelly: f* = (prob*(odds-1) - (1-prob)) / (odds-1)
  const b = odds - 1;
  return (prob * b - (1 - prob)) / b;
}

/* ─────────────────────────────────────────────
   6. FORM INDEX
───────────────────────────────────────────── */

function formIndex(results) {
  // results: array of recent results 'W','D','L', most recent last
  // Weighted: more weight to recent games
  const w = [0.1, 0.15, 0.2, 0.25, 0.3];
  let score = 0, totalW = 0;
  const r = results.slice(-5);
  r.forEach((res, i) => {
    const weight = w[i + (5 - r.length)];
    if (res === 'W') score += 3 * weight;
    else if (res === 'D') score += 1 * weight;
    totalW += weight;
  });
  return totalW > 0 ? score / (3 * totalW) : 0.5; // normalized 0-1
}

// xG efficiency: actual goals / xG (squad quality multiplier)
function xgEfficiency(actualGoals, xgGoals) {
  if (xgGoals <= 0) return 1;
  return Math.min(actualGoals / xgGoals, 2); // cap at 2x
}

/* ─────────────────────────────────────────────
   7. MAIN COMPUTE FUNCTION
───────────────────────────────────────────── */

function runSimulator(params) {
  const {
    homeXgFor, homeXgAgainst,
    awayXgFor, awayXgAgainst,
    homeGoalsFor, homeGoalsAgainst,
    awayGoalsFor, awayGoalsAgainst,
    homeForm, awayForm,
    leagueAvgGoals,
    homeAdvantage,
    rho, dispersion, useNB,
    homeOdds, drawOdds, awayOdds,
    over25Odds, bttsOdds, stake
  } = params;

  // Form indices
  const hForm = formIndex(homeForm);
  const aForm = formIndex(awayForm);

  // xG efficiency
  const hXgEff = xgEfficiency(homeGoalsFor, homeXgFor);
  const aXgEff = xgEfficiency(awayGoalsFor, awayXgFor);

  // Adjusted attack/defense using xG + form
  // Attack strength = team xG for / league avg * form * xgEfficiency
  const lgAvg = leagueAvgGoals || 2.6;
  const hAttack  = (homeXgFor  / (lgAvg / 2)) * (0.7 + 0.3 * hForm) * (0.85 + 0.15 * hXgEff);
  const hDefense = (awayXgAgainst / (lgAvg / 2)) * (0.7 + 0.3 * (1 - aForm)) * (0.85 + 0.15 * xgEfficiency(awayGoalsAgainst, awayXgAgainst));
  const aAttack  = (awayXgFor  / (lgAvg / 2)) * (0.7 + 0.3 * aForm) * (0.85 + 0.15 * aXgEff);
  const aDefense = (homeXgAgainst / (lgAvg / 2)) * (0.7 + 0.3 * (1 - hForm)) * (0.85 + 0.15 * xgEfficiency(homeGoalsAgainst, homeXgAgainst));

  // Expected goals for match
  let lambdaH = hAttack * hDefense * (lgAvg / 2) * homeAdvantage;
  let lambdaA = aAttack * aDefense * (lgAvg / 2);

  // Clamp to reasonable range
  lambdaH = Math.min(Math.max(lambdaH, 0.2), 4.5);
  lambdaA = Math.min(Math.max(lambdaA, 0.2), 4.5);

  // Build score matrix (Dixon-Coles)
  const matrix = buildScoreMatrix(lambdaH, lambdaA, rho, useNB, dispersion);

  // Analytical market probs from matrix
  const analytic = getMarketProbs(matrix);

  // Monte Carlo (10k) from matrix
  const mc = monteCarloFromMatrix(matrix, 10000);

  // Blend analytic + MC (analytic is exact for the model; MC adds confidence intervals)
  const blend = {
    pHW:   (analytic.pH * 0.5 + mc.pHW * 0.5),
    pD:    (analytic.pD * 0.5 + mc.pD  * 0.5),
    pAW:   (analytic.pA * 0.5 + mc.pAW * 0.5),
    pOver25: (analytic.pOver25 * 0.5 + mc.pO25 * 0.5),
    pBTTS:   (analytic.pBTTS   * 0.5 + mc.pBTTS * 0.5),
  };

  // EV calculations
  const evH  = calcEV(blend.pHW,   parseFloat(homeOdds) || 0, stake);
  const evD  = calcEV(blend.pD,    parseFloat(drawOdds) || 0, stake);
  const evA  = calcEV(blend.pAW,   parseFloat(awayOdds) || 0, stake);
  const evO25= calcEV(blend.pOver25, parseFloat(over25Odds) || 0, stake);
  const evBTTS= calcEV(blend.pBTTS, parseFloat(bttsOdds) || 0, stake);

  // Kelly
  const kH  = kellyFraction(blend.pHW,   parseFloat(homeOdds) || 1);
  const kD  = kellyFraction(blend.pD,    parseFloat(drawOdds) || 1);
  const kA  = kellyFraction(blend.pAW,   parseFloat(awayOdds) || 1);

  return {
    lambdaH, lambdaA,
    hForm, aForm, hXgEff, aXgEff,
    analytic, mc, blend,
    evH, evD, evA, evO25, evBTTS,
    kH, kD, kA,
    matrix
  };
}

/* ─────────────────────────────────────────────
   8. UI — BUILD THE SIMULATOR PAGE
───────────────────────────────────────────── */

/* ─────────────────────────────────────────
   LABORATOR STATISTIC — page-lab
───────────────────────────────────────── */
function buildLabUI() {
  const container = document.getElementById('page-lab');
  if (!container) return;
  container.innerHTML = `
    <div class="page-top-title">
      <i class="fa-solid fa-chart-line" style="color:var(--nb);"></i>
      <span>LAB — LABORATOR STATISTIC</span>
    </div>

    <!-- ── MATCHUP CARD (echipe, una lângă alta, stil dashboard) ── -->
    <div class="lab-card lab-matchup-card">
      <div class="lab-vs-row">
        <div class="lab-team-block">
          <div class="lab-team-ico home"><i class="fa-solid fa-house"></i></div>
          <input id="sim-home-name" type="text" class="lab-team-input" placeholder="Ex: Barcelona" value="Gazde" />
        </div>
        <div class="lab-vs-badge">VS</div>
        <div class="lab-team-block">
          <div class="lab-team-ico away"><i class="fa-solid fa-plane"></i></div>
          <input id="sim-away-name" type="text" class="lab-team-input" placeholder="Ex: Real Madrid" value="Oaspeți" />
        </div>
      </div>
    </div>

    <!-- ── xG DASHBOARD CARD ── -->
    <div class="lab-card">
      <div class="lab-card-head" onclick="labToggleSection('xg')">
        <div class="lab-card-head-left"><i class="fa-solid fa-bolt lab-head-ico gold"></i><span>xG (EXPECTED GOALS)</span></div>
        <i class="fa-solid fa-chevron-down lab-chevron" id="lab-chev-xg"></i>
      </div>
      <div class="lab-card-body" id="lab-body-xg">
        <div class="lab-stat-grid">
          <div class="lab-stat-cell">
            <label class="lab-stat-label"><i class="fa-solid fa-house"></i> xG Atac</label>
            <input id="sim-h-xgfor" type="number" step="0.01" min="0.1" max="4" class="lab-stat-input" value="1.55" />
          </div>
          <div class="lab-stat-cell">
            <label class="lab-stat-label"><i class="fa-solid fa-house"></i> xG Apărare</label>
            <input id="sim-h-xgag" type="number" step="0.01" min="0.1" max="4" class="lab-stat-input" value="1.10" />
          </div>
          <div class="lab-stat-cell">
            <label class="lab-stat-label"><i class="fa-solid fa-plane"></i> xG Atac</label>
            <input id="sim-a-xgfor" type="number" step="0.01" min="0.1" max="4" class="lab-stat-input" value="1.20" />
          </div>
          <div class="lab-stat-cell">
            <label class="lab-stat-label"><i class="fa-solid fa-plane"></i> xG Apărare</label>
            <input id="sim-a-xgag" type="number" step="0.01" min="0.1" max="4" class="lab-stat-input" value="1.35" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── GOLURI REALE CARD ── -->
    <div class="lab-card">
      <div class="lab-card-head" onclick="labToggleSection('goals')">
        <div class="lab-card-head-left"><i class="fa-solid fa-futbol lab-head-ico blue"></i><span>GOLURI REALE (ULT. 5 MECIURI)</span></div>
        <i class="fa-solid fa-chevron-down lab-chevron" id="lab-chev-goals"></i>
      </div>
      <div class="lab-card-body" id="lab-body-goals">
        <div class="lab-stat-grid lab-stat-grid-4">
          <div class="lab-stat-cell">
            <label class="lab-stat-label"><i class="fa-solid fa-house"></i> Marcate</label>
            <input id="sim-h-gfor" type="number" step="0.1" class="lab-stat-input" value="7" />
          </div>
          <div class="lab-stat-cell">
            <label class="lab-stat-label"><i class="fa-solid fa-house"></i> Primite</label>
            <input id="sim-h-gag" type="number" step="0.1" class="lab-stat-input" value="5" />
          </div>
          <div class="lab-stat-cell">
            <label class="lab-stat-label"><i class="fa-solid fa-plane"></i> Marcate</label>
            <input id="sim-a-gfor" type="number" step="0.1" class="lab-stat-input" value="5" />
          </div>
          <div class="lab-stat-cell">
            <label class="lab-stat-label"><i class="fa-solid fa-plane"></i> Primite</label>
            <input id="sim-a-gag" type="number" step="0.1" class="lab-stat-input" value="6" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── FORMĂ RECENTĂ CARD ── -->
    <div class="lab-card">
      <div class="lab-card-head" onclick="labToggleSection('form')">
        <div class="lab-card-head-left"><i class="fa-solid fa-chart-simple lab-head-ico green"></i><span>FORMĂ RECENTĂ (VECHI→NOU)</span></div>
        <i class="fa-solid fa-chevron-down lab-chevron" id="lab-chev-form"></i>
      </div>
      <div class="lab-card-body" id="lab-body-form">
        <div class="lab-form-row">
          <div class="lab-form-team-label"><i class="fa-solid fa-house"></i> Gazdă</div>
          <div class="form-pills-container" id="form-home-pills">
            ${buildFormPills('h', ['W','W','D','W','W'])}
          </div>
        </div>
        <div class="lab-form-row">
          <div class="lab-form-team-label"><i class="fa-solid fa-plane"></i> Oaspete</div>
          <div class="form-pills-container" id="form-away-pills">
            ${buildFormPills('a', ['L','D','W','D','L'])}
          </div>
        </div>
      </div>
    </div>

    <!-- ── CONFIGURARE MODEL CARD ── -->
    <div class="lab-card">
      <div class="lab-card-head" onclick="labToggleSection('model')">
        <div class="lab-card-head-left"><i class="fa-solid fa-flask lab-head-ico purple"></i><span>CONFIGURARE MODEL</span></div>
        <i class="fa-solid fa-chevron-down lab-chevron" id="lab-chev-model"></i>
      </div>
      <div class="lab-card-body" id="lab-body-model">
        <div class="lab-stat-grid">
          <div class="lab-stat-cell">
            <label class="lab-stat-label">Avg. Goluri Ligă</label>
            <input id="sim-league-avg" type="number" step="0.1" min="1" max="5" class="lab-stat-input" value="2.6" />
          </div>
          <div class="lab-stat-cell">
            <label class="lab-stat-label">Avantaj Teren</label>
            <input id="sim-home-adv" type="number" step="0.01" min="0.8" max="1.6" class="lab-stat-input" value="1.15" />
          </div>
          <div class="lab-stat-cell">
            <label class="lab-stat-label">ρ Dixon-Coles</label>
            <input id="sim-rho" type="number" step="0.01" min="-0.2" max="0" class="lab-stat-input" value="-0.13" />
          </div>
          <div class="lab-stat-cell">
            <label class="lab-stat-label">Dispersie NB</label>
            <input id="sim-dispersion" type="number" step="0.5" min="1" max="20" class="lab-stat-input" value="5" />
          </div>
        </div>
        <div class="sim-toggle-row" style="margin-top:10px;">
          <label class="sim-label">Model distribuție goluri:</label>
          <div class="sim-model-tabs">
            <button class="sim-tab active" id="tab-poisson" onclick="simSetModel('poisson')">Poisson</button>
            <button class="sim-tab" id="tab-nb" onclick="simSetModel('nb')">Neg. Binomial</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── COTE BOOKMAKER CARD ── -->
    <div class="lab-card">
      <div class="lab-card-head" onclick="labToggleSection('odds')">
        <div class="lab-card-head-left"><i class="fa-solid fa-coins lab-head-ico gold"></i><span>COTE BOOKMAKER (PENTRU EV)</span></div>
        <i class="fa-solid fa-chevron-down lab-chevron" id="lab-chev-odds"></i>
      </div>
      <div class="lab-card-body" id="lab-body-odds">
        <div class="lab-stat-grid lab-stat-grid-3">
          <div class="lab-stat-cell">
            <label class="lab-stat-label">1 (Gazdă)</label>
            <input id="sim-odds-h" type="number" step="0.01" min="1" class="lab-stat-input" placeholder="2.10" value="2.10" />
          </div>
          <div class="lab-stat-cell">
            <label class="lab-stat-label">X (Egal)</label>
            <input id="sim-odds-d" type="number" step="0.01" min="1" class="lab-stat-input" placeholder="3.40" value="3.40" />
          </div>
          <div class="lab-stat-cell">
            <label class="lab-stat-label">2 (Oaspete)</label>
            <input id="sim-odds-a" type="number" step="0.01" min="1" class="lab-stat-input" placeholder="3.60" value="3.60" />
          </div>
        </div>
        <div class="lab-stat-grid" style="margin-top:8px;">
          <div class="lab-stat-cell">
            <label class="lab-stat-label">Over 2.5</label>
            <input id="sim-odds-o25" type="number" step="0.01" min="1" class="lab-stat-input" placeholder="1.85" value="1.85" />
          </div>
          <div class="lab-stat-cell">
            <label class="lab-stat-label">BTTS (GG)</label>
            <input id="sim-odds-btts" type="number" step="0.01" min="1" class="lab-stat-input" placeholder="1.75" value="1.75" />
          </div>
        </div>
        <div class="lab-stat-cell" style="margin-top:8px;">
          <label class="lab-stat-label"><i class="fa-solid fa-sack-dollar"></i> Miză analiză (RON)</label>
          <input id="sim-stake" type="number" step="1" min="1" class="lab-stat-input" value="50" />
        </div>
      </div>
    </div>

    <button class="sim-run-btn" id="simRunBtn" onclick="runSimulatorUI()">
      <span id="simRunLabel">🚀 RULEAZĂ SIMULAREA (10.000 iterații)</span>
      <div class="sim-loader" id="simLoader" style="display:none;"></div>
    </button>

    <!-- ── RESULTS PANEL (dashboard) ── -->
    <div id="sim-results" style="display:none;">

      <!-- λ & xG Summary -->
      <div class="lab-card lab-results-card">
        <div class="lab-results-head"><i class="fa-solid fa-bolt"></i> xG EFICIENȚĂ &amp; PARAMETRI</div>
        <div id="sim-xg-cards" class="sim-xg-grid"></div>
      </div>

      <!-- 1X2 Probabilities -->
      <div class="lab-card lab-results-card">
        <div class="lab-results-head"><i class="fa-solid fa-bullseye"></i> PROBABILITĂȚI 1X2 (MODEL + MONTE CARLO)</div>
        <div id="sim-1x2" class="sim-1x2-row"></div>
      </div>

      <!-- Markets -->
      <div class="lab-card lab-results-card">
        <div class="lab-results-head"><i class="fa-solid fa-chart-pie"></i> PIEȚE PRINCIPALE</div>
        <div id="sim-markets"></div>
      </div>

      <!-- Goals distribution chart -->
      <div class="lab-card lab-results-card">
        <div class="lab-results-head"><i class="fa-solid fa-chart-column"></i> DISTRIBUȚIE GOLURI (MONTE CARLO)</div>
        <div style="height:180px; position:relative;">
          <canvas id="simGoalChart"></canvas>
        </div>
      </div>

      <!-- Score matrix heatmap -->
      <div class="lab-card lab-results-card">
        <div class="lab-results-head"><i class="fa-solid fa-table-cells"></i> MATRICE SCORURI (TOP PROBABILITĂȚI)</div>
        <div id="sim-score-matrix" class="sim-matrix-wrap"></div>
      </div>

      <!-- EV Report -->
      <div class="lab-card lab-results-card">
        <div class="lab-results-head"><i class="fa-solid fa-sack-dollar"></i> RAPORT VALOARE AȘTEPTATĂ (EV)</div>
        <div id="sim-ev-report"></div>
      </div>

      <!-- Form visualization -->
      <div class="lab-card lab-results-card">
        <div class="lab-results-head"><i class="fa-solid fa-chart-simple"></i> INDICE DE FORMĂ</div>
        <div id="sim-form-report"></div>
      </div>

      <!-- Disclaimer -->
      <div class="sim-disclaimer">
        ⚠️ Rezultatele sunt generate probabilistic pe baza modelelor matematice Dixon-Coles și Negative Binomial.
        Nu reprezintă garanții. Pariați responsabil.
      </div>

    </div><!-- end sim-results -->
  `;

  // Init model state
  window._simUseNB = false;
  window._simFormH = ['W','W','D','W','W'];
  window._simFormA = ['L','D','W','D','L'];
  initFormPills();
  initLabSections();
}

/* ── Carduri colapsabile (accordion compact pentru dashboard) ── */
function initLabSections() {
  // Prima secțiune (xG) deschisă implicit, restul colapsate, pentru un
  // formular mai compact, fără scroll excesiv.
  ['xg'].forEach(key => {
    const body = document.getElementById('lab-body-' + key);
    if (body) body.classList.add('open');
  });
  ['goals','form','model','odds'].forEach(key => {
    const chev = document.getElementById('lab-chev-' + key);
    if (chev) chev.classList.add('collapsed');
  });
}
window.labToggleSection = function(key) {
  const body = document.getElementById('lab-body-' + key);
  const chev = document.getElementById('lab-chev-' + key);
  if (!body) return;
  body.classList.toggle('open');
  if (chev) chev.classList.toggle('collapsed');
};

function buildFormPills(team, defaults) {
  const options = ['W', 'D', 'L'];
  return defaults.map((val, i) => `
    <div class="form-pill-group">
      ${options.map(o => `
        <button class="form-pill fp-${o.toLowerCase()} ${val === o ? 'active' : ''}"
          onclick="simToggleForm('${team}', ${i}, '${o}', this)">
          ${o}
        </button>`).join('')}
    </div>
  `).join('');
}

function initFormPills() {
  window._simFormH = ['W','W','D','W','W'];
  window._simFormA = ['L','D','W','D','L'];
}

window.simToggleForm = function(team, idx, val, btn) {
  const arr = team === 'h' ? window._simFormH : window._simFormA;
  arr[idx] = val;
  // Update active state in the same group
  const grp = btn.closest('.form-pill-group');
  grp.querySelectorAll('.form-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
};

window.simSetModel = function(model) {
  window._simUseNB = (model === 'nb');
  document.getElementById('tab-poisson').classList.toggle('active', model === 'poisson');
  document.getElementById('tab-nb').classList.toggle('active', model === 'nb');
};

/* ─────────────────────────────────────────────
   9. RUN & RENDER RESULTS
───────────────────────────────────────────── */

window.runSimulatorUI = function() {
  const btn = document.getElementById('simRunBtn');
  const loader = document.getElementById('simLoader');
  const label = document.getElementById('simRunLabel');

  // Show loader
  label.style.display = 'none';
  loader.style.display = 'block';
  btn.disabled = true;

  setTimeout(() => {
    try {
      const params = gatherParams();
      const res = runSimulator(params);
      renderResults(res, params);
      document.getElementById('sim-results').style.display = 'block';
      document.getElementById('sim-results').scrollIntoView({ behavior: 'smooth' });
    } catch(e) {
      console.error(e);
      alert('Eroare simulare: ' + e.message);
    } finally {
      label.style.display = 'block';
      loader.style.display = 'none';
      btn.disabled = false;
    }
  }, 80); // Small delay so loader shows
};

function gatherParams() {
  const g = id => parseFloat(document.getElementById(id).value) || 0;
  const s = id => document.getElementById(id).value.trim();
  return {
    homeXgFor:      g('sim-h-xgfor'),
    homeXgAgainst:  g('sim-h-xgag'),
    awayXgFor:      g('sim-a-xgfor'),
    awayXgAgainst:  g('sim-a-xgag'),
    homeGoalsFor:   g('sim-h-gfor'),
    homeGoalsAgainst: g('sim-h-gag'),
    awayGoalsFor:   g('sim-a-gfor'),
    awayGoalsAgainst: g('sim-a-gag'),
    homeForm:       [...window._simFormH],
    awayForm:       [...window._simFormA],
    leagueAvgGoals: g('sim-league-avg'),
    homeAdvantage:  g('sim-home-adv'),
    rho:            g('sim-rho'),
    dispersion:     g('sim-dispersion'),
    useNB:          window._simUseNB,
    homeOdds:       g('sim-odds-h'),
    drawOdds:       g('sim-odds-d'),
    awayOdds:       g('sim-odds-a'),
    over25Odds:     g('sim-odds-o25'),
    bttsOdds:       g('sim-odds-btts'),
    stake:          g('sim-stake'),
    homeName:       s('sim-home-name') || 'Gazdă',
    awayName:       s('sim-away-name') || 'Oaspete',
  };
}

function pct(v) { return (v * 100).toFixed(1) + '%'; }
function fmt(v) { return v.toFixed(2); }

/* Gauge circular SVG reutilizabil — folosit pentru probabilități 1X2, EV, eficiență xG etc. */
function svgGauge(percentValue, colorVar, size = 76, strokeWidth = 7) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, percentValue));
  const dashOffset = circumference * (1 - clamped);
  const center = size / 2;
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="gauge-svg">
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="${strokeWidth}"/>
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${colorVar}" stroke-width="${strokeWidth}"
        stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
        transform="rotate(-90 ${center} ${center})" class="gauge-arc"/>
    </svg>
  `;
}

function evClass(ev) {
  if (ev > 0) return 'ev-pos';
  if (ev < -5) return 'ev-neg';
  return 'ev-neutral';
}

function kellyLabel(k) {
  if (k <= 0) return { text: 'SKIP', cls: 'kelly-skip' };
  if (k < 0.05) return { text: fmt(k*100)+'% (micro)', cls: 'kelly-low' };
  if (k < 0.15) return { text: fmt(k*100)+'%', cls: 'kelly-med' };
  return { text: fmt(k*100)+'% ⚠️', cls: 'kelly-high' };
}

function renderResults(res, params) {
  const { lambdaH, lambdaA, hForm, aForm, hXgEff, aXgEff,
          analytic, mc, blend, evH, evD, evA, evO25, evBTTS, kH, kD, kA, matrix } = res;
  const { homeName, awayName, homeOdds, drawOdds, awayOdds, over25Odds, bttsOdds, stake } = params;

  // ── xG Cards ──
  document.getElementById('sim-xg-cards').innerHTML = `
    <div class="xg-card xg-home">
      <div class="xg-label">🏠 ${homeName}</div>
      <div class="xg-val">λ = <strong>${fmt(lambdaH)}</strong></div>
      <div class="xg-sub">xG Eficiență: <span class="${hXgEff >= 1 ? 'c-ng' : 'c-danger'}">${fmt(hXgEff)}x</span></div>
      <div class="xg-sub">Indice formă: <span class="c-gold">${pct(hForm)}</span></div>
    </div>
    <div class="xg-card xg-away">
      <div class="xg-label">✈️ ${awayName}</div>
      <div class="xg-val">λ = <strong>${fmt(lambdaA)}</strong></div>
      <div class="xg-sub">xG Eficiență: <span class="${aXgEff >= 1 ? 'c-ng' : 'c-danger'}">${fmt(aXgEff)}x</span></div>
      <div class="xg-sub">Indice formă: <span class="c-gold">${pct(aForm)}</span></div>
    </div>
    <div class="xg-card xg-model">
      <div class="xg-label">🔬 Model</div>
      <div class="xg-val">${params.useNB ? 'Neg. Binomial' : 'Poisson'} + DC</div>
      <div class="xg-sub">ρ = ${fmt(params.rho)}</div>
      <div class="xg-sub">10.000 iter. MC</div>
    </div>
  `;

  // ── 1X2 ──
  const maxP1x2 = Math.max(blend.pHW, blend.pD, blend.pAW);
  document.getElementById('sim-1x2').innerHTML = `
    ${make1x2Card('1', homeName, blend.pHW, analytic.pH, mc.pHW, homeOdds, maxP1x2 === blend.pHW)}
    ${make1x2Card('X', 'Egal', blend.pD, analytic.pD, mc.pD, drawOdds, maxP1x2 === blend.pD)}
    ${make1x2Card('2', awayName, blend.pAW, analytic.pA, mc.pAW, awayOdds, maxP1x2 === blend.pAW)}
  `;

  // ── Markets ──
  document.getElementById('sim-markets').innerHTML = `
    <div class="mkt-bars-wrap">
      ${mktRow('Over 1.5', analytic.pOver15, mc.pO15, (analytic.pOver15+mc.pO15)/2)}
      ${mktRow('Over 2.5', analytic.pOver25, mc.pO25, blend.pOver25)}
      ${mktRow('Over 3.5', analytic.pOver35, mc.pO35, (analytic.pOver35+mc.pO35)/2)}
      ${mktRow('BTTS (GG)', analytic.pBTTS, mc.pBTTS, blend.pBTTS)}
      ${mktRow('Under 2.5', 1-analytic.pOver25, 1-mc.pO25, 1-blend.pOver25)}
      ${mktRow('NG (No GG)', 1-analytic.pBTTS, 1-mc.pBTTS, 1-blend.pBTTS)}
    </div>
    <div class="sim-avg-goals">
      ⚽ Medie goluri estimată: <strong>${fmt(mc.avgGoals)}</strong> per meci
    </div>
  `;

  // ── Goals Chart ──
  renderGoalsChart(mc.goalsDist);

  // ── Score Matrix ──
  renderScoreMatrix(matrix, mc.scoreCounts, homeName, awayName);

  // ── EV Report ──
  document.getElementById('sim-ev-report').innerHTML = `
    <div class="ev-cards-wrap">
      ${evRow('1 — ' + homeName, blend.pHW, homeOdds, evH, kH)}
      ${evRow('X — Egal', blend.pD, drawOdds, evD, kD)}
      ${evRow('2 — ' + awayName, blend.pAW, awayOdds, evA, kA)}
      ${evRow('Over 2.5', blend.pOver25, over25Odds, evO25, kellyFraction(blend.pOver25, parseFloat(over25Odds)||1))}
      ${evRow('BTTS', blend.pBTTS, bttsOdds, evBTTS, kellyFraction(blend.pBTTS, parseFloat(bttsOdds)||1))}
    </div>
    <div class="ev-legend">
      <span class="ev-pos-dot"></span> EV pozitiv = valoare așteptată favorabilă &nbsp;
      <span class="ev-neg-dot"></span> EV negativ = evitați
    </div>
  `;

  // ── Form Report ──
  document.getElementById('sim-form-report').innerHTML = `
    <div class="sim-form-bars">
      ${formBar(homeName, params.homeForm, hForm)}
      ${formBar(awayName, params.awayForm, aForm)}
    </div>
  `;
}

function make1x2Card(label, name, blend, analytic, mc, odds, best) {
  const implied = odds > 0 ? 1 / odds : 0;
  const edge = blend - implied;
  const gaugeColor = best ? 'var(--ng)' : 'var(--nb)';
  return `
    <div class="result-1x2 ${best ? 'result-best' : ''}">
      <div class="gauge-wrap">
        ${svgGauge(blend, gaugeColor, 92, 8)}
        <div class="gauge-center">
          <div class="gauge-label">${label}</div>
          <div class="gauge-pct">${pct(blend)}</div>
        </div>
      </div>
      <div class="res-name">${name}</div>
      <div class="res-sub">Model ${pct(analytic)} · MC ${pct(mc)}</div>
      <div class="res-edge ${edge > 0 ? 'edge-pos' : 'edge-neg'}">
        ${edge > 0 ? '▲' : '▼'} Edge ${edge > 0 ? '+' : ''}${pct(edge)}
      </div>
    </div>
  `;
}

function mktRow(label, analytic, mc, blend) {
  const fair = blend > 0 ? (1/blend).toFixed(2) : '—';
  const widthPct = Math.max(0, Math.min(100, blend * 100));
  const barColor = blend >= 0.6 ? 'var(--ng)' : blend >= 0.35 ? 'var(--gold)' : 'var(--danger)';
  return `
    <div class="mkt-bar-row">
      <div class="mkt-bar-top">
        <span class="mkt-bar-label">${label}</span>
        <span class="mkt-bar-pct" style="color:${barColor};">${pct(blend)}</span>
      </div>
      <div class="mkt-bar-track">
        <div class="mkt-bar-fill" style="width:${widthPct}%; background:${barColor};"></div>
      </div>
      <div class="mkt-bar-sub">Model ${pct(analytic)} · MC ${pct(mc)} · Cotă fair <span class="c-gold">${fair}</span></div>
    </div>
  `;
}

function evRow(label, prob, odds, ev, kelly) {
  const kl = kellyLabel(kelly);
  const verdictCls = ev > 0 ? 'verdict-pos' : 'verdict-neg';
  const verdict = ev > 0 ? '✅ VALUE BET' : (ev > -3 ? '⚠️ MARGINAL' : '❌ SKIP');
  return `
    <div class="ev-card ${evClass(ev)}-card">
      <div class="ev-card-top">
        <span class="ev-card-label">${label}</span>
        <span class="ev-card-verdict ${verdictCls}">${verdict}</span>
      </div>
      <div class="ev-card-stats">
        <div class="ev-stat"><span class="ev-stat-k">Prob.</span><span class="ev-stat-v">${pct(prob)}</span></div>
        <div class="ev-stat"><span class="ev-stat-k">Cotă</span><span class="ev-stat-v">${parseFloat(odds) > 0 ? parseFloat(odds).toFixed(2) : '—'}</span></div>
        <div class="ev-stat"><span class="ev-stat-k">EV</span><span class="ev-stat-v ${evClass(ev)}">${ev > 0 ? '+' : ''}${fmt(ev)} RON</span></div>
        <div class="ev-stat"><span class="ev-stat-k">Kelly</span><span class="ev-stat-v ${kl.cls}">${kl.text}</span></div>
      </div>
    </div>
  `;
}

function formBar(name, results, index) {
  const pills = results.map(r => `<span class="form-badge fb-${r.toLowerCase()}">${r}</span>`).join('');
  const width = (index * 100).toFixed(0);
  const color = index > 0.65 ? 'var(--ng)' : index > 0.4 ? 'var(--gold)' : 'var(--danger)';
  return `
    <div class="form-bar-item">
      <div class="form-bar-name">${name}</div>
      <div class="form-pills-display">${pills}</div>
      <div class="form-index-bar">
        <div class="form-index-fill" style="width:${width}%; background:${color};"></div>
      </div>
      <div class="form-index-val" style="color:${color};">${pct(index)} formă</div>
    </div>
  `;
}

function renderGoalsChart(dist) {
  const canvas = document.getElementById('simGoalChart');
  if (!canvas) return;
  if (window._simGoalChartInst) { window._simGoalChartInst.destroy(); }

  const labels = ['0', '1', '2', '3', '4', '5', '6+'];
  const colors = dist.map((v, i) => {
    if (i <= 1) return 'rgba(255,51,102,0.7)';
    if (i === 2) return 'rgba(255,204,0,0.7)';
    return 'rgba(0,200,255,0.7)';
  });

  window._simGoalChartInst = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Probabilitate goluri totale',
        data: dist.map(v => (v*100).toFixed(2)),
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('0.7','1')),
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => ctx.parsed.y + '%' }
      }},
      scales: {
        x: { ticks: { color: '#aabbcc', font: { family: 'Rajdhani', size: 12 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#aabbcc', font: { family: 'Rajdhani', size: 11 }, callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function renderScoreMatrix(matrix, scoreCounts, homeName, awayName) {
  const N = 10000;
  // Build top 16 scores
  const scores = [];
  for (let h = 0; h <= 5; h++)
    for (let a = 0; a <= 5; a++)
      scores.push({ h, a, p: matrix[h][a], mc: (scoreCounts[`${h}-${a}`] || 0) / N });
  scores.sort((x, y) => y.p - x.p);
  const top = scores.slice(0, 16);
  const maxP = top[0].p;

  const cells = top.map(s => {
    const intensity = Math.round((s.p / maxP) * 100);
    const alpha = 0.1 + (s.p / maxP) * 0.55;
    const color = s.h > s.a ? `rgba(0,200,255,${alpha})` : s.h < s.a ? `rgba(255,51,102,${alpha})` : `rgba(255,204,0,${alpha})`;
    return `
      <div class="matrix-cell" style="background:${color}; border-color:${color.replace(alpha.toFixed(2), '0.6')};">
        <div class="mc-score">${s.h} - ${s.a}</div>
        <div class="mc-prob">${pct(s.p)}</div>
        <div class="mc-mc">${pct(s.mc)}</div>
      </div>
    `;
  }).join('');

  document.getElementById('sim-score-matrix').innerHTML = `
    <div class="matrix-legend">
      <span style="color:var(--nb)">■ Victorie gazdă</span>
      <span style="color:var(--gold)">■ Egal</span>
      <span style="color:var(--danger)">■ Victorie oaspete</span>
    </div>
    <div class="matrix-grid">${cells}</div>
    <div class="matrix-note">Sus: Probabilitate model · Jos: Monte Carlo 10k</div>
  `;
}

/* ─────────────────────────────────────────────
   10. INIT
───────────────────────────────────────────── */

/* ─────────────────────────────────────────
   SIMULARE MECI — page-match
───────────────────────────────────────── */
function buildMatchUI() {
  const container = document.getElementById('page-match');
  if (!container) return;
  // Curățăm orice modal de pauză rămas pe <body> dintr-o sesiune anterioară
  // (vezi dssRunHalf — modalul e mutat pe body ca să nu fie prins de
  // "contain: layout" de pe .spa-page).
  const orphanModal = document.getElementById('dss_modal');
  if (orphanModal && orphanModal.parentElement === document.body) {
    orphanModal.remove();
  }
  container.innerHTML = `
    <div class="page-top-title">
      <i class="fa-solid fa-futbol" style="color:var(--ng);"></i>
      <span>SIM — SIMULARE MECI</span>
    </div>

    <!-- ── SETĂRI GLOBALE CARD ── -->
    <div class="lab-card">
      <div class="lab-card-head" onclick="labToggleSection('dssGlobal')">
        <div class="lab-card-head-left"><i class="fa-solid fa-sliders lab-head-ico blue"></i><span>SETĂRI GLOBALE</span></div>
        <i class="fa-solid fa-chevron-down lab-chevron" id="lab-chev-dssGlobal"></i>
      </div>
      <div class="lab-card-body" id="lab-body-dssGlobal">
        <div class="dss-global">
          <div class="dss-ig">
            <label>Posesie Echipa A <span id="dss_val_posA">50%</span></label>
            <input type="range" id="dss_posA" min="10" max="90" value="50" oninput="dssUpdatePossession()">
          </div>
          <div class="dss-ig">
            <label>Posesie Echipa B <span id="dss_val_posB">50%</span></label>
            <input type="range" id="dss_posB" min="10" max="90" value="50" disabled>
          </div>
          <div class="dss-ig">
            <label>Medie Goluri / Meci <span id="dss_val_avgG">2.5</span></label>
            <input type="range" id="dss_avgG" min="0.5" max="5.0" step="0.1" value="2.5" oninput="dssUpdateVal('avgG')">
          </div>
        </div>
      </div>
    </div>

    <!-- ── ECHIPA A CARD ── -->
    <div class="lab-card">
      <div class="lab-card-head" onclick="labToggleSection('dssTeamA')">
        <div class="lab-card-head-left"><i class="fa-solid fa-house lab-head-ico blue"></i><span>ECHIPA A (ACASĂ)</span></div>
        <i class="fa-solid fa-chevron-down lab-chevron" id="lab-chev-dssTeamA"></i>
      </div>
      <div class="lab-card-body" id="lab-body-dssTeamA">
        <div class="dss-ig"><label>Ofensivă <span id="dss_val_offA">75</span></label><input type="range" id="dss_offA" min="1" max="100" value="75" oninput="dssUpdateVal('offA')"></div>
        <div class="dss-ig"><label>Defensivă <span id="dss_val_defA">70</span></label><input type="range" id="dss_defA" min="1" max="100" value="70" oninput="dssUpdateVal('defA')"></div>
        <div class="dss-ig"><label>Tranziție <span id="dss_val_traA">65</span></label><input type="range" id="dss_traA" min="1" max="100" value="65" oninput="dssUpdateVal('traA')"></div>
        <div class="dss-ig"><label>Agresivitate <span id="dss_val_agrA">80</span></label><input type="range" id="dss_agrA" min="1" max="100" value="80" oninput="dssUpdateVal('agrA')"></div>
        <div class="dss-ig"><label>Disciplină <span id="dss_val_disA">70</span></label><input type="range" id="dss_disA" min="1" max="100" value="70" oninput="dssUpdateVal('disA')"></div>
        <div class="dss-ig"><label>Stamina <span id="dss_val_staA">85</span></label><input type="range" id="dss_staA" min="1" max="100" value="85" oninput="dssUpdateVal('staA')"></div>
      </div>
    </div>

    <!-- ── ECHIPA B CARD ── -->
    <div class="lab-card">
      <div class="lab-card-head" onclick="labToggleSection('dssTeamB')">
        <div class="lab-card-head-left"><i class="fa-solid fa-plane lab-head-ico" style="background:rgba(255,51,102,0.12); color:var(--danger);"></i><span>ECHIPA B (DEPLASARE)</span></div>
        <i class="fa-solid fa-chevron-down lab-chevron" id="lab-chev-dssTeamB"></i>
      </div>
      <div class="lab-card-body" id="lab-body-dssTeamB">
        <div class="dss-ig"><label>Ofensivă <span id="dss_val_offB">70</span></label><input type="range" id="dss_offB" min="1" max="100" value="70" oninput="dssUpdateVal('offB')"></div>
        <div class="dss-ig"><label>Defensivă <span id="dss_val_defB">75</span></label><input type="range" id="dss_defB" min="1" max="100" value="75" oninput="dssUpdateVal('defB')"></div>
        <div class="dss-ig"><label>Tranziție <span id="dss_val_traB">80</span></label><input type="range" id="dss_traB" min="1" max="100" value="80" oninput="dssUpdateVal('traB')"></div>
        <div class="dss-ig"><label>Agresivitate <span id="dss_val_agrB">60</span></label><input type="range" id="dss_agrB" min="1" max="100" value="60" oninput="dssUpdateVal('agrB')"></div>
        <div class="dss-ig"><label>Disciplină <span id="dss_val_disB">85</span></label><input type="range" id="dss_disB" min="1" max="100" value="85" oninput="dssUpdateVal('disB')"></div>
        <div class="dss-ig"><label>Stamina <span id="dss_val_staB">80</span></label><input type="range" id="dss_staB" min="1" max="100" value="80" oninput="dssUpdateVal('staB')"></div>
      </div>
    </div>

    <!-- ── SCOREBOARD CARD ── -->
    <div class="lab-card lab-matchup-card">
      <div class="dss-sb-wrap">
        <svg class="dss-sb-pitch" viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="dssGrass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1a6b30"/>
              <stop offset="100%" stop-color="#145224"/>
            </linearGradient>
          </defs>
          <rect width="320" height="200" fill="url(#dssGrass)"/>
          <rect x="0"   y="0" width="40" height="200" fill="rgba(0,0,0,0.07)"/>
          <rect x="80"  y="0" width="40" height="200" fill="rgba(0,0,0,0.07)"/>
          <rect x="160" y="0" width="40" height="200" fill="rgba(0,0,0,0.07)"/>
          <rect x="240" y="0" width="40" height="200" fill="rgba(0,0,0,0.07)"/>
          <rect x="8" y="8" width="304" height="184" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2" rx="2"/>
          <line x1="160" y1="8" x2="160" y2="192" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
          <circle cx="160" cy="100" r="34" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.5"/>
          <circle cx="160" cy="100" r="2.5" fill="rgba(255,255,255,0.7)"/>
          <rect x="8" y="58" width="46" height="84" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.2"/>
          <rect x="8" y="76" width="18" height="48" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="1"/>
          <rect x="3" y="85" width="6" height="30" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="1.5"/>
          <path d="M 54 75 A 24 24 0 0 1 54 125" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1" stroke-dasharray="3 2"/>
          <circle cx="40" cy="100" r="2" fill="rgba(255,255,255,0.6)"/>
          <rect x="266" y="58" width="46" height="84" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.2"/>
          <rect x="294" y="76" width="18" height="48" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="1"/>
          <rect x="311" y="85" width="6" height="30" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="1.5"/>
          <path d="M 266 75 A 24 24 0 0 0 266 125" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1" stroke-dasharray="3 2"/>
          <circle cx="280" cy="100" r="2" fill="rgba(255,255,255,0.6)"/>
          <path d="M 8 8  A 8 8 0 0 1 16 16"   fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.2"/>
          <path d="M 312 8  A 8 8 0 0 0 304 16" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.2"/>
          <path d="M 8 192 A 8 8 0 0 0 16 184"  fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.2"/>
          <path d="M 312 192 A 8 8 0 0 1 304 184" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.2"/>
          <rect x="80" y="62" width="160" height="76" rx="10" fill="rgba(0,0,0,0.52)"/>
        </svg>
        <div class="dss-sb-over">
          <div class="dss-min" id="dss_min">⏱ 00:00</div>
          <div class="dss-score" id="dss_score">0 - 0</div>
          <div class="dss-banner status vis" id="dss_banner">Așteptare Calibrare...</div>
        </div>
      </div>
      <button class="dss-btn dss-btn-r1" id="dss_btn_h1" onclick="dssRunHalf(1)">▶ RULEAZĂ REPRIZA 1</button>
      <button class="dss-btn dss-btn-r2" id="dss_btn_h2" onclick="dssRunHalf(2)" style="display:none;">▶ RULEAZĂ REPRIZA 2</button>
      <button class="dss-btn dss-btn-rst" id="dss_btn_rst" onclick="dssReset()" style="display:none;">↺ SIMULARE NOUĂ</button>
    </div>

    <!-- ── RAPORT CARD ── -->
    <div class="lab-card lab-results-card" id="dss_report" style="display:none;">
      <div class="lab-results-head"><i class="fa-solid fa-chart-pie"></i> RAPORT DE ANALIZĂ</div>
      <div class="dss-report-grid">
        <div>
          <h3 style="font-family:'Syncopate';font-size:9px;color:var(--text2);letter-spacing:1px;margin-bottom:8px;">STATISTICI MECI</h3>
          <table class="dss-stat-table">
            <tr><th>Stat</th><th>R1 (A-B)</th><th>R2 (A-B)</th><th>TOT</th></tr>
            <tr><td>⚽ Goluri</td>      <td id="dss_g_h1">-</td><td id="dss_g_h2">-</td><td id="dss_g_tot" class="dss-goal-val">-</td></tr>
            <tr><td>🚩 Cornere</td>     <td id="dss_c_h1">-</td><td id="dss_c_h2">-</td><td id="dss_c_tot">-</td></tr>
            <tr><td>👟 Șuturi</td>      <td id="dss_s_h1">-</td><td id="dss_s_h2">-</td><td id="dss_s_tot">-</td></tr>
            <tr><td>🟨 Galbene</td>     <td id="dss_y_h1">-</td><td id="dss_y_h2">-</td><td id="dss_y_tot" class="dss-yellow-val">-</td></tr>
            <tr><td>🟥 Roșii</td>       <td id="dss_r_h1">-</td><td id="dss_r_h2">-</td><td id="dss_r_tot" class="dss-red-val">-</td></tr>
            <tr><td>⚠️ Fault-uri</td>   <td id="dss_f_h1">-</td><td id="dss_f_h2">-</td><td id="dss_f_tot">-</td></tr>
          </table>
        </div>
        <div>
          <h3 style="font-family:'Syncopate';font-size:9px;color:var(--text2);letter-spacing:1px;margin-bottom:8px;">PROBABILITĂȚI (COTE)</h3>
          <table class="dss-odds-table">
            <tr><th>Piață</th><th>Prob.</th><th>Cotă</th></tr>
            <tr><td>Victorie A</td><td id="dss_p1">-</td><td class="dss-odds-val" id="dss_o1">-</td></tr>
            <tr><td>Egal</td>      <td id="dss_px">-</td><td class="dss-odds-val" id="dss_ox">-</td></tr>
            <tr><td>Victorie B</td><td id="dss_p2">-</td><td class="dss-odds-val" id="dss_o2">-</td></tr>
            <tr><td>Peste 2.5</td> <td id="dss_po25">-</td><td class="dss-odds-val" id="dss_oo25">-</td></tr>
            <tr><td>Sub 2.5</td>   <td id="dss_pu25">-</td><td class="dss-odds-val" id="dss_ou25">-</td></tr>
            <tr><td>BTTS</td>      <td id="dss_pbtts">-</td><td class="dss-odds-val" id="dss_obtts">-</td></tr>
          </table>
          <div class="dss-narrative" id="dss_narrative"></div>
        </div>
      </div>
    </div>

    <!-- MODAL PAUZA -->
    <div class="dss-modal" id="dss_modal">
      <div class="dss-modal-box">
        <div class="dss-modal-title">⏸ PAUZĂ — REPRIZA 1 ÎNCHEIATĂ</div>
        <div class="dss-modal-score" id="dss_modal_score">0 - 0</div>
        <div class="dss-modal-text" id="dss_modal_text"></div>
        <button class="dss-btn dss-btn-r2" style="margin-top:0;" onclick="dssCloseModal()">▶ CONTINUĂ REPRIZA 2</button>
      </div>
    </div>
  `;
  // Init banner DSS
  const banner = document.getElementById('dss_banner');
  if (banner) { banner.className = 'dss-banner status vis'; }
  window.dssUpdatePossession && window.dssUpdatePossession();
  ['offA','defA','traA','agrA','disA','staA','offB','defB','traB','agrB','disB','staB','avgG'].forEach(id => {
    window.dssUpdateVal && window.dssUpdateVal(id);
  });
  // Toate cardurile colapsabile deschise implicit pe pagina Simulator
  // (sunt doar 3, mai puține decât în Lab, deci nu e nevoie de accordion strict).
  ['dssGlobal','dssTeamA','dssTeamB'].forEach(key => {
    const body = document.getElementById('lab-body-' + key);
    if (body) body.classList.add('open');
  });
}

/*  ─────────────────────────────────────
   10. INIT
───────────────────────────────────────────────────────────────── */
function init() {
  buildLabUI();
  buildMatchUI();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* ─────────────────────────────────────────────
   DSS ENGINE — SIMULARE MECI
───────────────────────────────────────────── */

// ── Helper citire slider ──
function dssG(id) { return parseFloat(document.getElementById('dss_' + id).value); }

window.dssUpdateVal = function(id) {
  const el = document.getElementById('dss_' + id);
  const span = document.getElementById('dss_val_' + id);
  if (!el || !span) return;
  span.textContent = el.step && parseFloat(el.step) < 1
    ? parseFloat(el.value).toFixed(1) : el.value;
};

window.dssUpdatePossession = function() {
  const a = dssG('posA');
  document.getElementById('dss_posB').value = 100 - a;
  document.getElementById('dss_val_posA').textContent = a + '%';
  document.getElementById('dss_val_posB').textContent = (100 - a) + '%';
};

// ── Stare globala meci ──
let DSS = { sA: 0, sB: 0, h1: null, h2: null, phase: 'ready' };

// ── Poisson ──
function dssPoisson(lambda) {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda); let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

// ── Lambdas ──
function dssLambdas() {
  const offA=dssG('offA'), defA=dssG('defA'), traA=dssG('traA'), agrA=dssG('agrA'), disA=dssG('disA'), staA=dssG('staA');
  const offB=dssG('offB'), defB=dssG('defB'), traB=dssG('traB'), agrB=dssG('agrB'), disB=dssG('disB'), staB=dssG('staB');
  const posA = dssG('posA') / 100;
  const anchor = dssG('avgG');
  const atkA = (offA*0.40 + traA*0.25 + agrA*0.20 + staA*0.15) / 100;
  const defA_ = (defA*0.45 + disA*0.30 + staA*0.25) / 100;
  const atkB = (offB*0.40 + traB*0.25 + agrB*0.20 + staB*0.15) / 100;
  const defB_ = (defB*0.45 + disB*0.30 + staB*0.25) / 100;
  let lA = (anchor/2) * (atkA/(atkA+atkB)) * (1-defB_) * 1.08 * posA * 2;
  let lB = (anchor/2) * (atkB/(atkA+atkB)) * (1-defA_) * (1-posA) * 2;
  return { lA: Math.max(0.1, Math.min(lA,4)), lB: Math.max(0.1, Math.min(lB,4)) };
}

// ── Simulare repriza ──
function dssSimHalf(halfNum) {
  const { lA, lB } = dssLambdas();
  const fat = halfNum === 2 ? 0.88 : 1.0;
  const goalsA = dssPoisson(lA * fat);
  const goalsB = dssPoisson(lB * fat);
  const posA = dssG('posA');
  const agrA=dssG('agrA'), agrB=dssG('agrB');
  const disA=dssG('disA'), disB=dssG('disB');
  const offA=dssG('offA'), offB=dssG('offB');

  const shotsA   = goalsA + Math.floor(Math.random()*5)+3;
  const shotsB   = goalsB + Math.floor(Math.random()*5)+2;
  const shotsOnA = Math.min(shotsA, goalsA + Math.floor(Math.random()*3)+1);
  const shotsOnB = Math.min(shotsB, goalsB + Math.floor(Math.random()*3)+1);
  const cornersA = Math.max(0, Math.floor((posA/100)*9*Math.random() + (offA/100)*2));
  const cornersB = Math.max(0, Math.floor(((100-posA)/100)*9*Math.random() + (offB/100)*2));
  const foulsA   = Math.max(0, Math.floor((agrA/100)*10*Math.random()+2));
  const foulsB   = Math.max(0, Math.floor((agrB/100)*10*Math.random()+2));

  // Galbene — model multi-factor calibrat
  const halfMult     = halfNum === 2 ? 1.35 : 1.0;
  const lateBonus    = halfNum === 2 ? 1.08 : 1.0;
  const scoreDiff    = DSS.sA - DSS.sB;
  const pressA = scoreDiff < 0 ? 1.0 + Math.min(Math.abs(scoreDiff),3)*0.18 : (scoreDiff > 0 ? 1.0 + Math.min(scoreDiff,2)*0.08 : 1.0);
  const pressB = scoreDiff > 0 ? 1.0 + Math.min(Math.abs(scoreDiff),3)*0.18 : (scoreDiff < 0 ? 1.0 + Math.min(Math.abs(scoreDiff),2)*0.08 : 1.0);
  const agFactA = Math.pow(agrA/75,0.90) * Math.pow(1.0-(disA/100)*0.72,0.80);
  const agFactB = Math.pow(agrB/75,0.90) * Math.pow(1.0-(disB/100)*0.72,0.80);
  const foulFacA = 0.60 + (foulsA/8.0)*0.82;
  const foulFacB = 0.60 + (foulsB/8.0)*0.82;
  const lyA = 0.90 * agFactA * foulFacA * pressA * halfMult * lateBonus * 0.95;
  const lyB = 0.90 * agFactB * foulFacB * pressB * halfMult * lateBonus;
  const yellowA = Math.min(5, dssPoisson(Math.max(0.15, lyA)));
  const yellowB = Math.min(5, dssPoisson(Math.max(0.15, lyB)));

  const chA = ((agrA/100)*(1-disA/100))*0.6 * (halfNum===2?1.5:1.0) * pressA;
  const chB = ((agrB/100)*(1-disB/100))*0.6 * (halfNum===2?1.5:1.0) * pressB;
  const rdblA = yellowA>=2 ? (yellowA-1)*0.10 : 0;
  const rdblB = yellowB>=2 ? (yellowB-1)*0.10 : 0;
  const redA  = Math.random() < (chA*0.038 + rdblA) ? 1 : 0;
  const redB  = Math.random() < (chB*0.038 + rdblB) ? 1 : 0;

  return { goalsA, goalsB, cornersA, cornersB, shotsA, shotsB,
           shotsOnA, shotsOnB, foulsA, foulsB, yellowA, yellowB, redA, redB };
}

// ── Coada de evenimente ──
function dssBuildQueue(half, halfNum) {
  const base = halfNum === 1 ? 0 : 45;
  const events = [];

  function randMins(n) {
    const pool = [];
    for (let m = base+1; m <= base+45; m++) pool.push(m);
    for (let i = 0; i < Math.min(n, pool.length); i++) {
      const j = i + Math.floor(Math.random()*(pool.length-i));
      [pool[i],pool[j]] = [pool[j],pool[i]];
    }
    return pool.slice(0,n).sort((a,b)=>a-b);
  }

  function shuffleAssign(nA, nB) {
    const arr = [...Array(nA).fill('A'), ...Array(nB).fill('B')];
    for (let i=arr.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    return arr;
  }

  // Goluri
  const gMins = randMins(half.goalsA + half.goalsB);
  const gAssign = shuffleAssign(half.goalsA, half.goalsB);
  gMins.forEach((m,i) => events.push({ minute:m, type:'goal', team:gAssign[i],
    cssClass:'goal', label: gAssign[i]==='A' ? '⚽ GOL! Echipa A' : '⚽ GOL! Echipa B' }));

  // Cornere
  const cMins = randMins(half.cornersA + half.cornersB);
  const cAssign = shuffleAssign(half.cornersA, half.cornersB);
  cMins.forEach((m,i) => events.push({ minute:m, type:'corner', team:cAssign[i],
    cssClass:'corner', label: cAssign[i]==='A' ? '🚩 Corner — Echipa A' : '🚩 Corner — Echipa B' }));

  // Galbene
  const yMins = randMins(half.yellowA + half.yellowB);
  const yAssign = shuffleAssign(half.yellowA, half.yellowB);
  yMins.forEach((m,i) => events.push({ minute:m, type:'yellow', team:yAssign[i],
    cssClass:'yellow', label: yAssign[i]==='A' ? '🟨 Galben — Echipa A' : '🟨 Galben — Echipa B' }));

  // Rosii
  if (half.redA) { const [m]=randMins(1); events.push({minute:m,type:'red',team:'A',cssClass:'red',label:'🟥 Cartonaș Roșu — Echipa A'}); }
  if (half.redB) { const [m]=randMins(1); events.push({minute:m,type:'red',team:'B',cssClass:'red',label:'🟥 Cartonaș Roșu — Echipa B'}); }

  events.sort((a,b)=>a.minute-b.minute);
  return events;
}

// ── Animatie repriza ──
function dssAnimateHalf(halfNum, halfData, initA, initB, onDone) {
  const base   = halfNum === 1 ? 0 : 45;
  const endMin = halfNum === 1 ? 45 : 90;
  const events = dssBuildQueue(halfData, halfNum);

  const MS_MIN   = 133;
  const EV_PAUSE = 2500;

  let curMin = base;
  let curA   = initA;
  let curB   = initB;
  let evIdx  = 0;

  const minEl    = document.getElementById('dss_min');
  const scoreEl  = document.getElementById('dss_score');
  const bannerEl = document.getElementById('dss_banner');

  function showRunning() {
    bannerEl.className = 'dss-banner status vis';
    bannerEl.textContent = halfNum === 1 ? 'Repriza 1 în desfășurare...' : 'Repriza 2 în desfășurare...';
  }

  function showEvent(ev, cb) {
    bannerEl.className = 'dss-banner ' + ev.cssClass + ' vis';
    bannerEl.textContent = ev.label;
    if (ev.type === 'goal') {
      if (ev.team==='A') curA++; else curB++;
      scoreEl.textContent = curA + ' - ' + curB;
      scoreEl.classList.remove('dss-goal-flash');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('dss-goal-flash');
    }
    setTimeout(() => { showRunning(); cb(); }, EV_PAUSE);
  }

  showRunning();

  function tick() {
    if (curMin >= endMin) {
      minEl.textContent   = '⏱ ' + String(endMin).padStart(2,'0') + ':00';
      scoreEl.textContent = curA + ' - ' + curB;
      bannerEl.className  = 'dss-banner status vis';
      if (halfNum === 1) {
        bannerEl.textContent = '— Pauză —';
      } else {
        bannerEl.textContent = curA > curB ? '🏆 Victorie Echipa A!' : curB > curA ? '🏆 Victorie Echipa B!' : '🤝 Egal!';
      }
      onDone(curA, curB);
      return;
    }
    curMin++;
    const sec = Math.floor(Math.random()*59);
    minEl.textContent = '⏱ ' + String(curMin).padStart(2,'0') + ':' + String(sec).padStart(2,'0');

    if (evIdx < events.length && events[evIdx].minute === curMin) {
      function processNext() {
        if (evIdx < events.length && events[evIdx].minute === curMin) {
          showEvent(events[evIdx++], processNext);
        } else {
          setTimeout(tick, MS_MIN);
        }
      }
      processNext();
    } else {
      setTimeout(tick, MS_MIN);
    }
  }
  setTimeout(tick, 300);
}

// ── Rulare repriza ──
window.dssRunHalf = function(halfNum) {
  if (halfNum === 1) {
    document.getElementById('dss_btn_h1').disabled = true;
    DSS.phase = 'running';
    const h = dssSimHalf(1);
    DSS.h1 = h;
    dssAnimateHalf(1, h, 0, 0, (sA, sB) => {
      DSS.sA = sA; DSS.sB = sB;
      dssStatUI(h, '1');
      document.getElementById('dss_modal_score').textContent = sA + ' - ' + sB;
      document.getElementById('dss_modal_text').textContent =
        'A: ' + h.goalsA + ' gol(uri) | B: ' + h.goalsB + ' gol(uri) · Cornere: ' + h.cornersA + '-' + h.cornersB +
        ' · Galbene: ' + (h.yellowA+h.yellowB) + ' · Roșii: ' + (h.redA+h.redB);
      const modalEl = document.getElementById('dss_modal');
      // Mutăm modalul direct pe <body> — altfel "contain: layout" de pe .spa-page
      // ancorează position:fixed la container, nu la fereastra reală a browserului,
      // forțând utilizatorul să facă scroll ca să-l vadă.
      if (modalEl.parentElement !== document.body) {
        document.body.appendChild(modalEl);
      }
      modalEl.classList.add('open');
      DSS.phase = 'after_h1';
    });
  } else {
    document.getElementById('dss_btn_h2').disabled = true;
    DSS.phase = 'running';
    const h = dssSimHalf(2);
    DSS.h2 = h;
    dssAnimateHalf(2, h, DSS.sA, DSS.sB, (sA, sB) => {
      DSS.sA = sA; DSS.sB = sB;
      DSS.phase = 'finished';
      dssStatUI(h, '2');
      dssTotals();
      dssOdds();
      dssNarrative();
      document.getElementById('dss_report').style.display = 'block';
      document.getElementById('dss_btn_h2').style.display = 'none';
      document.getElementById('dss_btn_rst').style.display = 'block';
    });
  }
};

window.dssCloseModal = function() {
  document.getElementById('dss_modal').classList.remove('open');
  document.getElementById('dss_btn_h2').style.display = 'block';
};

// ── Reset ──
window.dssReset = function() {
  const sliders = ['offA','defA','traA','agrA','disA','staA','offB','defB','traB','agrB','disB','staB','posA','avgG'];
  const saved = {};
  sliders.forEach(id => { saved[id] = document.getElementById('dss_'+id).value; });

  DSS = { sA:0, sB:0, h1:null, h2:null, phase:'ready' };

  document.getElementById('dss_min').textContent   = '⏱ 00:00';
  document.getElementById('dss_score').textContent = '0 - 0';
  const banner = document.getElementById('dss_banner');
  banner.className = 'dss-banner status vis';
  banner.textContent = 'Așteptare Calibrare...';

  document.getElementById('dss_btn_h1').disabled   = false;
  document.getElementById('dss_btn_h1').style.display = 'block';
  document.getElementById('dss_btn_h2').style.display = 'none';
  document.getElementById('dss_btn_h2').disabled   = false;
  document.getElementById('dss_btn_rst').style.display = 'none';
  document.getElementById('dss_report').style.display = 'none';

  ['g','c','s','y','r','f'].forEach(s => {
    ['h1','h2','tot'].forEach(p => {
      const el = document.getElementById('dss_'+s+'_'+p);
      if (el) el.textContent = '-';
    });
  });
  ['1','x','2','o25','u25','btts'].forEach(k => {
    const pe=document.getElementById('dss_p'+k), oe=document.getElementById('dss_o'+k);
    if(pe) pe.textContent='-'; if(oe) oe.textContent='-';
  });
  document.getElementById('dss_narrative').textContent = '';

  sliders.forEach(id => {
    document.getElementById('dss_'+id).value = saved[id];
    window.dssUpdateVal(id);
  });
  window.dssUpdatePossession();
};

// ── Stat UI ──
function dssStatUI(h, suf) {
  const s = (id,v) => { const el=document.getElementById('dss_'+id+'_h'+suf); if(el) el.textContent=v; };
  s('g', h.goalsA + '-' + h.goalsB);
  s('c', h.cornersA + '-' + h.cornersB);
  s('s', h.shotsOnA + '-' + h.shotsOnB);
  s('y', h.yellowA + '-' + h.yellowB);
  s('r', h.redA + '-' + h.redB);
  s('f', h.foulsA + '-' + h.foulsB);
}

function dssTotals() {
  const h1=DSS.h1, h2=DSS.h2;
  const t = (k) => h1[k]+h2[k];
  const el = (id,v) => { const e=document.getElementById('dss_'+id+'_tot'); if(e) e.textContent=v; };
  el('g',  t('goalsA')  + '-' + t('goalsB'));
  el('c',  t('cornersA')+ '-' + t('cornersB'));
  el('s',  t('shotsOnA')+ '-' + t('shotsOnB'));
  el('y',  t('yellowA') + '-' + t('yellowB'));
  el('r',  t('redA')    + '-' + t('redB'));
  el('f',  t('foulsA')  + '-' + t('foulsB'));
}

// ── Cote Monte Carlo ──
function dssOdds() {
  const N=5000; let w1=0,dx=0,w2=0,ov=0,bt=0;
  for(let i=0;i<N;i++){
    const {lA,lB}=dssLambdas();
    const a=dssPoisson(lA)+dssPoisson(lA*0.88);
    const b=dssPoisson(lB)+dssPoisson(lB*0.88);
    if(a>b) w1++; else if(a===b) dx++; else w2++;
    if(a+b>2.5) ov++;
    if(a>0&&b>0) bt++;
  }
  const fmt=p=>(p/N*100).toFixed(1)+'%';
  const odd=p=>p>0?(N/p).toFixed(2):'—';
  document.getElementById('dss_p1').textContent    = fmt(w1);
  document.getElementById('dss_px').textContent    = fmt(dx);
  document.getElementById('dss_p2').textContent    = fmt(w2);
  document.getElementById('dss_po25').textContent  = fmt(ov);
  document.getElementById('dss_pu25').textContent  = ((1-ov/N)*100).toFixed(1)+'%';
  document.getElementById('dss_pbtts').textContent = fmt(bt);
  document.getElementById('dss_o1').textContent    = odd(w1);
  document.getElementById('dss_ox').textContent    = odd(dx);
  document.getElementById('dss_o2').textContent    = odd(w2);
  document.getElementById('dss_oo25').textContent  = odd(ov);
  document.getElementById('dss_ou25').textContent  = ov>0?(N/(N-ov)).toFixed(2):'—';
  document.getElementById('dss_obtts').textContent = odd(bt);
}

// ── Narativa ──
function dssNarrative() {
  const sA=DSS.sA, sB=DSS.sB, tot=sA+sB;
  let txt='';
  if(sA>sB) txt+=`Echipa A a câștigat meciul ${sA}-${sB}. `;
  else if(sB>sA) txt+=`Echipa B a câștigat la deplasare, ${sB}-${sA}. `;
  else txt+=`Meci egal, ${sA}-${sB}. `;
  if(tot===0) txt+='Porțile au rămas inviolate, apărările au dominat.';
  else if(tot<=2) txt+='Meci echilibrat, cu puține goluri.';
  else if(tot<=4) txt+='Spectacol cu goluri multiple.';
  else txt+='Meci spectaculos cu numerous goluri!';
  const h1=DSS.h1,h2=DSS.h2;
  if(h2.goalsA+h2.goalsB > h1.goalsA+h1.goalsB) txt+=' Repriza a 2-a a fost mai prolifică.';
  else if(h1.goalsA+h1.goalsB > h2.goalsA+h2.goalsB) txt+=' Repriza 1 a dominat ca spectacol ofensiv.';
  document.getElementById('dss_narrative').textContent = txt;
}

