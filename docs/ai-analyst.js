/* ═══════════════════════════════════════════════════════════════
   ai-analyst.js  — Analist AI pentru meciuri de fotbal
   Folosește Anthropic API (claude-sonnet-4-6) cu web_search
   Pagina se construiește dinamic la prima navigare spre 'ai'
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── Stare globală ── */
let AI = {
  built:       false,
  loading:     false,
  history:     [],      // [{role,content}] — conversație curentă
  matchData:   null,    // datele meciului introduse de user
  abortCtrl:   null,    // AbortController pentru anulare stream
};

/* ══════════════════════════════════════════════════════════════
   1. BUILD UI
══════════════════════════════════════════════════════════════ */
function buildAiPage() {
  if (AI.built) return;
  AI.built = true;

  const page = document.getElementById('page-ai');
  if (!page) return;

  page.innerHTML = `
    <div class="ai-page">

      <!-- Header -->
      <div class="ai-header">
        <div class="ai-header-left">
          <div class="ai-logo-icon">
            <i class="fa-solid fa-robot"></i>
            <span class="ai-logo-pulse"></span>
          </div>
          <div>
            <div class="ai-header-title">AI ANALIST</div>
            <div class="ai-header-sub">Powered by Gemini 2.0 · Analiză matematică fotbal</div>
          </div>
        </div>
        <button class="ai-new-btn" onclick="aiNewSession()" title="Conversație nouă">
          <i class="fa-solid fa-rotate-right"></i>
        </button>
      </div>

      <!-- Match Input Form -->
      <div class="ai-form-card" id="ai-form-card">
        <div class="ai-form-title">
          <i class="fa-solid fa-magnifying-glass-chart"></i>
          INTRODU MECIUL
        </div>

        <div class="ai-form-row">
          <div class="ai-form-group">
            <label class="ai-label">ECHIPA GAZDĂ</label>
            <input class="ai-input" id="ai-home" type="text" placeholder="ex: Real Madrid" autocomplete="off"/>
          </div>
          <div class="ai-vs-badge">VS</div>
          <div class="ai-form-group">
            <label class="ai-label">ECHIPA OASPETE</label>
            <input class="ai-input" id="ai-away" type="text" placeholder="ex: Barcelona" autocomplete="off"/>
          </div>
        </div>

        <div class="ai-form-row-3">
          <div class="ai-form-group">
            <label class="ai-label">COMPETIȚIE</label>
            <input class="ai-input" id="ai-competition" type="text" placeholder="ex: La Liga" autocomplete="off"/>
          </div>
          <div class="ai-form-group">
            <label class="ai-label">DATA MECIULUI</label>
            <input class="ai-input" id="ai-date" type="date"/>
          </div>
          <div class="ai-form-group">
            <label class="ai-label">PIAȚA DE ANALIZAT</label>
            <select class="ai-input ai-select" id="ai-market">
              <option value="general">Analiză Completă 1X2</option>
              <option value="goals">Goluri (Over/Under 2.5)</option>
              <option value="btts">Ambele Marchează (BTTS)</option>
              <option value="corners">Cornere</option>
              <option value="cards">Cartonașe</option>
              <option value="handicap">Handicap Asiatic</option>
              <option value="halftime">Rezultat Prima Repriză</option>
              <option value="custom">Altă piață (specifică mai jos)</option>
            </select>
          </div>
        </div>

        <!-- Extra context accordion -->
        <div class="ai-accordion" id="ai-accordion">
          <button class="ai-accordion-btn" onclick="aiToggleAccordion()">
            <i class="fa-solid fa-sliders"></i>
            Date Suplimentare (opțional)
            <i class="fa-solid fa-chevron-down ai-acc-arrow" id="ai-acc-arrow"></i>
          </button>
          <div class="ai-accordion-body" id="ai-accordion-body">
            <div class="ai-form-row-3">
              <div class="ai-form-group">
                <label class="ai-label">FORMĂ GAZDĂ (ultimele 5)</label>
                <input class="ai-input" id="ai-form-home" type="text" placeholder="ex: W W D L W" autocomplete="off"/>
              </div>
              <div class="ai-form-group">
                <label class="ai-label">FORMĂ OASPETE (ultimele 5)</label>
                <input class="ai-input" id="ai-form-away" type="text" placeholder="ex: W L W W D" autocomplete="off"/>
              </div>
              <div class="ai-form-group">
                <label class="ai-label">COTELE ACTUALE</label>
                <input class="ai-input" id="ai-odds" type="text" placeholder="ex: 1X2: 1.85 / 3.4 / 4.2" autocomplete="off"/>
              </div>
            </div>
            <div class="ai-form-row-2">
              <div class="ai-form-group">
                <label class="ai-label">ABSENȚE / ACCIDENTAȚI</label>
                <input class="ai-input" id="ai-injuries" type="text" placeholder="ex: Benzema (gazdă), Pedri (oaspete)" autocomplete="off"/>
              </div>
              <div class="ai-form-group">
                <label class="ai-label">ALTE DETALII RELEVANTE</label>
                <input class="ai-input" id="ai-extra" type="text" placeholder="ex: derby, ploaie, meci de cupă" autocomplete="off"/>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick analysis chips -->
        <div class="ai-chips-label">ANALIZE RAPIDE:</div>
        <div class="ai-chips" id="ai-chips">
          <button class="ai-chip" onclick="aiQuickAnalysis('prediction')">
            <i class="fa-solid fa-bullseye"></i> Predicție & Cote Corecte
          </button>
          <button class="ai-chip" onclick="aiQuickAnalysis('value')">
            <i class="fa-solid fa-gem"></i> Value Bet
          </button>
          <button class="ai-chip" onclick="aiQuickAnalysis('goals')">
            <i class="fa-solid fa-futbol"></i> Goluri Estimate
          </button>
          <button class="ai-chip" onclick="aiQuickAnalysis('kelly')">
            <i class="fa-solid fa-percent"></i> Kelly Criterion
          </button>
          <button class="ai-chip" onclick="aiQuickAnalysis('buildup')">
            <i class="fa-solid fa-layer-group"></i> Acumulator Optim
          </button>
          <button class="ai-chip" onclick="aiQuickAnalysis('risk')">
            <i class="fa-solid fa-shield-halved"></i> Analiză Risc
          </button>
        </div>

        <button class="ai-analyze-btn" id="ai-analyze-btn" onclick="aiStartAnalysis()">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          ANALIZEAZĂ MECIUL
          <span class="ai-btn-glow"></span>
        </button>
      </div>

      <!-- Chat / Response area -->
      <div class="ai-chat-area" id="ai-chat-area">
        <!-- Messages injected here -->
        <div class="ai-welcome" id="ai-welcome">
          <div class="ai-welcome-icon">🤖</div>
          <div class="ai-welcome-title">Bună ziua! Sunt Analistul AI.</div>
          <div class="ai-welcome-sub">
            Introdu detaliile meciului mai sus și voi analiza matematic probabilitățile,
            forma echipelor, statisticile head-to-head și îți voi oferi recomandări clare
            bazate pe modele statistice avansate (Poisson, Dixon-Coles, Expected Goals).
          </div>
          <div class="ai-welcome-pills">
            <span class="ai-wpill">🌐 Google Search</span>
            <span class="ai-wpill">⚽ xG Model</span>
            <span class="ai-wpill">📈 Poisson</span>
            <span class="ai-wpill">💰 Value Bets</span>
            <span class="ai-wpill">🎯 Kelly Criterion</span>
          </div>
        </div>
      </div>

      <!-- Chat input pentru follow-up questions -->
      <div class="ai-chat-input-wrap" id="ai-chat-input-wrap" style="display:none;">
        <div class="ai-chat-input-row">
          <input
            class="ai-chat-input"
            id="ai-follow-input"
            type="text"
            placeholder="Pune o întrebare despre acest meci..."
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();aiAskFollowUp();}"
            autocomplete="off"
          />
          <button class="ai-send-btn" id="ai-send-btn" onclick="aiAskFollowUp()">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </div>
        <div class="ai-follow-chips">
          <button class="ai-follow-chip" onclick="aiFollowUp('Care este cel mai sigur pariu pentru acest meci?')">🎯 Cel mai sigur pariu</button>
          <button class="ai-follow-chip" onclick="aiFollowUp('Ce cote reprezintă value în acest meci?')">💎 Value bets</button>
          <button class="ai-follow-chip" onclick="aiFollowUp('Calculează suma optimă de pariat folosind Kelly Criterion')">📐 Kelly Criterion</button>
          <button class="ai-follow-chip" onclick="aiFollowUp('Analizează statisticile head-to-head')">📊 H2H Stats</button>
        </div>
      </div>

    </div><!-- end ai-page -->
  `;

  // Set today's date as default
  const dateInp = document.getElementById('ai-date');
  if (dateInp) dateInp.value = new Date().toISOString().split('T')[0];
}

/* ══════════════════════════════════════════════════════════════
   2. ACCORDION
══════════════════════════════════════════════════════════════ */
window.aiToggleAccordion = function () {
  const body  = document.getElementById('ai-accordion-body');
  const arrow = document.getElementById('ai-acc-arrow');
  if (!body) return;
  const isOpen = body.classList.toggle('open');
  if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : '';
};

/* ══════════════════════════════════════════════════════════════
   3. CONSTRUIRE PROMPT SISTEM — expertul AI
══════════════════════════════════════════════════════════════ */
function buildSystemPrompt() {
  return `Ești un expert mondial în analiza matematică a fotbalului, cu specializare în:

1. **Modele statistice**: Poisson bivariate, Dixon-Coles, Expected Goals (xG), forme Elo
2. **Piețe de pariuri**: 1X2, Asian Handicap, Over/Under, BTTS, cornere, cartonașe
3. **Value betting**: identificarea pariurilor cu EV pozitiv față de cotele bookmakerilor
4. **Kelly Criterion**: calculul fracției optime din bankroll pentru fiecare pariu
5. **Head-to-head analysis**: tendințe istorice, statistici directe
6. **Factori contextuali**: motivație, oboseală, absențe cheie, condiții meteo, importanța meciului

**Regulile tale**:
- Răspunzi ÎNTOTDEAUNA în română
- Structurezi răspunsul cu emoji și secțiuni clare pentru lizibilitate mobilă
- Oferi ÎNTOTDEAUNA o recomandare concretă, nu ambiguă
- Calculezi probabilitățile și le compari cu cotele (dacă sunt furnizate)
- Identifici value bets (probabilitate calculată > probabilitate implicită în cotă)
- Ești sincer: dacă datele sunt insuficiente, spui că ai nevoie de mai multe informații
- Folosești web search pentru a obține date actuale despre echipe, formă și știri
- La finalul fiecărei analize incluzi o secțiune "⚠️ DISCLAIMER" despre parierea responsabilă

**Formatul răspunsului** (adaptabil la piața cerută):
\`\`\`
📊 ANALIZĂ: [Echipa A] vs [Echipa B]
━━━━━━━━━━━━━━━━━━━━━━

🔢 MODEL PROBABILISTIC
• Victorie [Gazdă]: X%
• Egal: X%  
• Victorie [Oaspete]: X%

⚽ PREDICȚIE GOLURI
• xG estimat: X.X - X.X
• Medie goluri per meci: X.X

📈 ANALIZA FORMEI
• [Gazdă]: ...
• [Oaspete]: ...

💎 VALUE BET DETECTAT
• Piața: ...
• Cota corectă: X.XX
• Cota oferită: X.XX
• Edge: +X.X%

🎯 RECOMANDARE PRINCIPALĂ
• Pariu: ...
• Cotă recomandată: minimum X.XX
• Tip pariu: ...
• Încredere: X/10

📐 KELLY CRITERION
• Bankroll recomandat: X%
• Miză optimă la 100 RON bankroll: X RON

⚠️ DISCLAIMER: Pariați responsabil. Niciun sistem nu garantează profit.
\`\`\``;
}

/* ══════════════════════════════════════════════════════════════
   4. CONSTRUIRE PROMPT UTILIZATOR
══════════════════════════════════════════════════════════════ */
function buildMatchPrompt(quickType) {
  const home        = (document.getElementById('ai-home')?.value || '').trim();
  const away        = (document.getElementById('ai-away')?.value || '').trim();
  const competition = (document.getElementById('ai-competition')?.value || '').trim();
  const date        = document.getElementById('ai-date')?.value || '';
  const market      = document.getElementById('ai-market')?.value || 'general';
  const formHome    = (document.getElementById('ai-form-home')?.value || '').trim();
  const formAway    = (document.getElementById('ai-form-away')?.value || '').trim();
  const odds        = (document.getElementById('ai-odds')?.value || '').trim();
  const injuries    = (document.getElementById('ai-injuries')?.value || '').trim();
  const extra       = (document.getElementById('ai-extra')?.value || '').trim();

  if (!home || !away) return null;

  const MARKET_NAMES = {
    general:   'Analiză Completă 1X2 și piețe principale',
    goals:     'Over/Under 2.5 Goluri',
    btts:      'Ambele Marchează (BTTS)',
    corners:   'Cornere (Over/Under și handicap)',
    cards:     'Cartonașe',
    handicap:  'Handicap Asiatic',
    halftime:  'Rezultat Prima Repriză',
    custom:    extra || 'Piață personalizată',
  };
  const marketName = MARKET_NAMES[market] || market;

  const QUICK_PROMPTS = {
    prediction: `Realizează o predicție completă matematică pentru meciul ${home} vs ${away}.`,
    value:      `Identifică toate value bets posibile pentru meciul ${home} vs ${away}. Compară probabilitățile calculate cu cotele furnizate.`,
    goals:      `Analizează piața de goluri pentru ${home} vs ${away}. Calculează xG, media de goluri și probabilitățile pentru Over/Under 0.5, 1.5, 2.5, 3.5.`,
    kelly:      `Calculează Kelly Criterion pentru pariurile recomandate la ${home} vs ${away}. Arată fracția optimă din bankroll pentru fiecare pariu.`,
    buildup:    `Sugerează 3-5 selecții optime din meciul ${home} vs ${away} pentru un acumulator, ordonate după încredere.`,
    risk:       `Analizează riscurile pentru meciul ${home} vs ${away}. Identifică incertitudinile cheie și cum afectează fiecare piață.`,
  };

  let prompt = quickType
    ? QUICK_PROMPTS[quickType] || `Analizează ${home} vs ${away}.`
    : `Analizează complet meciul ${home} vs ${away} cu focus pe: ${marketName}.`;

  prompt += `\n\nDETALII MECI:`;
  prompt += `\n• Gazdă: ${home}`;
  prompt += `\n• Oaspete: ${away}`;
  if (competition) prompt += `\n• Competiție: ${competition}`;
  if (date)        prompt += `\n• Data: ${date}`;
  prompt += `\n• Piața de interes: ${marketName}`;
  if (formHome)  prompt += `\n• Formă ${home} (ultimele 5): ${formHome}`;
  if (formAway)  prompt += `\n• Formă ${away} (ultimele 5): ${formAway}`;
  if (odds)      prompt += `\n• Cote actuale: ${odds}`;
  if (injuries)  prompt += `\n• Absențe/accidentați: ${injuries}`;
  if (extra && market !== 'custom') prompt += `\n• Informații suplimentare: ${extra}`;

  prompt += `\n\nFolosește web search pentru a găsi date actuale despre aceste echipe, forma recentă, statistici head-to-head și orice știri relevante.`;

  // Save match data for context
  AI.matchData = { home, away, competition, date, market, formHome, formAway, odds, injuries, extra };

  return prompt;
}

/* ══════════════════════════════════════════════════════════════
   5. API CALL — Anthropic API cu web_search
══════════════════════════════════════════════════════════════ */
async function callAI(userMessage, isFollowUp = false) {
  if (AI.loading) return;
  AI.loading = true;

  const chatArea = document.getElementById('ai-chat-area');
  const welcome  = document.getElementById('ai-welcome');
  if (welcome) welcome.style.display = 'none';

  if (isFollowUp) appendMessage('user', userMessage);

  const msgId = 'ai-msg-' + Date.now();
  appendMessage('assistant', '', msgId);

  // ── Construiește conversația în formatul Gemini ──────────────────────
  // Gemini: roles = 'user' | 'model'  (nu 'assistant')
  const geminiHistory = AI.history.map(m => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  // Adaugă mesajul curent
  geminiHistory.push({ role: 'user', parts: [{ text: userMessage }] });

  // ── System instruction (injectat în primul turn user dacă history e gol) ──
  const systemText = buildSystemPrompt();

  // ── Payload Gemini ───────────────────────────────────────────────────
  // Gemini 2.0 Flash cu Google Search grounding pentru date live
  const GEMINI_KEY = 'AIzaSyAb8RN6KuZ5XBxdjy7V1Sr1jto1YSj51efFRIN4Y5BvWWPuUWSQ';
  const GEMINI_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    'gemini-2.0-flash:generateContent?key=' + GEMINI_KEY;

  const payload = {
    system_instruction: {
      parts: [{ text: systemText }],
    },
    contents: geminiHistory,
    tools: [{ google_search: {} }],           // Google Search grounding — date live
    generationConfig: {
      temperature:     0.7,
      maxOutputTokens: 2048,
      topP:            0.9,
    },
  };

  try {
    AI.abortCtrl = new AbortController();

    const resp = await fetch(GEMINI_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  AI.abortCtrl.signal,
      body:    JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      const errMsg  = errData?.error?.message || `HTTP ${resp.status}`;
      throw new Error(errMsg);
    }

    const data = await resp.json();

    // ── Extrage textul din răspunsul Gemini ──────────────────────────
    let fullText = '';
    try {
      const candidates = data.candidates || [];
      for (const cand of candidates) {
        const parts = cand?.content?.parts || [];
        for (const part of parts) {
          if (part.text) fullText += part.text;
        }
      }
    } catch (_) {}

    if (!fullText) {
      // Safety block sau răspuns gol
      const reason = data.candidates?.[0]?.finishReason || 'UNKNOWN';
      throw new Error('Răspuns gol de la Gemini. Motiv: ' + reason +
        '. Încearcă o formulare diferită a întrebării.');
    }

    // ── Extrage sursele Google Search (dacă există) ──────────────────
    let sourcesHtml = '';
    try {
      const sources = data.candidates?.[0]
        ?.groundingMetadata?.searchEntryPoint?.renderedContent || '';
      if (sources) {
        // Gemini returnează HTML pentru search sources — îl adaptăm
        sourcesHtml = '<div class="ai-sources"><i class="fa-solid fa-magnifying-glass"></i> '
          + 'Surse web căutate de AI</div>';
      }
    } catch (_) {}

    // ── Actualizează mesajul ─────────────────────────────────────────
    const msgEl = document.getElementById(msgId);
    if (msgEl) {
      msgEl.querySelector('.ai-msg-content').innerHTML =
        renderMarkdown(fullText) + sourcesHtml;
      msgEl.classList.add('ai-msg-done');
      appendResponseActions(msgEl, fullText);
    }

    // ── Actualizează history ─────────────────────────────────────────
    AI.history.push({ role: 'user',      content: userMessage });
    AI.history.push({ role: 'assistant', content: fullText    });
    if (AI.history.length > 12) AI.history = AI.history.slice(-12);

    showFollowUpInput();

  } catch (err) {
    const msgEl = document.getElementById(msgId);
    if (!msgEl) return;

    if (err.name === 'AbortError') {
      msgEl.querySelector('.ai-msg-content').innerHTML =
        '<span style="color:rgba(255,255,255,.4);font-style:italic;">Analiză anulată.</span>';
    } else {
      // Mesaj de eroare detaliat
      let hint = '';
      if (err.message.includes('API_KEY') || err.message.includes('403')) {
        hint = 'Cheia API este invalidă sau expirată.';
      } else if (err.message.includes('quota') || err.message.includes('429')) {
        hint = 'Limita de cereri a fost atinsă. Încearcă din nou în câteva minute.';
      } else if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed')) {
        hint = 'Problemă de rețea. Verifică conexiunea la internet.';
      } else {
        hint = err.message;
      }

      msgEl.querySelector('.ai-msg-content').innerHTML = `
        <div class="ai-error-msg">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <strong>Eroare Gemini API:</strong><br/>
          ${escHtml(hint)}
        </div>`;
    }
  } finally {
    AI.loading   = false;
    AI.abortCtrl = null;

    const btn = document.getElementById('ai-analyze-btn');
    if (btn) {
      btn.disabled  = false;
      btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> ANALIZEAZĂ MECIUL <span class="ai-btn-glow"></span>';
    }
    const sendBtn = document.getElementById('ai-send-btn');
    if (sendBtn) {
      sendBtn.disabled  = false;
      sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
    }
    if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
  }
}


/* ══════════════════════════════════════════════════════════════
   6. RENDER MARKDOWN SIMPLU
══════════════════════════════════════════════════════════════ */
function renderMarkdown(text) {
  if (!text) return '';
  return text
    // Code blocks
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre class="ai-code">$1</pre>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<div class="ai-h3">$1</div>')
    .replace(/^## (.+)$/gm,  '<div class="ai-h2">$1</div>')
    .replace(/^# (.+)$/gm,   '<div class="ai-h1">$1</div>')
    // Horizontal rule
    .replace(/^━+$/gm, '<hr class="ai-hr"/>')
    .replace(/^─+$/gm, '<hr class="ai-hr"/>')
    // Bullet points
    .replace(/^[•·]\s(.+)$/gm, '<div class="ai-bullet">•&nbsp;<span>$1</span></div>')
    .replace(/^[-]\s(.+)$/gm,  '<div class="ai-bullet">•&nbsp;<span>$1</span></div>')
    // Newlines
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

/* ══════════════════════════════════════════════════════════════
   7. DOM HELPERS
══════════════════════════════════════════════════════════════ */
function appendMessage(role, content, id) {
  const chatArea = document.getElementById('ai-chat-area');
  if (!chatArea) return;

  const wrap = document.createElement('div');
  wrap.className = `ai-message ai-msg-${role}`;
  if (id) wrap.id = id;

  if (role === 'user') {
    wrap.innerHTML = `
      <div class="ai-msg-avatar ai-msg-avatar-user"><i class="fa-solid fa-user"></i></div>
      <div class="ai-msg-bubble ai-msg-bubble-user">
        <div class="ai-msg-content">${escHtml(content)}</div>
      </div>`;
  } else {
    wrap.innerHTML = `
      <div class="ai-msg-avatar ai-msg-avatar-ai">
        <i class="fa-solid fa-robot"></i>
        <span class="ai-avatar-glow"></span>
      </div>
      <div class="ai-msg-bubble ai-msg-bubble-ai">
        <div class="ai-msg-content">
          ${content
            ? renderMarkdown(content)
            : '<div class="ai-typing"><span></span><span></span><span></span></div>'
          }
        </div>
      </div>`;
  }

  chatArea.appendChild(wrap);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function appendResponseActions(msgEl, text) {
  if (!msgEl) return;
  const bubble = msgEl.querySelector('.ai-msg-bubble-ai');
  if (!bubble) return;

  const actions = document.createElement('div');
  actions.className = 'ai-response-actions';
  actions.innerHTML = `
    <button class="ai-action-btn" onclick="aiCopyResponse(this)" title="Copiază">
      <i class="fa-solid fa-copy"></i> Copiază
    </button>
    <button class="ai-action-btn" onclick="aiSaveToNote(this,'${encodeURIComponent(text.slice(0,200))}')" title="Salvează notă">
      <i class="fa-solid fa-bookmark"></i> Salvează
    </button>
  `;
  bubble.appendChild(actions);
}

function showFollowUpInput() {
  const wrap = document.getElementById('ai-chat-input-wrap');
  if (wrap) wrap.style.display = 'block';
  const input = document.getElementById('ai-follow-input');
  if (input) setTimeout(() => input.focus(), 100);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* ══════════════════════════════════════════════════════════════
   8. ACȚIUNI PUBLICE
══════════════════════════════════════════════════════════════ */
window.aiStartAnalysis = async function () {
  const home = (document.getElementById('ai-home')?.value || '').trim();
  const away = (document.getElementById('ai-away')?.value || '').trim();

  if (!home || !away) {
    aiShakeInput('ai-home');
    aiShakeInput('ai-away');
    return;
  }

  const prompt = buildMatchPrompt(null);
  if (!prompt) return;

  // Update button state
  const btn = document.getElementById('ai-analyze-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> ANALIZEZ... <span class="ai-btn-glow"></span>';
  }

  await callAI(prompt, false);
};

window.aiQuickAnalysis = async function (type) {
  const home = (document.getElementById('ai-home')?.value || '').trim();
  const away = (document.getElementById('ai-away')?.value || '').trim();

  if (!home || !away) {
    aiShakeInput('ai-home');
    aiShakeInput('ai-away');
    // Scroll to form
    document.getElementById('ai-home')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const prompt = buildMatchPrompt(type);
  if (!prompt) return;

  const btn = document.getElementById('ai-analyze-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> ANALIZEZ... <span class="ai-btn-glow"></span>';
  }

  // Highlight clicked chip
  document.querySelectorAll('.ai-chip').forEach(c => c.classList.remove('ai-chip-active'));
  event?.target?.closest('.ai-chip')?.classList.add('ai-chip-active');

  await callAI(prompt, false);
};

window.aiAskFollowUp = async function () {
  const input = document.getElementById('ai-follow-input');
  const text  = (input?.value || '').trim();
  if (!text || AI.loading) return;

  if (input) input.value = '';

  const sendBtn = document.getElementById('ai-send-btn');
  if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>'; }

  await callAI(text, true);
};

window.aiFollowUp = function (text) {
  const input = document.getElementById('ai-follow-input');
  if (input) { input.value = text; input.focus(); }
};

window.aiNewSession = function () {
  AI.history   = [];
  AI.matchData = null;
  AI.loading   = false;
  if (AI.abortCtrl) { AI.abortCtrl.abort(); AI.abortCtrl = null; }

  const chatArea = document.getElementById('ai-chat-area');
  if (chatArea) {
    chatArea.innerHTML = `
      <div class="ai-welcome" id="ai-welcome">
        <div class="ai-welcome-icon">🤖</div>
        <div class="ai-welcome-title">Conversație nouă</div>
        <div class="ai-welcome-sub">Introdu detaliile unui nou meci pentru analiză.</div>
        <div class="ai-welcome-pills">
          <span class="ai-wpill">🌐 Google Search</span>
          <span class="ai-wpill">⚽ xG Model</span>
          <span class="ai-wpill">📈 Poisson</span>
          <span class="ai-wpill">💰 Value Bets</span>
          <span class="ai-wpill">🎯 Kelly Criterion</span>
        </div>
      </div>`;
  }

  const followWrap = document.getElementById('ai-chat-input-wrap');
  if (followWrap) followWrap.style.display = 'none';

  const btn = document.getElementById('ai-analyze-btn');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> ANALIZEAZĂ MECIUL <span class="ai-btn-glow"></span>';
  }

  document.querySelectorAll('.ai-chip').forEach(c => c.classList.remove('ai-chip-active'));
};

window.aiCopyResponse = function (btn) {
  const bubble = btn.closest('.ai-msg-bubble-ai');
  const content = bubble?.querySelector('.ai-msg-content');
  if (!content) return;
  const text = content.innerText || content.textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Copiat!';
    btn.style.color = 'var(--ng, #00ff88)';
    setTimeout(() => {
      btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiază';
      btn.style.color = '';
    }, 2000);
  });
};

window.aiSaveToNote = function (btn, encodedText) {
  const text = decodeURIComponent(encodedText);
  const key  = 'rgb_ai_notes';
  let notes  = [];
  try { notes = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
  notes.unshift({
    text,
    date: new Date().toLocaleDateString('ro-RO'),
    match: AI.matchData ? `${AI.matchData.home} vs ${AI.matchData.away}` : 'Meci',
  });
  if (notes.length > 20) notes = notes.slice(0, 20);
  localStorage.setItem(key, JSON.stringify(notes));
  btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvat!';
  btn.style.color = 'var(--ng, #00ff88)';
  setTimeout(() => {
    btn.innerHTML = '<i class="fa-solid fa-bookmark"></i> Salvează';
    btn.style.color = '';
  }, 2000);
};

function aiShakeInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('ai-shake');
  el.style.borderColor = 'var(--danger, #ff3366)';
  setTimeout(() => {
    el.classList.remove('ai-shake');
    el.style.borderColor = '';
  }, 600);
}

/* ══════════════════════════════════════════════════════════════
   9. HOOK PE NAVIGATETO — build page la prima deschidere
══════════════════════════════════════════════════════════════ */
(function hookNav() {
  let tries = 0;
  const iv = setInterval(() => {
    tries++;
    if (typeof window.navigateTo === 'function' && !window._aiNavHooked) {
      const origNav = window.navigateTo;
      window.navigateTo = function (pageId, btnEl) {
        if (pageId === 'ai') buildAiPage();
        return origNav.apply(this, arguments);
      };
      window._aiNavHooked = true;
      clearInterval(iv);
    }
    if (tries > 40) clearInterval(iv);
  }, 150);
})();
