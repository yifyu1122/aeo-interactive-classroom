/* Calculation notebook. Everything displayed here reads the selected run's
   recorded events. Moving the cursor, picking a point or changing a tab
   never samples the RNG or changes the state of an individual. */
(function (global) {
  'use strict';
  const names = {
    init: '族群初始化', sort: '排序與角色分配', production: '生產者更新',
    herb: '草食者更新', carn: '肉食者更新', omni: '雜食者更新',
    decomposition: '分解更新', finish: '執行完成'
  };
  const sources = { production: '式 (1)–(3)', herb: '式 (4)–(6)', carn: '式 (4)、(5)、(7)', omni: '式 (4)、(5)、(8)', decomposition: '式 (9)–(12)' };
  const role = { producer: '生產者', peer: '參考消費者', best: '此階段最佳解', random: '隨機位置' };
  const memo = new WeakMap();
  const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = v => {
    if (v == null) return '—';
    if (Array.isArray(v)) return v.length === 1 ? fmt(v[0]) : '(' + v.map(fmt).join(', ') + ')';
    if (!Number.isFinite(v)) return escape(v);
    if (Object.is(v, -0) || v === 0) return '0';
    const a = Math.abs(v);
    return String(a < 0.0001 || a >= 1e6 ? v.toExponential(5) : Number(v.toPrecision(6))).replace(/-/g,'−');
  };
  const point = id => 'P' + id;
  const value = v => '<code>' + fmt(v) + '</code>';
  const row = (key, val) => '<div><dt>' + key + '</dt><dd>' + val + '</dd></div>';
  const refsOf = e => Object.fromEntries((e.refs || []).map(r => [r.role,r]));
  function title(e) {
    if (e.kind === 'evaluate') return '評估' + (names[e.stage] || '候選解').replace('更新','') + '的提案';
    return names[e.stage] || names[e.kind] || '事件紀錄';
  }
  function simple(e,run) {
    if (e.kind === 'init') return '先在搜尋範圍內放好每個點，量出它們的高度；分數越低，位置越好。';
    if (e.kind === 'sort') return '把分數從大排到小，最差的點負責生產，最佳的點會成為分解時的參考。';
    if (e.kind === 'finish') return run.config.demo ? '這次獨立示範完成，可回到前一步重看這一種食性。' : '已走完設定的輪數，圖上標出的最佳點是這次搜尋留下的最低分。';
    if (e.kind === 'evaluate') return e.accepted ? '候選位置的分數更低，這個點搬到新位置。' : '候選位置沒有拿到更低的分數，這個點留在原地。';
    if (e.stage === 'production') return '從目前最佳點朝隨機點走一段，替最差的點提出新位置。';
    if (e.stage === 'herb') return '草食者拿自己和生產者的位置作比較，再用步幅係數決定往哪裡試。';
    if (e.stage === 'carn') return '肉食者抽到一位排在自己前面的消費者，用兩者的位置差提出新位置。';
    if (e.stage === 'omni') return ['先看生產者：用自己的位置減掉生產者的位置，得到第一組差。','再看另一位消費者：用自己的位置減掉它的位置，得到第二組差。','把兩組位置差依權重混合，乘上步幅係數，再從自己的位置出發。'][e.part-1];
    return '分解時從最佳位置出發，用自己的位置算出擾動；走完還需要評分。';
  }
  function formula(e) {
    if (e.stage === 'production') return 'x_rand = L + r ⊙ (U − L)\na = (1 − t/T) r₁\nx′ = (1 − a)xₙ + a x_rand';
    if (e.stage === 'decomposition') return 'D = 3u； e = r₃k − 1； h = 2r₃ − 1\nx′ = xₙ + D(e xₙ − h xᵢ)';
    if (e.stage === 'omni' && e.kind !== 'evaluate' && e.part < 3)
      return e.part === 1 ? 'Δ₁ = xᵢ − x₁' : 'Δ₁ = xᵢ − x₁\nΔ₂ = xᵢ − xⱼ';
    return 'C = ½ v₁ / |v₂|\n' + ({
      herb:'x′ = xᵢ + C (xᵢ − x₁)',carn:'x′ = xᵢ + C (xᵢ − xⱼ)',
      omni:'x′ = xᵢ + C [r₂ (xᵢ − x₁) + (1 − r₂)(xᵢ − xⱼ)]'
    })[e.stage];
  }
  function roleWhy(e) {
    const rr=refsOf(e);
    if (e.stage === 'production') return '生產者使用最佳位置與界內隨機位置作兩個端點。';
    if (e.stage === 'decomposition') return '這一批都以生產／消費結束後的最佳位置為基準，依自己的位置算擾動。';
    if (e.stage === 'herb') return e.rank===2 && e.random.dietDraw == null ? '排名 i = 2 時，沒有 2 ≤ j < i 的消費者可選；本實作在完整迭代時指定草食。' : '草食策略以生產者的位置為參考，位置差的正負與 C 共同決定位移方向。';
    if (!rr.peer || (e.stage === 'omni' && e.kind!=='evaluate' && e.part===1)) return '雜食者需要兩個參考。這一步先看生產者的位置。';
    return '同伴 '+point(rr.peer.id)+' 的排名 j = '+rr.peer.rank+'，符合 2 ≤ j < i = '+e.rank+'。'+(e.stage==='omni'?'兩組位置差依 r₂ 加權；權重和步幅由不同亂數控制。':'只在符合條件的消費者中隨機選取。');
  }
  function refInfo(e) {
    return (e.refs||[]).filter(r=>!(e.stage==='omni'&&e.part===1&&e.kind!=='evaluate'&&r.role==='peer'))
      .map(r=>row(role[r.role] || '參考位置',(r.id!=null?point(r.id)+' · ':'')+value(r.x))).join('');
  }
  function numeric(e,run) {
    const p=e.random, r=refsOf(e), text=[], step=(s)=>text.push(s);
    const partial=e.stage==='omni'&&e.kind!=='evaluate'&&e.part<3;
    if (e.stage==='production'){
      step('a = (1 − '+e.t+'/'+run.config.T+') × '+fmt(p.r1)+' ≈ '+fmt(p.a));
    } else if(e.stage==='decomposition'){
      step('D = 3 × '+fmt(p.u)+' ≈ '+fmt(p.D));
      step('e = '+fmt(p.r3)+' × '+p.k+' − 1 ≈ '+fmt(p.e)+'；h = 2 × '+fmt(p.r3)+' − 1 ≈ '+fmt(p.h));
    } else if (!partial) step('C = ½ × '+fmt(p.v1)+' / |'+fmt(p.v2)+'| ≈ '+fmt(p.C));
    e.old.forEach((v,i)=>{
      const prefix=e.old.length>1?(i?'y':'x')+' 分量　':'';
      const f=fmt, x=f(v), get=name=>f(r[name]?.x?.[i]);
      if(e.stage==='production'){
        step(prefix+'x_rand = '+f(run.config.L)+' + '+f(p.r[i])+' × ('+f(run.config.U)+' − ('+f(run.config.L)+')) ≈ '+get('random'));
        step(prefix+'x′ = (1 − '+f(p.a)+') × '+get('best')+' + '+f(p.a)+' × '+get('random')+' ≈ '+f(e.raw[i]));
      }else if(e.stage==='decomposition'){
        step(prefix+'x′ = '+get('best')+' + '+f(p.D)+' × ('+f(p.e)+' × '+get('best')+' − '+f(p.h)+' × '+x+') ≈ '+f(e.raw[i]));
      }else {
        if(e.delta1) step(prefix+'Δ₁ = '+x+' − ('+get('producer')+') ≈ '+f(e.delta1[i]));
        if(e.delta2 && !(partial && e.part===1)) step(prefix+'Δ₂ = '+x+' − ('+get('peer')+') ≈ '+f(e.delta2[i]));
        if(!partial){
          if(e.stage==='omni') step(prefix+'Δ = '+f(p.r2)+' × '+f(e.delta1[i])+' + (1 − '+f(p.r2)+') × '+f(e.delta2[i])+' ≈ '+f(e.deltaMix[i]));
          const delta=e.stage==='omni'?e.deltaMix:e.stage==='herb'?e.delta1:e.delta2;
          step(prefix+'x′ = '+x+' + ('+f(p.C)+') × ('+f(delta[i])+') ≈ '+f(e.raw[i]));
        }
      }
    });
    return text;
  }
  const randomLabels={r:'r · 隨機點各維抽樣',r1:'r₁ · 生產權重抽樣',a:'a · 實際權重',cap:'1 − t/T · 權重上限',v1:'v₁ · 標準常態',v2:'v₂ · 標準常態',C:'C · 消費係數',r2:'r₂ · 生產者差值的權重',dietDraw:'食性抽樣',peerDraw:'同伴索引抽樣',u:'u · 標準常態',D:'D · 分解係數',r3:'r₃ · 分解權重抽樣',k:'k · 整數抽樣',e:'e · 最佳位置權重',h:'h · 自身位置權重'};
  function coeff(e){
    const p=e.random||{}, show=Object.entries(p).filter(([k,v])=>v!=null&&!(e.stage==='omni'&&e.kind!=='evaluate'&&e.part<3&&['v1','v2','C','r2',...(e.part===1?['peerDraw']:[])].includes(k)));
    return '<dl class="ls-kv">'+show.map(([k,v])=>row(randomLabels[k]||escape(k),value(v))).join('')+'</dl>';
  }
  function score(e){
    if (e.kind!=='evaluate') return '<p class="ls-note">尚未評估 · 原位置仍然有效。</p>';
    return '<div class="ls-decision '+(e.accepted?'positive':'neutral')+'"><strong>'+(e.accepted?'接受更新':'保留原位置')+'</strong><span>舊 f = '+fmt(e.oldF)+'　→　新 f = '+fmt(e.newF)+'</span></div>';
  }
  function movement(e,run,withFormula){
    const partial=e.stage==='omni'&&e.kind!=='evaluate'&&e.part<3;
    let out='<div class="ls-event-name"><span>'+escape(sources[e.stage]||'')+'</span><span>第 '+e.t+' 輪 · 排名 '+e.rank+'</span></div><dl class="ls-kv">'+row('原位置 '+point(e.id),value(e.old))+refInfo(e);
    if(partial){
      if(e.part>=1)out+=row('與生產者的位置差 Δ₁',value(e.delta1));
      if(e.part===2)out+=row('與同伴的位置差 Δ₂',value(e.delta2));
    }else{
      if(e.stage==='herb'||e.stage==='carn'||e.stage==='omni'){
        out+=row(e.stage==='omni'?'加權位置差':'位置差',value(e.deltaMix))+row('步幅係數 C',value(e.random.C));
      }
      out+=row('公式算出的候選',value(e.raw));
      if(e.kind==='evaluate'&&e.repair)out+=row('越界後重新抽取',value(e.next));
    }
    out+='</dl><p class="ls-note">'+escape(roleWhy(e))+'</p>'+score(e);
    if(e.stage==='production'){
      const p=e.random;
      out+='<div class="ls-weights"><span>生產權重 a <b>'+fmt(p.a)+'</b> ／ 本輪上限 '+fmt(p.cap)+'</span><div role="img" aria-label="上限與實際權重"><i style="width:'+Number(p.cap*100)+'%"></i><b style="width:'+Number(p.a*100)+'%"></b></div><small>越到後期，可抽取的權重上限越小；每輪的 a 仍會波動。</small></div>';
    }
    if(withFormula){
      out+='<section class="ls-math"><h4>本步公式</h4><pre>'+escape(formula(e))+'</pre><h4>本次代入</h4><div class="ls-lines">'+numeric(e,run).map(s=>'<code>'+escape(s)+'</code>').join('')+'</div></section>';
      out+='<details class="ls-details"><summary>查看抽樣與完整精度</summary>'+coeff(e);
      if(e.kind==='evaluate'&&e.repair)out+='<p class="ls-note">至少一維超界，整個向量重新產生：L + r × (U − L)，抽樣 r = '+fmt(e.repairR)+'。</p>';
      const record={old:e.old,refs:(e.refs||[]).filter(r=>!partial||e.part>1||r.role!=='peer')};
      if(partial){record.delta1=e.delta1;if(e.part===2)record.delta2=e.delta2;}
      else Object.assign(record,{random:e.random,raw:e.raw});
      if(e.kind==='evaluate')Object.assign(record,{repair:e.repair,repairR:e.repairR,next:e.next,oldF:e.oldF,newF:e.newF,accepted:e.accepted});
      out+='<p class="ls-note">畫面取約六位有效數字；以下保留事件原值。</p><pre>'+escape(JSON.stringify(record,null,2))+'</pre></details>';
    }
    return out;
  }
  function indexed(run){
    if(!memo.has(run)){
      const byId=new Map();run.events.forEach((e,i)=>{if(e.id!=null&&(e.kind==='evaluate'||e.kind==='proposal')){if(!byId.has(e.id))byId.set(e.id,[]);byId.get(e.id).push(i);}});memo.set(run,byId);
    }
    return memo.get(run);
  }
  function render(container,run,index,options={}){
    if(!container||!run?.events?.length)return;
    const now=run.events[index],selected=options.selected!=null?Number(options.selected):null;
    const history=selected===null?[]:(indexed(run).get(selected)||[]).filter(i=>i<=index);
    const current=selected!==null ? history.at(-1) : now.id!=null?index:undefined;
    let at=current;
    function paint(){
      const ev=at!=null?run.events[at]:null;
      const pop=global.AEO.stateAt(run,index);
      const p=pop.find(p=>p.id===selected);
      let html='<div class="ls-shell"><div class="ls-now"><span>第 '+now.t+' 輪 · '+escape(title(now))+(now.id!=null?' · '+point(now.id):'')+'</span><p>'+escape(simple(now,run))+'</p></div>';
      if(selected!==null){
        html+='<div class="ls-pick"><b>'+point(selected)+' 的計算紀錄</b>';
        if(history.length){
          /* Limit menu to one entry per update (plus currently revealed
             substeps), keeping even very long runs easy to inspect. */
          const menu=history.filter(j=>{const e=run.events[j];return e.kind==='evaluate'||j===current||j===at;});
          html+='<label>已播放的更新<select aria-label="已播放的個體更新">'+menu.map(i=>'<option value="'+i+'" '+(i===at?'selected':'')+'>第 '+run.events[i].t+' 輪 · '+escape(title(run.events[i]))+(run.events[i].stage==='omni'&&run.events[i].kind==='proposal'?' '+run.events[i].part+'/3':'')+'</option>').join('')+'</select></label>';
        }
        html+='</div>';
      }
      if(ev){
        if(ev!==now)html+='<p class="ls-note">回查第 '+ev.t+' 輪的'+escape(title(ev))+'。'+escape(simple(ev,run))+'</p>';
        html+=movement(ev,run,options.formulas!==false);
      }else if(p){
        const sample=run.events[0].samples?.[run.initial.findIndex(v=>v.id===p.id)];
        html+='<dl class="ls-kv">'+row('目前位置',value(p.x))+row('目前分數 f(x)',value(p.f))+'</dl><p class="ls-note">此個體尚無已播放的更新紀錄。繼續逐步執行即可檢查。</p>';
        if(sample&&options.formulas!==false)html+='<section class="ls-math"><h4>初始化時如何取得此位置</h4><pre>x = L + r ⊙ (U − L)\nr = '+fmt(sample.r)+'；L = '+fmt(run.config.L)+'；U = '+fmt(run.config.U)+'\nx ≈ '+fmt(sample.x)+'</pre></section>';
      }else {
        const best=pop.reduce((a,b)=>a.f<=b.f?a:b),worst=pop.reduce((a,b)=>a.f>=b.f?a:b);
        html+='<dl class="ls-kv">'+row('最低分 · '+point(best.id),value(best.f))+row('最高分 · '+point(worst.id),value(worst.f))+'</dl><p class="ls-note">'+(now.kind==='finish'?'點選圖中的個體，可回查已完成的計算。':'點選圖中的個體，查看它的位置與分數。')+'</p>';
      }
      container.innerHTML=html+'</div>';
      const selector=container.querySelector('.ls-pick select');
      if(selector)selector.onchange=()=>{at=Number(selector.value);paint();};
    }
    paint();
  }
  global.AEOLesson={render};
})(globalThis);
