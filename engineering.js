/* 論文 §4 的工程案例閱讀器。案例資料不加入原 AEO 搜尋引擎。
 * 來源：Zhao et al. (2020), §4.1–4.8 及工程問題附錄。
 * 三桿桁架計算器只評估指定設計，不是完整最佳化實驗。
 */
(function () {
  'use strict';
  const cases = [
    ['三桿桁架', '4.1', '兩側斜桿與中間直桿共同承受載重。少用材料，也要撐得住。',
      'x₁：兩側斜桿截面積；x₂：中間桿截面積。兩者範圍皆為 [0,1]。',
      'min f(x) = (2√2 x₁ + x₂)l', '三條桿件應力限制；l=10 cm、P=2 kN/cm²、σ=2 kN/cm²。',
      '一個候選解就是 [x₁,x₂]。AEO 提出新的兩個截面積，再計算重量及三條應力限制。',
      '圖 13–14；表 16–17。不同方法比較時，須對齊函數評估次數。', 'truss'],
    ['懸臂梁', '4.2', '把五段中空方形梁接成一支懸臂。末端受力時，梁不能彎得太多。',
      'x₁…x₅：五段梁的尺寸參數；各為 [0.01,100]。',
      'min f(x) = 0.0624(x₁+x₂+x₃+x₄+x₅)',
      '61/x₁³ + 37/x₂³ + 19/x₃³ + 7/x₄³ + 1/x₅³ − 1 ≤ 0。',
      '候選解有五維。靠近固定端的段落負擔較大，五個尺寸不必相同。',
      '圖 15–16；表 18–19。附錄的變數列只印兩個符號，但目標、限制及範圍實際使用五維。', 'beam'],
    ['拉伸／壓縮彈簧', '4.3', '彈簧要輕，也必須承受剪應力並符合變形與振動要求。',
      '[d,D,N]：線徑、平均圈徑、有效圈數；範圍依序 [0.05,2]、[0.25,1.3]、[2,15]。',
      'min f(x) = (N+2)D d²', '四項限制涵蓋剪應力、變形、振動及外形。完整係數見附錄。',
      '把三個尺寸當作同一向量更新。目標值較小但違反限制，仍不是可用設計。',
      '圖 17–18；表 20–21。圈數在此基準以連續變數處理，不能自行改成整數後宣稱重現原結果。', 'spring'],
    ['壓力容器', '4.4', '設計儲存流體的圓柱容器。材料與製造成本要低，容量與厚度也要合格。',
      '[Tₛ,Tₕ,R,L]：筒壁厚、封頭厚、內半徑、筒段長度。',
      'min f = 0.6224TₛRL + 1.7781TₕR² + 3.1661Tₛ²L + 19.84Tₛ²R',
      'Tₛ≥0.0193R；Tₕ≥0.00954R；πR²L+(4/3)πR³≥1296000；L≤240。',
      '每次同時提出四個尺寸，再檢查容量和厚度；不要只比較成本。',
      '圖 19–20；表 22–23。附錄範圍為厚度 [0,99]、R與L [10,200]；離散厚度規則須另外核對，不從其他版本直接套入。', 'vessel'],
    ['焊接梁', '4.5', '用焊縫固定一根承載梁。焊得少會便宜，但不能剪斷、彎壞或挫屈。',
      '[h,l,t,b]：焊縫厚、焊接長度、梁高、梁厚；範圍 [0.1,2]、[0.1,10]、[0.1,10]、[0.1,2]。',
      'min f = 1.10471h²l + 0.04811tb(14+l)',
      '剪應力、彎曲應力、末端撓度、挫屈載重、尺寸及成本等七項限制。',
      '四維向量產生新設計。應力、撓度與挫屈公式依附錄計算，再做可行性判斷。',
      '圖 21–22；表 24–25。附錄應力限制的符號需謹慎核讀；此閱讀器不據其文字擷取結果實作求解器。', 'beam'],
    ['減速齒輪', '4.6', '齒輪和兩根軸要輕，同時必須承受傳動的應力與變形。',
      '[b,m,z,l₁,l₂,d₁,d₂]：齒寬、模數、齒數、兩軸長及兩軸徑，共七維。',
      'min f(x)：減速器重量（完整多項式見附錄 Speed reducer design）。',
      '十一項限制，包括齒根彎曲、接觸應力、軸撓度、軸應力與幾何比例。',
      '七維更新仍使用相同 AEO 三階段；工程模型負責將尺寸轉成重量與限制值。',
      '圖 23–24；表 26–27。齒數的離散處理需明確規定；此頁不宣稱已重現論文求解。', 'gear'],
    ['滾動軸承', '4.7', '把鋼球放在內外環之間，希望軸承能承受更大的動態負載。',
      '[Dₘ,Dᵦ,Z,fᵢ,fₒ,K_Dmin,K_Dmax,ε,e,ζ]：節圓直徑、球徑、球數、曲率及內部幾何參數，共十維。',
      'max C = f_c Z^(2/3)Dᵦ^1.8（Dᵦ≤25.4）；否則 C = 3.647f_c Z^(2/3)Dᵦ^1.4',
      '十項幾何與運動學限制；球數 Z 為離散變數，其餘為連續變數。f_c 依曲率等參數計算，非固定常數。',
      '若接入最小化引擎，需用 −C 作為目標，再處理限制與離散球數。',
      '圖 25–26；表 28–29。§4.7 正文寫 minimized，附錄明列 Maximize；本頁依附錄最大化承載力解釋並保留差異。', 'bearing'],
    ['多片離合器煞車', '4.8', '多片摩擦片共同煞車。希望質量小，也要在規定時間內停下來。',
      '[rᵢ,rₒ,t,F,Z]：內半徑、外半徑、片厚、操作力、摩擦面數。五個都是離散變數。',
      'min f = π(rₒ²−rᵢ²)t(Z+1)ρ',
      '八項限制涵蓋徑向間隙、總長、接觸壓力、滑動速度、煞停時間與扭矩。',
      '更新後須映射到合法離散集合，再評估限制；映射規則會影響結果，不能隱藏。',
      '圖 27–28；表 30–31。rᵢ=60…80、rₒ=90…110（步長1）；t=1…3（步長0.5）；F=600…1000（步長10）；Z=2…9。', 'clutch']
  ];
  const host = document.getElementById('engineeringCases');
  if (!host) return;
  host.innerHTML = `<h2>八種工程設計，從實物看懂最佳化</h2><p class="engineering-intro">先認出零件，再找尺寸，最後看 AEO 如何比較設計。每一題都從論文 §4 的工程模型出發。</p><p class="engineering-note">這是案例教學閱讀器。下方桁架計算器評估指定設計；現有播放引擎仍使用原本的教學函數。未在此重跑八項論文實驗。</p><nav class="engineering-case-nav" aria-label="八種工程案例">${cases.map((c,i)=>`<button type="button" data-case="${i}" aria-pressed="${i===0}">${c[0]}</button>`).join('')}</nav><label class="field engineering-select">選擇工程案例<select id="engineeringSelect">${cases.map((c,i)=>`<option value="${i}">§${c[1]} ${c[0]}</option>`).join('')}</select></label><article id="engineeringDetail" aria-live="polite"></article><details><summary>如何把工程模型接上 AEO？</summary><ol><li>把尺寸組成候選向量，指定各維範圍與離散集合。</li><li>生產、消費、分解提出新向量；處理越界與離散變數。</li><li>計算原始目標與所有限制，分別記錄是否可行。</li><li>依明確的限制處理規則計算 fitness，再比較新舊解。</li></ol><p>論文 §4 使用大懲罰值處理違規設計。教學上可寫 F=f+λΣmax(0,gⱼ)²（gⱼ≤0），但這只是示意，不能當作作者指定的唯一懲罰式。比較時須說明 λ、單位尺度、容差及函數評估預算。</p></details><p class="sub">來源：W. Zhao, L. Wang, and Z. Zhang (2020), §4.1–4.8、工程問題附錄，<a href="https://doi.org/10.1007/s00521-019-04452-x" target="_blank" rel="noopener">Neural Computing and Applications, 32(13), 9383–9425</a>。</p>`;
  function draw() {
    document.querySelectorAll('[data-case]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.case===document.getElementById('engineeringSelect').value)));
    const c = cases[Number(document.getElementById('engineeringSelect').value)];
    document.getElementById('engineeringDetail').innerHTML = `<h3>${c[0]}</h3><p class="engineering-case-lead">${c[2]}</p>${globalThis.EngineeringVisuals.html(Number(document.getElementById('engineeringSelect').value))}<div class="engineering-flow" aria-label="工程設計流程"><span>尺寸向量</span><span>AEO 提出新設計</span><span>目標與限制評估</span><span>比較與保留</span></div><dl><dt>候選解與變數</dt><dd>${c[3]}</dd><dt>目標</dt><dd class="engineering-formula">${c[4]}</dd><dt>必須遵守的限制</dt><dd>${c[5]}</dd><dt>AEO 怎麼用？</dt><dd>${c[6]}</dd><dt>閱讀論文時注意</dt><dd>${c[7]}</dd></dl>${c[8]==='truss'?'<fieldset><legend>指定一組截面積，實際算一次</legend><label class="field">x₁<input id="trussX1" type="number" min="0" max="1" step="0.01" value="0.79"></label><label class="field">x₂<input id="trussX2" type="number" min="0" max="1" step="0.01" value="0.41"></label><p id="trussResult" role="status"></p><p class="sub">g₁=P(√2x₁+x₂)/(√2x₁²+2x₁x₂)−σ；g₂=Px₂/(√2x₁²+2x₁x₂)−σ；g₃=P/(x₁+√2x₂)−σ。可行要求全部 ≤0。</p></fieldset>':''}`;
    if(c[8]==='truss') {
      ['trussX1','trussX2'].forEach(id=>document.getElementById(id).addEventListener('input',evaluate)); evaluate();
    }
  }
  function evaluate() {
    const a=Number(document.getElementById('trussX1').value), b=Number(document.getElementById('trussX2').value);
    const output=document.getElementById('trussResult');
    if(['trussX1','trussX2'].some(id=>!document.getElementById(id).value.trim()) || !Number.isFinite(a+b) || a<=0 || a>1 || b<0 || b>1) {output.textContent='請輸入 0<x₁≤1、0≤x₂≤1。x₁=0 時應力公式分母為零，此計算器不評估退化結構。';return;}
    const denominator=Math.SQRT2*a*a+2*a*b;
    const g=[2*(Math.SQRT2*a+b)/denominator-2,2*b/denominator-2,2/(a+Math.SQRT2*b)-2];
    output.textContent=`目標值 ${(10*(2*Math.SQRT2*a+b)).toFixed(6)}；${g.map((x,i)=>`g${i+1}=${x.toFixed(6)}`).join('；')}。${g.every(x=>x<=0)?'✓ 所有應力限制皆通過':'✕ 至少一項應力超標，設計不可行'}。這是單點評估，不是 AEO 最佳解。`;
  }
  document.getElementById('engineeringSelect').addEventListener('change',draw);
  document.querySelectorAll('[data-case]').forEach(button=>button.addEventListener('click',()=>{document.getElementById('engineeringSelect').value=button.dataset.case;draw();}));
  draw();
})();
