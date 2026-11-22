/* AEO 互動教材單元 1 ~ 4 專用互動邏輯與 SVG 繪圖器
 * 秉持：先理解問題 -> 預測結果 -> 動手操作 -> 觀察變化 -> 理解公式 -> 驗證答案
 */
(function (global) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const fmt = (x, p = 3) => {
    if (!Number.isFinite(x)) return '—';
    if (Object.is(x, -0) || x === 0) return '0';
    return Number(x.toFixed(p)).toString();
  };

  function getTheme() {
    const isDark = (typeof document !== 'undefined') &&
      document.documentElement.getAttribute('data-theme') === 'dark';
    const css = getComputedStyle(document.documentElement);
    const token = name => css.getPropertyValue(name).trim();
    return {
      isDark,
      axis: token('--stage-axis'), axisText: token('--muted-fg'),
      curve: token('--chart-1'), best: token('--chart-4'), bestText: token('--chart-4'),
      rand: token('--chart-5'), randText: token('--chart-5'),
      self: token('--fg'), selfText: token('--fg'), newPoint: token('--chart-2'), newPointText: token('--chart-2'),
      herbivore: token('--chart-1'), herbivoreText: token('--chart-1'),
      carnivore: token('--chart-2'), carnivoreText: token('--chart-2'),
      omnivore: token('--chart-3'), omnivoreText: token('--chart-3'),
      peer: token('--chart-3'), peerText: token('--chart-3'),
      dotStroke: token('--card'), arrowDash: token('--chart-5')
    };
  }

  function el(parent, tag, attrs = {}, text) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== undefined) node.setAttribute(k, String(v));
    if (text !== undefined) node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  /* -------------------------------------------------------------
   * Unit 2: 生產階段 (Production Explorer)
   * ----------------------------------------------------------- */
  const Unit2 = {
    state: {
      a: 0.35,
      t: 2,
      T: 10,
      r1: 0.5,
      x_best: 0.2,   // 目前最佳位置 x_n
      x_rand: -3.8,  // 隨機位置 x_rand
      L: -5,
      U: 5
    },

    init() {
      const sliderA = document.getElementById('u2_slider_a');
      const sliderT = document.getElementById('u2_slider_t');
      const btnRand = document.getElementById('u2_btn_rand');
      const btnDrawA = document.getElementById('u2_btn_draw_a');

      if (!sliderA) return;

      sliderA.addEventListener('input', (e) => {
        this.state.a = parseFloat(e.target.value);
        this.render();
      });

      if (sliderT) {
        sliderT.addEventListener('input', (e) => {
          this.state.t = parseInt(e.target.value, 10);
          this.recalcAFromR1();
          this.render();
        });
      }

      if (btnRand) {
        btnRand.addEventListener('click', () => {
          const r = Math.random();
          this.state.x_rand = this.state.L + r * (this.state.U - this.state.L);
          this.render();
        });
      }

      if (btnDrawA) {
        btnDrawA.addEventListener('click', () => {
          this.state.r1 = Math.random();
          this.recalcAFromR1();
          this.render();
        });
      }

      this.render();
    },

    recalcAFromR1() {
      const cap = Math.max(0, 1 - this.state.t / this.state.T);
      this.state.a = cap * this.state.r1;
      const sliderA = document.getElementById('u2_slider_a');
      if (sliderA) sliderA.value = this.state.a.toFixed(3);
    },

    render() {
      const { a, t, T, x_best, x_rand, L, U } = this.state;
      // Formula: x'_1 = (1 - a) * x_best + a * x_rand
      const x_new = (1 - a) * x_best + a * x_rand;
      const f_new = x_new * x_new;
      const f_best = x_best * x_best;
      const cap = 1 - t / T;

      // Update text values
      const valA = document.getElementById('u2_val_a');
      const valCap = document.getElementById('u2_val_cap');
      const valT = document.getElementById('u2_val_t');
      const subBest = document.getElementById('u2_sub_best');
      const subRand = document.getElementById('u2_sub_rand');
      const subNew = document.getElementById('u2_sub_new');
      const barBest = document.getElementById('u2_bar_best');
      const barRand = document.getElementById('u2_bar_rand');

      if (valA) valA.textContent = fmt(a);
      if (valCap) valCap.textContent = fmt(cap);
      if (valT) valT.textContent = `第 ${t} / ${T} 輪`;
      if (subBest) subBest.textContent = fmt(x_best);
      if (subRand) subRand.textContent = fmt(x_rand);
      if (subNew) subNew.textContent = fmt(x_new);

      if (barBest) {
        barBest.style.width = `${((1 - a) * 100).toFixed(1)}%`;
        barBest.textContent = `最佳解權重 ${(1 - a).toFixed(2)}`;
      }
      if (barRand) {
        barRand.style.width = `${(a * 100).toFixed(1)}%`;
        barRand.textContent = `隨機點權重 ${a.toFixed(2)}`;
      }

      // Render SVG plot
      const svg = document.getElementById('u2_svg');
      if (!svg) return;
      svg.replaceChildren();

      const theme = getTheme();
      const W = 620, H = 240, padX = 50, padY = 30;
      const scaleX = x => padX + ((x - L) / (U - L)) * (W - 2 * padX);
      const maxY = 25;
      const scaleY = y => H - padY - (Math.min(maxY, y) / maxY) * (H - 2 * padY);

      // Axes & Curve f(x) = x^2
      el(svg, 'line', { x1: padX, y1: H - padY, x2: W - padX, y2: H - padY, stroke: theme.axis, 'stroke-width': 1.5 });
      el(svg, 'text', { x: W - padX + 5, y: H - padY + 4, fill: theme.axisText, 'font-size': 11 }, 'x');

      // Ticks
      for (let tx = L; tx <= U; tx += 2) {
        const px = scaleX(tx);
        el(svg, 'line', { x1: px, y1: H - padY, x2: px, y2: H - padY + 5, stroke: theme.axis });
        el(svg, 'text', { x: px, y: H - padY + 18, 'text-anchor': 'middle', fill: theme.axisText, 'font-size': 10 }, String(tx));
      }

      // Parabola path
      let d = '';
      for (let i = 0; i <= 100; i++) {
        const x = L + (i / 100) * (U - L);
        const y = x * x;
        const px = scaleX(x), py = scaleY(y);
        d += (i === 0 ? 'M' : 'L') + `${px.toFixed(1)},${py.toFixed(1)}`;
      }
      el(svg, 'path', { d, fill: 'none', stroke: theme.curve, 'stroke-width': 2.2 });

      // Connect line between best and random
      const pBestX = scaleX(x_best), pBestY = scaleY(f_best);
      const pRandX = scaleX(x_rand), pRandY = scaleY(x_rand * x_rand);
      const pNewX = scaleX(x_new), pNewY = scaleY(f_new);

      el(svg, 'line', {
        x1: pBestX, y1: pBestY, x2: pRandX, y2: pRandY,
        stroke: theme.arrowDash, 'stroke-width': 1.8, 'stroke-dasharray': '4 4'
      });

      // Markers
      // Random point
      el(svg, 'circle', { cx: pRandX, cy: pRandY, r: 5.5, fill: theme.rand, stroke: theme.dotStroke, 'stroke-width': 1.5 });
      el(svg, 'text', { x: pRandX, y: pRandY - 10, 'text-anchor': 'middle', fill: theme.randText, 'font-size': 11, 'font-weight': 600 }, `隨機點 x_rand (${fmt(x_rand, 1)})`);

      // Best point
      el(svg, 'circle', { cx: pBestX, cy: pBestY, r: 6.5, fill: theme.best, stroke: theme.dotStroke, 'stroke-width': 1.5 });
      el(svg, 'text', { x: pBestX, y: pBestY - 12, 'text-anchor': 'middle', fill: theme.bestText, 'font-size': 11, 'font-weight': 700 }, `最佳解 x_n (${fmt(x_best, 1)})`);

      // New proposed point (Orange-Red Diamond)
      const diamondPath = `M ${pNewX} ${pNewY - 8} L ${pNewX + 8} ${pNewY} L ${pNewX} ${pNewY + 8} L ${pNewX - 8} ${pNewY} Z`;
      el(svg, 'path', { d: diamondPath, fill: theme.newPoint, stroke: theme.dotStroke, 'stroke-width': 1.8 });
      el(svg, 'text', { x: pNewX, y: pNewY + 22, 'text-anchor': 'middle', fill: theme.newPointText, 'font-size': 11, 'font-weight': 700 }, `新生產者 x'1 (${fmt(x_new, 2)})`);
    }
  };

  /* -------------------------------------------------------------
   * Unit 3: 消費階段 (Consumption Explorer & Comparison)
   * ----------------------------------------------------------- */
  const Unit3 = {
    // Shared test baseline
    state: {
      mode: 'herb',   // 'herb' | 'carn' | 'omni' | 'compare'
      x_i: 2.2,       // 當前消費者自身位置
      x_1: -1.2,      // 生產者位置
      x_j: 0.6,       // 被參考同伴位置
      C: -0.5,        // 消費係數
      r2: 0.4,        // 雜食權重
      L: -5,
      U: 5
    },

    init() {
      // Sub-tabs
      const tabs = document.querySelectorAll('[data-u3-tab]');
      tabs.forEach(btn => {
        btn.addEventListener('click', () => {
          tabs.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.state.mode = btn.dataset.u3Tab;
          this.switchTabUI();
          this.render();
        });
      });

      // Controls
      const sliderC = document.getElementById('u3_slider_c');
      const sliderR2 = document.getElementById('u3_slider_r2');
      const sliderXi = document.getElementById('u3_slider_xi');
      const selPeer = document.getElementById('u3_sel_peer');
      const btnRandC = document.getElementById('u3_btn_rand_c');

      if (sliderC) {
        sliderC.addEventListener('input', (e) => {
          this.state.C = parseFloat(e.target.value);
          this.render();
        });
      }

      if (sliderR2) {
        sliderR2.addEventListener('input', (e) => {
          this.state.r2 = parseFloat(e.target.value);
          this.render();
        });
      }

      if (sliderXi) {
        sliderXi.addEventListener('input', (e) => {
          this.state.x_i = parseFloat(e.target.value);
          this.render();
        });
      }

      if (selPeer) {
        selPeer.addEventListener('change', (e) => {
          this.state.x_j = parseFloat(e.target.value);
          this.render();
        });
      }

      if (btnRandC) {
        btnRandC.addEventListener('click', () => {
          // Standard Box-Muller for v1, v2
          const u1 = Math.random(), u2 = Math.random();
          const v1 = Math.sqrt(-2 * Math.log(1 - u1)) * Math.cos(2 * Math.PI * u2);
          const u3 = Math.random(), u4 = Math.random();
          const v2 = Math.sqrt(-2 * Math.log(1 - u3)) * Math.cos(2 * Math.PI * u4);
          this.state.C = 0.5 * v1 / Math.abs(v2 || 1e-6);
          // Clamp to slider display range
          if (sliderC) sliderC.value = Math.max(-2, Math.min(2, this.state.C)).toFixed(2);
          this.render();
        });
      }

      this.switchTabUI();
      this.render();
    },

    switchTabUI() {
      const mode = this.state.mode;
      const rowR2 = document.getElementById('u3_row_r2');
      const rowPeer = document.getElementById('u3_row_peer');
      const introHerb = document.getElementById('u3_intro_herb');
      const introCarn = document.getElementById('u3_intro_carn');
      const introOmni = document.getElementById('u3_intro_omni');
      const introComp = document.getElementById('u3_intro_compare');

      if (rowR2) rowR2.style.display = (mode === 'omni' || mode === 'compare') ? 'grid' : 'none';
      if (rowPeer) rowPeer.style.display = (mode === 'carn' || mode === 'omni' || mode === 'compare') ? 'grid' : 'none';

      if (introHerb) introHerb.hidden = mode !== 'herb';
      if (introCarn) introCarn.hidden = mode !== 'carn';
      if (introOmni) introOmni.hidden = mode !== 'omni';
      if (introComp) introComp.hidden = mode !== 'compare';
    },

    render() {
      const { mode, x_i, x_1, x_j, C, r2, L, U } = this.state;
      const d1 = x_i - x_1;
      const d2 = x_i - x_j;
      const d_mix = r2 * d1 + (1 - r2) * d2;

      let x_new = x_i;
      if (mode === 'herb') x_new = x_i + C * d1;
      else if (mode === 'carn') x_new = x_i + C * d2;
      else if (mode === 'omni') x_new = x_i + C * d_mix;

      // Update values
      const valC = document.getElementById('u3_val_c');
      const valR2 = document.getElementById('u3_val_r2');
      const valXi = document.getElementById('u3_val_xi');
      const subXi = document.getElementById('u3_sub_xi');
      const subRef1 = document.getElementById('u3_sub_ref1');
      const subRef2 = document.getElementById('u3_sub_ref2');
      const subDiff = document.getElementById('u3_sub_diff');
      const subNew = document.getElementById('u3_sub_new');

      if (valC) valC.textContent = fmt(C, 2);
      if (valR2) valR2.textContent = fmt(r2, 2);
      if (valXi) valXi.textContent = fmt(x_i, 2);
      if (subXi) subXi.textContent = fmt(x_i, 2);
      if (subRef1) subRef1.textContent = fmt(x_1, 2);
      if (subRef2) subRef2.textContent = fmt(x_j, 2);

      const d_cur = mode === 'herb' ? d1 : mode === 'carn' ? d2 : d_mix;
      if (subDiff) subDiff.textContent = fmt(d_cur, 2);
      if (subNew) subNew.textContent = fmt(x_new, 2);

      // Render SVG
      const svg = document.getElementById('u3_svg');
      if (!svg) return;
      svg.replaceChildren();

      const theme = getTheme();
      const W = 620, H = mode === 'compare' ? 260 : 200, padX = 50;
      const scaleX = x => padX + ((x - L) / (U - L)) * (W - 2 * padX);

      // Base axis
      const axisY = mode === 'compare' ? 70 : 100;
      el(svg, 'line', { x1: padX, y1: axisY, x2: W - padX, y2: axisY, stroke: theme.axis, 'stroke-width': 1.5 });

      for (let tx = L; tx <= U; tx += 2) {
        const px = scaleX(tx);
        el(svg, 'line', { x1: px, y1: axisY - 4, x2: px, y2: axisY + 4, stroke: theme.axis });
        el(svg, 'text', { x: px, y: axisY + 20, 'text-anchor': 'middle', fill: theme.axisText, 'font-size': 11 }, String(tx));
      }

      const pXi = scaleX(x_i);
      const pX1 = scaleX(x_1);
      const pXj = scaleX(x_j);

      // Draw references
      // Producer (Green)
      if (mode === 'herb' || mode === 'omni' || mode === 'compare') {
        el(svg, 'circle', { cx: pX1, cy: axisY, r: 6.5, fill: theme.herbivore, stroke: theme.dotStroke, 'stroke-width': 1.5 });
        el(svg, 'text', { x: pX1, y: axisY - 14, 'text-anchor': 'middle', fill: theme.herbivoreText, 'font-size': 11, 'font-weight': 700 }, `生產者 x₁ (${fmt(x_1, 1)})`);
      }

      // Peer Consumer (Purple)
      if (mode === 'carn' || mode === 'omni' || mode === 'compare') {
        el(svg, 'circle', { cx: pXj, cy: axisY, r: 6.5, fill: theme.peer, stroke: theme.dotStroke, 'stroke-width': 1.5 });
        el(svg, 'text', { x: pXj, y: axisY - 34, 'text-anchor': 'middle', fill: theme.peerText, 'font-size': 11, 'font-weight': 700 }, `同伴 xⱼ (${fmt(x_j, 1)})`);
      }

      // Self Consumer (Dark Slate)
      el(svg, 'circle', { cx: pXi, cy: axisY, r: 7.5, fill: theme.self, stroke: theme.dotStroke, 'stroke-width': 2 });
      el(svg, 'text', { x: pXi, y: axisY + 36, 'text-anchor': 'middle', fill: theme.selfText, 'font-size': 11, 'font-weight': 700 }, `目前消費者 xᵢ (${fmt(x_i, 1)})`);

      // Single diet or comparison
      if (mode !== 'compare') {
        const pNew = scaleX(x_new);
        // Vector arrow from x_i to x_new
        const arrowColor = mode === 'herb' ? theme.herbivore : mode === 'carn' ? theme.carnivore : theme.omnivore;
        const arrowY = axisY - 8;

        el(svg, 'line', {
          x1: pXi, y1: arrowY, x2: pNew, y2: arrowY,
          stroke: arrowColor, 'stroke-width': 2.8, 'stroke-linecap': 'round'
        });

        // Direction arrowhead
        const dir = pNew >= pXi ? 1 : -1;
        if (Math.abs(pNew - pXi) > 6) {
          el(svg, 'polygon', {
            points: `${pNew},${arrowY} ${pNew - dir * 8},${arrowY - 4} ${pNew - dir * 8},${arrowY + 4}`,
            fill: arrowColor
          });
        }

        // New point marker
        el(svg, 'circle', { cx: pNew, cy: axisY, r: 6.5, fill: theme.newPoint, stroke: theme.dotStroke, 'stroke-width': 2 });
        el(svg, 'text', { x: pNew, y: axisY - 50, 'text-anchor': 'middle', fill: theme.newPointText, 'font-size': 11, 'font-weight': 700 }, `新位置 x' (${fmt(x_new, 2)})`);

        // Explain movement direction
        const note = document.getElementById('u3_direction_note');
        if (note) {
          if (C < 0) {
            note.innerHTML = `<strong>反轉方向靠近參考點：</strong>因為消費係數 <code>C = ${fmt(C, 2)} &lt; 0</code>，所以向量方向翻轉，個體朝參考點方向前進！`;
          } else {
            note.innerHTML = `<strong>同向反衝遠離參考點：</strong>因為消費係數 <code>C = ${fmt(C, 2)} &gt; 0</code>，向量沿自身遠離參考點方向向外探索！`;
          }
        }
      } else {
        // Compare Mode: draw all three
        const x_h = x_i + C * d1;
        const x_c = x_i + C * d2;
        const x_o = x_i + C * d_mix;

        const diets = [
          { name: '草食者 Herbivore', x: x_h, color: theme.herbivore, text: theme.herbivoreText, y: 130 },
          { name: '肉食者 Carnivore', x: x_c, color: theme.carnivore, text: theme.carnivoreText, y: 170 },
          { name: '雜食者 Omnivore', x: x_o, color: theme.omnivore, text: theme.omnivoreText, y: 210 }
        ];

        diets.forEach(d => {
          const px = scaleX(d.x);
          el(svg, 'line', { x1: pXi, y1: d.y, x2: px, y2: d.y, stroke: d.color, 'stroke-width': 2.5, 'stroke-linecap': 'round' });
          const dir = px >= pXi ? 1 : -1;
          if (Math.abs(px - pXi) > 5) {
            el(svg, 'polygon', {
              points: `${px},${d.y} ${px - dir * 7},${d.y - 3.5} ${px - dir * 7},${d.y + 3.5}`,
              fill: d.color
            });
          }
          el(svg, 'circle', { cx: px, cy: d.y, r: 5, fill: d.color, stroke: theme.dotStroke, 'stroke-width': 1.5 });
          el(svg, 'text', { x: 50, y: d.y + 4, fill: d.text, 'font-size': 11, 'font-weight': 700 }, d.name);
          el(svg, 'text', { x: px + (dir > 0 ? 8 : -8), y: d.y + 4, 'text-anchor': dir > 0 ? 'start' : 'end', fill: d.text, 'font-size': 11 }, fmt(d.x, 2));
        });
      }
    }
  };

  /* -------------------------------------------------------------
   * Unit 4: 分解階段 (Decomposition Explorer)
   * ----------------------------------------------------------- */
  const Unit4 = {
    state: {
      x_best: 0.1,    // 基準最佳解
      x_i: 2.8,       // 自身位置
      D: 1.2,         // 3u
      e: 0.5,         // r3*k - 1
      h: 0.4,         // 2*r3 - 1
      L: -5,
      U: 5
    },

    init() {
      const sliderD = document.getElementById('u4_slider_d');
      const sliderE = document.getElementById('u4_slider_e');
      const sliderH = document.getElementById('u4_slider_h');
      const btnRand = document.getElementById('u4_btn_rand');

      if (sliderD) {
        sliderD.addEventListener('input', (e) => {
          this.state.D = parseFloat(e.target.value);
          this.render();
        });
      }
      if (sliderE) {
        sliderE.addEventListener('input', (e) => {
          this.state.e = parseFloat(e.target.value);
          this.render();
        });
      }
      if (sliderH) {
        sliderH.addEventListener('input', (e) => {
          this.state.h = parseFloat(e.target.value);
          this.render();
        });
      }
      if (btnRand) {
        btnRand.addEventListener('click', () => {
          // Normal draw for u
          const u1 = Math.random(), u2 = Math.random();
          const u = Math.sqrt(-2 * Math.log(1 - u1)) * Math.cos(2 * Math.PI * u2);
          this.state.D = 3 * u;
          const r3 = Math.random();
          const k = Math.random() < 0.5 ? 1 : 2;
          this.state.e = r3 * k - 1;
          this.state.h = 2 * r3 - 1;

          if (sliderD) sliderD.value = Math.max(-3, Math.min(3, this.state.D)).toFixed(2);
          if (sliderE) sliderE.value = this.state.e.toFixed(2);
          if (sliderH) sliderH.value = this.state.h.toFixed(2);
          this.render();
        });
      }

      this.render();
    },

    render() {
      const { x_best, x_i, D, e, h, L, U } = this.state;
      // Formula: x' = x_best + D * (e * x_best - h * x_i)
      const bracket = e * x_best - h * x_i;
      const perturb = D * bracket;
      const x_new = x_best + perturb;

      const f_old = x_i * x_i;
      const f_new = x_new * x_new;
      const accepted = f_new < f_old;

      // Update text
      const valD = document.getElementById('u4_val_d');
      const valE = document.getElementById('u4_val_e');
      const valH = document.getElementById('u4_val_h');
      const subBest = document.getElementById('u4_sub_best');
      const subXi = document.getElementById('u4_sub_xi');
      const subPerturb = document.getElementById('u4_sub_perturb');
      const subNew = document.getElementById('u4_sub_new');
      const decisionCard = document.getElementById('u4_decision');

      if (valD) valD.textContent = fmt(D, 2);
      if (valE) valE.textContent = fmt(e, 2);
      if (valH) valH.textContent = fmt(h, 2);
      if (subBest) subBest.textContent = fmt(x_best, 2);
      if (subXi) subXi.textContent = fmt(x_i, 2);
      if (subPerturb) subPerturb.textContent = fmt(perturb, 2);
      if (subNew) subNew.textContent = fmt(x_new, 2);

      if (decisionCard) {
        if (accepted) {
          decisionCard.className = 'decision-box accepted';
          decisionCard.innerHTML = `<strong>✓ 接受更新 (Accept)</strong><p>新解 <code>f(x') = ${fmt(f_new, 3)}</code> 優於舊解 <code>f(x) = ${fmt(f_old, 3)}</code>，個體移動到新位置！</p>`;
        } else {
          decisionCard.className = 'decision-box rejected';
          decisionCard.innerHTML = `<strong>✗ 拒絕更新 (Reject)</strong><p>新解 <code>f(x') = ${fmt(f_new, 3)}</code> 未優於舊解 <code>f(x) = ${fmt(f_old, 3)}</code>，保留原本位置！</p>`;
        }
      }

      // Render SVG
      const svg = document.getElementById('u4_svg');
      if (!svg) return;
      svg.replaceChildren();

      const theme = getTheme();
      const W = 620, H = 210, padX = 50, axisY = 110;
      const scaleX = x => padX + ((x - L) / (U - L)) * (W - 2 * padX);

      // Axis
      el(svg, 'line', { x1: padX, y1: axisY, x2: W - padX, y2: axisY, stroke: theme.axis, 'stroke-width': 1.5 });
      for (let tx = L; tx <= U; tx += 2) {
        const px = scaleX(tx);
        el(svg, 'line', { x1: px, y1: axisY - 4, x2: px, y2: axisY + 4, stroke: theme.axis });
        el(svg, 'text', { x: px, y: axisY + 20, 'text-anchor': 'middle', fill: theme.axisText, 'font-size': 11 }, String(tx));
      }

      const pBest = scaleX(x_best);
      const pXi = scaleX(x_i);
      const pNew = scaleX(x_new);

      // Best解 (Gold) - 這是基準點
      el(svg, 'circle', { cx: pBest, cy: axisY, r: 7.5, fill: theme.best, stroke: theme.dotStroke, 'stroke-width': 2 });
      el(svg, 'text', { x: pBest, y: axisY - 16, 'text-anchor': 'middle', fill: theme.bestText, 'font-size': 11, 'font-weight': 700 }, `基準最佳解 x_best (${fmt(x_best, 1)})`);

      // 自身位置 (Slate)
      el(svg, 'circle', { cx: pXi, cy: axisY, r: 6.5, fill: theme.self, stroke: theme.dotStroke, 'stroke-width': 1.5 });
      el(svg, 'text', { x: pXi, y: axisY + 36, 'text-anchor': 'middle', fill: theme.selfText, 'font-size': 11, 'font-weight': 600 }, `被分解個體 xᵢ (${fmt(x_i, 1)})`);

      // 擾動向量 (從 x_best 出發指向 x_new)
      const arrowY = axisY - 7;
      el(svg, 'line', { x1: pBest, y1: arrowY, x2: pNew, y2: arrowY, stroke: theme.newPoint, 'stroke-width': 2.5, 'stroke-linecap': 'round' });
      const dir = pNew >= pBest ? 1 : -1;
      if (Math.abs(pNew - pBest) > 5) {
        el(svg, 'polygon', {
          points: `${pNew},${arrowY} ${pNew - dir * 8},${arrowY - 4} ${pNew - dir * 8},${arrowY + 4}`,
          fill: theme.newPoint
        });
      }

      // 新候選解
      el(svg, 'circle', { cx: pNew, cy: axisY, r: 6.5, fill: theme.newPoint, stroke: theme.dotStroke, 'stroke-width': 2 });
      el(svg, 'text', { x: pNew, y: axisY - 26, 'text-anchor': 'middle', fill: theme.newPointText, 'font-size': 11, 'font-weight': 700 }, `候選新解 x' (${fmt(x_new, 2)})`);
    }
  };

  /* -------------------------------------------------------------
   * Global Tab Navigation Manager
   * ----------------------------------------------------------- */
  function initNavigation() {
    const navButtons = document.querySelectorAll('nav.steps button');
    const sections = document.querySelectorAll('main > section[id^="unit"]');

    function showUnit(targetId) {
      navButtons.forEach(btn => {
        const isTarget = btn.dataset.target === targetId;
        btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
      });
      sections.forEach(sec => {
        sec.hidden = sec.id !== targetId;
      });

      // Lazy render on tab switch
      if (targetId === 'unit2') Unit2.render();
      if (targetId === 'unit3') Unit3.render();
      if (targetId === 'unit4') Unit4.render();
      if (targetId === 'unit5' && global.AEOApp) global.AEOApp.onShow();
    }

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        showUnit(btn.dataset.target);
      });
    });

    // Sub-stage quick jump buttons
    document.querySelectorAll('[data-jump]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.jump;
        showUnit(target);
      });
    });
  }

  // Export
  global.AEOUnits = {
    init() {
      initNavigation();
      Unit2.init();
      Unit3.init();
      Unit4.init();
    },
    renderAll() {
      Unit2.render();
      Unit3.render();
      Unit4.render();
    },
    Unit2,
    Unit3,
    Unit4
  };

})(typeof globalThis !== 'undefined' ? globalThis : window);
