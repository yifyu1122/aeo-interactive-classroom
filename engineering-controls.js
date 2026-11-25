/* 單元六尺寸探索：與 AEO 引擎分離。SVG 使用正規化顯示比例，不計算應力變形。
 * 參數範圍依論文工程問題附錄；軸承只提供三個可直接辨識的幾何變數。
 */
(function(global){
  'use strict';
  const definitions=[
    [['x₁','斜桿截面積',0.01,1,0.01,0.79],['x₂','直桿截面積',0,1,0.01,0.41]],
    Array.from({length:5},(_,i)=>['x'+(i+1),'第 '+(i+1)+' 段尺寸',0.01,100,0.01,[6,5.3,4.5,3.5,2.2][i]]),
    [['d','線徑',0.05,2,0.001,0.052],['D','平均圈徑',0.25,1.3,0.001,0.36],['N','有效圈數',2,15,0.1,10.9]],
    [['Tₛ','筒壁厚',0,99,0.01,0.84],['Tₕ','封頭厚',0,99,0.01,0.42],['R','內半徑',10,200,1,43],['L','筒段長',10,200,1,160]],
    [['h','焊縫厚',0.1,2,0.01,0.2],['l','焊接長',0.1,10,0.01,3.5],['t','梁高',0.1,10,0.01,9],['b','梁厚',0.1,2,0.01,0.2]],
    [['b','齒寬',2.6,3.6,0.01,3.5],['m','模數',0.7,0.8,0.001,0.7],['z','小齒輪齒數',17,28,1,17],['l₁','第一軸長',7.3,8.3,0.01,7.3],['l₂','第二軸長',7.3,8.3,0.01,7.8],['d₁','第一軸徑',2.9,3.9,0.01,3.3],['d₂','第二軸徑',5,5.5,0.01,5.3]],
    [['Dₘ','節圓直徑',125,150,0.1,130],['Dᵦ','球徑',10.5,31.5,0.1,18],['Z','球數',4,50,1,12]],
    [['rᵢ','內半徑',60,80,1,70],['rₒ','外半徑',90,110,1,100],['t','片厚',1,3,0.5,1.5],['F','壓緊力',600,1000,10,800],['Z','摩擦面數',2,9,1,5]]
  ];
  const saved=definitions.map(ds=>ds.map(d=>d[5]));
  const num=x=>Number(x.toFixed(4)).toString();
  const line=(a,b,c,d,w=3,cls='metal')=>`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke-width="${w}" class="${cls}"/>`;
  const rect=(x,y,w,h,cls='part')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" class="${cls}"/>`;
  const circle=(x,y,r,cls='part')=>`<circle cx="${x}" cy="${y}" r="${r}" class="${cls}"/>`;
  const label=(x,y,t)=>`<text x="${x}" y="${y}" class="model-label">${t}</text>`;
  function geometry(i,v){
    let g='';
    if(i===0){g=line(65,55,355,55,10,'support')+line(75,65,210,225,3+18*Math.sqrt(v[0]),'accent')+line(210,65,210,225,3+18*Math.sqrt(v[1]))+line(345,65,210,225,3+18*Math.sqrt(v[0]),'accent')+label(85,160,'x₁')+label(222,150,'x₂')+label(310,160,'x₁')+line(210,225,210,275,3,'load')+label(225,278,'P ↓');}
    if(i===1){g=rect(35,75,20,170,'support');v.forEach((x,j)=>{let h=12+68*Math.sqrt(x/100);g+=rect(55+j*65,160-h/2,65,h)+label(62+j*65,120,'x'+(j+1));});g+=line(380,165,380,250,3,'load')+label(355,275,'P ↓');}
    if(i===2){let n=Math.round(v[2]),pitch=195/n,r=35+70*(v[1]-.25)/1.05;let path='M210 50';for(let j=0;j<n;j++){let y=50+j*pitch;path+=` C ${210+r} ${y},${210+r} ${y+pitch/2},210 ${y+pitch/2} C ${210-r} ${y+pitch/2},${210-r} ${y+pitch},210 ${y+pitch}`;}g=`<path d="${path}" class="coil" stroke-width="${2+16*(v[0]-.05)/1.95}"/>`+label(25,285,'d='+num(v[0])+'；D='+num(v[1])+'；N='+num(v[2]));}
    if(i===3){let len=70+v[3]*.8,r=30+v[2]*.35,x=210-len/2,y=155;g=`<path d="M${x} ${y-r} C${x-r} ${y-r},${x-r} ${y+r},${x} ${y+r} H${x+len} C${x+len+r} ${y+r},${x+len+r} ${y-r},${x+len} ${y-r} Z" class="part"/>`+line(x,y-r,x+len,y-r,2+v[0]*.2,'accent')+line(x,y-r,x,y+r,2+v[1]*.2,'accent')+line(x,y+r+20,x+len,y+r+20,2,'dimension')+label(190,y+r+45,'L='+num(v[3]))+line(210,y,210,y-r,2,'load')+label(220,y,'R='+num(v[2]))+label(30,35,'Tₛ='+num(v[0])+'；Tₕ='+num(v[1]));}
    if(i===4){let h=15+v[2]*6,l=30+v[1]*18;g=rect(45,65,20,175,'support')+rect(65,155-h/2,300,h)+rect(65,155-h/2-(3+v[0]*8),l,3+v[0]*8,'weld')+rect(365,155-h/2,5+v[3]*13,h)+label(80,75,'焊縫 h、l')+label(180,245,'截面 t、b')+line(380,180,380,260,3,'load')+label(350,285,'P ↓');}
    if(i===5){let r=25+v[2],rr=r*1.45,cx=230,cy=190;g=line(35,85,180+v[3]*4,85,4+v[5]*3)+line(165,cy,325+v[4]*5,cy,4+v[6]*3);const gear=(x,y,r,n)=>{let points=[];for(let k=0;k<n*4;k++){let a=k*Math.PI/(n*2),radius=r+(k%4<2?5:0);points.push(`${x+radius*Math.cos(a)},${y+radius*Math.sin(a)}`);}return `<polygon points="${points.join(' ')}" class="part"/>`+circle(x,y,9,'hole');};g+=gear(150,85,r,v[2])+gear(cx,cy,rr,Math.round(v[2]*1.45))+rect(360,65,8+(v[0]-2.6)*20,70,'friction')+label(265,35,'齒寬 b='+num(v[0]))+label(20,290,'m='+num(v[1])+'；齒距隨模數放大');g=`<g transform="translate(210 160) scale(${v[1]/.75}) translate(-210 -160)">${g}</g>`;}
    if(i===6){let pitch=70+(v[0]-125)*1.4,ball=v[1]*.8;g=circle(210,155,125)+circle(210,155,113,'hole')+`<circle cx="210" cy="155" r="${pitch}" class="pitch"/>`;for(let j=0;j<v[2];j++){let a=j*2*Math.PI/v[2];g+=circle(210+pitch*Math.cos(a),155+pitch*Math.sin(a),ball);}g+=circle(210,155,49)+circle(210,155,39,'hole')+label(65,300,'Dₘ='+num(v[0])+'；Dᵦ='+num(v[1])+'；Z='+v[2]);}
    if(i===7){let n=v[4]+1,spacing=250/Math.max(1,n-1),outer=65+(v[1]-90),inner=20+(v[0]-60),thick=2+v[2]*2;for(let j=0;j<n;j++)g+=`<ellipse cx="${85+j*spacing}" cy="155" rx="${thick+7}" ry="${outer}" class="${j%2?'friction':'part'}"/><ellipse cx="${85+j*spacing}" cy="155" rx="5" ry="${inner}" class="hole"/>`;let len=20+(v[3]-600)*.08;g+=line(65-len,155,65,155,4,'load')+line(355+len,155,355,155,4,'load')+label(30,45,'F='+v[3]+' N；箭線長度表示壓緊力')+label(55,280,'Z='+v[4]+' 個摩擦面；'+n+' 片示意');}
    return `<svg viewBox="0 0 420 320" role="img" aria-label="目前尺寸模型：${definitions[i].map((d,j)=>d[0]+'='+num(v[j])).join('，')}"><title>尺寸探索模型，不按比例，未模擬應力或變形</title>${g}</svg>`;
  }
  function feedback(i,v){
    if(i===0){const [a,b]=v,den=Math.SQRT2*a*a+2*a*b,g=[2*(Math.SQRT2*a+b)/den-2,2*b/den-2,2/(a+Math.SQRT2*b)-2];return `f = (2√2×${num(a)}+${num(b)})×10 = ${num((2*Math.SQRT2*a+b)*10)}；${g.map((x,j)=>'g'+(j+1)+'='+num(x)).join('；')}。${g.every(x=>x<=0)?'✓ 三項應力限制通過':'✕ 有應力限制超標'}`;}
    if(i===1){const f=.0624*v.reduce((a,b)=>a+b,0),g=v.reduce((s,x,j)=>s+[61,37,19,7,1][j]/x**3,0)-1;return `f = 0.0624Σxᵢ = ${num(f)}；g₁ = Σaᵢ/xᵢ³−1 = ${num(g)}。${g<=0?'✓ 撓度限制通過':'✕ 撓度限制超標'}`;}
    if(i===2){const [d,D,N]=v,den=12566*(D*d**3-d**4);if(Math.abs(den)<1e-12)return '無法評估：彈簧限制式分母為零。請調整線徑或圈徑。';const g=[1-N*D**3/(71785*d**4),(4*D**2-d*D)/den+1/(5108*d*d)-1,1-140.45*d/(D*D*N),(d+D)/1.5-1];return `目標 f = ${num((N+2)*D*d*d)}；${g.map((x,j)=>`g${j+1}=${num(x)}`).join('；')}。${g.every(x=>x<=0)?'✓ 四項限制通過':'✕ 至少一項限制未通過'}。圖中圈數四捨五入，計算使用連續 N。`;}
    if(i===3){const [s,h,r,l]=v,vol=Math.PI*r*r*l+4/3*Math.PI*r**3,g=[-s+.0193*r,-h+.00954*r,1296000-vol,l-240];return `成本 f = ${num(.6224*s*r*l+1.7781*h*r*r+3.1661*s*s*l+19.84*s*s*r)}；${g.map((x,j)=>`g${j+1}=${num(x)}`).join('；')}。${g.every(x=>x<=0)?'✓ 四項限制通過':'✕ 至少一項限制未通過'}。`;}
    if(i===4){const [h,l,t,b]=v;return `成本 f = ${num(1.10471*h*h*l+.04811*t*b*(14+l))}。尚未評估應力、撓度與其他限制。`;}
    if(i===5)return '尺寸與齒數改變示意圖。齒形及嚙合為教學近似；尚未計算重量與十一項限制。z 在本尺寸探索器採整數。';
    if(i===6){let overlap=2*v[0]/2*Math.sin(Math.PI/v[2])<v[1];return `${overlap?'✕ 依節圓幾何，鄰球可能重疊。':'✓ 鄰球中心弦距不小於球徑。'}這項幾何檢查不等於完整可行性；其餘七個模型參數、承載力與十項限制尚未計算。`;}
    return `體積指標 V = π(rₒ²−rᵢ²)t(Z+1) = ${num(Math.PI*(v[1]**2-v[0]**2)*v[2]*(v[4]+1))} mm³；質量 f = ρV。未指定密度，不顯示質量；尚未評估煞停時間與其他限制。`;
  }
  function mount(i){
    const model=document.querySelector('.engineering-model');
    const controls=document.createElement('div');controls.className='panel engineering-controls';
    controls.innerHTML=`<div class="panel-head"><h3>調整尺寸</h3><button type="button" class="btn-outlined" id="engineeringReset">還原尺寸</button></div><div class="ctrl-group">${definitions[i].map((d,j)=>`<div class="ctrl"><label for="engineeringParam${j}">${d[0]} · ${d[1]}</label><input type="range" id="engineeringParam${j}" min="${d[2]}" max="${d[3]}" step="${d[4]}" value="${saved[i][j]}"><output for="engineeringParam${j}" id="engineeringValue${j}">${num(saved[i][j])}</output></div>`).join('')}</div><div class="formula-card engineering-result"><h4>目前設計的計算</h4><p id="engineeringFeedback" role="status"></p></div><p class="sub engineering-caveat">模型僅示意尺寸；計算是單組設計評估，不能當作工程安全驗證。</p>`;
    const reference=document.querySelector('.engineering-reference');
    const exhibit=document.querySelector('.engineering-exhibit');
    const referenceDetails=document.createElement('details');referenceDetails.className='engineering-photo-details';referenceDetails.innerHTML='<summary>查看實物參考與圖片授權</summary>';referenceDetails.appendChild(reference);exhibit.after(referenceDetails);
    model.classList.add('panel');model.insertAdjacentHTML('afterbegin','<div class="panel-head"><h3>可操作的尺寸模型</h3></div>');exhibit.appendChild(controls);
    function render(){document.getElementById('engineeringModelDrawing').innerHTML=geometry(i,saved[i]);document.getElementById('engineeringFeedback').textContent=feedback(i,saved[i]);definitions[i].forEach((d,j)=>{document.getElementById('engineeringValue'+j).textContent=num(saved[i][j]);});if(i===0){['trussX1','trussX2'].forEach((id,j)=>{document.getElementById(id).value=saved[i][j];});document.getElementById('trussX1').dispatchEvent(new Event('input'));}}
    definitions[i].forEach((d,j)=>document.getElementById('engineeringParam'+j).addEventListener('input',e=>{saved[i][j]=Number(e.target.value);render();}));
    if(i===0)['trussX1','trussX2'].forEach((id,j)=>document.getElementById(id).addEventListener('change',e=>{const x=Number(e.target.value),d=definitions[i][j];if(e.target.value.trim() && Number.isFinite(x) && x>=d[2] && x<=d[3]){saved[i][j]=x;document.getElementById('engineeringParam'+j).value=x;render();}}));
    document.getElementById('engineeringReset').addEventListener('click',()=>{saved[i]=definitions[i].map(d=>d[5]);definitions[i].forEach((d,j)=>document.getElementById('engineeringParam'+j).value=saved[i][j]);render();});render();
  }
  global.EngineeringControls={mount,geometry,feedback,definitions};
})(window);
