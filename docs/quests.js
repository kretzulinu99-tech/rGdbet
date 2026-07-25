/* ═══════════════════════════════════════════════════════════════
   quests.js — Apex Daily Missions & Rewards System
   v1.0 Sovereign Engagement Engine
═══════════════════════════════════════════════════════════════ */
'use strict';

const QUESTS_STORAGE_KEY = 'rgb_daily_quests';
const STREAK_STORAGE_KEY = 'rgb_login_streak';

let DAILY_MISSIONS = [
    { id: 'analyze_lab', title: 'Deep Analysis', desc: 'Analizează 3 meciuri în LAB', goal: 3, reward: 250, type: 'count', key: 'lab_analyses' },
    { id: 'place_bet', title: 'Risk Taker', desc: 'Plasează 2 bilete noi', goal: 2, reward: 150, type: 'count', key: 'bets_placed' },
    { id: 'social_post', title: 'Influencer', desc: 'Postează un bilet în Social', goal: 1, reward: 100, type: 'count', key: 'social_posts' },
    { id: 'high_odds', title: 'Sniper Shot', desc: 'Câștigă un bilet cu cotă > 2.0', goal: 1, reward: 500, type: 'bool', key: 'win_high_odds' }
];

window.initQuests = function() {
    checkLoginStreak();
    checkDailyReset();
    renderQuestsUI();
};

function checkDailyReset() {
    const lastReset = localStorage.getItem('rgb_last_quest_reset');
    const today = new Date().toDateString();

    if (lastReset !== today) {
        const initialProgress = {};
        DAILY_MISSIONS.forEach(m => initialProgress[m.id] = 0);
        localStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(initialProgress));
        localStorage.setItem('rgb_last_quest_reset', today);
        log("Daily Quests Reset for:", today);
    }
}

window.updateQuestProgress = function(questId, amount = 1) {
    let progress = JSON.parse(localStorage.getItem(QUESTS_STORAGE_KEY) || '{}');
    const mission = DAILY_MISSIONS.find(m => m.id === questId);

    if (!mission || progress[questId] >= mission.goal) return;

    progress[questId] = (progress[questId] || 0) + amount;
    localStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(progress));

    if (progress[questId] >= mission.goal) {
        completeQuest(mission);
    }
    renderQuestsUI();
};

function completeQuest(mission) {
    if (typeof addXP === 'function') addXP(mission.reward);
    if (typeof showMsgToast === 'function') {
        showMsgToast(`MISSION COMPLETE: ${mission.title} (+${mission.reward} XP)`, 'success');
    }
}

function checkLoginStreak() {
    let streakData = JSON.parse(localStorage.getItem(STREAK_STORAGE_KEY) || '{"count": 0, "lastDate": ""}');
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (streakData.lastDate === today) return;

    if (streakData.lastDate === yesterday) {
        streakData.count++;
    } else {
        streakData.count = 1;
    }

    streakData.lastDate = today;
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streakData));

    // Reward for login
    if (typeof addXP === 'function') addXP(50 * streakData.count);
}

window.renderQuestsUI = function() {
    const container = document.getElementById('daily-quests-container');
    if (!container) return;

    const progress = JSON.parse(localStorage.getItem(QUESTS_STORAGE_KEY) || '{}');
    let streakData = JSON.parse(localStorage.getItem(STREAK_STORAGE_KEY) || '{"count": 0}');

    let html = `
        <div class="sec-title">🎯 DAILY MISSIONS</div>
        <div class="quests-list">
    `;

    DAILY_MISSIONS.forEach(m => {
        const p = progress[m.id] || 0;
        const pct = Math.min(100, (p / m.goal) * 100);
        const isDone = p >= m.goal;

        html += `
            <div class="quest-card ${isDone ? 'completed' : ''}">
                <div class="quest-header">
                    <span class="quest-title">${m.title}</span>
                    <span class="quest-reward">+${m.reward} XP</span>
                </div>
                <div style="font-size:11px; color:var(--text2); margin-bottom:8px;">${m.desc}</div>
                <div class="quest-progress-track">
                    <div class="quest-progress-fill" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    });

    html += `</div>`; // end quests-list

    // Login Streak Calendar
    html += `
        <div class="sec-title" style="margin-top:20px;">🔥 LOGIN STREAK: ${streakData.count} DAYS</div>
        <div class="streak-calendar">
    `;

    for (let i = 1; i <= 7; i++) {
        const isDayDone = i <= streakData.count;
        const isToday = i === streakData.count;
        html += `<div class="streak-day ${isDayDone ? 'active' : ''} ${isToday ? 'today' : ''}">${i}</div>`;
    }

    html += `</div>`;

    container.innerHTML = html;
};

// RPG Level Up Screen
window.showRPGLevelUp = function(level) {
    const overlay = document.createElement('div');
    overlay.className = 'level-up-screen active';
    overlay.innerHTML = `
        <div class="lu-crown-wrap">
            <i class="fa-solid fa-crown lu-crown"></i>
        </div>
        <div class="lu-text-glitch" data-text="LEVEL UP!">LEVEL UP!</div>
        <div class="lu-new-rank">RANK REACHED: LEVEL ${level}</div>

        <button class="main-btn" onclick="this.parentElement.remove()" style="width:200px;">CONTINUE JOURNEY</button>
    `;
    document.body.appendChild(overlay);

    if (typeof confetti === 'function') {
        confetti({
            particleCount: 200,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#00c8ff', '#00ff88', '#ffcc00']
        });
    }

    if (window.Android && typeof Android.vibrate === 'function') Android.vibrate(500);
};
