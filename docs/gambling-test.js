/* ═══════════════════════════════════════════════════════════════
   gambling-test.js — Sistem Evaluare Dependenta (v1.0)
   Standard: NODS-SA (Self-Assessment)
   Creat pentru conformitate legala si etica rGdbet.
═══════════════════════════════════════════════════════════════ */
'use strict';

const GAMB_QUESTIONS = [
    "Ai simțit nevoia de a paria sume din ce în ce mai mari de bani pentru a obține aceeași stare de surescitare?",
    "Ai devenit neliniștit sau irascibil atunci când ai încercat să reduci sau să oprești parierea?",
    "Ai făcut încercări repetate și eșuate de a controla, reduce sau opri parierea?",
    "Ești adesea preocupat de pariere (retrăind experiențe trecute, planificând viitoarele pariuri)?",
    "Pariezi adesea atunci când te simți neliniștit (neajutorat, vinovat, anxios, deprimat)?",
    "După ce ai pierdut bani pariind, te întorci adesea a doua zi pentru a recupera pierderea?",
    "Ai mințit familia sau prietenii pentru a ascunde amploarea implicării tale în pariere?",
    "Ai pus în pericol o relație importantă, un loc de muncă sau cariera din cauza parierii?",
    "Te bazezi pe alții pentru a-ți furniza banii necesari pentru a rezolva situații financiare cauzate de pariere?"
];

let currentAnswers = [];

window.openGamblingTest = function() {
    const modal = document.getElementById('gamb-test-modal');
    const body = document.getElementById('gamb-test-body');
    if (!modal || !body) return;

    currentAnswers = new Array(GAMB_QUESTIONS.length).fill(null);
    renderGamblingQuestions();
    modal.style.display = 'flex';
};

function renderGamblingQuestions() {
    const body = document.getElementById('gamb-test-body');
    let html = `<div style="max-height:60vh; overflow-y:auto; padding-right:10px; font-family:'Rajdhani';">
        <p style="font-size:12px; opacity:0.7; margin-bottom:20px; text-align:justify;">
            Acest test este un instrument de auto-evaluare anonim. Răspunde sincer pentru a înțelege mai bine relația ta cu activitatea de pariere.
        </p>`;

    GAMB_QUESTIONS.forEach((q, idx) => {
        html += `
            <div style="margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:15px;">
                <p style="font-size:14px; font-weight:600; color:#fff; margin-bottom:12px;">${idx + 1}. ${q}</p>
                <div style="display:flex; gap:10px;">
                    <button class="gamb-ans-btn" onclick="setGambAnswer(${idx}, true)" id="gamb-btn-${idx}-yes">DA</button>
                    <button class="gamb-ans-btn" onclick="setGambAnswer(${idx}, false)" id="gamb-btn-${idx}-no">NU</button>
                </div>
            </div>
        `;
    });

    html += `
        <button id="gamb-submit-btn" class="main-btn" style="margin-top:20px; opacity:0.5;" onclick="calculateGambResult()" disabled>VEZI REZULTATUL</button>
        <p style="font-size:10px; margin-top:15px; opacity:0.5; text-align:center;">Analiza se bazează pe criterii clinice internaționale.</p>
    </div>`;

    body.innerHTML = html;
}

window.setGambAnswer = function(idx, val) {
    currentAnswers[idx] = val;

    // Update UI
    const yesBtn = document.getElementById(`gamb-btn-${idx}-yes`);
    const noBtn = document.getElementById(`gamb-btn-${idx}-no`);

    yesBtn.classList.toggle('active', val === true);
    noBtn.classList.toggle('active', val === false);

    // Check if all answered
    const completed = currentAnswers.every(ans => ans !== null);
    const submitBtn = document.getElementById('gamb-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = !completed;
        submitBtn.style.opacity = completed ? '1' : '0.5';
    }
};

window.calculateGambResult = function() {
    const score = currentAnswers.filter(ans => ans === true).length;
    const body = document.getElementById('gamb-test-body');

    let title = "";
    let color = "";
    let desc = "";
    let action = "";

    if (score === 0) {
        title = "RISC INEXISTENT";
        color = "var(--ng)";
        desc = "Comportamentul tău pare a fi sub control total. Continuați să tratați parierea ca pe o formă de divertisment, nu ca pe o sursă de venit.";
    } else if (score <= 2) {
        title = "RISC SCĂZUT";
        color = "var(--nb)";
        desc = "Există câteva semne de avertizare. Fii atent la timpul și banii alocați. Analizează-ți deciziile cu prudență.";
    } else if (score <= 4) {
        title = "RISC MODERAT (Problematic)";
        color = "var(--gold)";
        desc = "Prezinți trăsături specifice jocului problematic. Există riscul pierderii controlului. Îți recomandăm o pauză de la activitățile de pariere.";
    } else {
        title = "RISC RIDICAT (Dependență)";
        color = "var(--danger)";
        desc = "Rezultatele indică un risc major de dependență. Parierea pare să îți afecteze viața personală sau financiară. Este esențial să cauți ajutor specializat.";
        action = `<div style="margin-top:20px; padding:15px; background:rgba(255,51,102,0.1); border-radius:12px; border:1px solid var(--danger);">
            <p style="font-weight:700; color:var(--danger); margin-bottom:10px;">RESURSE AJUTOR:</p>
            <a href="https://jocresponsabil.ro" target="_blank" style="color:#fff; text-decoration:underline;">JocResponsabil.ro (Help-line gratuit)</a>
        </div>`;
    }

    body.innerHTML = `
        <div style="text-align:center; padding:20px 0; animation: popIn 0.5s ease-out;">
            <div style="font-family:'Syncopate'; font-size:12px; color:rgba(255,255,255,0.5); margin-bottom:10px;">ANALIZA FINALIZATĂ</div>
            <div style="font-family:'Syncopate'; font-size:18px; font-weight:900; color:${color}; margin-bottom:20px; text-shadow: 0 0 15px ${color};">${title}</div>
            <p style="font-family:'Rajdhani'; font-size:16px; line-height:1.6; color:#fff; margin-bottom:30px;">${desc}</p>
            ${action}
            <button class="main-btn" style="margin-top:30px;" onclick="closeModal('gamb-test-modal')">AM ÎNȚELES</button>
            <p style="font-size:11px; margin-top:20px; opacity:0.4;">Scor: ${score} / ${GAMB_QUESTIONS.length}</p>
        </div>
    `;
};
