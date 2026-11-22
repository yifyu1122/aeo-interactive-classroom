/* AEO 搜尋空間與收斂圖繪製器 (plot.js)
 * 嚴格遵循 WCAG 2.2 AA 對比標準，完美相容淺色與深色模式
 */
(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const heatCache = new Map();
  let sequence = 0;

  function getTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const css = getComputedStyle(document.documentElement);
    const token = name => css.getPropertyValue(name).trim();
    return {
      isDark,
      ink: token('--fg'),
      teal: token('--chart-1'),
      gold: token('--chart-4'),
      coral: token('--chart-2'),
      peer: token('--chart-3'),
      muted: token('--muted-fg'),
      grid: token('--stage-grid'),
      gridOpacity: isDark ? 0.7 : 0.9,
      paper: token('--card'),
      border: token('--border'),
      axisLine: token('--stage-axis'),
      legendText: token('--fg'),
      dotStroke: token('--card'),
      randomColor: token('--chart-5'),
      areaTop: token('--chart-1'),
      colors: ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5', '--primary', '--accent-purple', '--success']
        .map(token)
    };
  }

  const number = x => {
    if (!Number.isFinite(x)) return '—';
    if (x !== 0 && (Math.abs(x) < .001 || Math.abs(x) >= 100000)) return x.toExponential(2);
    return Number(x.toPrecision(4)).toString();
  };
  const vector = x => Array.isArray(x) ? x.map(number).join(', ') : '—';
  const clamp = (x, min, max) => Math.min(max, Math.max(min, x));

  function scale(a, b, c, d) {
    return v => c + (v - a) / (b - a) * (d - c);
  }

  function el(parent, tag, attrs = {}, text) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== undefined) node.setAttribute(k, String(v));
    if (text !== undefined) node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  const text = (p, x, y, value, attrs = {}) => el(p, 'text', { x, y, 'font-size': 11, ...attrs }, value);
  const line = (p, x1, y1, x2, y2, attrs = {}) => el(p, 'line', { x1, y1, x2, y2, 'stroke-width': 1, ...attrs });

  function makeSVG(host, w, h, description) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', description);
    svg.style.cssText = 'width:100%;height:auto;display:block;overflow:visible;font-family:"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif;font-variant-numeric:tabular-nums';
    el(svg, 'title', {}, description);
    host.replaceChildren(svg);
    return svg;
  }

  function setup(svg, key, b, theme) {
    const defs = el(svg, 'defs');
    const clip = el(defs, 'clipPath', { id: key + 'clip' });
    el(clip, 'rect', { x: b.x, y: b.y, width: b.w, height: b.h });

    const markerColors = {
      move: theme.coral,
      producer: theme.teal,
      peer: theme.peer,
      best: theme.gold,
      random: theme.randomColor
    };

    for (const [name, color] of Object.entries(markerColors)) {
      const m = el(defs, 'marker', {
        id: key + name,
        markerWidth: 8,
        markerHeight: 8,
        refX: 7,
        refY: 4,
        orient: 'auto',
        markerUnits: 'userSpaceOnUse'
      });
      el(m, 'path', { d: 'M 0 0 L 8 4 L 0 8 L 2.2 4 Z', fill: color });
    }

    const gradient = el(defs, 'linearGradient', { id: key + 'area', x1: 0, y1: 0, x2: 0, y2: 1, gradientUnits: 'objectBoundingBox' });
    el(gradient, 'stop', { offset: '0%', 'stop-color': theme.areaTop, 'stop-opacity': theme.isDark ? 0.3 : 0.22 });
    el(gradient, 'stop', { offset: '100%', 'stop-color': theme.areaTop, 'stop-opacity': 0.02 });
  }

  function arrow(svg, key, from, to, role, c, extra = {}, animate = false) {
    const dx = to[0] - from[0], dy = to[1] - from[1];
    const length = Math.hypot(dx, dy);
    const attrs = { stroke: c, 'stroke-width': role === 'move' ? 3.0 : 2.0, 'stroke-linecap': 'round', 'marker-end': `url(#${key + role})`, ...extra };
    if (length < 0.1) return line(svg, ...from, ...to, { ...attrs, 'marker-end': undefined });
    const result = line(svg, ...from, ...to, attrs);
    if (animate && length > 9 && !extra['stroke-dasharray'] && typeof result.animate === 'function') {
      result.animate([
        { strokeDasharray: `${length} ${length}`, strokeDashoffset: length },
        { strokeDasharray: `${length} ${length}`, strokeDashoffset: 0 }
      ], { duration: 230, easing: 'ease-out' });
    }
    return result;
  }

  function tickValues(lo, hi, n) {
    return Array.from({ length: n + 1 }, (_, i) => lo + (hi - lo) * i / n);
  }

  function axisTicks(lo, hi, target) {
    const span = (hi - lo) / target;
    if (!Number.isFinite(span) || span <= 0) return [lo, hi];
    const unit = 10 ** Math.floor(Math.log10(span));
    const step = unit * ([1, 2, 2.5, 5, 10].find(k => k >= span / unit) || 10);
    const first = Math.ceil(lo / step - 1e-12);
    const count = Math.min(12, Math.floor(hi / step + 1e-12) - first + 1);
    return count >= 2 ? Array.from({ length: count }, (_, i) => +(step * (first + i)).toPrecision(12)) : [lo, hi];
  }

  function axes(svg, b, xScale, yScale, L, U, yMin, yMax, is2, compact, theme) {
    const xs = axisTicks(L, U, compact ? 4 : 7), ys = axisTicks(yMin, yMax, 5);
    for (const y of ys) {
      const py = yScale(y);
      line(svg, b.x, py, b.x + b.w, py, { stroke: theme.grid, 'stroke-dasharray': '3 4' });
      text(svg, b.x - 9, py + 4, number(y), { 'text-anchor': 'end', fill: theme.muted, 'font-weight': '600' });
    }
    for (const x of xs) {
      const px = xScale(x);
      line(svg, px, b.y, px, b.y + b.h, { stroke: theme.grid, 'stroke-dasharray': '3 5' });
      text(svg, px, b.y + b.h + 18, number(x), { 'text-anchor': 'middle', fill: theme.muted, 'font-weight': '600' });
    }
    line(svg, b.x, b.y + b.h, b.x + b.w, b.y + b.h, { stroke: theme.axisLine, 'stroke-width': 1.5 });
    if (L < 0 && U > 0) {
      line(svg, xScale(0), b.y, xScale(0), b.y + b.h, {
        'stroke-dasharray': '4 4',
        stroke: theme.axisLine,
        'stroke-width': 1.2
      });
    }
    text(svg, b.x, b.y - 15, is2 ? 'y 座標' : '目標值 f(x)', { 'font-size': 11, 'font-weight': '700', fill: theme.ink });
    text(svg, b.x + b.w, b.y + b.h + 34, is2 ? 'x 座標' : '位置 x', { 'text-anchor': 'end', 'font-size': 11, 'font-weight': '700', fill: theme.ink });
  }

  function blendHeat(t) {
    const palette = [[28, 88, 80], [70, 136, 110], [130, 175, 130], [195, 210, 150], [240, 218, 165], [215, 155, 115]];
    const v = clamp(t, 0, 1) * (palette.length - 1), n = Math.min(palette.length - 2, Math.floor(v)), f = v - n;
    return palette[n].map((a, k) => Math.round(a + (palette[n + 1][k] - a) * f));
  }

  function heat(config) {
    const { fn, L, U } = config, key = [fn, L, U].join('/');
    if (heatCache.has(key)) return heatCache.get(key);
    const size = 180, vals = new Float64Array(size * size);
    let low = Infinity, high = -Infinity;
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      const f = root.AEO.objective(fn, [L + (U - L) * i / (size - 1), U - (U - L) * j / (size - 1)]);
      vals[j * size + i] = f; low = Math.min(low, f); high = Math.max(high, f);
    }
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d'), img = ctx.createImageData(size, size);
    for (let i = 0; i < vals.length; i++) {
      const rgb = blendHeat((vals[i] - low) / (high - low || 1));
      img.data.set(rgb, i * 4); img.data[4 * i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const result = { url: canvas.toDataURL(), low, high };
    if (heatCache.size >= 6) heatCache.clear();
    heatCache.set(key, result);
    return result;
  }

  function pathText(points) { return points.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(3) + ',' + y.toFixed(3)).join(' '); }

  function trailPaths(layer, run, index, project, theme) {
    const byId = new Map(run.initial.map(p => [p.id, [p.x]]));
    for (let i = 0; i <= index; i++) {
      const e = run.events[i];
      if (e.kind === 'evaluate' && e.accepted) byId.get(e.id)?.push(e.next);
    }
    for (const [id, coords] of byId) {
      if (coords.length > 1) {
        el(layer, 'path', {
          d: pathText(coords.map(project)),
          fill: 'none',
          stroke: theme.colors[(id - 1) % theme.colors.length],
          'stroke-width': 2.0,
          'stroke-opacity': 0.65,
          'stroke-dasharray': '3 3',
          'data-trail-id': id
        });
      }
    }
  }

  function legend(host, items) {
    const box = document.createElement('div');
    box.className = 'aeo-plot-key';
    box.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:6px 16px;font-size:12px;line-height:1.55;color:var(--muted-fg);padding:6px 16px 10px;';
    for (const [name, color, style] of items) {
      const entry = document.createElement('span');
      entry.style.cssText = 'display:inline-flex;align-items:center;gap:6px;font-weight:600;';
      const dot = document.createElement('i');
      dot.setAttribute('aria-hidden', 'true');
      dot.style.cssText = style === 'arrow'
        ? `width:16px;height:3px;background:${color};border-radius:2px;`
        : style === 'ring'
          ? `box-sizing:border-box;width:11px;height:11px;border-radius:50%;border:2.5px solid ${color};`
          : `width:9px;height:9px;border-radius:50%;background:${color};`;
      entry.append(dot, document.createTextNode(name));
      box.append(entry);
    }
    host.append(box);
    return box;
  }

  function placeTags(svg, labels, b, theme) {
    const used = [];
    for (const l of labels) {
      const w = l.t.length * 8.5 + 18, h = 20;
      let placed = null;
      for (const [dx, dy] of [[9, -25], [-w - 9, -25], [9, 7], [-w - 9, 7], [13, -47], [-w - 12, 30], [0, 33]]) {
        const x = clamp(l.p[0] + dx, b.x + 1, b.x + b.w - w - 1), y = clamp(l.p[1] + dy, b.y + 1, b.y + b.h - h - 1);
        if (used.every(r => r.x + r.w + 2 < x || x + w + 2 < r.x || r.y + r.h + 2 < y || y + h + 2 < r.y)) {
          placed = { x, y, w, h };
          break;
        }
      }
      if (!placed) continue;
      used.push(placed);
      const g = el(svg, 'g', { 'pointer-events': 'none', 'aria-hidden': 'true' });
      el(g, 'rect', { x: placed.x, y: placed.y, width: w, height: h, rx: 5, fill: theme.paper, stroke: l.c, 'stroke-width': 1.5 });
      text(g, placed.x + w / 2, placed.y + 14, l.t, { 'font-size': 11, 'font-weight': 700, fill: l.c, 'text-anchor': 'middle' });
    }
  }

  function eventViews(ev) {
    const part = ev.kind === 'proposal' && ev.stage === 'omni' ? ev.part : 3;
    const refs = (ev.refs || []).filter(r => part === 1 ? r.role === 'producer' : part === 2 ? r.role === 'peer' : true);
    return { refs, showProposal: part >= 3 && !!ev.old && !!ev.raw };
  }

  function draw(host, run, index, options = {}) {
    if (!host || !run || !run.events?.length) return;
    const theme = getTheme();
    const ev = run.events[index], cfg = run.config, { fn, L, U } = cfg;
    const pop = root.AEO.stateAt(run, index), is2 = fn === 'sphere' || fn === 'rastrigin', key = 'aeop' + (++sequence);
    const width = clamp(host.clientWidth || 740, 320, 1050), compact = width < 530;
    const height = is2 ? clamp(width * 0.58, 287, 395) : clamp(width * 0.45, 255, 342);
    const b = { x: compact ? 46 : 55, y: 37, w: width - (compact ? 66 : 82), h: height - 83 };
    const svg = makeSVG(host, width, height, is2 ? '二維搜尋空間，顏色為函數值，點選個體可查看紀錄' : '一維函數曲線，橫軸為位置，縱軸為目標值，點選個體可查看紀錄');
    svg.dataset.domain = JSON.stringify([L, U]);
    setup(svg, key, b, theme);

    const xScale = scale(L, U, b.x, b.x + b.w);
    const sampled = tickValues(L, U, Math.max(240, Math.ceil(b.w)));
    const curve = is2 ? [] : sampled.map(x => [x, root.AEO.objective(fn, [x])]);
    let lower = is2 ? L : Math.min(...curve.map(p => p[1]), ...pop.map(p => p.f));
    let upper = is2 ? U : Math.max(...curve.map(p => p[1]), ...pop.map(p => p.f));
    if (!is2) {
      const pad = (upper - lower || 1) * 0.07;
      upper += pad;
      if (lower < 0.005 * (upper - lower)) lower = 0; else lower -= pad;
    }
    const yScale = scale(lower, upper, b.y + b.h, b.y);
    const project = v => [xScale(v[0]), yScale(is2 ? v[1] : root.AEO.objective(fn, v))];
    svg.dataset.viewport = JSON.stringify({ x: b.x, y: b.y, width: b.w, height: b.h, lowY: lower, highY: upper });

    const clipped = el(svg, 'g', { 'clip-path': `url(#${key}clip)` });
    let heatmap;
    if (is2) {
      heatmap = heat(cfg);
      el(clipped, 'image', { href: heatmap.url, x: b.x, y: b.y, width: b.w, height: b.h, preserveAspectRatio: 'none' });
    } else {
      const dots = curve.map(([x, f]) => [xScale(x), yScale(f)]);
      const d = pathText(dots);
      el(clipped, 'path', { d: d + ` L ${b.x + b.w} ${b.y + b.h} L ${b.x} ${b.y + b.h} Z`, fill: `url(#${key}area)` });
    }

    axes(svg, b, xScale, yScale, L, U, lower, upper, is2, compact, theme);

    const layer = el(svg, 'g', { 'clip-path': `url(#${key}clip)` });
    if (!is2) {
      el(layer, 'path', { d: pathText(curve.map(([x, f]) => [xScale(x), yScale(f)])), stroke: theme.teal, 'stroke-width': 2.8, fill: 'none' });
    }
    if (options.trails) trailPaths(layer, run, index, project, theme);

    const { refs, showProposal } = eventViews(ev);
    const tags = [], extras = [], motion = !options.reduced && !(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const roleColors = {
      producer: ['生產者', theme.teal],
      peer: ['同伴', theme.peer],
      best: ['最佳參考', theme.gold],
      random: ['隨機位置', theme.randomColor]
    };

    for (const r of refs) {
      if (!r.x) continue;
      const [roleName, c] = roleColors[r.role] || [r.role, theme.teal];
      const p = project(r.x);
      el(layer, 'circle', {
        cx: p[0], cy: p[1], r: 9.5, fill: 'none', stroke: c, 'stroke-width': 2.0, 'stroke-dasharray': '3 2',
        'data-role': r.role, 'data-position': JSON.stringify(r.x)
      });
      extras.push([roleName + (r.id != null ? ' #' + r.id : ''), c, 'ring']);
      if (ev.old && ['herb', 'carn', 'omni'].includes(ev.stage)) {
        arrow(layer, key, p, project(ev.old), r.role, c, { 'stroke-dasharray': '4 4', 'data-difference': r.role }, false);
      }
      if (r.role === 'random') tags.push({ p, t: '隨機點', c });
    }

    let outNote = '';
    if (showProposal) {
      const start = ev.stage === 'decomposition' ? ev.refs.find(r => r.role === 'best')?.x || ev.old : ev.stage === 'production' ? ev.refs.find(r => r.role === 'best')?.x || ev.old : ev.old;
      const p = project(start), rawP = project(ev.raw);
      const outside = ev.raw.some(v => v < L || v > U);
      let dest = rawP;
      if (outside) {
        let fraction = 1;
        ev.raw.forEach((v, j) => {
          if (v < L || v > U) fraction = Math.min(fraction, ((v < L ? L : U) - start[j]) / (v - start[j]));
        });
        const edge = start.map((v, j) => v + (ev.raw[j] - v) * fraction);
        dest = project(edge);
        outNote = '候選越界，箭頭止於邊界；空心菱形標出界內重抽的位置。';
      }

      if (ev.stage === 'production') {
        const rand = ev.refs.find(r => r.role === 'random');
        if (rand) line(layer, ...p, ...project(rand.x), { stroke: theme.randomColor, 'stroke-dasharray': '4 4' });
      }

      let arrowStart = p;
      if (ev.stage === 'decomposition' || ev.stage === 'production') {
        const oldp = project(ev.old);
        if (Math.hypot(oldp[0] - p[0], oldp[1] - p[1]) > 6) {
          line(layer, ...p, ...dest, { stroke: theme.gold, 'stroke-width': 1.6, 'stroke-dasharray': '4 4' });
          extras.push(['虛線：公式基準至候選', theme.gold, 'arrow']);
        }
        arrowStart = oldp;
        if (outside) {
          let f = 1;
          ev.raw.forEach((v, j) => { if (v < L || v > U) f = Math.min(f, ((v < L ? L : U) - ev.old[j]) / (v - ev.old[j])); });
          dest = project(ev.old.map((v, j) => v + (ev.raw[j] - v) * f));
        }
      }

      arrow(layer, key, arrowStart, dest, 'move', theme.coral, { 'data-stage': ev.stage, 'data-clipped': outside }, motion);

      const end = project(ev.next);
      const before = project(ev.old);
      el(layer, 'circle', { cx: before[0], cy: before[1], r: 10, fill: 'none', stroke: theme.ink, 'stroke-dasharray': '2 3', 'stroke-width': 1.5 });
      const diamond = el(layer, 'path', {
        d: `M ${end[0]} ${end[1] - 7} l 7 7 -7 7 -7 -7 Z`,
        fill: 'none',
        stroke: theme.coral,
        'stroke-width': 2.5,
        'data-next': JSON.stringify(ev.next)
      });
      el(diamond, 'title', {}, '候選位置 ' + vector(ev.next) + '，目標值 ' + number(ev.newF));
      extras.push([ev.kind === 'evaluate' ? (ev.accepted ? '已接受候選' : '未接受候選') : '候選位置', theme.coral, 'ring']);
    }

    const best = pop.reduce((a, b) => a.f <= b.f ? a : b), worst = pop.reduce((a, b) => a.f >= b.f ? a : b);
    const sort = [...pop].sort((a, b) => Number(a.id === options.selected) - Number(b.id === options.selected));

    for (const obj of sort) {
      const p = project(obj.x), selected = obj.id === options.selected, active = obj.id === ev.id;
      const isBest = obj.id === best.id, isWorst = obj.id === worst.id;
      const c = selected ? theme.coral : isBest ? theme.gold : theme.colors[(obj.id - 1) % theme.colors.length];
      const g = el(svg, 'g', {
        class: 'aeo-point',
        role: 'button',
        tabindex: '0',
        'aria-label': `個體 ${obj.id}，位置 ${vector(obj.x)}，目標值 ${number(obj.f)}`,
        'aria-pressed': !!selected,
        'data-id': obj.id,
        transform: `translate(${p[0]} ${p[1]})`,
        style: 'cursor:pointer'
      });
      el(g, 'title', {}, `#${obj.id}  x = ${vector(obj.x)}  f = ${number(obj.f)}`);
      el(g, 'circle', { r: 12, fill: 'transparent' });
      if (selected || active || isBest) el(g, 'circle', { r: 9.5, fill: c, 'fill-opacity': 0.22, stroke: c, 'stroke-width': 1.0 });
      el(g, 'circle', { r: selected || active ? 6.2 : 5.2, fill: c, stroke: theme.dotStroke, 'stroke-width': 2.0 });

      const action = () => options.onSelect?.(obj.id);
      g.addEventListener('click', action);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action(); } });

      if (isBest || isWorst || active || selected) {
        const t = (isBest ? '★ 最佳 ' : isWorst ? '▽ 最差 ' : active ? '▶ 更新 ' : '選取 ') + '#' + obj.id;
        tags.push({ p, t, c: isBest ? theme.gold : isWorst ? theme.muted : c });
      }
    }

    placeTags(svg, tags, b, theme);

    const items = extras.length ? extras : [['族群個體', theme.teal], ['最佳解', theme.gold, 'ring']];
    if (options.trails && index > 0) items.push(['已接受軌跡', theme.muted, 'arrow']);
    if (refs.length && ['herb', 'carn', 'omni'].includes(ev.stage)) items.push(['虛線：參考點至舊位置', theme.muted, 'arrow']);
    if (is2) items.push(['低 ' + number(heatmap.low), theme.teal], ['高 ' + number(heatmap.high), theme.gold]);

    const caption = legend(host, items);
    if (outNote) {
      const msg = document.createElement('span');
      msg.textContent = outNote;
      msg.style.color = theme.coral;
      msg.style.fontWeight = '600';
      caption.append(msg);
    }
    return { project, viewport: b };
  }

  function convergence(host, entries) {
    if (!host) return;
    const theme = getTheme();
    const runs = (entries || []).filter(Boolean).map((r, i) => ({ run: r.run || r, label: r.label || '執行 ' + (i + 1) }));
    if (!runs.length) { host.replaceChildren(); return; }
    const w = clamp(host.clientWidth || 600, 265, 960), h = 190, b = { x: 58, y: 26, w: w - 82, h: h - 68 };
    const svg = makeSVG(host, w, h, '歷代最佳目標值，點選資料點可讀取迭代、評估次數與數值');
    const all = runs.flatMap(r => r.run.history);
    let lo = Infinity, hi = -Infinity, maxT = 1;
    for (const row of all) { lo = Math.min(lo, row.best); hi = Math.max(hi, row.best); maxT = Math.max(maxT, row.t); }
    const logarithmic = lo > 0 && hi / lo > 100;
    if (hi === lo) hi = lo + Math.max(1, Math.abs(lo) * 0.05);

    const y = logarithmic ? v => scale(Math.log10(lo), Math.log10(hi), b.y + b.h, b.y)(Math.log10(v)) : scale(lo, hi, b.y + b.h, b.y);
    const x = scale(0, maxT, b.x, b.x + b.w);

    text(svg, b.x, 14, logarithmic ? '歷代最佳目標值（對數刻度）' : '歷代最佳目標值', { fill: theme.ink, 'font-weight': '700' });

    for (let i = 0; i <= 3; i++) {
      const f = i / 3, yy = b.y + b.h * (1 - f), val = logarithmic ? Math.exp(Math.log(lo) + (Math.log(hi) - Math.log(lo)) * f) : lo + (hi - lo) * f;
      line(svg, b.x, yy, b.x + b.w, yy, { stroke: theme.grid, 'stroke-dasharray': '3 4' });
      text(svg, b.x - 7, yy + 3, number(val), { 'text-anchor': 'end', fill: theme.muted, 'font-size': 10, 'font-weight': '600' });
    }

    for (const t of new Set(tickValues(0, maxT, 4).map(Math.round))) {
      text(svg, x(t), b.y + b.h + 16, String(t), { 'text-anchor': 'middle', fill: theme.muted, 'font-size': 10, 'font-weight': '600' });
    }
    text(svg, b.x + b.w, b.y + b.h + 30, '迭代 t', { 'text-anchor': 'end', fill: theme.ink, 'font-weight': '700' });

    const palette = [theme.teal, theme.coral, theme.peer, theme.gold, theme.randomColor];
    runs.forEach(({ run }, i) => {
      const c = palette[i % palette.length];
      el(svg, 'path', { d: pathText(run.history.map(p => [x(p.t), y(p.best)])), stroke: c, 'stroke-width': 2.4, fill: 'none' });
      for (const p of run.history) {
        const dot = el(svg, 'circle', { cx: x(p.t), cy: y(p.best), r: run.history.length > 55 ? 2.0 : 3.2, fill: c });
        el(dot, 'title', {}, `第 ${p.t} 輪／${p.fe} 次評估／最佳 ${number(p.best)}`);
      }
    });
    legend(host, runs.map((r, i) => [r.label, palette[i % palette.length], 'arrow']));
  }

  root.AEOPlot = { draw, convergence, scale };
})(typeof globalThis === 'undefined' ? window : globalThis);
