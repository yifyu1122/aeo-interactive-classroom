/* AEO 教材核心控制器 (app.js)
 * 整合 Unit 5 完整演算法實驗、虛擬碼同步高亮、收斂圖、CSV 匯出與設定對話框
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
    }
  };

  const fnMeta = {
    square: { desc: '單一谷底，全空間最小值在 x = 0，f = 0。', range: '[-5, 5]' },
    multi: { desc: '具多個局部極小值（Rastrigin）。全域最佳解在 x = 0，f = 0。', range: '[-5.12, 5.12]' },
    sphere: { desc: '二維碗狀曲面，單一谷底。全域最佳解在 (0, 0)，f = 0。', range: '[-5, 5]²' },
    rastrigin: { desc: '二維多局部極小值（Rastrigin），強烈考驗跳脫局部陷阱的能力。', range: '[-5.12, 5.12]²' }
  };

  /* ── 執行演算法 ─────────────────────────────────────────── */
  function execute() {
    stop();
    state.selected = null;
    try {
      state.run = global.AEO.run(state.params);
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
    const is2d = state.params.fn === 'sphere' || state.params.fn === 'rastrigin';
    const dim1Btn = $('dim1'), dim2Btn = $('dim2');
    if (dim1Btn) dim1Btn.classList.toggle('active', !is2d || state.currentDim === 1);
    if (dim2Btn) dim2Btn.classList.toggle('active', is2d && state.currentDim === 2);

    // Pseudocode Sync
    updatePseudocode(ev);

    // Plot
    const plotHost = $('plot');
    if (plotHost && global.AEOPlot) {
      global.AEOPlot.draw(plotHost, state.run, state.cursor, {
        selected: state.selected,
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
    const lines = document.querySelectorAll('#aeo_pseudocode li');
    if (!lines.length) return;
    lines.forEach(l => l.classList.remove('hl'));

    // Pseudocode line mapping
    // 1: init
    // 2: loop start
    // 3: sort
    // 4: production
    // 5: consumption
    // 6: accept test (consumption/production)
    // 7: best record
    // 8: decomposition
    // 9: accept test (decomposition)
    // 10: end loop / finish
    let activeLine = 1;
    if (ev.kind === 'init') activeLine = 1;
    else if (ev.kind === 'sort') activeLine = 3;
    else if (ev.stage === 'production') activeLine = ev.kind === 'evaluate' ? 6 : 4;
    else if (['herb', 'carn', 'omni'].includes(ev.stage)) activeLine = ev.kind === 'evaluate' ? 6 : 5;
    else if (ev.stage === 'decomposition') activeLine = ev.kind === 'evaluate' ? 9 : 8;
    else if (ev.kind === 'finish') activeLine = 10;

    const target = lines[activeLine - 1];
    if (target) {
      target.classList.add('hl');
      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
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
    const is2d = state.params.fn === 'sphere' || state.params.fn === 'rastrigin';

    const popRows = $('rows');
    if (!popRows) return;

    popRows.innerHTML = pop.map(p => {
      const isBest = p.id === best.id;
      const isWorst = p.id === worst.id;
      const isActive = p.id === ev.id;
      const isSel = p.id === state.selected;
      let badge = '';
      if (isBest) badge = '<span style="color:var(--gold); font-weight:700">★ 最佳</span>';
      else if (isWorst) badge = '<span style="color:var(--muted-fg)">▽ 最差</span>';
      else if (isActive) badge = '<span style="color:var(--accent-warm); font-weight:700">▶ 更新中</span>';

      return `<tr class="${isSel ? 'is-selected' : ''}" data-pop-id="${p.id}">
        <td><span class="ind"><i style="background:${plotColor(p.id)}"></i>P${p.id}</span></td>
        <td>${vector(p.x)}</td>
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
    if (popInfo) popInfo.textContent = `族群大小 ${pop.length}　${is2d ? '二維空間' : '一維空間'}`;

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
      const entries = [{ run: state.run, label: '本次執行' }, ...state.savedRuns];
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
    const fnSelect = $('fn');
    if (fnSelect) fnSelect.value = state.params.fn;
    if ($('n')) $('n').value = state.params.n;
    if ($('T')) $('T').value = state.params.T;
    if ($('L')) $('L').value = state.params.L;
    if ($('U')) $('U').value = state.params.U;
    if ($('seed')) $('seed').value = state.params.seed;
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

    const needsRerun = ['fn', 'n', 'T', 'L', 'U', 'seed'].some(k => newParams[k] !== state.params[k]);
    state.params = newParams;

    if (needsRerun) {
      execute();
      toast('已更新參數並重新執行。');
    } else {
      updateAll();
      toast('顯示偏好設定已更新。');
    }
    return true;
  }

  /* ── 初始化事件綁定 ─────────────────────────────────────── */
  function init() {
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
        if (applySettings()) settingsDlg.close();
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
        const is2d = state.params.fn === 'sphere' || state.params.fn === 'rastrigin';
        if (is2d) {
          state.params.fn = state.params.fn === 'rastrigin' ? 'multi' : 'square';
          state.params.L = global.AEO.functions[state.params.fn].L;
          state.params.U = global.AEO.functions[state.params.fn].U;
          execute();
        } else {
          updateAll();
        }
      });
    }

    if (dim2Btn) {
      dim2Btn.addEventListener('click', () => {
        state.currentDim = 2;
        const is2d = state.params.fn === 'sphere' || state.params.fn === 'rastrigin';
        if (!is2d) {
          state.params.fn = state.params.fn === 'multi' ? 'rastrigin' : 'sphere';
          state.params.L = global.AEO.functions[state.params.fn].L;
          state.params.U = global.AEO.functions[state.params.fn].U;
          execute();
        } else {
          updateAll();
        }
      });
    }

    // Lab operations
    const saveRunBtn = $('saveRun');
    if (saveRunBtn) {
      saveRunBtn.addEventListener('click', () => {
        if (!state.run) return;
        const label = `${global.AEO.functions[state.params.fn]?.name || state.params.fn} n=${state.params.n} T=${state.params.T} s=${state.params.seed}`;
        state.savedRuns.push({ run: state.run, label });
        updateLab();
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
    onShow() {
      if (state.run) updateAll();
    }
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
