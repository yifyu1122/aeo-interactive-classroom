/* 原創 SVG 教學模型；照片及外部結構圖的個別授權見 assets/engineering/credits.json。
 * 圖形依論文 Figures 13,15,17,19,21,23,25,27 示意，不作施工圖或應力模擬。
 */
(function(global){
  'use strict';
  const keys=['truss','cantilever','spring','vessel','weld','gear','bearing','clutch'];
  const captions=[
    '桁架橋的實物照片。橋上有許多桿件；右圖才是論文的三桿理想模型。',
    '懸臂結構的教學透視圖。論文進一步簡化成固定一端、末端受力的五段梁。',
    '壓縮彈簧實物。右圖標出線徑、圈徑及圈數，對照論文三個變數。',
    '氫氣壓力瓶實物。材質與用途不同於論文基準；共同外形是筒身與封頭。',
    '焊接作業實物照片。論文研究焊縫固定承載梁的尺寸，不模擬焊接火花或製程。',
    '微波爐轉盤的減速齒輪組實物。論文使用七變數齒輪與軸的理想模型。',
    '滾珠軸承實物。可辨識內環、外環及兩環之間的鋼球。',
    '多片離合器的組裝與爆炸示意圖，可看到交錯排列的摩擦片；不是實物攝影。'
  ];
  const observations=[
    '看桿件怎麼把載重傳到支承。三桿模型中，x₁控制兩根斜桿的截面積，x₂控制中間直桿。',
    '找固定端與自由端。靠近固定端通常承受較大的彎矩；本圖把五段尺寸分別標出。',
    '分清楚線材本身的粗細 d，和整個線圈的平均直徑 D。N 是有效圈數。',
    'R 是內半徑，L 只量中間筒段。Tₛ與Tₕ分別量筒壁和封頭厚度。',
    'l 是焊接長度；h 是焊縫厚。t、b 描述梁截面，不能把四者混成同一種厚度。',
    '小齒輪與大齒輪互相嚙合。齒數和模數決定齒輪幾何；兩根軸各有長度與直徑。',
    'Dₘ 是球心所在圓的直徑，Dᵦ是單顆球的直徑。Z 是球數，不是軸承外徑。',
    '從爆炸圖辨認摩擦片。rᵢ、rₒ量環片內外半徑，t量片厚，F是壓緊力，Z是摩擦面數。'
  ];
  const sources=[
    ['Engineering Statics：桁架','https://engineeringstatics.org/Chapter_06-trusses.html'],
    ['MIT OpenCourseWare：建築技術','https://ocw.mit.edu/courses/4-401-introduction-to-building-technology-spring-2006/'],
    ['Lee Spring：壓縮彈簧','https://www.leespring.com/compression-springs'],
    ['Paul Mueller：容器設備','https://www.paulmueller.com/store/product/custom-tanks-and-vessels?scLang=en'],
    ['AEO 原論文：焊接梁模型','https://doi.org/10.1007/s00521-019-04452-x'],
    ['SEW-EURODRIVE：減速機','https://www.seweurodrive.com/products/gear-units/gear-units.html'],
    ['NSK：軸承結構','https://www.nsk.com/tools-resources/abc-bearings/differentiating-rolling-bearings/'],
    ['Ogura：多片離合器官方演示','https://www.youtube.com/watch?v=GeGQtuR2Qzo']
  ];
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function line(x1,y1,x2,y2,cls='metal',width=5){return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" stroke-width="${width}"/>`;}
  function text(x,y,t){return `<text x="${x}" y="${y}" class="model-label">${t}</text>`;}
  function rect(x,y,w,h,cls='part'){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" class="${cls}"/>`;}
  function circle(x,y,r,cls='part'){return `<circle cx="${x}" cy="${y}" r="${r}" class="${cls}"/>`;}
  function gear(cx,cy,r){let p=[];for(let i=0;i<64;i++){let a=i*Math.PI/32,rr=r+(i%4<2?6:0);p.push(`${cx+rr*Math.cos(a)},${cy+rr*Math.sin(a)}`);}return `<polygon points="${p.join(' ')}" class="part"/>`+circle(cx,cy,12,'hole');}
  function drawing(index,scale=1){
    let g='';
    if(index===0){g=line(70,65,350,65,'support',10)+line(80,75,210,230,'accent',8*scale)+line(210,75,210,230,'metal',6*scale)+line(340,75,210,230,'accent',8*scale);g+=circle(210,230,6)+line(210,235,210,278,'load',3)+text(220,277,'P ↓')+text(91,160,'x₁')+text(220,150,'x₂')+text(315,160,'x₁');}
    if(index===1){g=rect(45,90,20,140,'support');for(let j=0;j<5;j++)g+=rect(65+j*61,130+j*5,61,(65-j*9)*scale,'part')+text(72+j*61,115,`x${j+1}`);g+=line(370,180,370,256,'load',3)+text(345,280,'P ↓');}
    if(index===2){let path='M145 60';for(let j=0;j<9;j++)path+=` C 260 ${65+j*20}, 260 ${85+j*20}, 145 ${85+j*20} C 90 ${85+j*20}, 90 ${95+j*20},145 ${95+j*20}`;g=`<path d="${path}" class="coil" stroke-width="${6*scale}"/>`+line(105,265,260,265,'dimension',2)+text(175,290,'D')+text(278,150,'d：線徑')+text(278,180,'N：圈數');}
    if(index===3){g=`<path d="M110 95 C30 95 30 235 110 235 L305 235 C385 235 385 95 305 95 Z" class="part"/>`+line(110,95,110,235,'dimension',2)+line(305,95,305,235,'dimension',2)+line(110,265,305,265,'dimension',2)+text(200,290,'L')+line(205,165,205,103,'load',2)+text(215,140,'R')+text(145,75,'Tₛ：筒壁厚')+text(300,70,'Tₕ：封頭厚');}
    if(index===4){g=rect(55,80,20,170,'support')+rect(75,135,285,45*scale)+`<path d="M75 125 L160 125 L160 135 L75 135 Z" class="weld"/>`+text(105,110,'h、l：焊縫')+text(190,210,'t、b：梁截面')+line(360,185,360,260,'load',3)+text(345,285,'P ↓');}
    if(index===5){g=line(50,115,230,115,'metal',12*scale)+line(185,218,390,218,'metal',17*scale)+gear(180,115,41)+gear(255,218,76)+text(52,76,'d₁、l₁')+text(300,260,'d₂、l₂')+text(70,185,'b：齒寬')+text(278,80,'m：模數')+text(278,105,'z：小齒輪齒數');}
    if(index===6){g=circle(210,165,112)+circle(210,165,68,'hole')+`<circle cx="210" cy="165" r="90" class="pitch"/>`;for(let j=0;j<10;j++){let a=j*Math.PI/5;g+=circle(210+90*Math.cos(a),165+90*Math.sin(a),13*scale);}g+=circle(210,165,47,'hole')+text(20,42,'外環')+text(160,170,'內環')+line(300,165,326,165,'load',2)+text(328,160,'Dᵦ')+text(55,298,'Dₘ：節圓直徑；Z：球數');}
    if(index===7){for(let j=0;j<6;j++)g+=`<ellipse cx="${100+j*41}" cy="165" rx="22" ry="82" class="${j%2?'friction':'part'}"/><ellipse cx="${100+j*41}" cy="165" rx="9" ry="35" class="hole"/>`;g+=line(40,165,75,165,'load',4)+line(380,165,345,165,'load',4)+text(30,140,'F →')+text(350,140,'← F')+text(85,275,'rᵢ、rₒ：內外半徑')+text(125,55,'t：片厚；Z：摩擦面數');}
    return `<svg viewBox="0 0 420 320" role="img" aria-label="${escape(observations[index])}"><title>${escape(observations[index])}</title>${g}</svg>`;
  }
  global.EngineeringVisuals={drawing,html(index){const asset=global.ENGINEERING_CREDITS.find(a=>a.id===keys[index]),source=sources[index];return `<div class="engineering-exhibit"><figure class="engineering-reference"><div class="reference-photo"><img src="${escape(asset.src)}" alt="${escape(captions[index])}" loading="eager" width="900" height="650"></div><figcaption>${captions[index]}<details class="image-credit"><summary>圖片來源與授權</summary><p><a href="${escape(asset.source)}" target="_blank" rel="noopener">${escape(asset.title)}</a> · ${escape(asset.author)} · <a href="${escape(asset.licenseUrl||asset.source)}" target="_blank" rel="noopener">${escape(asset.license)}</a>。僅縮放顯示，未修改內容。</p></details></figcaption></figure><figure class="engineering-model"><div id="engineeringModelDrawing">${drawing(index)}</div><figcaption>論文模型的原創教學重繪 · 不按比例</figcaption></figure></div><div class="engineering-observe"><h4>先看懂哪個部位？</h4><p>${observations[index]}</p><a href="${source[1]}" target="_blank" rel="noopener">${source[0]}：查看結構與實物資料</a><p class="sub">外觀參考資料瀏覽日期：2026/11/25。這些參考物件不是論文作者實際製作的原型。</p></div>`;}};
})(window);

