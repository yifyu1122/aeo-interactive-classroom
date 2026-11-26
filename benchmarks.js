/* AEO 論文 §3 Tables 1–4；CEC 組合題公式保留來源限定。 */
(function(global) {
  const common30='30 維；逐維範圍見本列；全域最小值';
  const entries=[
    ['1','單峰','Sphere','Σxᵢ²','[-100,100]','0','利用能力：單一碗狀谷底'],
    ['2','單峰','Schwefel 2.22','Σ|xᵢ| + Π|xᵢ|','[-10,10]','0','利用能力：乘積與絕對值'],
    ['3','單峰','Schwefel 1.2','Σᵢ(Σⱼ₌₁ⁱxⱼ)²','[-100,100]','0','利用能力：累積變數耦合'],
    ['4','單峰','Schwefel 2.21','maxᵢ |xᵢ|','[-100,100]','0','利用能力：最大座標主導'],
    ['5','單峰','Rosenbrock','Σᵢ₌₁ⁿ⁻¹[100(xᵢ₊₁−xᵢ²)²+(xᵢ−1)²]','[-30,30]','0','狹長彎曲谷底'],
    ['6','單峰','Step','Σ(xᵢ+0.5)²','[-100,100]','0','平移平方碗狀函數'],
    ['7','單峰','Quartic','Σᵢ·xᵢ⁴ + U(0,1) 隨機噪聲','[-1.28,1.28]','0','目標值含隨機噪聲'],
    ['8','多峰','Schwefel','−Σ xᵢ sin(√|xᵢ|)','[-500,500]','−12569.5','多個局部谷底；探索能力'],
    ['9','多峰','Rastrigin 平方項','Σᵢ[xᵢ²−10cos(2πxᵢ)+10]²','[-5.12,5.12]','0','依原論文 Table 2，每一維 Rastrigin 項再平方；不是標準未平方版本'],
    ['10','多峰','Ackley','−20e^(−0.2√(Σxᵢ²/n))−e^(Σcos(2πxᵢ)/n)+20+e','[-32,32]','0','中央谷底與波紋'],
    ['11','多峰','Griewank','1+Σ(xᵢ−100)²/4000−Πcos((xᵢ−100)/√i)','[-600,600]','0','乘積項造成規律局部谷底'],
    ['12','多峰','Penalized 1','π/n{10sin²(πy₁)+Σ(yᵢ−1)²[1+10sin²(πyᵢ₊₁)]+(yₙ−1)²}+Σu(xᵢ;10,100,4)','[-50,50]','0','yᵢ=1+(xᵢ+1)/4；含懲罰項'],
    ['13','多峰','Penalized 2','0.1{sin²(3πx₁)+Σ(xᵢ−1)²[1+sin²(3πxᵢ₊₁)]+(xₙ−1)²[1+sin²(2πxₙ)]}+Σu(xᵢ;5,10,4)','[-50,50]','0','懲罰係數依原論文 Table 2 視覺核對為 k=10'],
    ['14','低維','Shekel’s Foxholes','[1/500+Σⱼ₌₁²⁵ 1/(j+Σₖ₌₁²(xₖ−aₖⱼ)⁶)]⁻¹','[-65.536,65.536]²','0.998','2 維、多個深淺谷；係數 aₖⱼ 為 5×5 網格'],
    ['15','低維','Kowalik','Σᵢ₌₁¹¹[aᵢ−x₁(bᵢ²+bᵢx₂)/(bᵢ²+bᵢx₃+x₄)]²','[-5,5]⁴','3.0759×10⁻⁴','4 維；使用文獻固定資料表 aᵢ,bᵢ'],
    ['16','低維','Six-hump Camel','4x₁²−2.1x₁⁴+x₁⁶/3+x₁x₂−4x₂²+4x₂⁴','[-5,5]²','−1.0316','2 維、多個全域谷底'],
    ['17','低維','Branin','(x₂−5.1x₁²/(4π²)+5x₁/π−6)²+10(1−1/(8π))cos(x₁)+10','[-5,10]×[0,15]','0.398','2 維、多個全域谷底'],
    ['18','低維','Goldstein–Price','[1+(x₁+x₂+1)²(19−14x₁+3x₁²−14x₂+6x₁x₂+3x₂²)]·[30+(2x₁−3x₂)²(18−32x₁+12x₁²+48x₂−36x₁x₂+27x₂²)]','[-2,2]²','3','2 維；多項式乘積'],
    ['19','低維','Hartman 3','−Σᵢ₌₁⁴αᵢ exp(−Σⱼ₌₁³ Aᵢⱼ(xⱼ−Pᵢⱼ)²)','[0,1]³','−3.86','係數 A、P、α 依論文表格'],
    ['20','低維','Hartman 6','−Σᵢ₌₁⁴αᵢ exp(−Σⱼ₌₁⁶ Aᵢⱼ(xⱼ−Pᵢⱼ)²)','[0,1]⁶','−3.322','係數 A、P、α 依論文表格'],
    ['21','低維','Shekel 5','−Σᵢ₌₁⁵[||x−aᵢ||²+cᵢ]⁻¹','[0,10]⁴','−10.1532','中心 aᵢ 與常數 cᵢ 依論文表格'],
    ['22','低維','Shekel 7','−Σᵢ₌₁⁷[||x−aᵢ||²+cᵢ]⁻¹','[0,10]⁴','−10.4028','中心 aᵢ 與常數 cᵢ 依論文表格'],
    ['23','低維','Shekel 10','−Σᵢ₌₁¹⁰[||x−aᵢ||²+cᵢ]⁻¹','[0,10]⁴','−10.5364','中心 aᵢ 與常數 cᵢ 依論文表格'],
    ...Array.from({length:8},(_,i)=>[String(i+24),'複合',`Composition function ${i+1}`,'CEC 2014 composition：Σᵢ wᵢ(x)[λᵢgᵢ(Mᵢ(x−oᵢ))+bᵢ]+fᵢ*','[-100,100]',''+(2300+i*100),`30 維；N=${[5,3,3,5,5,5,3,3][i]} 個分量；位移、旋轉與權重依 CEC 定義`])
  ];
  const supported = new Set(Object.keys(global.AEOBenchmarkFunctions.specs).map(String));
  for (const [id, spec] of Object.entries(global.AEOBenchmarkFunctions.specs)) {
    global.AEO.registerFunction(`bench${id}`, {
      name:`f${id} ${spec.name}（${spec.dim} 維）`, dim:spec.dim, L:spec.L, U:spec.U,
      multimodal:!['1','2','3','4','5','6','12','13'].includes(id), knownBest:spec.best
    }, spec.evaluate);
  }
  const group=document.getElementById('benchmarkGroup'),search=document.getElementById('benchmarkSearch'),grid=document.getElementById('benchmarkGrid');
  function render(){const q=search.value.trim().toLowerCase();const rows=entries.filter(x=>(group.value==='all'||({uni:'單峰',multi:'多峰',low:'低維',comp:'複合'}[group.value]===x[1]))&&(!q||x.join(' ').toLowerCase().includes(q)||`f${x[0]}`.includes(q)));grid.innerHTML=rows.map(x=>`<article class="panel benchmark-card"><header><span>f${x[0]}</span><small>${x[1]}</small></header><h3>${x[2]}</h3><code>${x[3]}</code><dl><dt>維度／範圍</dt><dd>${x[1]==='低維'?x[4]:common30.replace('逐維範圍見本列',`範圍 ${x[4]}`)}</dd><dt>已知最佳值</dt><dd>${x[5]}</dd></dl><p>${x[6]}</p><small>${supported.has(x[0])?'已驗證，可載入共用 AEO 實驗。':'尚未驗證或缺少必要資料，僅供公式教學；執行已停用。'}</small>${x[1]==='複合'?'<small>個別分量與矩陣參數依 CEC 2014 定義，未冒充近似函數。</small>':''}<button type="button" class="${supported.has(x[0])?'btn-primary':'btn-outlined'}" data-benchmark-start="${x[0]}" ${supported.has(x[0])?'':'disabled'}>${supported.has(x[0])?'載入共用實驗':'尚未支援執行'}</button></article>`).join('')||'<p class="empty-state">沒有符合條件的函數。</p>';}
  group.addEventListener('change',render);search.addEventListener('input',render);render();
  grid.addEventListener('click',event=>{const button=event.target.closest('[data-benchmark-start]');if(!button||button.disabled)return;const id=button.dataset.benchmarkStart;source.value='paper';source.dispatchEvent(new Event('change',{bubbles:true}));query.value=`f${id}`;query.dispatchEvent(new Event('input',{bubbles:true}));picker.value=`bench${id}`;picker.dispatchEvent(new Event('change',{bubbles:true}));start.click();global.AEOApp?.showLabTab('basic');});
  const source=document.getElementById('functionSource'), picker=document.getElementById('functionSelect'), query=document.getElementById('functionSearch'), info=document.getElementById('functionInfo'), start=document.getElementById('startExperiment');
  function fillPicker(){const paper=source.value==='paper',q=query.value.trim().toLowerCase();const options=paper?entries.filter(x=>x.join(' ').toLowerCase().includes(q)||`f${x[0]}`.includes(q)).map(x=>({id:`bench${x[0]}`,name:`f${x[0]} · ${x[2]} · ${x[1]}`,row:x,supported:supported.has(x[0])})):Object.entries(global.AEO.functions).filter(([id])=>!id.startsWith('bench')).map(([id,m])=>({id,name:m.name,supported:true}));picker.innerHTML=options.map(o=>`<option value="${o.id}" ${o.supported?'':'disabled'}>${o.name}${o.supported?'':'（尚未支援）'}</option>`).join('');showInfo();if(picker.value&&global.AEOApp)global.AEOApp.setPendingFunction(picker.value);}
  function showInfo(){const id=picker.value,entry=entries.find(x=>`bench${x[0]}`===id);if(entry){const ok=supported.has(entry[0]);info.innerHTML=`<b>f${entry[0]} ${entry[2]}</b> · ${entry[1]}<p><code>${entry[3]}</code></p><p>搜尋範圍：${entry[4]}；論文維度：${entry[1]==='低維'?'依該函數指定':'30'}；已知最佳值：${entry[5]}</p><p>${entry[6]}</p><p>${ok?'已驗證，可執行':'尚未驗證／缺少必要資料；目前僅供公式教學，不能執行。'}</p>`;start.disabled=!ok;}else{const m=global.AEO.functions[id];info.innerHTML=`<b>${m?.name||'函數'}</b><p>搜尋範圍：[${m?.L}, ${m?.U}]；維度：${m?.dim}；已知最佳值：0。</p><p>教學函數用來理解 AEO 的搜尋更新，不代表論文 Benchmark 的完整測試設定。</p>`;start.disabled=false;}}
  source.addEventListener('change',fillPicker);query.addEventListener('input',fillPicker);picker.addEventListener('change',()=>{showInfo();global.AEOApp.setPendingFunction(picker.value);});start.addEventListener('click',()=>global.AEOApp.startPending());fillPicker();
})(typeof globalThis !== 'undefined' ? globalThis : window);
