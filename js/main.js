/* ESCADA — Deja tu estela
   Lógica de la landing (vídeo del hero atado al scroll, control de vidrio, difusión al scroll,
   story con estelas en canvas y selector de tamaño). */
(() => {
  'use strict';

  class Escada {
    constructor() {
      this.dead = false;
      this.offs = [];
      this.rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.D = this.rm ? 1 : 980;
    }

    init() {
      const R = this.root = document.getElementById('app');
      if (!R) return;
      document.documentElement.lang = 'es';
      if (location.protocol === 'file:') this.fileNotice();
      this.hero = R.querySelector('[data-hero]');
      this.live = R.querySelector('[data-live]');
      const ready = () => { if (this.hero && !this.dead) this.hero.setAttribute('data-ready', ''); };
      requestAnimationFrame(() => requestAnimationFrame(ready));
      setTimeout(ready, 120);
      this.initVideo(); this.initCtrl(); this.initReveal(); this.initSizes(); this.initStory(); this.initNotas(); this.initRitual(); this.initOcc();
    }

    // Abierta con doble clic (file://) el navegador bloquea la carga del modelo 3D: se avisa cómo abrirla bien.
    fileNotice() {
      const n = document.createElement('div');
      n.setAttribute('role', 'status');
      n.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:60;max-width:min(380px,calc(100vw - 32px));padding:14px 44px 14px 16px;border-radius:16px;background:rgb(250 246 241 / 0.94);color:#2A0F16;border:1px solid rgb(42 15 22 / 0.14);box-shadow:0 18px 40px -20px rgb(42 15 22 / 0.5);font:500 14px/1.45 Manrope,system-ui,sans-serif';
      n.innerHTML = 'Estás viendo la web como archivo, y así el navegador no deja cargar el <b>modelo 3D</b>. Ábrela desde un servidor local, por ejemplo <b>node serve.mjs 8735</b> y luego http://127.0.0.1:8735/.';
      const x = document.createElement('button');
      x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Cerrar aviso');
      x.style.cssText = 'position:absolute;top:6px;right:8px;width:32px;height:32px;border:0;background:none;color:inherit;font:400 22px/1 system-ui;cursor:pointer';
      x.addEventListener('click', () => n.remove());
      n.appendChild(x);
      document.body.appendChild(n);
    }
    on(t, e, f, o) { t.addEventListener(e, f, o); this.offs.push(() => t.removeEventListener(e, f, o)); }
    say(msg) { const l = this.live; if (!l) return; l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 60); }

    // ---- Vídeo del hero atado al scroll ----
    // 106 fotogramas (los 7 s del clip, uno de cada dos) se dibujan en un canvas según el progreso de la
    // escena fija. Se cargan de grueso a fino para que haya imagen en cualquier punto desde el principio.
    initVideo() {
      const H = this.hero, S = H.closest('[data-hscene]'), cv = H.querySelector('.hcv');
      if (!S || !cv || this.rm) return;
      const N = 106, url = i => 'assets/hero/f' + String(i).padStart(3, '0') + '.webp';
      const ctx = cv.getContext('2d');
      const imgs = new Array(N).fill(null), tries = new Array(N).fill(0);
      const clamp = v => Math.min(1, Math.max(0, v));
      let target = 0, shown = 0, raf = 0, drawn = -1, w = 0, h = 0, active = 0, qi = 0;

      const order = [0, N - 1], seen = new Set(order);
      [32, 16, 8, 4, 2, 1].forEach(step => { for (let i = 0; i < N; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); } });

      const pick = f => {
        const i = Math.round(f);
        if (imgs[i]) return i;
        for (let d = 1; d < N; d++) {
          if (i - d >= 0 && imgs[i - d]) return i - d;
          if (i + d < N && imgs[i + d]) return i + d;
        }
        return -1;
      };
      const draw = i => {
        const im = imgs[i]; if (!im || !w) return;
        const s = Math.max(w / im.naturalWidth, h / im.naturalHeight), dw = im.naturalWidth * s, dh = im.naturalHeight * s;
        ctx.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
        drawn = i;
      };
      const request = () => { if (!raf) raf = requestAnimationFrame(tick); };
      const tick = () => {
        raf = 0;
        shown += (target - shown) * 0.16;
        if (Math.abs(target - shown) < 0.0004) shown = target;
        const i = pick(shown * (N - 1));
        if (i >= 0 && i !== drawn) draw(i);
        if (shown !== target) request();
      };
      const measure = () => {
        const r = S.getBoundingClientRect(), d = r.height - innerHeight;
        target = d > 0 ? clamp(-r.top / d) : 0;
      };
      const size = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cw = Math.max(1, Math.round(H.clientWidth * dpr)), ch = Math.max(1, Math.round(H.clientHeight * dpr));
        const k = Math.min(1, 1600 / cw);
        w = cv.width = Math.round(cw * k); h = cv.height = Math.round(ch * k);
        ctx.imageSmoothingQuality = 'high';
        drawn = -1; request();
      };
      const load = () => {
        while (active < 6 && qi < order.length) {
          const i = order[qi++], im = new Image();
          active++;
          im.decoding = 'async';
          im.onload = () => { imgs[i] = im; active--; request(); load(); };
          im.onerror = () => { active--; if (++tries[i] < 3) order.push(i); load(); };
          im.src = url(i);
        }
      };

      measure(); shown = target;
      size(); load();
      this.on(window, 'scroll', () => { measure(); request(); }, { passive: true });
      this.on(window, 'resize', () => { size(); measure(); request(); });
    }

    // ---- Controlador de vidrio ----
    initCtrl() {
      const C = this.ctrl = this.hero.querySelector('[data-ctrl]');
      const cap = C.querySelector('.capsule'), trk = C.querySelector('.track');
      this.anchor = C.querySelector('.anchor');
      this.btns = [...C.querySelectorAll('button[data-i]')];
      this.fichas = [...this.hero.querySelectorAll('.ficha')];
      this.state = 'idle'; this.busy = false; this.ptrIn = false; this.ctok = 0; this.chosen = null;
      const CAP = [['-5px', 'calc(20% + 5px)'], ['20%', '20%'], ['40%', '20%'], ['60%', '20%'], ['80%', 'calc(20% + 5px)']];
      this.setHl = i => { C.style.setProperty('--cap-left', CAP[i][0]); C.style.setProperty('--cap-width', CAP[i][1]); C.setAttribute('data-hl', String(i)); };
      this.setHl(0);
      const kb = () => { const f = document.activeElement; return this.btns.includes(f) && f.matches(':focus-visible') ? f : null; };
      this.on(C.querySelector('.intro'), 'pointerenter', e => { if (this.state === 'idle' && e.pointerType !== 'touch' && !kb()) this.setHl(0); });
      this.btns.forEach(b => {
        const i = +b.dataset.i;
        this.on(b, 'pointerenter', e => { if (this.state === 'idle' && e.pointerType !== 'touch') this.setHl(i); });
        this.on(b, 'focus', () => { if (this.state === 'idle') this.setHl(i); });
        this.on(b, 'blur', () => { if (this.state === 'idle' && !this.ptrIn) this.setHl(0); });
        this.on(b, 'click', () => this.pick(b, i));
      });
      this.on(C, 'pointerenter', () => { this.ptrIn = true; });
      this.on(C, 'pointerleave', () => { this.ptrIn = false; if (this.state !== 'idle') return; const f = kb(); this.setHl(f ? +f.dataset.i : 0); });
      this.on(C, 'pointermove', e => {
        [trk, cap].forEach(el => {
          const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
          el.style.setProperty('--glass-x', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
          el.style.setProperty('--glass-y', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
        });
      });
    }
    pick(b, i) {
      if (this.busy || b.disabled) return;
      if (this.state === 'idle') this.select(b, i);
      else if (this.state === 'selected' && b === this.chosen) this.back(b);
    }
    select(b, i) {
      const tok = ++this.ctok; this.busy = true; this.state = 'selected'; this.chosen = b;
      const hadFocus = document.activeElement === b;
      this.btns.forEach(x => { x.disabled = true; });
      const br = b.getBoundingClientRect(), ar = this.anchor.getBoundingClientRect();
      b.style.setProperty('--tx', (ar.left + ar.width / 2 - (br.left + br.width / 2)).toFixed(2) + 'px');
      b.style.setProperty('--ty', (ar.top + ar.height / 2 - (br.top + br.height / 2)).toFixed(2) + 'px');
      b.setAttribute('data-chosen', '');
      this.btns.forEach(x => { if (x !== b) { x.setAttribute('aria-hidden', 'true'); x.tabIndex = -1; } });
      this.ctrl.setAttribute('data-state', 'selected');
      const f = this.fichas.find(el => el.dataset.n === String(i));
      this.fichas.forEach(el => { if (el === f) el.setAttribute('data-show', ''); else el.removeAttribute('data-show'); });
      this.hero.setAttribute('data-mode', 'note');
      if (f) { const [n, ing, fr] = [...f.children].map(c => c.textContent); this.say(`Nota ${n}: ${ing}. ${fr}`); }
      setTimeout(() => {
        if (tok !== this.ctok || this.dead) return;
        b.disabled = false; b.setAttribute('aria-label', 'Volver');
        if (hadFocus) b.focus({ preventScroll: true });
        this.busy = false;
      }, this.D);
    }
    back(b) {
      const tok = ++this.ctok; this.busy = true; this.state = 'returning';
      const hadFocus = document.activeElement === b;
      this.btns.forEach(x => { x.disabled = true; });
      b.removeAttribute('aria-label');
      this.setHl(0);
      this.ctrl.setAttribute('data-state', 'returning');
      this.fichas.forEach(el => el.removeAttribute('data-show'));
      this.hero.setAttribute('data-back', ''); this.hero.setAttribute('data-mode', 'title');
      this.say('De vuelta a las notas de ESCADA.');
      setTimeout(() => {
        if (tok !== this.ctok || this.dead) return;
        this.state = 'idle'; this.chosen = null;
        this.ctrl.setAttribute('data-state', 'idle');
        b.removeAttribute('data-chosen'); b.style.removeProperty('--tx'); b.style.removeProperty('--ty');
        this.btns.forEach(x => { x.disabled = false; x.removeAttribute('aria-hidden'); x.removeAttribute('tabindex'); });
        this.busy = false;
        if (hadFocus) b.focus({ preventScroll: true });
      }, this.D);
    }

    // ---- Difusión al hacer scroll ----
    initReveal() {
      const lines = [...this.root.querySelectorAll('[data-words]')];
      lines.forEach(p => {
        if (p.dataset.split) return; p.dataset.split = '1';
        let wi = 0;
        const walk = node => {
          [...node.childNodes].forEach(n => {
            if (n.nodeType === 3) {
              const frag = document.createDocumentFragment();
              n.textContent.split(/(\s+)/).forEach(part => {
                if (!part) return;
                if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
                const s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--wi', wi++); s.textContent = part; frag.appendChild(s);
              });
              n.replaceWith(frag);
            } else if (n.nodeType === 1) { if (n.tagName === 'EM') n.style.setProperty('--wi', wi); walk(n); }
          });
        };
        walk(p);
      });
      const els = [...this.root.querySelectorAll('[data-dif],[data-words]')];
      if (this.rm || !('IntersectionObserver' in window)) { els.forEach(e => e.setAttribute('data-in', '')); return; }
      this.rio = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { e.target.setAttribute('data-in', ''); this.rio.unobserve(e.target); }
      }), { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
      els.forEach(e => this.rio.observe(e));
    }

    // ---- Story: frases que se relevan con el scroll ----
    initStory() {
      const S = this.root.querySelector('[data-story]'); if (!S) return;
      const lines = [...S.querySelectorAll('[data-line]')];
      lines.forEach(p => {
        if (p.dataset.split) return; p.dataset.split = '1';
        const full = p.textContent.replace(/\s+/g, ' ').trim();
        const letters = [];
        const wrap = document.createElement('span'); wrap.setAttribute('aria-hidden', 'true');
        const build = (node, target, grad) => {
          [...node.childNodes].forEach(n => {
            if (n.nodeType === 3) {
              n.textContent.split(/(\s+)/).forEach(part => {
                if (!part) return;
                if (/^\s+$/.test(part)) { target.appendChild(document.createTextNode(' ')); return; }
                const w = document.createElement('span'); w.className = 'wd';
                [...part].forEach(c => { const s = document.createElement('span'); s.className = grad ? 'ch g' : 'ch'; s.textContent = c; w.appendChild(s); letters.push(s); });
                target.appendChild(w);
              });
            } else if (n.nodeType === 1) {
              const clone = n.cloneNode(false); target.appendChild(clone); build(n, clone, grad || n.tagName === 'EM');
            }
          });
        };
        build(p, wrap, false);
        const n = Math.max(1, letters.length - 1);
        letters.forEach((s, i) => s.style.setProperty('--k', (i / n).toFixed(3)));
        const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = full;
        p.textContent = ''; p.appendChild(sr); p.appendChild(wrap);
      });
      // Estelas de aroma: canvas a baja resolución, difuminado barato
      const box = S.querySelector('.trails');
      const cv = document.createElement('canvas'); box.textContent = ''; box.appendChild(cv);
      const ctx = cv.getContext('2d');
      const DS = 0.3, canFilter = 'filter' in ctx;
      const TR = [{ off: -0.95, amp: 0.075, k: 1.9, sp: 1, w: 1 }, { off: 0.1, amp: 0.095, k: 1.5, sp: 0.75, w: 1.3 }, { off: 1, amp: 0.065, k: 2.3, sp: 1.25, w: 0.85 }];
      const COL = [['#F4A93B', '#F37A45', '#E0356E'], ['#F37A45', '#E0356E', '#C4265A'], ['#F4A93B', '#F7A8C4', '#E0356E']];
      const LAY = [[180, 0.05], [128, 0.06], [84, 0.075], [48, 0.1], [20, 0.16]];
      let W = 0, H = 0;
      const size = () => { W = box.clientWidth; H = box.clientHeight; cv.width = Math.max(1, Math.round(W * DS)); cv.height = Math.max(1, Math.round(H * DS)); };
      let storyP = 0, storyW = [1, 0, 0];
      const draw = time => {
        if (!W) size();
        const w = cv.width, h = cv.height, s = Math.max(0.45, Math.min(1.2, W / 1100)) * DS, N = 48;
        ctx.clearRect(0, 0, w, h);
        if (canFilter) ctx.filter = 'blur(' + (7 * Math.max(0.6, W / 1400)).toFixed(1) + 'px)';
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        TR.forEach((t, i) => {
          const g = ctx.createLinearGradient(0, 0, w, 0); COL[i].forEach((c, j) => g.addColorStop(j / 2, c));
          ctx.strokeStyle = g; ctx.beginPath();
          const y0 = h * (0.5 + t.off * 0.2);
          for (let j = 0; j <= N; j++) {
            const q = j / N, x = -w * 0.15 + w * 1.3 * q;
            const y = y0 - h * 0.06 * t.off * q + Math.sin(q * t.k * Math.PI * 2 - time * 0.00035 * t.sp - storyP * 5 + i * 1.7) * h * t.amp * 1.6 * (0.35 + q * 0.9);
            if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          const a = 0.4 + storyW[i] * 0.6;
          LAY.forEach(([lw, o]) => { ctx.globalAlpha = Math.min(1, o * a * 1.5); ctx.lineWidth = lw * t.w * s; ctx.stroke(); });
        });
        ctx.globalAlpha = 1; if (canFilter) ctx.filter = 'none';
      };
      this.on(window, 'resize', () => { size(); draw(performance.now()); });
      if (this.rm) {
        S.setAttribute('data-static', ''); lines.forEach(p => p.removeAttribute('data-off'));
        storyP = 0.4; storyW = [0.6, 0.6, 0.6]; requestAnimationFrame(() => { size(); draw(0); });
        return;
      }
      const bar = S.querySelector('[data-bar]');
      const c01 = x => Math.min(1, Math.max(0, x));
      // [entrada inicio, entrada fin, salida inicio, salida fin] en progreso de fijado P
      const T = [[null, null, 0.2, 0.34], [0.3, 0.47, 0.56, 0.7], [0.66, 0.83, 2, 3]];
      const tgt = { P: 0, A: 0 }, cur = { P: 0, A: 0 }, prev = lines.map(() => ({ p: -1, q: -1, f: '' }));
      let seeded = false, lastT = 0, running = false, tRaf = 0, lastBar = '';
      const measure = () => {
        const r = S.getBoundingClientRect(), vh = window.innerHeight;
        tgt.P = c01(-r.top / Math.max(1, r.height - vh)); tgt.A = c01(1 - r.top / vh);
      };
      const apply = () => {
        const P = cur.P, A = cur.A;
        lines.forEach((el, i) => {
          const [a, b, c, d] = T[i];
          const pin = i === 0 ? c01((A - 0.3) / 0.62) : c01((P - a) / (b - a));
          const q = c01((P - c) / (d - c));
          const pr = prev[i], ps = pin.toFixed(4), qs = q.toFixed(4);
          if (ps !== pr.p) { el.style.setProperty('--p', ps); pr.p = ps; }
          if (qs !== pr.q) { el.style.setProperty('--q', qs); pr.q = qs; }
          const off = pin <= 0 || q >= 1;
          if (off !== el.hasAttribute('data-off')) { if (off) el.setAttribute('data-off', ''); else el.removeAttribute('data-off'); }
          const bl = (1 - pin) * 7 + q * 7;
          const f = off || bl < 0.05 ? 'none' : 'blur(' + bl.toFixed(2) + 'px)';
          if (f !== pr.f) { el.style.filter = f; pr.f = f; }
        });
        storyP = P;
        storyW = [0, 1, 2].map(i => Math.max(0, 1 - Math.abs(P * 2.4 - i) * 0.7));
        const bs = 'scaleX(' + P.toFixed(4) + ')';
        if (bar && bs !== lastBar) { bar.style.transform = bs; lastBar = bs; }
      };
      const loop = now => {
        tRaf = 0; if (!running || this.dead) return;
        measure();
        const dt = lastT ? Math.min(64, now - lastT) : 16.67; lastT = now;
        if (!seeded) { cur.P = tgt.P; cur.A = tgt.A; seeded = true; }
        const k = 1 - Math.pow(1 - 0.16, dt / 16.67);
        cur.P += (tgt.P - cur.P) * k; cur.A += (tgt.A - cur.A) * k;
        if (Math.abs(tgt.P - cur.P) < 0.00005) cur.P = tgt.P;
        if (Math.abs(tgt.A - cur.A) < 0.00005) cur.A = tgt.A;
        apply(); draw(now);
        tRaf = requestAnimationFrame(loop);
      };
      this.sio = new IntersectionObserver(es => {
        running = es[es.length - 1].isIntersecting;
        if (running && !tRaf) { lastT = 0; tRaf = requestAnimationFrame(loop); }
      }, { rootMargin: '20% 0px 20% 0px' });
      this.sio.observe(S);
      measure(); cur.P = tgt.P; cur.A = tgt.A; seeded = true; apply(); size(); draw(performance.now());
    }

    // ---- Selector de tamaño ----
    initSizes() {
      const g = this.root.querySelector('[data-sizes]'); if (!g) return;
      const rs = [...g.querySelectorAll('[role="radio"]')];
      const pick = (r, focus) => { rs.forEach(x => { const on = x === r; x.setAttribute('aria-checked', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; }); if (focus) r.focus(); };
      pick(rs.find(r => r.getAttribute('aria-checked') === 'true') || rs[0], false);
      rs.forEach((r, i) => {
        this.on(r, 'click', () => pick(r, false));
        this.on(r, 'keydown', e => {
          let j = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % rs.length;
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + rs.length) % rs.length;
          if (j !== null) { e.preventDefault(); pick(rs[j], true); }
        });
      });
    }

    // ---- Dial de la estela (sección notas) ----
    initNotas() {
      const P = this.root.querySelector('[data-notas-dial]'); if (!P) return;
      const PH = [
        { name: 'Salida', time: '0–15 min', title: 'El destello', micro: 'Luminosa. Efervescente. Tuya.', line: 'Abre la noche con mandarina confitada, pera y un toque de pimienta rosa: chispa pura recién llegada.', chips: ['Mandarina confitada', 'Pera', 'Pimienta rosa'], share: 26 },
        { name: 'Corazón', time: '15 min–3 h', title: 'El latido', micro: 'Dulce, con carácter.', line: 'Jazmín sambac y azahar toman la palabra sobre un praliné cremoso: el corazón solar del perfume.', chips: ['Jazmín sambac', 'Azahar', 'Praliné'], share: 40 },
        { name: 'Fondo', time: 'Más de 3 h', title: 'El recuerdo', micro: 'Lo que abraza durante horas.', line: 'Vainilla bourbon, ámbar y haba tonka se quedan en la piel: la estela que la mañana siguiente recuerda.', chips: ['Vainilla bourbon', 'Ámbar', 'Haba tonka'], share: 34 }
      ];
      const SPARK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/></svg>';
      const CHIPCOL = ['#F4A93B', '#E0356E', '#C9A24B'];
      const arcs = [...P.querySelectorAll('.narc')];
      const core = P.querySelector('.ncore');
      const title = core.querySelector('.ntitle'), micro = core.querySelector('.nmicro');
      const line = P.querySelector('.nline'), chips = P.querySelector('.nchips');
      const tabs = [...P.querySelectorAll('.ntab')];
      const stations = [...P.querySelectorAll('.nstation')];
      const live = P.querySelector('.nlive');
      const rm = this.rm, SWEEP = 3400, HOLD = 2300, SHARES = PH.map(p => p.share);
      let cur = -1, prog = 1, hold = 0, raf = 0, last = 0, inView = false, parked = false;

      const words = (el, text) => {
        el.textContent = '';
        text.split(' ').forEach((w, i) => {
          const s = document.createElement('span'); s.className = 'nw'; s.style.setProperty('--wi', i); s.textContent = w;
          el.appendChild(s); el.appendChild(document.createTextNode(' '));
        });
      };
      const render = () => {
        arcs.forEach((a, i) => {
          if (i === cur) { a.classList.add('on'); a.setAttribute('stroke-dasharray', (SHARES[i] * prog).toFixed(2) + ' 100'); }
          else { a.classList.remove('on'); a.setAttribute('stroke-dasharray', SHARES[i] + ' 100'); }
        });
      };
      const setPhase = i => {
        cur = i; prog = rm ? 1 : 0; hold = 0;
        const d = PH[i];
        tabs.forEach((t, j) => { t.setAttribute('aria-selected', j === i ? 'true' : 'false'); t.tabIndex = j === i ? 0 : -1; });
        core.setAttribute('data-phase', String(i));
        core.classList.remove('in'); void core.offsetWidth;
        title.textContent = d.title;
        words(micro, d.micro); words(line, d.line);
        chips.innerHTML = d.chips.map((c, j) => `<span class="nchip" style="--i:${j};--chip:${CHIPCOL[i]}">${SPARK}${c}</span>`).join('');
        stations.forEach((s, j) => s.classList.toggle('on', j === i));
        core.classList.add('in');
        if (live) { live.textContent = ''; setTimeout(() => { live.textContent = `Acto ${i + 1} de 3: ${d.name}, ${d.time}. ${d.title}.`; }, 60); }
        render();
      };
      const tick = now => {
        raf = requestAnimationFrame(tick);
        const dt = last ? Math.min(64, now - last) : 16.7; last = now;
        if (rm || parked || !inView) return;
        if (hold > 0) { hold -= dt; if (hold <= 0) setPhase((cur + 1) % PH.length); }
        else { prog += dt / SWEEP; if (prog >= 1) { prog = 1; hold = HOLD; } render(); }
      };
      const start = () => { if (!rm && !raf) { last = 0; raf = requestAnimationFrame(tick); } };
      const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

      tabs.forEach((t, i) => {
        t.addEventListener('click', () => setPhase(i));
        t.addEventListener('keydown', e => {
          let j = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % PH.length;
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + PH.length) % PH.length;
          if (j !== null) { e.preventDefault(); setPhase(j); tabs[j].focus(); }
        });
      });
      P.addEventListener('pointerenter', () => { parked = true; });
      P.addEventListener('pointerleave', () => { parked = false; });
      P.addEventListener('focusin', () => { parked = true; });
      P.addEventListener('focusout', e => { if (!P.contains(e.relatedTarget)) parked = false; });
      new IntersectionObserver(es => {
        inView = es[es.length - 1].isIntersecting;
        if (inView) start(); else stop();
      }, { rootMargin: '10% 0px 10% 0px' }).observe(P);

      setPhase(0);
      start();
    }

    // ---- Ocasiones: lista desplegable; la etiqueta de la foto sigue a la ocasión abierta ----
    initOcc() {
      const R = this.root.querySelector('[data-occ]'); if (!R) return;
      const items = [...R.querySelectorAll('.occ-item')];
      const chip = R.querySelector('[data-occ-chip]');
      const photos = [...R.querySelectorAll('.occ-ph')];
      const open = it => {
        const k = +it.dataset.photo || 0;
        photos.forEach((p, n) => p.classList.toggle('on', n === k));
        items.forEach(o => {
          const on = o === it;
          o.classList.toggle('open', on);
          o.querySelector('.occ-btn').setAttribute('aria-expanded', on ? 'true' : 'false');
        });
        const t = it.querySelector('.occ-btn').dataset.t;
        if (chip && chip.textContent !== t) {
          chip.classList.add('swap');
          setTimeout(() => { chip.textContent = t; chip.classList.remove('swap'); }, this.rm ? 0 : 260);
        }
      };
      items.forEach(it => it.querySelector('.occ-btn').addEventListener('click', () => open(it)));
    }

    // ---- Escena notas + ritual: la sección queda fija y el scroll releva el contenido ----
    initRitual() {
      const S = this.root.querySelector('[data-nscene]'); if (!S) return;
      const slides = [...S.querySelectorAll('[data-slide]')];
      const pts = [...S.querySelectorAll('[data-rpt]')];
      const bottle = S.querySelector('[data-nstick]');
      slides.forEach(sl => [...sl.children].forEach((c, k) => c.style.setProperty('--k', k)));
      const mq = matchMedia('(min-width:860px) and (min-height:560px) and (prefers-reduced-motion:no-preference)');
      const clamp = v => Math.min(1, Math.max(0, v));
      const easeIn = t => 1 - Math.cos(t * Math.PI / 2);
      const easeOut = t => Math.sin(t * Math.PI / 2);
      let cur = -2, lit = null, target = 0, shown = 0, raf = 0, inView = false;

      const setPoint = i => {
        if (i === cur) return; cur = i;
        pts.forEach((p, j) => p.classList.toggle('on', j === i));
      };
      const setLit = v => { if (v !== lit) { lit = v; bottle && bottle.classList.toggle('lit', v); } };
      const paint = p => {
        // relevo solapado: la 0 sale hacia arriba acelerando (p .22–.44) mientras la 1
        // ya sube desde abajo y frena al llegar (p .34–.58)
        const s0 = -easeIn(clamp((p - 0.22) / 0.22));
        const s1 = 1 - easeOut(clamp((p - 0.34) / 0.24));
        [s0, s1].forEach((v, i) => {
          const el = slides[i], a = Math.abs(v);
          el.style.setProperty('--s', v.toFixed(4));
          el.style.setProperty('--o', Math.max(0, 1 - a * 1.15).toFixed(4));
          el.style.setProperty('--b', (a * 10).toFixed(2));
          const hidden = a > 0.5;
          if (el.inert !== hidden) el.inert = hidden;
        });
        setLit(p > 0.46);
        setPoint(p < 0.6 ? -1 : Math.min(pts.length - 1, Math.floor((p - 0.6) / 0.09)));
      };
      const measure = () => {
        const r = S.getBoundingClientRect(), d = r.height - innerHeight;
        target = d > 0 ? clamp(-r.top / d) : 0;
      };
      const tick = () => {
        raf = 0;
        shown += (target - shown) * 0.07;
        if (Math.abs(target - shown) < 0.0005) shown = target;
        paint(shown);
        if (shown !== target) raf = requestAnimationFrame(tick);
      };
      const onScroll = () => { if (!mq.matches || !inView) return; measure(); if (!raf) raf = requestAnimationFrame(tick); };
      const reset = () => {
        slides.forEach(el => { ['--s', '--o', '--b'].forEach(k => el.style.removeProperty(k)); el.inert = false; });
        if (mq.matches) { measure(); shown = target; paint(shown); } else { setLit(false); setPoint(-1); }
      };
      // giro del frasco: cada movimiento de scroll le da un impulso (mide el salto del propio evento,
      // así funciona igual con la rueda a saltos que con el trackpad) y frena como una inercia
      const mv = bottle && bottle.querySelector('model-viewer');
      if (mv && !this.rm) {
        const BASE = 18, MAX = 150;
        let lastY = scrollY, vel = 0, speed = BASE, spinRaf = 0;
        const spin = () => {
          vel *= 0.94;
          const goal = lit ? Math.min(MAX, BASE + vel * 5) : BASE;
          speed += (goal - speed) * (goal > speed ? 0.08 : 0.04);
          if (speed - BASE > 0.4 || vel > 0.05) { mv.rotationPerSecond = speed.toFixed(1) + 'deg'; spinRaf = requestAnimationFrame(spin); }
          else { mv.rotationPerSecond = BASE + 'deg'; spinRaf = 0; }
        };
        addEventListener('scroll', () => {
          const d = Math.abs(scrollY - lastY); lastY = scrollY;
          if (!lit || !d) return;
          vel = Math.max(vel, Math.min(d, 80));
          if (!spinRaf) spinRaf = requestAnimationFrame(spin);
        }, { passive: true });
      }
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', onScroll);
      mq.addEventListener('change', reset);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(es => { inView = es[es.length - 1].isIntersecting; onScroll(); }).observe(S);
        // sin escena fija (móvil o movimiento reducido): se activa el punto que cruza el centro
        const on = new Set();
        const io = new IntersectionObserver(es => {
          if (mq.matches) return;
          es.forEach(e => { const i = +e.target.dataset.rpt; if (e.isIntersecting) on.add(i); else on.delete(i); });
          setPoint(on.size ? Math.max(...on) : -1); setLit(on.size > 0);
        }, { rootMargin: '-42% 0px -42% 0px' });
        pts.forEach(p => io.observe(p));
      } else inView = true;
      reset();
    }
  }

  new Escada().init();
})();
