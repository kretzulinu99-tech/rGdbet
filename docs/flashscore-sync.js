/* ── FLASHSCORE SMART VALIDATOR (v16.40) ── */
'use strict';

window.syncBetsWithFlashscore = async function() {
    const bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]');
    const pendingBets = bets.filter(b => b.status === 'pending');
    if (pendingBets.length === 0) {
        if(typeof showMsgToast === 'function') showMsgToast("Nu ai niciun bilet în așteptare.", "info");
        else alert("Nu ai niciun bilet în așteptare.");
        return;
    }

    const btn = document.getElementById('fs-sync-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> VERIFICARE...`;
    }

    let updatedCount = 0;
    for (let bet of pendingBets) {
        try {
            const result = await checkBetResult(bet);
            if (result && result.status !== 'pending') {
                const index = bets.findIndex(b => b.id === bet.id);
                if (index !== -1) {
                    bets[index].status = result.status;
                    updatedCount++;
                }
            }
        } catch (e) { console.error("Sync error for bet", bet.id, e); }
    }

    if (updatedCount > 0) {
        localStorage.setItem('rgb_bets', JSON.stringify(bets));
        if (typeof render === 'function') render();
        if(typeof showMsgToast === 'function') showMsgToast(`Sincronizare Gata! ${updatedCount} bilete actualizate.`, "success");
        else alert(`Sincronizare Gata! ${updatedCount} bilete actualizate.`);
    } else {
        if(typeof showMsgToast === 'function') showMsgToast("Meciurile nu s-au terminat încă sau nu au fost găsite.", "info");
        else alert("Meciurile nu s-au terminat încă sau nu au fost găsite pe Flashscore.");
    }
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-rotate"></i> SYNC FLASHSCORE`;
    }
};

async function checkBetResult(bet) {
    const events = bet.events || [{ name: bet.name, market: "Pronostic", odds: bet.odds }];
    if (!events.length) return null;

    let allWon = true;
    let anyLoss = false;
    let anyPending = false;

    for (let ev of events) {
        const matchInfo = await queryGeminiForResult(ev.name, bet.date);
        if (!matchInfo || !matchInfo.finished) {
            anyPending = true;
            allWon = false;
            continue;
        }

        const isWinner = validateMarket(ev.market, matchInfo.homeScore, matchInfo.awayScore);
        if (isWinner === false) {
            anyLoss = true;
            allWon = false;
            break;
        }
        if (isWinner === null) {
            anyPending = true;
            allWon = false;
        }
    }

    if (anyLoss) return { status: 'loss' };
    if (allWon && !anyPending) return { status: 'win' };
    return { status: 'pending' };
}

async function queryGeminiForResult(matchName, date) {
    const GEMINI_KEY = 'AIzaSyAb8RN6KuZ5XBxdjy7V1Sr1jto1YSj51efFRIN4Y5BvWWPuUWSQ';
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

    const prompt = `Return Football result for: "${matchName}" on date ${date} from reliable sources like Flashscore. Output JSON ONLY: {"finished":true, "homeScore":X, "awayScore":Y}. If the match is not found or not finished, return {"finished":false}.`;

    try {
        const resp = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                tools: [{ google_search: {} }]
            })
        });
        const data = await resp.json();
        const text = data.candidates[0].content.parts[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
        console.error("Gemini API Error", e);
        return null;
    }
}

function validateMarket(market, h, a) {
    const m = (market || "").toLowerCase();
    const total = h + a;

    // Logică pentru 1X2
    if (m === '1' || m.includes('solist') || m.includes('gazde')) return h > a;
    if (m === '2' || m.includes('oaspeti')) return a > h;
    if (m.toLowerCase() === 'x' || m.includes('egal')) return h === a;

    // Logică pentru Goluri
    const overMatch = m.match(/peste\s*(\d+\.?\d*)/) || m.match(/over\s*(\d+\.?\d*)/);
    if (overMatch) return total > parseFloat(overMatch[1]);

    const underMatch = m.match(/sub\s*(\d+\.?\d*)/) || m.match(/under\s*(\d+\.?\d*)/);
    if (underMatch) return total < parseFloat(underMatch[1]);

    // Logică pentru GG (Ambele marchează)
    if (m.includes('gg') || m.includes('ambele')) return h > 0 && a > 0;

    return null; // Tip de pariu nerecunoscut pentru validare automată
}
