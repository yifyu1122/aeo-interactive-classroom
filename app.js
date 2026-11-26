/* AEO 教材核心控制器 (app.js)
 * 整合 Unit 5 完整演算法實驗、虛擬碼同步高亮、收斂圖、CSV 匯出與設定對話框
 * Unit 5 新增：統一函數選擇器、待執行狀態管理、實驗歷史面板
 */
(function (global) {
  'use strict';

  const $ = id => document.getElementById(id);
  const number = x => {
    if (!Number.isFinite(x)) return '—';
    if (x !== 0 && (Math.abs(x) < .001 || Math.abs(x) >= 100000)) return x.toExponential(2);
    return Number(x.toPrecision(4)).toString();
  };
  const vector = x => Array.isArray(x) ? x.map(number).join(', ') : '—';

  function toast(msg) {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg; el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2600);
  }

  // Application State
  const state = {
    run: null,
    cursor: 0,
    selected: null,
    playing: false,
    playTimer: null,
    speed: 1,
    showFormulas: true,
    showTrails: true,
    pseudocodeMode: 'simple',
    pseudocodeSelection: null,
    reducedMotion: false,
    savedRuns: [],
    followMode: true,
    currentDim: 1,
    params: {
      fn: 'square',
      n: 8,
      T: 12,
      seed: 42,
      L: -5,
      U: 5,
      demo: ''
    },
    // Unit 5: function selection pending state
    selectedFnSource: 'basic',  // 'basic' | 'paper'
    selectedFnId: 'square',     // current confirmed function ID
    pendingFnId: 'square',      // what user has selected but not yet run
    pendingParams: {
      fn: 'square',
      n: 8,
      T: 12,
      seed: 42,
      L: -5,
      U: 5
    },
    pendingDirty: false         // true when pending differs from run
  };

  const fnMeta = {
    square: { desc: '單一谷底，全空間最小值在 x = 0，f = 0。', range: '[-5, 5]' },
    multi: { desc: '具多個局部極小值（Rastrigin）。全域最佳解在 x = 0，f = 0。', range: '[-5.12, 5.12]' },
    sphere: { desc: '二維碗狀曲面，單一谷底。全域最佳解在 (0, 0)，f = 0。', range: '[-5, 5]²' },
    rastrigin: { desc: '二維多局部極小值（Rastrigin），強烈考驗跳脫局部陷阱的能力。', range: '[-5.12, 5.12]²' }
  };

  /* ── AEO.registerFunction 橋接 ─────────────────────────── */
  function ensureRegistered(fnId) {
    if (global.AEO.functions[fnId]) return fnId;
    const entry = global.AEOBench?.get(fnId);
    if (!entry || !entry.evaluate) throw new Error('此函數尚未實作，無法執行。');
    const engineId = 'bench' + entry.id;
    if (!global.AEO.functions[engineId]) {
      global.AEO.registerFunction(engineId, {
        name: entry.name,
        dim: entry.defaultDim,
        L: entry.bounds.L,
        U: entry.bounds.U,
        multimodal: entry.category.includes('多峰'),
        knownBest: entry.knownBest
      }, entry.evaluate);
    }
    return engineId;
  }

  /* ── 執行演算法 ─────────────────────────────────────────── */
  function execute() {
    stop();
    state.selected = null;
    try {
      const started = performance.now();
      state.run = global.AEO.run(state.params);
      state.run.elapsedMs = performance.now() - started;
    } catch (e) {
      toast('執行失敗：' + e.message);
      return;
    }
    state.cursor = 0;
    const timeline = $('timeline');
    if (timeline) {
      timeline.max = state.run.events.length - 1;
      timeline.value = 0;
    }
    state.followMode = true;
    const followBtn = $('follow');
    if (followBtn) followBtn.hidden = true;
    updateAll();
    updateLab();
  }

  /* ── 全局渲染更新 ───────────────────────────────────────── */
  function updateAll() {
    if (!state.run) return;
    const ev = state.run.events[state.cursor];
    const timeline = $('timeline');
    if (timeline) timeline.value = state.cursor;

    // Status text
    const stageNames = {
      init: '族群初始化', sort: '排序與角色分配', production: '生產者更新',
      herb: '草食者更新', carn: '肉食者更新', omni: '雜食者更新',
      decomposition: '分解更新', finish: '執行完成'
    };
    const statusEl = $('status');
    if (statusEl) {
      statusEl.textContent = (ev.kind === 'evaluate' ? '評估 ' : '') +
        (stageNames[ev.stage] || stageNames[ev.kind] || '事件');
    }

    const stepCountEl = $('stepCount');
    if (stepCountEl) {
      stepCountEl.textContent = `第 ${state.cursor + 1} / ${state.run.events.length} 步`;
    }

    // Top facts
    const meta = global.AEO.functions[state.params.fn];
    const fnNameEl = $('fnName');
    if (fnNameEl) fnNameEl.textContent = meta ? meta.name : state.params.fn;

    const best = state.run.history.filter(h => h.index <= state.cursor).at(-1);
    const bestNumEl = $('bestNum');
    if (bestNumEl) bestNumEl.textContent = best ? number(best.best) : '—';

    const genNumEl = $('genNum');
    if (genNumEl) genNumEl.textContent = `${ev.t} / ${state.params.demo ? 1 : state.params.T}`;

    // Dimension buttons
    const dimension = global.AEO.functions[state.params.fn]?.dim || 1;
    const is2d = dimension > 1;
    const dim1Btn = $('dim1'), dim2Btn = $('dim2');
    if (dim1Btn) dim1Btn.classList.toggle('active', !is2d || state.currentDim === 1);
    if (dim2Btn) {
      dim2Btn.classList.toggle('active', is2d && state.currentDim === 2);
      dim2Btn.disabled = !is2d;
    }
    if (dim1Btn) dim1Btn.disabled = !is2d;

    // Pseudocode Sync
    updatePseudocode(ev);

    // Plot
    const plotHost = $('plot');
    if (plotHost && global.AEOPlot) {
      global.AEOPlot.draw(plotHost, state.run, state.cursor, {
        selected: state.selected,
        currentDim: state.currentDim,
        trails: state.showTrails,
        reduced: state.reducedMotion,
        onSelect: id => {
          state.selected = (state.selected === id ? null : id);
          state.followMode = false;
          const follow = $('follow');
          if (follow) follow.hidden = false;
          updateAll();
        }
      });
    }

    // Lesson
    const lessonHost = $('lesson');
    if (lessonHost && global.AEOLesson) {
      global.AEOLesson.render(lessonHost, state.run, state.cursor, {
        selected: state.selected,
        formulas: state.showFormulas
      });
    }

    // Population Table
    renderPopulation();

    // Button states
    const prevBtn = $('prevBtn'), nextBtn = $('nextBtn');
    if (prevBtn) prevBtn.disabled = state.cursor <= 0;
    if (nextBtn) nextBtn.disabled = state.cursor >= state.run.events.length - 1;
    updatePlayButton();
  }

  /* ── 虛擬碼同步高亮 ─────────────────────────────────────── */
  function updatePseudocode(ev) {
    const map = global.AEOPseudocode;
    if (!map || !ev) return;
    const activeLine = map.eventLine(ev);
    const lines = document.querySelectorAll('#aeo_pseudocode [data-pseudo-line]');
    lines.forEach(el => {
      const active = Number(el.dataset.pseudoLine) === activeLine;
      el.classList.toggle('hl', active);
      if (active) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
    });
    const simplePhase = ev.kind === 'evaluate' ? 'evaluate' :
      ev.kind === 'init' ? 'init' :
      ev.kind === 'sort' ? 'sort' :
        ev.kind === 'finish' ? 'finish' :
          ev.stage === 'production' ? 'production' :
            ev.stage === 'decomposition' ? 'decomposition' :
              ['herb','carn','omni'].includes(ev.stage) ? (ev.kind === 'evaluate' ? 'evaluate' : 'consume') : 'finish';
    document.querySelectorAll('#aeo_pseudocode_simple [data-pseudo-phase]').forEach(el => {
      const active = el.dataset.pseudoPhase === simplePhase;
      el.classList.toggle('hl', active);
      if (active) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
    });
    if (state.pseudocodeSelection && state.pseudocodeSelection.index !== state.cursor) state.pseudocodeSelection = null;
    renderPseudocodeDetails(ev, state.pseudocodeSelection?.lineId || activeLine);
  }

  function renderPseudocodeDetails(ev, lineId, unavailable = false) {
    const map = global.AEOPseudocode;
    if (!map) return;
    const detail = map.details(ev, lineId, state.params, state.run);
    if (!detail) return;
    const title = $('pseudoDetailTitle');
    if (title) title.textContent = detail.strategy && detail.strategy !== '—'
      ? `第 ${ev.t} 輪・${detail.strategy}策略・個體 ${ev.id}`
      : detail.line.phase === 'init' ? '初始族群與歷史最佳' : `虛擬碼第 ${detail.line.id} 行`;
    if ($('pseudoExplain')) $('pseudoExplain').textContent = detail.explain;
    if ($('pseudoEquation')) $('pseudoEquation').textContent = detail.equation;
    if ($('pseudoVariables')) $('pseudoVariables').textContent = detail.variables;
    if ($('pseudoRandomRefs')) {
      const items = [...detail.randoms, ...detail.refs];
      $('pseudoRandomRefs').textContent = items.length ? items.join('；') : '此行沒有位置更新亂數或參考個體。';
    }
    if ($('pseudoCalculation')) $('pseudoCalculation').textContent = detail.calculation;
    if ($('pseudoOutcome')) {
      $('pseudoOutcome').textContent = unavailable
        ? '這次 Seed 執行沒有產生此策略事件；不會虛構亂數或計算。可重新執行，或將游標移到實際出現的策略。'
        : detail.outcome;
      $('pseudoOutcome').classList.toggle('accepted', detail.accepted === true);
      $('pseudoOutcome').classList.toggle('rejected', detail.accepted === false);
    }
  }

  function buildPseudocode() {
    const map = global.AEOPseudocode;
    const list = $('aeo_pseudocode');
    if (!map || !list || list.childElementCount) return;
    map.lines.forEach(line => {
      const item = document.createElement('li');
      item.dataset.pseudoLine = line.id;
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', `虛擬碼第 ${line.id} 行：${line.code}`);
      const code = document.createElement('code');
      code.textContent = line.code;
      item.append(code);
      const inspect = () => {
        stop();
        const index = map.findEventIndex(state.run, line.id, state.cursor);
        state.pseudocodeSelection = {lineId:line.id, index:index >= 0 ? index : null};
        if (index >= 0) goTo(index);
        else renderPseudocodeDetails(null, line.id, true);
      };
      item.addEventListener('click', inspect);
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inspect(); }
      });
      list.append(item);
    });
    const tabs = [
      {tab:$('pseudoSimpleTab'), mode:'simple', panel:$('pseudoSimple')},
      {tab:$('pseudoFullTab'), mode:'full', panel:$('pseudoFull')},
      {tab:$('pseudoSourceTab'), mode:'source', panel:$('pseudoSource')}
    ];
    const setMode = mode => {
      state.pseudocodeMode = mode;
      tabs.forEach(item => {
        if (item.panel) item.panel.hidden = item.mode !== mode;
        if (item.tab) item.tab.setAttribute('aria-selected', String(item.mode === mode));
      });
      const detail = $('pseudoDetail');
      if (detail) detail.hidden = mode === 'source';
    };
    tabs.forEach((item,index) => {
      const {tab,mode} = item;
      if (!tab) return;
      tab.addEventListener('click', () => setMode(mode));
      tab.addEventListener('keydown', e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const nextIndex = (index + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
        const next = tabs[nextIndex];
        setMode(next.mode);
        next.tab?.focus();
      });
    });
    setMode('simple');
  }

  function updatePlayButton() {
    const playBtn = $('playBtn');
    if (!playBtn) return;
    const icon = playBtn.querySelector('use');
    const label = playBtn.querySelector('span');
    if (state.playing) {
      if (icon) icon.setAttribute('href', '#pause');
      if (label) label.textContent = '暫停';
    } else if (state.cursor >= (state.run ? state.run.events.length - 1 : 0)) {
      if (icon) icon.setAttribute('href', '#play');
      if (label) label.textContent = '重新執行';
    } else if (state.cursor > 0) {
      if (icon) icon.setAttribute('href', '#play');
      if (label) label.textContent = '繼續';
    } else {
      if (icon) icon.setAttribute('href', '#play');
      if (label) label.textContent = '開始';
    }
  }

  /* ── 候選解觀測表 ───────────────────────────────────────── */
  function renderPopulation() {
    if (!state.run) return;
    const pop = global.AEO.stateAt(state.run, state.cursor);
    const ev = state.run.events[state.cursor];
    const best = pop.reduce((a, b) => a.f <= b.f ? a : b);
    const worst = pop.reduce((a, b) => a.f >= b.f ? a : b);
    const dimension = global.AEO.functions[state.params.fn]?.dim || 1;
    const is2d = dimension > 1 && state.currentDim === 2;

    const popRows = $('rows');
    if (!popRows) return;

    popRows.innerHTML = pop.map(p => {
      const isBest = p.id === best.id;
      const isWorst = p.id === worst.id;
      const isActive = p.id === ev.id;
      const isSel = p.id === state.selected;
      let badge = '';
      if (isBest) badge = '<span class="badge badge-best">★ 最佳</span>';
      else if (isWorst) badge = '<span class="badge badge-worst">▽ 最差</span>';
      else if (isActive) badge = '<span class="badge badge-active">▶ 更新中</span>';

      return `<tr class="${isSel ? 'is-selected' : ''}" data-pop-id="${p.id}">
        <td><span class="ind"><i style="background:${plotColor(p.id)}"></i>P${p.id}</span></td>
        <td title="${vector(p.x)}">${dimension > 3 ? `${vector(p.x.slice(0, 3))}, …（${dimension} 維）` : vector(p.x)}</td>
        <td>${number(p.f)}</td>
        <td>${badge}</td>
        <td><button class="textBtn" data-select="${p.id}">查看</button></td>
      </tr>`;
    }).join('');

    // Click handler
    popRows.querySelectorAll('[data-select]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.select);
        state.selected = (state.selected === id ? null : id);
        state.followMode = false;
        const follow = $('follow');
        if (follow) follow.hidden = false;
        updateAll();
      });
    });

    const popInfo = $('popInfo');
    if (popInfo) popInfo.textContent = `族群大小 ${pop.length}　${is2d ? (dimension > 2 ? `二維切片（其餘 ${dimension - 2} 維固定為 0）` : '二維空間') : (dimension > 1 ? `一維切片（其餘 ${dimension - 1} 維固定為 0）` : '一維空間')}`;

    // Diet breakdown
    const dietEl = $('diet');
    const dietNote = $('dietNote');
    const diets = state.run.diets[ev.t];
    if (diets && dietEl) {
      const total = diets.herb + diets.carn + diets.omni;
      dietEl.innerHTML = [
        ['草食者', diets.herb, 'var(--herbivore)'],
        ['肉食者', diets.carn, 'var(--carnivore)'],
        ['雜食者', diets.omni, 'var(--omnivore)']
      ].map(([name, count, color]) =>
        `<span class="dietpill" style="border-left:3px solid ${color}">${name} ${count}</span>`
      ).join('');
      if (dietNote) {
        dietNote.textContent = total > 0
          ? `第 ${ev.t} 輪共 ${total} 位消費者依隨機機率選擇食性。`
          : '';
      }
    } else if (dietEl) {
      dietEl.innerHTML = '';
      if (dietNote) dietNote.textContent = ev.kind === 'init' ? '族群初始中，尚未分配食性。' : '';
    }
  }

  function plotColor(id) { return `var(--chart-${((id - 1) % 5) + 1})`; }

  /* ── 播放控制 ───────────────────────────────────────────── */
  function stepForward() {
    if (!state.run || state.cursor >= state.run.events.length - 1) return false;
    state.cursor++;
    if (state.followMode) state.selected = null;
    updateAll();
    return true;
  }

  function stepBack() {
    if (!state.run || state.cursor <= 0) return false;
    state.cursor--;
    if (state.followMode) state.selected = null;
    updateAll();
    return true;
  }

  function goTo(index) {
    if (!state.run) return;
    state.cursor = Math.max(0, Math.min(state.run.events.length - 1, index));
    if (state.followMode) state.selected = null;
    updateAll();
  }

  function play() {
    if (!state.run) return;
    if (state.cursor >= state.run.events.length - 1) {
      state.cursor = 0;
      updateAll();
    }
    state.playing = true;
    updatePlayButton();
    scheduleNext();
  }

  function stop() {
    state.playing = false;
    clearTimeout(state.playTimer);
    state.playTimer = null;
    updatePlayButton();
  }

  function scheduleNext() {
    if (!state.playing) return;
    const delay = Math.max(80, 600 / state.speed);
    state.playTimer = setTimeout(() => {
      if (!stepForward()) {
        stop();
        return;
      }
      scheduleNext();
    }, delay);
  }

  /* ── 收斂曲線與實驗 ─────────────────────────────────────── */
  function updateLab() {
    if (!state.run) return;
    const labDesc = $('labDesc');
    if (labDesc) {
      labDesc.textContent = `函數 ${global.AEO.functions[state.params.fn]?.name || state.params.fn}，n = ${state.params.n}，T = ${state.params.T}，Seed = ${state.params.seed}。最終最佳適應值：${number(state.run.history.at(-1)?.best)}。`;
    }

    const histBody = $('hist');
    if (histBody) {
      histBody.innerHTML = state.run.history.map(h =>
        `<tr><td>${h.t}</td><td>${number(h.best)}</td><td>${h.fe}</td></tr>`
      ).join('');
    }

    const convHost = $('conv');
    if (convHost && global.AEOPlot) {
      const entries = [{ run: state.run, label: '本次執行', knownBest:global.AEO.functions[state.params.fn]?.knownBest ?? 0 }, ...state.savedRuns];
      global.AEOPlot.convergence(convHost, entries);
    }

    const compareList = $('compareList');
    if (compareList) {
      if (state.savedRuns.length) {
        compareList.innerHTML = `已保存 ${state.savedRuns.length} 組比較曲線：` +
          state.savedRuns.map(r => `<br>• ${r.label}`).join('');
      } else {
        compareList.textContent = '尚未保存比較組。點選「保存本次設定作比較」可加入圖中對照。';
      }
    }

    renderHistoryTable();
  }

  /* ── Unit 5 歷史面板 ───────────────────────────────────── */
  function renderHistoryTable() {
    const rows = $('u5HistoryRows');
    const countBadge = $('u5HistoryCount');
    const chart = $('u5CompareChart');

    if (rows) {
      rows.innerHTML = state.savedRuns.map((item, idx) => {
        const best = item.run.history.at(-1)?.best ?? NaN;
        const known = item.knownBest ?? 0;
        const dim = global.AEO.functions[item.config.fn]?.dim ?? '—';
        const startGap = Math.abs((item.run.history[0]?.best ?? NaN) - known);
        const normalizedGap = startGap > 0 ? Math.abs(best - known) / startGap : null;
        return `<tr>
          <td>${item.fnName}</td>
          <td>${item.config.n}/${item.config.T}/${item.config.seed}</td>
          <td>${dim}</td>
          <td>${number(best)}</td>
          <td>${number(known)}</td>
          <td>${number(Math.abs(best - known))}</td>
          <td>${normalizedGap == null ? '—' : number(normalizedGap * 100) + '%'}</td>
          <td>${item.run.history.at(-1)?.fe ?? '—'}</td>
          <td>${number(item.elapsedMs)}</td>
          <td><button class="textBtn" data-del-run="${idx}">刪除</button></td>
        </tr>`;
      }).join('');

      rows.querySelectorAll('[data-del-run]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.delRun);
          state.savedRuns.splice(idx, 1);
          renderHistoryTable();
          toast('已刪除該筆實驗記錄。');
        });
      });
    }

    if (countBadge) countBadge.textContent = state.savedRuns.length;

    if (chart && global.AEOPlot && state.run) {
      const entries = [{ run: state.run, label: '目前執行', knownBest:global.AEO.functions[state.params.fn]?.knownBest ?? 0 }, ...state.savedRuns];
      global.AEOPlot.convergence(chart, entries);
    }
  }

  function exportCSV() {
    if (!state.run) return;
    const header = '迭代,最佳目標值,最佳位置,累計評估次數\n';
    const rows = state.run.history.map(h =>
      `${h.t},${h.best},"${vector(h.x)}",${h.fe}`
    ).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `AEO_${state.params.fn}_n${state.params.n}_T${state.params.T}_s${state.params.seed}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('已匯出 CSV 執行紀錄');
  }

  /* ── 參數設定 ───────────────────────────────────────────── */
  function populateSettings() {
    // Pre-fill settings with PENDING params
    const fnSelect = $('fn');
    if (fnSelect) fnSelect.value = state.pendingParams.fn;
    if ($('n')) $('n').value = state.pendingParams.n;
    if ($('T')) $('T').value = state.pendingParams.T;
    if ($('L')) $('L').value = state.pendingParams.L;
    if ($('U')) $('U').value = state.pendingParams.U;
    if ($('seed')) $('seed').value = state.pendingParams.seed;
    if ($('formulas')) $('formulas').checked = state.showFormulas;
    if ($('trails')) $('trails').checked = state.showTrails;
    if ($('reduced')) $('reduced').checked = state.reducedMotion;
    updateFnMeta();
    if ($('paramError')) $('paramError').textContent = '';
    if ($('dirty')) $('dirty').textContent = '';
  }

  function updateFnMeta() {
    const fnSelect = $('fn');
    const fnMetaEl = $('fnMeta');
    if (!fnSelect || !fnMetaEl) return;
    const info = fnMeta[fnSelect.value];
    if (info) fnMetaEl.textContent = `${info.desc} 預設範圍：${info.range}`;
  }

  function applySettings() {
    const fnSelect = $('fn');
    const paramError = $('paramError');
    if (paramError) paramError.textContent = '';

    const newParams = {
      fn: fnSelect.value,
      n: parseInt($('n').value, 10),
      T: parseInt($('T').value, 10),
      L: parseFloat($('L').value),
      U: parseFloat($('U').value),
      seed: parseInt($('seed').value, 10),
      demo: ''
    };

    try {
      global.AEO.validate(newParams);
    } catch (e) {
      if (paramError) paramError.textContent = e.message;
      return false;
    }

    state.showFormulas = $('formulas')?.checked ?? true;
    state.showTrails = $('trails')?.checked ?? true;
    state.reducedMotion = $('reduced')?.checked ?? false;
    document.body.classList.toggle('reduced', state.reducedMotion);

    // Update pending state and show dirty note
    state.pendingParams = { ...newParams };
    state.pendingFnId = newParams.fn;
    markPendingDirty();

    // Sync u5 param inputs with new values
    syncU5Inputs();

    return true;
  }

  /* ── Unit 5: 函數資訊面板更新 ─────────────────────────── */
  function updateU5FnInfo(fnId) {
    // Try AEOBench first, then AEO.functions
    const benchEntry = global.AEOBench?.get(fnId);
    const aeoMeta = global.AEO.functions[fnId] || (benchEntry ? {
      name: benchEntry.name,
      dim: benchEntry.defaultDim,
      L: benchEntry.bounds.L,
      U: benchEntry.bounds.U,
      knownBest: benchEntry.knownBest
    } : null);

    if (!aeoMeta && !benchEntry) return;

    const name = benchEntry?.name || aeoMeta?.name || fnId;
    const formula = benchEntry?.formula || '';
    const desc = benchEntry?.description || fnMeta[fnId]?.desc || '';
    const L = benchEntry?.bounds?.L ?? aeoMeta?.L ?? -5;
    const U = benchEntry?.bounds?.U ?? aeoMeta?.U ?? 5;
    const best = benchEntry?.knownBest ?? aeoMeta?.knownBest ?? 0;
    const dim = benchEntry?.defaultDim ?? aeoMeta?.dim ?? 1;
    const status = benchEntry?.status ?? 'runnable';

    if ($('u5FnName')) $('u5FnName').textContent = name;
    if ($('u5FnFormula')) $('u5FnFormula').textContent = formula;
    if ($('u5FnDesc')) $('u5FnDesc').textContent = desc;
    if ($('u5FnBounds')) $('u5FnBounds').textContent = `[${L}, ${U}]`;
    if ($('u5FnBest')) $('u5FnBest').textContent = number(best);
    if ($('u5FnDim')) $('u5FnDim').textContent = dim + 'D';
    if ($('u5DimDisplay')) $('u5DimDisplay').textContent = dim + 'D';

    // Status badge
    const badge = $('u5FnStatusBadge');
    if (badge) {
      badge.textContent = status === 'runnable' ? '✓ 可執行' : status === 'preview' ? '預覽' : '不可用';
      badge.className = 'fn-status-badge ' + status;
    }

    // Missing box and start button
    const missingBox = $('u5FnMissingBox');
    const startBtn = $('u5StartBtn');
    if (status === 'preview') {
      if (missingBox) missingBox.hidden = false;
      if ($('u5FnMissing') && benchEntry?.missingData?.length) {
        $('u5FnMissing').textContent = benchEntry.missingData.join('、');
      }
      if (startBtn) startBtn.disabled = true;
    } else {
      if (missingBox) missingBox.hidden = true;
      if (startBtn) startBtn.disabled = false;
    }

    // Update bound inputs
    if ($('u5L')) $('u5L').value = L;
    if ($('u5U')) $('u5U').value = U;

    // Also update pending params bounds
    state.pendingParams.L = L;
    state.pendingParams.U = U;
    state.pendingParams.fn = fnId;
  }

  function syncU5Inputs() {
    if ($('u5n')) $('u5n').value = state.pendingParams.n;
    if ($('u5T')) $('u5T').value = state.pendingParams.T;
    if ($('u5seed')) $('u5seed').value = state.pendingParams.seed;
    if ($('u5L')) $('u5L').value = state.pendingParams.L;
    if ($('u5U')) $('u5U').value = state.pendingParams.U;
  }

  function readU5Params() {
    return {
      fn: state.pendingFnId,
      n: parseInt($('u5n')?.value ?? state.pendingParams.n, 10),
      T: parseInt($('u5T')?.value ?? state.pendingParams.T, 10),
      seed: parseInt($('u5seed')?.value ?? state.pendingParams.seed, 10),
      L: parseFloat($('u5L')?.value ?? state.pendingParams.L),
      U: parseFloat($('u5U')?.value ?? state.pendingParams.U),
      demo: ''
    };
  }

  function markPendingDirty() {
    state.pendingDirty = true;
    const dirtyNote = $('u5DirtyNote');
    if (dirtyNote) {
      dirtyNote.hidden = false;
      dirtyNote.textContent = state.run ? '設定已修改，請重新開始實驗以套用。' : '設定已修改。';
    }
    const pickerDirtyNote = $('settingsDirty');
    if (pickerDirtyNote) {
      pickerDirtyNote.hidden = false;
      pickerDirtyNote.textContent = state.run
        ? '目前圖表仍是上一個實驗；按「開始新實驗」後才會載入選取函數。'
        : '設定已修改，開始實驗後套用。';
    }
  }

  function clearDirty() {
    state.pendingDirty = false;
    const dirtyNote = $('u5DirtyNote');
    if (dirtyNote) { dirtyNote.hidden = true; dirtyNote.textContent = ''; }
    const pickerDirtyNote = $('settingsDirty');
    if (pickerDirtyNote) pickerDirtyNote.hidden = true;
  }

  /* ── Unit 5: 論文基準函數列表渲染 ─────────────────────── */
  function renderBenchList() {
    const listEl = $('u5BenchList');
    if (!listEl || !global.AEOBench) return;

    const groupEl = $('u5BenchGroup');
    const searchEl = $('u5BenchSearch');
    const catFilter = groupEl?.value || '';
    const textFilter = (searchEl?.value || '').toLowerCase();

    let entries = global.AEOBench.entries.filter(e => e.source === 'paper');
    if (catFilter) entries = entries.filter(e => e.category === catFilter);
    if (textFilter) entries = entries.filter(e =>
      e.name.toLowerCase().includes(textFilter) ||
      String(e.id).includes(textFilter) ||
      (e.description || '').toLowerCase().includes(textFilter)
    );

    if (!entries.length) {
      listEl.innerHTML = '<p style="padding:12px;color:var(--muted-fg)">無符合條件的函數。</p>';
      return;
    }

    listEl.innerHTML = entries.map(e => {
      const isSelected = state.pendingFnId === String(e.id);
      const statusLabel = e.status === 'runnable' ? '✓' : '預覽';
      return `<div class="fn-bench-item${isSelected ? ' selected' : ''}" data-bench-id="${e.id}">
        <span class="fn-id">f${e.id}</span>
        <span class="fn-name">${e.name}</span>
        <span class="fn-status-badge ${e.status}">${statusLabel}</span>
        <button class="textBtn" data-bench-select="${e.id}">選擇</button>
      </div>`;
    }).join('');

    listEl.querySelectorAll('[data-bench-select]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.benchSelect;
        selectPaperFunction(id);
      });
    });
  }

  function selectPaperFunction(id) {
    state.pendingFnId = String(id);
    updateU5FnInfo(id);
    markPendingDirty();
    renderBenchList(); // refresh selection highlight
  }

  function selectBasicFunction(id) {
    state.pendingFnId = id;
    updateU5FnInfo(id);
    markPendingDirty();
  }

  /* ── Unit 5: 開始實驗按鈕 ─────────────────────────────── */
  function handleU5Start() {
    stop();

    const params = readU5Params();

    // Validate function status
    const benchEntry = global.AEOBench?.get(state.pendingFnId);
    if (benchEntry && benchEntry.status !== 'runnable') {
      const errEl = $('u5ParamError');
      if (errEl) errEl.textContent = '此函數尚未實作，無法執行。';
      toast('此函數尚未實作，無法執行。');
      return;
    }

    // Validate params
    let registeredId;
    try {
      registeredId = ensureRegistered(state.pendingFnId);
      params.fn = registeredId;
      global.AEO.validate(params);
    } catch (e) {
      const errEl = $('u5ParamError');
      if (errEl) errEl.textContent = e.message;
      toast('參數錯誤：' + e.message);
      return;
    }

    const errEl = $('u5ParamError');
    if (errEl) errEl.textContent = '';

    // Snapshot params as run params
    state.params = { ...params };
    state.pendingParams = { ...params };
    state.selectedFnId = state.pendingFnId;
    state.currentDim = (global.AEO.functions[registeredId]?.dim || 1) > 1 ? 2 : 1;

    // Execute
    execute();

    // Reveal workspace
    const workspace = $('u5Workspace');
    if (workspace) workspace.hidden = false;

    // Update run label
    const runLabel = $('u5RunLabel');
    const runStatus = $('u5RunStatus');
    const fnDisplayName = global.AEO.functions[registeredId]?.name || state.pendingFnId;
    if (runLabel) {
      runLabel.textContent = `實驗：${fnDisplayName}，n=${params.n}，T=${params.T}，Seed=${params.seed}`;
    }
    if (runStatus) {
      runStatus.textContent = state.run ? '已完成' : '執行中…';
    }

    clearDirty();
    toast(`已開始實驗：${fnDisplayName}`);
  }

  /* ── 初始化事件綁定 ─────────────────────────────────────── */
  const labTabs = [
    {id:'basic', tab:'labBasicTab', panel:'labBasicPanel'},
    {id:'benchmarks', tab:'labBenchmarkTab', panel:'labBenchmarkPanel'},
    {id:'compare', tab:'labCompareTab', panel:'labComparePanel'}
  ];
  function showLabTab(id, focus = false) {
    const selected = labTabs.find(item => item.id === id);
    if (!selected) return false;
    for (const item of labTabs) {
      const tab = $(item.tab), panel = $(item.panel), active = item === selected;
      if (!tab || !panel) continue;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panel.hidden = !active;
      if (active && focus) tab.focus();
    }
    return true;
  }

  function init() {
    buildPseudocode();
    for (const item of labTabs) {
      const tab = $(item.tab);
      tab?.addEventListener('click', () => showLabTab(item.id));
      tab?.addEventListener('keydown', event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault();
        const current = labTabs.findIndex(candidate => candidate.id === item.id);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? labTabs.length - 1 :
          (current + (event.key === 'ArrowRight' ? 1 : labTabs.length - 1)) % labTabs.length;
        showLabTab(labTabs[next].id, true);
      });
    }
    // The first visit is light by design; a saved explicit choice always wins.
    const themeToggle = $('themeToggle');
    if (themeToggle) {
      const syncThemeLabel = () => {
        const dark = document.documentElement.dataset.theme === 'dark';
        themeToggle.setAttribute('aria-pressed', String(dark));
        themeToggle.querySelector('.theme-label').textContent = dark ? '淺色模式' : '深色模式';
        themeToggle.setAttribute('aria-label', dark ? '切換至淺色模式' : '切換至深色模式');
      };
      syncThemeLabel();
      themeToggle.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem('aeo_theme', next); } catch (_) { /* Private browsing may block storage. */ }
        syncThemeLabel();
        if (global.AEOUnits) global.AEOUnits.renderAll();
        updateAll();
      });
    }

    // Initial run
    execute();

    // Dialog & controls
    const settingsBtn = $('settingsBtn');
    const settingsDlg = $('settings');
    if (settingsBtn && settingsDlg) {
      settingsBtn.addEventListener('click', () => {
        populateSettings();
        settingsDlg.showModal();
      });
    }

    document.querySelectorAll('[data-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dlg = $(btn.dataset.open);
        if (dlg) dlg.showModal();
      });
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dlg = $(btn.dataset.close);
        if (dlg) dlg.close();
      });
    });

    const paramForm = $('parameterForm');
    if (paramForm) {
      paramForm.addEventListener('submit', e => {
        e.preventDefault();
        if (applySettings()) settingsDlg?.close();
      });
    }

    const fnSelect = $('fn');
    if (fnSelect) {
      fnSelect.addEventListener('change', () => {
        const meta = global.AEO.functions[fnSelect.value];
        if (meta) {
          if ($('L')) $('L').value = meta.L;
          if ($('U')) $('U').value = meta.U;
        }
        updateFnMeta();
        if ($('dirty')) $('dirty').textContent = '⚠ 設定已修改，套用後重新執行。';
      });
    }

    ['n', 'T', 'L', 'U', 'seed'].forEach(id => {
      const input = $(id);
      if (input) {
        input.addEventListener('input', () => {
          if ($('dirty')) $('dirty').textContent = '⚠ 設定已修改，套用後重新執行。';
        });
      }
    });

    // Playback
    const playBtn = $('playBtn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (state.playing) stop(); else play();
      });
    }

    const prevBtn = $('prevBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => { stop(); stepBack(); });

    const nextBtn = $('nextBtn');
    if (nextBtn) nextBtn.addEventListener('click', () => { stop(); stepForward(); });

    const resetBtn = $('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', () => { stop(); goTo(0); toast('已重設至初始狀態'); });

    const speedSelect = $('speed');
    if (speedSelect) {
      speedSelect.addEventListener('change', () => {
        state.speed = parseFloat(speedSelect.value);
      });
    }

    const timeline = $('timeline');
    if (timeline) {
      timeline.addEventListener('input', () => {
        stop();
        goTo(parseInt(timeline.value, 10));
      });
    }

    const followBtn = $('follow');
    if (followBtn) {
      followBtn.addEventListener('click', () => {
        state.followMode = true;
        state.selected = null;
        followBtn.hidden = true;
        updateAll();
      });
    }

    // Dimensions
    const dim1Btn = $('dim1'), dim2Btn = $('dim2');
    if (dim1Btn) {
      dim1Btn.addEventListener('click', () => {
        state.currentDim = 1;
        updateAll();
      });
    }

    if (dim2Btn) {
      dim2Btn.addEventListener('click', () => {
        state.currentDim = 2;
        updateAll();
      });
    }

    // Lab operations
    const saveRunBtn = $('saveRun');
    if (saveRunBtn) {
      saveRunBtn.addEventListener('click', () => {
        if (!state.run) return;
        const label = `${global.AEO.functions[state.params.fn]?.name || state.params.fn} n=${state.params.n} T=${state.params.T} s=${state.params.seed}`;
        state.savedRuns.push({
          run: state.run, label,
          config: {...state.params},
          fnName: global.AEO.functions[state.params.fn]?.name || state.params.fn,
          knownBest: global.AEO.functions[state.params.fn]?.knownBest ?? 0,
          elapsedMs: state.run.elapsedMs ?? 0
        });
        updateLab();
        renderHistoryTable();
        toast(`已保存。共 ${state.savedRuns.length} 組比較曲線。`);
      });
    }

    const rerunBtn = $('rerun');
    if (rerunBtn) rerunBtn.addEventListener('click', () => { execute(); toast('已重新執行。'); });

    const clearRunsBtn = $('clearRuns');
    if (clearRunsBtn) {
      clearRunsBtn.addEventListener('click', () => {
        state.savedRuns = [];
        updateLab();
        toast('比較曲線已清除。');
      });
    }

    const csvBtn = $('csv');
    if (csvBtn) csvBtn.addEventListener('click', exportCSV);

    // Legacy compare buttons (kept for backward compat, IDs may not exist)
    const saveCompare = $('saveCurrentCompare');
    if (saveCompare) saveCompare.addEventListener('click', () => {
      if (!state.run) return;
      state.savedRuns.push({
        run: state.run,
        label: `${global.AEO.functions[state.params.fn]?.name} n=${state.params.n} T=${state.params.T} seed=${state.params.seed}`,
        config: {...state.params},
        fnName: global.AEO.functions[state.params.fn]?.name || state.params.fn,
        knownBest: global.AEO.functions[state.params.fn]?.knownBest ?? 0,
        elapsedMs: state.run.elapsedMs ?? 0
      });
      updateLab();
      toast('目前結果已加入比較。');
    });
    const runCompare=$('runCompare');
    if(runCompare) runCompare.addEventListener('click',()=>{try{const fn=state.params.fn,cfg={...state.params,n:Number($('compareN').value),T:Number($('compareT').value),seed:Number($('compareSeed').value)};global.AEO.validate(cfg);const t=performance.now(),run=global.AEO.run(cfg);run.elapsedMs=performance.now()-t;state.savedRuns.push({run,label:`${global.AEO.functions[fn].name} n=${cfg.n} T=${cfg.T} seed=${cfg.seed}`,config:cfg,fnName:global.AEO.functions[fn].name,knownBest:global.AEO.functions[fn].knownBest,elapsedMs:run.elapsedMs});renderHistoryTable();updateLab();$('compareStatus').textContent=`已加入比較，共 ${state.savedRuns.length} 筆；歷史資料為獨立快照。`;toast('比較實驗完成。');}catch(e){$('compareStatus').textContent='參數錯誤：'+e.message;}});

    // ── Unit 5 新增控制 ────────────────────────────────────

    // fn source radio buttons
    document.querySelectorAll('input[name="fnSource"]').forEach(radio => {
      radio.addEventListener('change', () => {
        state.selectedFnSource = radio.value;
        const basicPanel = $('fnBasicPanel');
        const paperPanel = $('fnPaperPanel');
        if (basicPanel) basicPanel.hidden = radio.value !== 'basic';
        if (paperPanel) paperPanel.hidden = radio.value !== 'paper';

        if (radio.value === 'basic') {
          selectBasicFunction('square');
          // Set square radio checked
          const sq = document.querySelector('input[name="fnChoice"][value="square"]');
          if (sq) sq.checked = true;
        } else {
          // Switch to paper: select first runnable paper function
          const first = global.AEOBench?.entries.find(e => e.source === 'paper' && e.status === 'runnable');
          if (first) selectPaperFunction(String(first.id));
          renderBenchList();
        }
        markPendingDirty();
      });
    });

    // fn choice radio buttons (basic functions)
    document.querySelectorAll('input[name="fnChoice"]').forEach(radio => {
      radio.addEventListener('change', () => {
        selectBasicFunction(radio.value);
      });
    });

    // paper function search/filter
    const benchGroup = $('u5BenchGroup');
    const benchSearch = $('u5BenchSearch');
    if (benchGroup) benchGroup.addEventListener('change', renderBenchList);
    if (benchSearch) benchSearch.addEventListener('input', renderBenchList);

    // u5 params: n, T, seed, L, U
    ['u5n', 'u5T', 'u5seed', 'u5L', 'u5U'].forEach(id => {
      const el = $(id);
      if (el) {
        el.addEventListener('input', () => {
          state.pendingParams.n = parseInt($('u5n')?.value, 10) || state.pendingParams.n;
          state.pendingParams.T = parseInt($('u5T')?.value, 10) || state.pendingParams.T;
          state.pendingParams.seed = parseInt($('u5seed')?.value, 10) || state.pendingParams.seed;
          state.pendingParams.L = parseFloat($('u5L')?.value) || state.pendingParams.L;
          state.pendingParams.U = parseFloat($('u5U')?.value) || state.pendingParams.U;
          markPendingDirty();
        });
      }
    });

    // u5StartBtn
    const startBtn = $('u5StartBtn');
    if (startBtn) startBtn.addEventListener('click', handleU5Start);
    const newStart=$('startExperiment'); if(newStart) newStart.addEventListener('click',handleU5Start);
    ['u5n','u5T','u5seed'].forEach(id=>$(id)?.addEventListener('input',()=>{state.pendingParams.n=parseInt($('u5n').value,10)||state.pendingParams.n;state.pendingParams.T=parseInt($('u5T').value,10)||state.pendingParams.T;state.pendingParams.seed=parseInt($('u5seed').value,10)||0;markPendingDirty();}));

    // u5 history panel
    const clearHistoryBtn = $('u5ClearHistory');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        state.savedRuns = [];
        renderHistoryTable();
        updateLab();
        toast('實驗歷史已清除。');
      });
    }

    const exportCsvBtn = $('u5ExportCSV');
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCSV);

    // Initialize bench list if AEOBench is available
    if (global.AEOBench) renderBenchList();

    // Initialize u5 fn info with default function
    updateU5FnInfo('square');
    syncU5Inputs();

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const settings = $('settings');
      if (settings && settings.open) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); stop(); stepForward(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); stepBack(); }
      else if (e.key === ' ') { e.preventDefault(); if (state.playing) stop(); else play(); }
      else if (e.key === 'r' || e.key === 'R') { stop(); goTo(0); }
    });
  }

  // Export
  global.AEOApp = {
    init,
    setPendingFunction(id) {
      const spec=global.AEO.functions[id]; if(!spec) { toast('此函數尚未註冊，不能執行。'); return false; }
      const unchanged = state.pendingFnId === id && state.pendingParams.L === spec.L && state.pendingParams.U === spec.U &&
        state.params.fn === id && state.params.L === spec.L && state.params.U === spec.U;
      if (!unchanged) stop();
      state.pendingFnId=id; state.pendingFnSource=id.startsWith('bench')?'paper':'basic';
      state.pendingParams={...state.pendingParams,fn:id,L:spec.L,U:spec.U};
      updateU5FnInfo(id); syncU5Inputs();
      if (unchanged) clearDirty(); else markPendingDirty();
      return true;
    },
    startPending() { return handleU5Start(); },
    loadFunction(id) {
      const meta = global.AEO.functions[id];
      if (!meta) return toast('此函數尚未註冊，暫不支援執行。');
      stop();
      state.params.fn = id; state.params.L = meta.L; state.params.U = meta.U;
      state.currentDim = meta.dim;
      // Also update pending state
      state.pendingFnId = id;
      state.pendingParams = { ...state.params };
      state.run = null;
      execute();
      updateAll();
      updateU5FnInfo(id);
      clearDirty();
      toast(`${meta.name} 已載入；Seed 與族群設定保留。`);
    },
    onShow() {
      if (state.run) updateAll();
    },
    showLabTab(id) { return showLabTab(id); }
  };

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (global.AEOUnits) global.AEOUnits.init();
      init();
    });
  } else {
    if (global.AEOUnits) global.AEOUnits.init();
    init();
  }

})(typeof globalThis !== 'undefined' ? globalThis : window);
