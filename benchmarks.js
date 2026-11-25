/* AEO 論文 §3 Tables 1–4；CEC 組合題公式保留來源限定。 */
(() => {
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
    ['9','多峰','Rastrigin','Σ[xᵢ²−10cos(2πxᵢ)+10]','[-5.12,5.12]','0','規律排列的許多局部谷底'],
    ['10','多峰','Ackley','−20e^(−0.2√(Σxᵢ²/n))−e^(Σcos(2πxᵢ)/n)+20+e','[-32,32]','0','中央谷底與波紋'],
    ['11','多峰','Griewank','1+Σ(xᵢ−100)²/4000−Πcos((xᵢ−100)/√i)','[-600,600]','0','乘積項造成規律局部谷底'],
    ['12','多峰','Penalized 1','π/n{10sin²(πy₁)+Σ(yᵢ−1)²[1+10sin²(πyᵢ₊₁)]+(yₙ−1)²}+Σu(xᵢ;10,100,4)','[-50,50]','0','yᵢ=1+(xᵢ+1)/4；含懲罰項'],
    ['13','多峰','Penalized 2','0.1{sin²(3πx₁)+Σ(xᵢ−1)²[1+sin²(3πxᵢ₊₁)]+(xₙ−1)²[1+sin²(2πxₙ)]}+Σu(xᵢ;5,100,4)','[-50,50]','0','邊界懲罰；原表排版以 PDF 視覺為準'],
    ['14','低維','Shekel’s Foxholes','[1/500+Σⱼ₌₁²Σᵢ₌₁²⁵ 1/(j+aᵢⱼ)⁶]⁻¹','[-65.536,65.536]²','0.998','2 維、多個深淺谷'],
    ['15','低維','Kowalik','Σᵢ₌₁¹¹[aᵢ−x₁(bᵢ²+bᵢx₂)/(bᵢ²+bᵢx₃+x₄)]²','[-5,5]⁴','3.0759×10⁻⁴','4 維；使用固定資料表 aᵢ,bᵢ'],
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
  const source=document.getElementById('unit7');
  const unitNav=document.querySelector('[data-target="unit7"]');
  if(source){
    const unit5=document.getElementById('unit5');
    const details=document.createElement('details');details.className='benchmark-lab';
    details.innerHTML='<summary>31 個基準函數｜公式與搜尋特性</summary><p class="sub">在實驗室操作時查閱函數分類、公式、搜尋範圍與基準最佳值。</p>';
    [...source.querySelectorAll('.benchmark-toolbar,#benchmarkGrid,.benchmark-note')].forEach(node=>details.appendChild(node));
    unit5.appendChild(details);source.remove();unitNav?.remove();
  }
  const group=document.getElementById('benchmarkGroup'),search=document.getElementById('benchmarkSearch'),grid=document.getElementById('benchmarkGrid');
  function render(){const q=search.value.trim().toLowerCase();const rows=entries.filter(x=>(group.value==='all'||({uni:'單峰',multi:'多峰',low:'低維',comp:'複合'}[group.value]===x[1]))&&(!q||x.join(' ').toLowerCase().includes(q)||`f${x[0]}`.includes(q)));grid.innerHTML=rows.map(x=>`<article class="panel benchmark-card"><header><span>f${x[0]}</span><small>${x[1]}</small></header><h3>${x[2]}</h3><code>${x[3]}</code><dl><dt>維度／範圍</dt><dd>${x[1]==='低維'?x[4]:common30.replace('逐維範圍見本列',`範圍 ${x[4]}`)}</dd><dt>已知最佳值</dt><dd>${x[5]}</dd></dl><p>${x[6]}</p>${x[1]==='複合'?'<small>個別分量與矩陣參數由 CEC 2014 資料檔決定；此處列通用組合形式，不偽稱是完整展開式。</small>':''}</article>`).join('')||'<p class="empty-state">沒有符合條件的函數。</p>';}
  group.addEventListener('change',render);search.addEventListener('input',render);render();
})();
