/* ═══════════════════════════════════════════════════════════
   streak-effects.js  v3 — simplu, garantat vizibil
   HOT  : 5+ WIN  consecutive → flăcări pe margini + glow
   COLD : 5+ LOSS consecutive → cristale + ninsoare + glow
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Config ─────────────────────────────── */
  var THRESHOLD = 5;
  var LS_KEY    = 'rgb_bets';

  /* ── State ──────────────────────────────── */
  var mode     = null;   // 'hot'|'cold'|null
  var rafId    = null;
  var cvs, ctx;
  var particles = [];
  var badgeEl, notifyEl, ntTimer;

  /* ══════════════════════════════════════════
     INIT
  ══════════════════════════════════════════ */
  function init() {
    injectStyle();

    /* canvas unic, poziţionat peste tot */
    cvs = document.createElement('canvas');
    cvs.id = 'sfx-cvs';
    cvs.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'pointer-events:none;z-index:99990;display:none;' +
      'margin:0;padding:0;border:none;outline:none;'  /* NO transform/filter/opacity — root stacking context */;
    document.body.appendChild(cvs);
    ctx = cvs.getContext('2d');

    /* badge colţ dreapta */
    badgeEl = document.createElement('div');
    badgeEl.id = 'sfx-badge';
    badgeEl.style.cssText =
      'position:fixed;top:14px;right:14px;z-index:99992;display:none;' +
      'pointer-events:none;padding:6px 14px;border-radius:30px;' +
      'font-family:Syncopate,sans-serif;font-size:10px;font-weight:700;' +
      'letter-spacing:2px;color:#fff;';
    document.body.appendChild(badgeEl);

    /* banner sus-centru */
    notifyEl = document.createElement('div');
    notifyEl.id = 'sfx-notify';
    notifyEl.style.cssText =
      'position:fixed;left:50%;transform:translateX(-50%);top:-120px;' +
      'z-index:99993;pointer-events:none;' +
      'transition:top .55s cubic-bezier(.34,1.56,.64,1);' +
      'padding:13px 26px;border-radius:50px;color:#fff;white-space:nowrap;' +
      'font-family:Syncopate,sans-serif;font-size:11px;font-weight:700;' +
      'letter-spacing:2px;display:flex;align-items:center;gap:10px;';
    document.body.appendChild(notifyEl);

    window.addEventListener('resize', onResize);
    onResize();

    /* evaluare la pornire (streak existent) */
    setTimeout(evaluate, 800);

    /* hook pe changeStatus (e global în script.js) */
    hookOnce();
  }

  function onResize() {
    cvs.width  = window.innerWidth;
    cvs.height = window.innerHeight;
  }

  /* ══════════════════════════════════════════
     HOOK PE changeStatus
  ══════════════════════════════════════════ */
  function hookOnce() {
    var attempts = 0;
    var iv = setInterval(function () {
      attempts++;
      if (typeof window.changeStatus === 'function' && !window._sfxHooked) {
        var orig = window.changeStatus;
        window.changeStatus = function (id, st) {
          var r = orig(id, st);
          setTimeout(evaluate, 200);
          return r;
        };
        window._sfxHooked = true;
        clearInterval(iv);
      }
      if (attempts > 50) clearInterval(iv);
    }, 250);
  }

  /* ══════════════════════════════════════════
     DETECŢIE STREAK
  ══════════════════════════════════════════ */
  function evaluate() {
    var raw = localStorage.getItem(LS_KEY);
    if (!raw) { deactivate(); return; }
    var bets;
    try { bets = JSON.parse(raw); } catch (e) { deactivate(); return; }

    var settled = bets.filter(function (b) {
      return b.status === 'win' || b.status === 'loss' || b.status === 'cashout';
    });
    if (!settled.length) { deactivate(); return; }

    var wins = 0, losses = 0;
    for (var i = settled.length - 1; i >= 0; i--) {
      var st = settled[i].status;
      if (st === 'win' || st === 'cashout') {
        if (losses > 0) break;
        wins++;
      } else {
        if (wins > 0) break;
        losses++;
      }
    }

    if (wins   >= THRESHOLD) activate('hot');
    else if (losses >= THRESHOLD) activate('cold');
    else deactivate();
  }

  /* ══════════════════════════════════════════
     ACTIVARE / DEZACTIVARE
  ══════════════════════════════════════════ */
  function activate(m) {
    if (mode === m) return;
    deactivate();
    mode = m;
    particles = [];
    document.body.classList.add(m === 'hot' ? 'streak-hot' : 'streak-cold');
    cvs.style.display = 'block';

    if (m === 'hot') {
      showBadge('🔥 HOT STREAK', 'linear-gradient(135deg,#ff4400,#ff9900)',
                '0 4px 20px rgba(255,80,0,.6)');
      showNotify('🔥', 'HOT STREAK!', '5 WIN consecutive',
                 'linear-gradient(135deg,#ff3300,#ff8800)',
                 '0 8px 40px rgba(255,60,0,.6)');
      if (typeof window.confetti === 'function') {
        window.confetti({
          particleCount: 100, spread: 110,
          colors: ['#ff4400','#ff8800','#ffcc00','#ffff00'],
          origin: { y: 0.7 }
        });
      }
    } else {
      showBadge('❄️ COLD STREAK', 'linear-gradient(135deg,#0044cc,#00bbff)',
                '0 4px 20px rgba(0,150,255,.6)');
      showNotify('❄️', 'COLD STREAK!', '5 LOSS consecutive',
                 'linear-gradient(135deg,#0033bb,#00aaff)',
                 '0 8px 40px rgba(0,130,255,.6)');
    }

    rafId = requestAnimationFrame(tick);
  }

  function deactivate() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    mode = null;
    particles = [];
    document.body.classList.remove('streak-hot', 'streak-cold');
    if (cvs) {
      cvs.style.display = 'none';
      if (ctx) ctx.clearRect(0, 0, cvs.width, cvs.height);
    }
    hideBadge();
  }

  /* ══════════════════════════════════════════
     LOOP ANIMAŢIE
  ══════════════════════════════════════════ */
  var lastT = 0;
  function tick(ts) {
    if (!mode) return;
    var dt = ts - lastT;
    if (dt > 60) dt = 60;   /* cap — tab inactiv */
    lastT = ts;

    var W = cvs.width, H = cvs.height;

    if (mode === 'hot')  drawFire(W, H, dt);
    if (mode === 'cold') drawIce(W, H, dt);

    rafId = requestAnimationFrame(tick);
  }

  /* ══════════════════════════════════════════
     FOC — particule alungite, gradiente calde
  ══════════════════════════════════════════ */
  function mkFlame(W, H) {
    /* spawn de-a lungul întregii baze + coloane laterale */
    var zone = Math.random();
    var x, y;
    if (zone < 0.72) { x = R(0, W);   y = H + R(2, 12); }
    else if (zone < 0.86) { x = R(-8, 5);    y = R(H * 0.2, H); }
    else              { x = R(W - 5, W + 8); y = R(H * 0.2, H); }

    return {
      x: x, y: y,
      vx: R(-0.8, 0.8),
      vy: -R(1.6, 3.8),
      r:  R(7, 26),          /* raza initiala */
      hue:R(10, 52),         /* 10=rosu, 52=galben */
      life: 0,
      maxL: R(0.55, 1.0),
      wob: Math.random() * 6.28,
    };
  }

  function mkEmber(W, H) {
    return {
      x: R(W * 0.05, W * 0.95), y: H + 4,
      vx: R(-1.5, 1.5), vy: -R(2.5, 5.5),
      r: R(0.8, 2.5), life: 0, maxL: R(0.35, 0.8),
      ember: true,
    };
  }

  function drawFire(W, H, dt) {
    /* fundal semitransparent — creează "urme" calde */
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(8,1,0,0.20)';
    ctx.fillRect(0, 0, W, H);

    /* spawn */
    if (particles.length < 200) {
      for (var s = 0; s < 6; s++) particles.push(mkFlame(W, H));
    }
    if (Math.random() < 0.65 && particles.filter(function(p){return p.ember;}).length < 70)
      particles.push(mkEmber(W, H));

    /* draw — modul 'lighter' aduna luminile → efect strălucitor */
    ctx.globalCompositeOperation = 'lighter';

    var alive = [];
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var step = dt * 0.016;

      p.life += step * (p.ember ? 1.1 : Math.abs(p.vy) / 2.8);
      p.wob  += dt * 0.05;
      p.x    += p.vx * dt * 0.45 + Math.sin(p.wob) * 0.75;
      p.y    += p.vy * dt * 0.45;
      if (!p.ember) p.r *= (1 - step * 0.18);

      if (p.life >= p.maxL || p.r < 0.8) continue;

      var t  = p.life / p.maxL;
      var al = t < 0.18 ? t / 0.18 : 1 - ((t - 0.18) / 0.82);
      al = Math.max(0, Math.min(1, al));

      if (p.ember) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.28);
        ctx.fillStyle = 'hsla(42,100%,82%,' + al + ')';
        ctx.fill();
      } else {
        /* flacără alungită */
        var rad = p.r * Math.max(0.25, 1 - t * 0.45);
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        g.addColorStop(0,    'hsla(60,100%,98%,'  + al         + ')');
        g.addColorStop(0.18, 'hsla(' + (p.hue+24) + ',100%,88%,' + (al*0.93) + ')');
        g.addColorStop(0.50, 'hsla(' + (p.hue+10) + ',100%,65%,' + (al*0.72) + ')');
        g.addColorStop(0.78, 'hsla(' + p.hue      + ',95%,42%,'  + (al*0.42) + ')');
        g.addColorStop(1,    'hsla(' + (p.hue-10) + ',90%,22%,0)');
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1, 1.75);           /* alungit vertical */
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, 6.28);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
      }
      alive.push(p);
    }
    particles = alive;

    /* linie de foc animată la baza ecranului */
    var now = performance.now() * 0.001;
    for (var fx = 0; fx < W; fx += 7) {
      var fh = 38 + Math.sin(fx * 0.038 + now * 4.5) * 17
                  + Math.sin(fx * 0.065 + now * 7.2) * 9;
      var fg = ctx.createLinearGradient(fx, H, fx, H - fh);
      fg.addColorStop(0,   'rgba(255,90,0,0.50)');
      fg.addColorStop(0.4, 'rgba(255,55,0,0.24)');
      fg.addColorStop(0.85,'rgba(255,150,0,0.08)');
      fg.addColorStop(1,   'rgba(255,200,0,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(fx, H - fh, 7, fh);
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  /* ══════════════════════════════════════════
     GHEAŢĂ — cristale hexagonale + ninsoare
  ══════════════════════════════════════════ */
  function mkFlake(W) {
    var big = Math.random() < 0.20;
    return {
      x: R(0, W), y: R(-30, -5),
      vx: R(-0.6, 0.6), vy: R(0.5, 1.7),
      r:  big ? R(12, 26) : R(2, 8),
      rot: Math.random() * 6.28,
      rotV:(Math.random() - 0.5) * 0.03,
      wob: Math.random() * 6.28,
      al:  R(0.40, 0.90),
      crystal: big,
      ice: true,
    };
  }

  function drawIce(W, H, dt) {
    ctx.clearRect(0, 0, W, H);

    /* stalactite sus */
    var nt = performance.now() * 0.001;
    for (var sx = 10; sx < W; sx += 24) {
      var ih = 24 + Math.sin(sx * 0.042 + nt * 0.55) * 11
                  + Math.sin(sx * 0.088 + nt * 0.82) * 6;
      var sg = ctx.createLinearGradient(sx, 0, sx, ih);
      sg.addColorStop(0,   'rgba(160,235,255,0.32)');
      sg.addColorStop(0.65,'rgba(90,195,255,0.14)');
      sg.addColorStop(1,   'rgba(50,170,255,0)');
      ctx.beginPath();
      ctx.moveTo(sx - 6, 0);
      ctx.lineTo(sx,     ih);
      ctx.lineTo(sx + 6, 0);
      ctx.closePath();
      ctx.fillStyle = sg;
      ctx.fill();
    }

    /* cristale pe margini laterale */
    [[0, 1], [W, -1]].forEach(function (side) {
      var bx = side[0], dir = side[1];
      for (var j = 0; j < 9; j++) {
        var by = H * (j + 0.5) / 9;
        var bw = 14 + Math.sin(j * 0.85 + nt * 0.42) * 6;
        var bg = ctx.createLinearGradient(bx, by, bx + dir * bw, by);
        bg.addColorStop(0, 'rgba(130,225,255,0.24)');
        bg.addColorStop(1, 'rgba(70,190,255,0)');
        ctx.beginPath();
        ctx.moveTo(bx, by - 13);
        ctx.lineTo(bx + dir * bw, by);
        ctx.lineTo(bx, by + 13);
        ctx.closePath();
        ctx.fillStyle = bg;
        ctx.fill();
      }
    });

    /* spawn fulgi */
    if (particles.length < 130) particles.push(mkFlake(W));

    var aliveI = [];
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.y   += p.vy * dt * 0.38;
      p.wob += dt * 0.020;
      p.x   += p.vx * dt * 0.32 + Math.sin(p.wob) * 0.42;
      p.rot += p.rotV * dt;
      if (p.y > H + 35) continue;

      ctx.save();
      ctx.globalAlpha = p.al;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.crystal) drawHex(ctx, p.r);
      else           drawDot(ctx, p.r);
      ctx.restore();
      aliveI.push(p);
    }
    particles = aliveI;

    /* ceaţă rece subtilă */
    var fog = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.85);
    fog.addColorStop(0,   'rgba(0,190,255,' + (0.035 + Math.sin(nt * 0.5) * 0.012) + ')');
    fog.addColorStop(0.7, 'rgba(0,140,255,0.010)');
    fog.addColorStop(1,   'rgba(0,100,200,0)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);
  }

  function drawHex(c, s) {
    for (var b = 0; b < 6; b++) {
      c.save();
      c.rotate(b * Math.PI / 3);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -s);
      c.strokeStyle = 'rgba(190,248,255,0.88)';
      c.lineWidth = Math.max(0.7, s * 0.07);
      c.lineCap = 'round'; c.stroke();
      for (var l = 1; l <= 2; l++) {
        var by = -(s * l) / 2.9, bl = s * 0.27 * (1 - l * 0.22);
        c.beginPath();
        c.moveTo(0, by); c.lineTo( bl * 0.71, by - bl * 0.71);
        c.moveTo(0, by); c.lineTo(-bl * 0.71, by - bl * 0.71);
        c.strokeStyle = 'rgba(210,250,255,0.68)';
        c.lineWidth = Math.max(0.4, s * 0.042);
        c.stroke();
      }
      c.restore();
    }
    c.beginPath(); c.arc(0, 0, s * 0.10, 0, 6.28);
    c.fillStyle = 'rgba(235,252,255,0.95)'; c.fill();
  }

  function drawDot(c, s) {
    var g = c.createRadialGradient(0, 0, 0, 0, 0, s);
    g.addColorStop(0,   'rgba(230,252,255,0.95)');
    g.addColorStop(0.5, 'rgba(155,228,255,0.60)');
    g.addColorStop(1,   'rgba(70,175,255,0)');
    c.beginPath(); c.arc(0, 0, s, 0, 6.28);
    c.fillStyle = g; c.fill();
  }

  /* ══════════════════════════════════════════
     UI HELPERS
  ══════════════════════════════════════════ */
  function showBadge(txt, bg, shadow) {
    badgeEl.textContent = txt;
    badgeEl.style.background  = bg;
    badgeEl.style.boxShadow   = shadow;
    badgeEl.style.display     = 'block';
  }
  function hideBadge() { if (badgeEl) badgeEl.style.display = 'none'; }

  function showNotify(icon, title, sub, bg, shadow) {
    if (!notifyEl) return;
    if (ntTimer) clearTimeout(ntTimer);
    notifyEl.innerHTML =
      '<span style="font-size:20px">' + icon + '</span>' +
      '<span><span style="display:block;font-size:12px">' + title + '</span>' +
      '<span style="font-size:8px;opacity:.75;letter-spacing:1px">' + sub + '</span></span>' +
      '<span style="font-size:20px">' + icon + '</span>';
    notifyEl.style.background = bg;
    notifyEl.style.boxShadow  = shadow;
    notifyEl.style.top = '-120px';
    void notifyEl.offsetWidth;
    notifyEl.style.top = '18px';
    ntTimer = setTimeout(function () { notifyEl.style.top = '-120px'; }, 4500);
  }

  /* ══════════════════════════════════════════
     CSS CLASE BODY — glow containere
  ══════════════════════════════════════════ */
  function injectStyle() {
    if (document.getElementById('sfx-css')) return;
    var css = [
      /* ── HOT ── */
      'body.streak-hot .form-card,body.streak-hot .stat-card,',
      'body.streak-hot .chart-wrap,body.streak-hot .target-card,',
      'body.streak-hot .filter-bar,body.streak-hot .dss-team-panel,',
      'body.streak-hot .dss-global,body.streak-hot .dss-sb-wrap,',
      'body.streak-hot .dss-report,body.streak-hot .profile-stat-card,',
      'body.streak-hot .panel{',
      '  border-color:rgba(255,110,0,.80)!important;',
      '  box-shadow:0 0 16px rgba(255,80,0,.55),',
      '             0 0 42px rgba(255,50,0,.30),',
      '             inset 0 0 22px rgba(255,40,0,.10)!important;',
      '  animation:sfxHot 2.2s ease-in-out infinite!important;}',
      '@keyframes sfxHot{',
      '  0%,100%{box-shadow:0 0 16px rgba(255,80,0,.55),0 0 42px rgba(255,50,0,.30),inset 0 0 22px rgba(255,40,0,.10);border-color:rgba(255,110,0,.80)!important;}',
      '  50%{box-shadow:0 0 30px rgba(255,140,0,.80),0 0 75px rgba(255,70,0,.48),inset 0 0 36px rgba(255,60,0,.18);border-color:rgba(255,200,0,.98)!important;}}',

      /* ── COLD ── */
      'body.streak-cold .form-card,body.streak-cold .stat-card,',
      'body.streak-cold .chart-wrap,body.streak-cold .target-card,',
      'body.streak-cold .filter-bar,body.streak-cold .dss-team-panel,',
      'body.streak-cold .dss-global,body.streak-cold .dss-sb-wrap,',
      'body.streak-cold .dss-report,body.streak-cold .profile-stat-card,',
      'body.streak-cold .panel{',
      '  border-color:rgba(80,205,255,.80)!important;',
      '  box-shadow:0 0 16px rgba(0,185,255,.55),',
      '             0 0 42px rgba(0,135,255,.30),',
      '             inset 0 0 22px rgba(0,165,255,.10)!important;',
      '  animation:sfxCold 3s ease-in-out infinite!important;}',
      '@keyframes sfxCold{',
      '  0%,100%{box-shadow:0 0 16px rgba(0,185,255,.55),0 0 42px rgba(0,135,255,.30),inset 0 0 22px rgba(0,165,255,.10);border-color:rgba(80,205,255,.80)!important;}',
      '  50%{box-shadow:0 0 32px rgba(0,228,255,.82),0 0 78px rgba(0,165,255,.50),inset 0 0 38px rgba(0,198,255,.18);border-color:rgba(165,248,255,.98)!important;}}',

      /* nav glow */
      'body.streak-hot .bottom-nav{box-shadow:0 -4px 28px rgba(255,80,0,.42)!important;border-top-color:rgba(255,110,0,.50)!important;}',
      'body.streak-cold .bottom-nav{box-shadow:0 -4px 28px rgba(0,185,255,.42)!important;border-top-color:rgba(0,210,255,.50)!important;}',
      /* stat values */
      'body.streak-hot .stat-val{animation:sfxHotTxt 2s ease-in-out infinite;}',
      'body.streak-cold .stat-val{animation:sfxColdTxt 2.5s ease-in-out infinite;}',
      '@keyframes sfxHotTxt{0%,100%{text-shadow:0 0 6px rgba(255,100,0,.4);}50%{text-shadow:0 0 20px rgba(255,165,0,.95),0 0 40px rgba(255,80,0,.55);}}',
      '@keyframes sfxColdTxt{0%,100%{text-shadow:0 0 6px rgba(0,185,255,.4);}50%{text-shadow:0 0 20px rgba(0,235,255,.95),0 0 40px rgba(0,155,255,.55);}}',
    ].join('\n');

    var st = document.createElement('style');
    st.id = 'sfx-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ── Util ────────────────────────────────── */
  function R(a, b) { return a + Math.random() * (b - a); }

  /* ══════════════════════════════════════════
     API PUBLICĂ
  ══════════════════════════════════════════ */
  window.streakFX = {
    evaluate: evaluate,
    hot:  function () { activate('hot');  },
    cold: function () { activate('cold'); },
    off:  deactivate,
    mode: function () { return mode; },
  };

  /* start */
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else
    init();

})();
