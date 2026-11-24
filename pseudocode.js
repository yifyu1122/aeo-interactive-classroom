/* 教學虛擬碼與引擎事件的逐行對照。所有數值直接取自 engine.js 的事件紀錄。 */
(function (global) {
  'use strict';

  const lines = [
    {id:1, code:'def AEO(目標函數 f, 族群大小 n, 最大迭代 T, 搜尋範圍 [L, U]):', phase:'setup', match:'init', explain:'建立一次 AEO 最佳化工作。f(x) 越小越好；x 可以是一維或多維向量。'},
    {id:2, code:'    P = 在 [L, U] 內隨機產生 n 個位置；計算每個 f(x)', phase:'init', match:'init', explain:'每個隨機位置都是一個候選解。引擎使用固定 Seed 的亂數產生器，所以相同設定會得到相同族群。'},
    {id:3, code:'    歷史最佳解 = P 中 f(x) 最小的個體', phase:'init', match:'init', explain:'記下目前找到的最好位置與目標值；之後每一代都更新這份歷史紀錄。'},
    {id:4, code:'    for t in range(1, T + 1):  # 逐代改善候選解', phase:'loop', match:'sort', explain:'每次迭代 t 都依序執行排序、生產、消費、分解，直到到達 T。'},
    {id:5, code:'        P.sort(key=f, reverse=True)  # x₁ 最差，xₙ 最佳', phase:'sort', match:'sort', explain:'由目標值大到小排序。最差個體 x₁ 擔任生產者；排序結果也決定肉食者可參考的索引範圍。'},
    {id:6, code:'        x_rand = L + r · (U - L)  # 每一維各抽 r ∈ [0, 1]（式 3）', phase:'production', match:'production', explain:'在搜尋範圍內抽出隨機位置，作為生產者的探索來源。'},
    {id:7, code:'        a = (1 - t / T) · r₁  # r₁ ∈ [0, 1]（式 2）', phase:'production', match:'production', explain:'a 的上限會隨迭代進度縮小；早期較可能大量探索，後期生產更新的隨機權重較小。'},
    {id:8, code:'        x₁_candidate = a · x_rand + (1 - a) · xₙ  # 生產（式 1）', phase:'production', match:'production', explain:'把最差個體更新為最佳個體與隨機位置的加權組合，形成生產者候選位置。'},
    {id:9, code:'        x₁_candidate = 邊界修復(x₁_candidate); 評估並依 f(new) < f(old) 決定接受', phase:'production', match:'production-eval', explain:'若候選位置超出 [L, U]，引擎會重新抽取整個位置向量；只在新目標值嚴格較小時接受。'},
    {id:10, code:'        for i in range(2, n + 1):  # 依排序輪流更新消費者', phase:'consume', match:'consumer', explain:'每個排序位置 i=2 到 n 依序更新一次。參考同伴座標固定為本輪排序時的結果；生產者則使用本輪已接受的位置。'},
    {id:11, code:'            策略 = 隨機選擇(草食、肉食、雜食)  # 依原論文規則', phase:'consume', match:'consumer', explain:'消費策略由引擎依原論文設定抽選。最前面的排序個體沒有合法同伴索引時，引擎以草食策略處理；不會為了動畫補造策略。'},
    {id:12, code:'            C = 0.5 · v₁ / |v₂|；v₁、v₂ ~ N(0, 1)  # 消費係數（式 4–5）', phase:'consume', match:'consumer', explain:'C 可正可負，因此位置差可能被加上或反向加上；不能一概說成「朝參考點移動」。'},
    {id:13, code:'            if 策略 == "草食":', phase:'herb', match:'herb', explain:'草食者只參考本輪生產者的位置。'},
    {id:14, code:'                x_candidate = xᵢ + C · (xᵢ - x₁)  # 草食更新（式 6）', phase:'herb', match:'herb', explain:'先算草食者與生產者的位置差，再乘 C 加回草食者目前位置。'},
    {id:15, code:'            elif 策略 == "肉食":', phase:'carn', match:'carn', explain:'肉食者只參考一位排序上較差、但不是生產者的消費者。'},
    {id:16, code:'                j = 2 + floor(r · (i - 2))  # 隨機取 j ∈ {2, …, i-1}', phase:'carn', match:'carn', explain:'索引 j 依本次亂數與 i 決定，必定滿足 2 ≤ j < i；不會任意挑選參考對象。'},
    {id:17, code:'                x_candidate = xᵢ + C · (xᵢ - xⱼ)  # 肉食更新（式 7）', phase:'carn', match:'carn', explain:'肉食者使用自己與索引 j 個體的位置差更新。依原文公式標籤，肉食為式 (7)。'},
    {id:18, code:'            else:  # 雜食：同時參考生產者與一位合法同伴', phase:'omni', match:'omni', explain:'雜食者先使用與生產者的差，再使用與合法同伴的差。這裡混合的是兩個位置差，不是兩個參考位置。'},
    {id:19, code:'                Δ₁ = xᵢ - x₁；Δ₂ = xᵢ - xⱼ；Δ = r₂·Δ₁ + (1-r₂)·Δ₂', phase:'omni', match:'omni', explain:'以 r₂ 對兩個位置差做加權組合；r₂ 越大，第一個差的權重越高。'},
    {id:20, code:'                x_candidate = xᵢ + C · Δ  # 雜食更新（式 8）', phase:'omni', match:'omni', explain:'將加權後的位置差乘上 C，再加回雜食者目前位置。依原文公式標籤，雜食為式 (8)。'},
    {id:21, code:'            x_candidate = 邊界修復(x_candidate); 評估並依 f(new) < f(old) 決定接受', phase:'consume', match:'consumer-eval', explain:'消費更新後檢查搜尋邊界，評估目標函數；新解較好才取代舊解。'},
    {id:22, code:'        x_best = 本輪消費後的最佳個體；for i in range(1, n + 1):', phase:'decomposition', match:'decomposition', explain:'消費階段結束後，固定當下最佳位置，再讓全族群各執行一次分解候選更新。'},
    {id:23, code:'            u ~ N(0, 1)；D = 3 · u  # 分解係數（式 9）', phase:'decomposition', match:'decomposition', explain:'u 是標準常態亂數，D 可正可負，決定分解擾動的方向與大小。'},
    {id:24, code:'            e = r₃ · k - 1；h = 2 · r₃ - 1；k ∈ {1, 2}  #（式 10–11）', phase:'decomposition', match:'decomposition', explain:'r₃ 決定權重；k 由 1 或 2 擇一。e、h 再與最佳位置、目前個體位置共同形成擾動。'},
    {id:25, code:'            x_candidate = x_best + D · (e·x_best - h·xᵢ)  # 分解（式 12）', phase:'decomposition', match:'decomposition', explain:'以本輪最佳位置為基準，加上由 D、e、h 與目前位置共同構成的擾動。候選點不保證較好。'},
    {id:26, code:'            x_candidate = 邊界修復(x_candidate); 評估並依 f(new) < f(old) 決定接受', phase:'decomposition', match:'decomposition-eval', explain:'越界時重新抽取整個位置向量；分解候選仍須通過同一個嚴格改善條件才接受。'},
    {id:27, code:'        更新歷史最佳解 = min(歷史最佳解, 本代族群最佳解)', phase:'record', match:'finish', explain:'將本代最好結果與過去最佳紀錄比較，確保歷史最佳目標值不會變差。'},
    {id:28, code:'    return 歷史最佳解  # 到達 T 後停止', phase:'finish', match:'finish', explain:'完成 T 代後回傳搜尋過程中記錄到的最佳解。啟發式搜尋不保證一定找到全域最佳解。'}
  ];

  const fmt = x => {
    if (!Number.isFinite(x)) return '—';
    if (x !== 0 && (Math.abs(x) < 0.001 || Math.abs(x) >= 100000)) return x.toExponential(3);
    return Number(x.toPrecision(5)).toString();
  };
  const vec = x => Array.isArray(x) ? `[${x.map(fmt).join(', ')}]` : '—';
  const refsText = e => (e.refs || []).map(r => {
    const role = {best:'目前最佳解',random:'隨機位置',producer:'本輪生產者',peer:'排序同伴'}[r.role] || r.role;
    return `${role}${r.id ? `（個體 ${r.id}${r.rank ? `，排序第 ${r.rank}` : ''}）` : ''}: ${vec(r.x)}`;
  });
  const lineById = id => lines.find(line => line.id === Number(id));

  function eventLine(e) {
    if (!e) return null;
    if (e.kind === 'init') return 2;
    if (e.kind === 'sort') return 5;
    if (e.kind === 'finish') return 28;
    if (e.stage === 'production') return e.kind === 'evaluate' ? 9 : 8;
    if (e.stage === 'herb') return e.kind === 'evaluate' ? 21 : 14;
    if (e.stage === 'carn') return e.kind === 'evaluate' ? 21 : 17;
    if (e.stage === 'omni') return e.kind === 'evaluate' ? 21 : ([18,19,20][Math.max(1, Math.min(3, e.part || 1)) - 1]);
    if (e.stage === 'decomposition') return e.kind === 'evaluate' ? 26 : 25;
    return 1;
  }

  function matches(line, e) {
    if (!line || !e) return false;
    const isProposal = e.kind === 'proposal';
    const isEvaluation = e.kind === 'evaluate';
    if (line.match === 'init') return e.kind === 'init';
    if (line.match === 'sort') return e.kind === 'sort';
    if (line.match === 'finish') return e.kind === 'finish';
    if (line.match === 'production') return e.stage === 'production' && isProposal;
    if (line.match === 'production-eval') return e.stage === 'production' && isEvaluation;
    if (line.match === 'consumer') return ['herb','carn','omni'].includes(e.stage) && isProposal;
    if (line.match === 'consumer-eval') return ['herb','carn','omni'].includes(e.stage) && isEvaluation;
    if (['herb','carn'].includes(line.match)) return e.stage === line.match && isProposal;
    if (line.match === 'omni') return e.stage === 'omni' && isProposal && e.part === ({18:1,19:2,20:3}[line.id] || 1);
    if (line.match === 'decomposition') return e.stage === 'decomposition' && isProposal;
    if (line.match === 'decomposition-eval') return e.stage === 'decomposition' && isEvaluation;
    return false;
  }

  function findEventIndex(run, lineId, cursor = 0) {
    const line = lineById(lineId);
    if (!run || !line) return -1;
    let best = -1, distance = Infinity;
    run.events.forEach((e, i) => {
      if (!matches(line, e)) return;
      const d = Math.abs(i - cursor);
      if (d < distance) { best = i; distance = d; }
    });
    return best;
  }

  function details(e, lineId, config = {}, run = null) {
    const line = lineById(lineId || eventLine(e));
    if (!line) return null;
    if (e?.kind === 'init') {
      const sample = e.samples?.[0];
      const initialBest = run?.history?.find(h => h.t === 0);
      const randoms = (e.samples || []).slice(0, 4).map((p,i) => `個體 ${i+1} 的 r=${vec(p.r)}`);
      if (e.samples?.length > 4) randoms.push(`另有 ${e.samples.length-4} 個初始位置`);
      const isHistory = line.id === 3;
      return {line, explain:line.explain, equation:isHistory?'初始最佳 = arg minₓ f(x)':'x = L + r·(U-L)', variables:'n：族群大小；L、U：座標下界與上界；r：固定 Seed 產生的均勻亂數。', randoms,
        refs:[], calculation:isHistory&&initialBest?`初始最佳個體 ${initialBest.id}；位置 ${vec(initialBest.x)}；f(x) = ${fmt(initialBest.best)}`:
          sample?`x₁ = ${fmt(config.L)} + ${vec(sample.r)}×(${fmt(config.U)}-${fmt(config.L)}) = ${vec(sample.x)}${e.samples.length>1?'；其餘個體依相同規則抽樣':''}`:'初始候選位置由事件紀錄中的樣本計算。',
        outcome:'初始候選解全部加入族群，尚未進行新舊解接受判斷。'};
    }
    if (e?.kind === 'sort') return {line, explain:line.explain, equation:'依 f(x) 由大到小排序；最小 f(x) 的個體排在最後。',
      variables:'x₁：目標值最差；xₙ：目前排序最佳；i、j：排序位置索引。', randoms:[], refs:[],
      calculation:`本輪排序個體 ID：${(e.order || []).join(' → ')}\nx₁ = 個體 ${e.order?.[0] ?? '—'}；xₙ = 個體 ${e.order?.at(-1) ?? '—'}`,
      outcome:'排序決定生產者與消費者索引；不改變個體位置。'};
    if (e?.kind === 'finish') {
      const best = run?.history?.at(-1);
      return {line, explain:line.explain, equation:'回傳歷史最佳解 = arg min 已評估候選解 f(x)', variables:'T：迭代上限；f(x)：目標函數；fe：累計函數評估次數。', randoms:[], refs:[],
        calculation:best?`完成第 ${e.t} 代；最佳位置 ${vec(best.x)}；最佳 f(x) = ${fmt(best.best)}；評估次數 ${e.fe}`:'執行已結束。',
        outcome:'演算法停止；回傳歷史最佳紀錄。'};
    }
    if (!e || !['proposal','evaluate'].includes(e.kind) || !e.stage || !e.old) {
      return {line, explain:line.explain, equation:'此行是流程控制步驟，沒有獨立的位置更新公式。', variables:'參數與座標定義可在上方設定；本行不會額外抽取亂數。', randoms:[], refs:[], calculation:'請播放到對應事件，查看這次 Seed 實際產生的數值。', outcome:'尚無位置更新事件。'};
    }
    const randoms = Object.entries(e.random || {}).filter(([,v]) => v !== null && v !== undefined)
      .map(([k,v]) => `${k} = ${Array.isArray(v) ? vec(v) : (typeof v === 'number' ? fmt(v) : String(v))}`);
    if (e.repairR?.length) randoms.push(`邊界重抽亂數 = ${vec(e.repairR)}`);
    const refs = refsText(e);
    const x = vec(e.old), cand = vec(e.raw), next = vec(e.next);
    let equation = '—', variables = '—', calculation = '—';
    const r = e.random || {};
    if (e.stage === 'production') {
      const best = e.refs.find(v => v.role === 'best')?.x;
      const sample = e.refs.find(v => v.role === 'random')?.x;
      equation = '式 (1)–(3)：a=(1-t/T)r₁；x_rand=L+r(U-L)；x₁′=a·x_rand+(1-a)·xₙ';
      variables = 't：目前代數；T：最大代數；r₁、r：均勻亂數；a：生產權重；xₙ：排序最佳位置。';
      calculation = `a = (1 - ${e.t}/${config.T ?? 'T'}) × ${fmt(r.r1)} = ${fmt(r.a)}\nx_rand = ${vec(sample)}；xₙ = ${vec(best)}\nx₁′ = ${fmt(r.a)} × ${vec(sample)} + (1 - ${fmt(r.a)}) × ${vec(best)} = ${cand}`;
    } else if (['herb','carn','omni'].includes(e.stage)) {
      equation = e.stage === 'herb' ? '式 (4)–(6)：C=0.5v₁/|v₂|；xᵢ′=xᵢ+C(xᵢ-x₁)' :
        e.stage === 'carn' ? '式 (4)–(5)、(7)：C=0.5v₁/|v₂|；j∈{2,…,i-1}；xᵢ′=xᵢ+C(xᵢ-xⱼ)' :
          '式 (4)–(5)、(8)：Δ=r₂(xᵢ-x₁)+(1-r₂)(xᵢ-xⱼ)；xᵢ′=xᵢ+CΔ';
      variables = 'xᵢ：目前個體位置；x₁：本輪生產者；xⱼ：依排序索引選出的同伴；C：有正負號的消費係數；r₂：雜食差向量權重。';
      const ds = e.stage === 'herb' ? `Δ₁ = ${vec(e.delta1)}` : e.stage === 'carn' ? `Δ₂ = ${vec(e.delta2)}` : `Δ₁ = ${vec(e.delta1)}\nΔ₂ = ${vec(e.delta2)}\nΔ = ${fmt(r.r2)}×Δ₁ + (1-${fmt(r.r2)})×Δ₂ = ${vec(e.deltaMix)}`;
      const peer = e.refs.find(v => v.role === 'peer');
      const refName = e.stage === 'herb' ? '生產者 x₁' : `同伴 xⱼ（j=${peer?.rank ?? '—'}）`;
      const delta = e.stage === 'herb' ? e.delta1 : e.stage === 'carn' ? e.delta2 : e.deltaMix;
      calculation = `xᵢ = ${x}；參考 ${refName}\n${ds}\nC = 0.5×${fmt(r.v1)}/|${fmt(r.v2)}| = ${fmt(r.C)}\nxᵢ′ = ${x} + (${fmt(r.C)})×${vec(delta)} = ${cand}`;
      if (e.stage === 'carn' || e.stage === 'omni') calculation = `j = 2 + floor(${fmt(r.peerDraw)}×(${e.rank}-2)) = ${peer?.rank ?? '—'}\n` + calculation;
    } else {
      const best = e.refs.find(v => v.role === 'best')?.x;
      equation = '式 (9)–(12)：D=3u；e=r₃k-1；h=2r₃-1；xᵢ′=x_best+D(e·x_best-h·xᵢ)';
      variables = 'u：標準常態亂數；D：分解步幅；r₃：均勻亂數；k：1 或 2；e、h：分解權重；x_best：本輪消費後最佳位置。';
      calculation = `D = 3×${fmt(r.u)} = ${fmt(r.D)}；e = ${fmt(r.r3)}×${r.k} - 1 = ${fmt(r.e)}；h = 2×${fmt(r.r3)} - 1 = ${fmt(r.h)}\nx_best = ${vec(best)}；xᵢ = ${x}\nxᵢ′ = ${vec(best)} + ${fmt(r.D)}×(${fmt(r.e)}×${vec(best)} - ${fmt(r.h)}×${x}) = ${cand}`;
    }
    const repaired = e.repair ? `超出邊界，重抽整個向量 → 採用 ${next}` : `邊界檢查通過 → ${next}`;
    const outcome = e.kind === 'evaluate'
      ? `舊位置 ${x}，舊 f=${fmt(e.oldF)}；候選位置 ${next}，新 f=${fmt(e.newF)}。${repaired}。${e.accepted ? '接受新解。' : '拒絕新解，保留舊解。'}`
      : `已算出候選解與目標值 f=${fmt(e.newF)}；${repaired}。接下來依 f(new) < f(old) 判斷${e.accepted ? '，本次將接受。' : '，本次將拒絕。'}`;
    return {line, explain:line.explain, equation, variables, randoms, refs, calculation, outcome,
      old:x, raw:e.raw, candidate:e.next, oldF:fmt(e.oldF), newF:fmt(e.newF), oldFValue:e.oldF, newFValue:e.newF, accepted:e.kind === 'evaluate' ? e.accepted : null,
      stage:e.stage, strategy:{herb:'草食',carn:'肉食',omni:'雜食'}[e.stage] || '—', eventIndex:e.index};
  }

  global.AEOPseudocode = {lines, eventLine, matches, findEventIndex, details};
  if (typeof module === 'object' && module.exports) module.exports = global.AEOPseudocode;
})(typeof globalThis !== 'undefined' ? globalThis : this);
